/**
 * ExerciseQuestionnaireSheet — 8-question structured feedback form
 *
 * Bottom-sheet overlay showing one question at a time with auto-advance,
 * progress bar, and notes field. Same UX pattern as WeeklyFeedbackCard.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Loader2,
  Check,
  ChevronLeft,
  SkipForward,
} from 'lucide-react';
import { AudioRecorder } from '@/modules/journey/components/capture/AudioRecorder';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ExerciseQuestionnaire');

// ─── Questionnaire schema ─────────────────────────

export interface QuestionnaireAnswers {
  volume_adequate?: number;
  volume_completed?: number;
  intensity_adequate?: number;
  intensity_completed?: number;
  fatigue?: number;
  stress?: number;
  nutrition?: number;
  sleep?: number;
}

type QuestionKey = keyof QuestionnaireAnswers;

interface QuestionDef {
  key: QuestionKey;
  label: string;
  scaleLabels: string[];
}

const QUESTIONS: QuestionDef[] = [
  {
    key: 'volume_adequate',
    label: 'Volume adequado ao perfil?',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'],
  },
  {
    key: 'volume_completed',
    label: 'Cumpriu o volume?',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Medio', 'Bastante', 'Totalmente'],
  },
  {
    key: 'intensity_adequate',
    label: 'Intensidade adequada?',
    scaleLabels: ['Pessima', 'Ruim', 'Regular', 'Boa', 'Muito Boa', 'Excelente'],
  },
  {
    key: 'intensity_completed',
    label: 'Cumpriu a intensidade?',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Medio', 'Bastante', 'Totalmente'],
  },
  {
    key: 'fatigue',
    label: 'Nivel de cansaco',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'],
  },
  {
    key: 'stress',
    label: 'Nivel de stress',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'],
  },
  {
    key: 'nutrition',
    label: 'Cuidado com alimentacao',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'],
  },
  {
    key: 'sleep',
    label: 'Qualidade do sono',
    scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'],
  },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // 8 questions + 1 notes step

/**
 * Detects and removes duplicated transcript text from Gemini responses.
 * e.g. "Os exercícios foram bons.Os exercícios foram bons." → "Os exercícios foram bons."
 */
function deduplicateTranscript(text: string): string {
  if (!text || text.length < 10) return text;
  const len = text.length;
  // Check if the text is roughly the same phrase repeated (within half ±5 chars)
  for (let mid = Math.floor(len / 2) - 5; mid <= Math.ceil(len / 2) + 5; mid++) {
    if (mid <= 0 || mid >= len) continue;
    const first = text.slice(0, mid).trim();
    const second = text.slice(mid).trim();
    if (first.length > 10 && first === second) return first;
  }
  return text;
}

// ─── Props ─────────────────────────────────────────

export interface ExerciseQuestionnaireSheetProps {
  slotId: string;
  slotName: string;
  dayLabel: string;
  onSubmit: (data: { slotId: string; questionnaire: QuestionnaireAnswers; notes: string }) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ─── Component ─────────────────────────────────────

export function ExerciseQuestionnaireSheet({
  slotId,
  slotName,
  dayLabel,
  onSubmit,
  onClose,
  isSubmitting = false,
}: ExerciseQuestionnaireSheetProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    try {
      // Convert blob to base64 using FileReader (efficient, no byte-by-byte loop)
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const mimeType = blob.type || 'audio/webm';

      log.debug('Transcribing audio', { mimeType, sizeBytes: blob.size });

      // Call gemini-chat directly via supabase.functions.invoke (#723)
      // This bypasses GeminiClient's raw fetch — supabase-js handles auth reliably
      const { data, error: fnError } = await supabase.functions.invoke('gemini-chat', {
        body: {
          action: 'transcribe_audio',
          payload: { audioBase64, mimeType },
        },
      });

      if (fnError) {
        log.error('Edge function error:', fnError);
        throw fnError;
      }

      const raw = data?.result?.transcription || data?.result?.text || '';
      const cleaned = raw.replace(/<THINK>[\s\S]*?<\/THINK>\s*/gi, '').trim();

      // Deduplicate if Gemini returned repeated text (e.g. "abc.abc." → "abc.")
      const text = deduplicateTranscript(cleaned);

      if (text) {
        setVoiceTranscript(text);
        // Replace notes with transcript (not append) to prevent duplication on re-record
        setNotes(text);
      }
    } catch (err: any) {
      log.error('Transcription error:', err);
      setError('Erro na transcricao. Use o campo de texto.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.key] !== undefined).length,
    [answers]
  );

  const progressPct = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);

  const isAdvancingRef = useRef(false);
  const handleAnswer = useCallback((key: QuestionKey, value: number) => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setAnswers((prev) => ({ ...prev, [key]: value }));
    // Auto-advance after short delay
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
      isAdvancingRef.current = false;
    }, 300);
  }, []);

  const handleSubmit = async () => {
    await onSubmit({ slotId, questionnaire: answers, notes });
  };

  const isOnNotesStep = currentStep >= QUESTIONS.length;
  const currentQuestion = !isOnNotesStep ? QUESTIONS[currentStep] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-ceramic-base w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              {slotName}
            </h3>
            <p className="text-xs text-ceramic-text-secondary mt-0.5">
              {dayLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {currentStep + 1}/{TOTAL_STEPS}
            </span>
            {answeredCount === QUESTIONS.length && (
              <span className="text-[10px] font-bold text-amber-600">Completo</span>
            )}
          </div>
          <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-400 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question / Notes content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <AnimatePresence mode="wait">
            {currentQuestion ? (
              <motion.div
                key={currentQuestion.key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Question label */}
                <p className="text-sm font-medium text-ceramic-text-primary">
                  {currentQuestion.label}
                </p>

                {/* Scale options — vertical list with labels */}
                <div className="space-y-2">
                  {currentQuestion.scaleLabels.map((label, idx) => {
                    const isSelected = answers[currentQuestion.key] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswer(currentQuestion.key, idx)}
                        disabled={isSubmitting}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-ceramic-border/40 bg-ceramic-cool/20 hover:border-ceramic-border hover:bg-ceramic-cool/40'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'bg-ceramic-base text-ceramic-text-secondary border border-ceramic-border/60'
                          }`}
                        >
                          {idx}
                        </span>
                        <span
                          className={`text-sm ${
                            isSelected
                              ? 'font-bold text-amber-700'
                              : 'text-ceramic-text-primary'
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                    className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                    className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Pular
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="notes-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Summary */}
                {answeredCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/50">
                    <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-700">
                      {answeredCount} de {QUESTIONS.length} perguntas respondidas
                    </span>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ceramic-text-primary">
                    Observacoes (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Alguma dor, desconforto ou observacao sobre o treino?"
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 text-sm border border-ceramic-border/50 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all placeholder:text-ceramic-text-secondary/50"
                  />
                </div>

                {/* Voice recorder */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {isTranscribing ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200/50 text-amber-700 text-xs font-bold rounded-xl">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transcrevendo...</span>
                      </div>
                    ) : (
                      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                    )}
                  </div>
                  {voiceTranscript && (
                    <div className="px-3 py-2.5 rounded-xl bg-ceramic-cool/30 border border-ceramic-border/30">
                      <p className="text-xs text-ceramic-text-secondary italic leading-relaxed">
                        &ldquo;{voiceTranscript}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-ceramic-error">{error}</p>
                )}

                {/* Navigation + Submit */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(QUESTIONS.length - 1)}
                    className="flex items-center gap-1 px-3 py-2.5 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Salvar Feedback
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
