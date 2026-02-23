/**
 * WeeklyFeedbackCard — weekly feedback with structured questionnaire + voice
 *
 * Replaces CoachAvailabilityCard in AthletePortalView.
 * Shows 8 questions one at a time (6-point labeled scale each),
 * then a free-text + voice step, then submits to `athlete_feedback_entries`.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Lock,
} from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('WeeklyFeedbackCard');

// ─── Questionnaire definition ────────────────────────────────────

interface QuestionDef {
  key: string;
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

const TOTAL_STEPS = QUESTIONS.length + 1; // 8 questions + 1 notes/voice step

// ─── Component ───────────────────────────────────────────────────

export interface WeeklyFeedbackCardProps {
  athleteId: string;
  microcycleId: string;
  weekNumber: number;
  userId: string;
  currentWeek?: number;
}

export function WeeklyFeedbackCard({
  athleteId,
  microcycleId,
  weekNumber,
  userId,
  currentWeek,
}: WeeklyFeedbackCardProps) {
  const isFutureWeek = currentWeek != null && weekNumber > currentWeek;
  // Form state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0); // 0..8: 0-7 = questions, 8 = notes
  const [notes, setNotes] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingNotes, setExistingNotes] = useState<string | null>(null);
  const [existingQuestionnaire, setExistingQuestionnaire] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing weekly feedback
  useEffect(() => {
    if (!microcycleId || !weekNumber) return;
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from('athlete_feedback_entries')
        .select('id, notes, voice_transcript, questionnaire')
        .eq('microcycle_id', microcycleId)
        .eq('week_number', weekNumber)
        .eq('feedback_type', 'weekly')
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setIsSubmitted(true);
        setExistingNotes(data.notes || data.voice_transcript || null);
        setExistingQuestionnaire(data.questionnaire as Record<string, number> | null);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [microcycleId, weekNumber]);

  const handleAnswer = useCallback((key: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    // Auto-advance to next step after a short delay
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, 300);
  }, []);

  const handleTranscriptChange = useCallback((transcript: string, durationSeconds: number) => {
    setVoiceTranscript(transcript);
    setVoiceDuration(durationSeconds);
    // Append transcription to notes field
    if (transcript) {
      setNotes((prev) => prev ? `${prev}\n${transcript}` : transcript);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const questionnaire = Object.keys(answers).length > 0 ? answers : null;
      const finalNotes = notes.trim() || null;
      const finalTranscript = voiceTranscript.trim() || null;

      const { error: insertError } = await supabase
        .from('athlete_feedback_entries')
        .insert({
          user_id: userId,
          athlete_id: athleteId,
          microcycle_id: microcycleId,
          feedback_type: 'weekly',
          week_number: weekNumber,
          questionnaire,
          notes: finalNotes,
          voice_transcript: finalTranscript,
          voice_duration_seconds: voiceDuration || null,
        });

      if (insertError) throw insertError;

      setIsSubmitted(true);
      setExistingNotes(finalNotes || finalTranscript);
      setExistingQuestionnaire(questionnaire);
    } catch (err) {
      log.error('Failed to submit weekly feedback:', err);
      setError('Erro ao salvar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, notes, voiceTranscript, voiceDuration, userId, athleteId, microcycleId, weekNumber]);

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round(((currentStep) / TOTAL_STEPS) * 100);

  // ─── Future week — locked ───

  if (isFutureWeek) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3 opacity-50">
        <Lock className="w-5 h-5 text-ceramic-text-secondary/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-secondary">
            Feedback da Semana {weekNumber}
          </h3>
          <p className="text-xs text-ceramic-text-secondary/60 mt-0.5">
            Disponivel quando a semana comecar
          </p>
        </div>
      </div>
    );
  }

  // ─── Already submitted ───

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Feedback da Semana {weekNumber}
          </h3>
        </div>
        {existingQuestionnaire && (
          <div className="grid grid-cols-2 gap-2">
            {QUESTIONS.map((q) => {
              const val = existingQuestionnaire[q.key];
              if (val === undefined) return null;
              return (
                <div key={q.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-ceramic-cool/40">
                  <span className="text-[10px] text-ceramic-text-secondary truncate mr-1">{q.label}</span>
                  <span className="text-[10px] font-bold text-ceramic-text-primary flex-shrink-0">{q.scaleLabels[val]}</span>
                </div>
              );
            })}
          </div>
        )}
        {existingNotes && (
          <p className="text-xs text-ceramic-text-secondary leading-relaxed line-clamp-3 italic">
            &ldquo;{existingNotes}&rdquo;
          </p>
        )}
        <p className="text-[10px] text-green-600 font-medium">Enviado com sucesso</p>
      </div>
    );
  }

  // ─── Collapsed (not started) ───

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
      >
        <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Feedback da Semana {weekNumber}
          </h3>
          <p className="text-xs text-ceramic-text-secondary mt-0.5">
            8 perguntas rapidas + observacoes
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
      </button>
    );
  }

  // ─── Active form (one question at a time) ───

  const isOnNotesStep = currentStep >= QUESTIONS.length;
  const currentQuestion = !isOnNotesStep ? QUESTIONS[currentStep] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header + progress */}
      <div className="px-5 pt-5 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Feedback da Semana {weekNumber}
          </h3>
          <span className="text-[10px] text-ceramic-text-secondary font-medium">
            {currentStep + 1}/{TOTAL_STEPS}
          </span>
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
      <div className="px-5 pb-5">
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
                            : 'bg-white text-ceramic-text-secondary border border-ceramic-border/60'
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
              {/* Summary of answered questions */}
              {answeredCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/50">
                  <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-700">
                    {answeredCount} de {QUESTIONS.length} perguntas respondidas
                  </span>
                </div>
              )}

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ceramic-text-primary">
                  Observacoes gerais (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Disposicao, dores, algo que queira comunicar ao coach..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-ceramic-border/50 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all placeholder:text-ceramic-text-secondary/50"
                />
              </div>

              {/* Voice recorder */}
              <VoiceRecorder
                onTranscriptChange={handleTranscriptChange}
                initialTranscript={voiceTranscript}
              />

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500">{error}</p>
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
                  disabled={isSubmitting || (answeredCount === 0 && !notes.trim() && !voiceTranscript.trim())}
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
                      Enviar Feedback
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
