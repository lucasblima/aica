/**
 * ExerciseQuestionnaireSheet — 8-question structured feedback form
 *
 * Bottom-sheet overlay with progress bar showing answered/8.
 * Each question uses a ScaleInput (0-5). Optional notes field.
 * All text in Portuguese per Ceramic design.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { ScaleInput } from './ScaleInput';

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
  lowAnchor: string;
  highAnchor: string;
}

const QUESTIONS: QuestionDef[] = [
  { key: 'volume_adequate', label: 'Volume adequado?', lowAnchor: 'Nada', highAnchor: 'Perfeito' },
  { key: 'volume_completed', label: 'Cumpriu volume?', lowAnchor: 'Nada', highAnchor: 'Tudo' },
  { key: 'intensity_adequate', label: 'Intensidade adequada?', lowAnchor: 'Nada', highAnchor: 'Perfeito' },
  { key: 'intensity_completed', label: 'Cumpriu intensidade?', lowAnchor: 'Nada', highAnchor: 'Tudo' },
  { key: 'fatigue', label: 'Nivel de cansaco', lowAnchor: 'Descansado', highAnchor: 'Exausto' },
  { key: 'stress', label: 'Nivel de stress', lowAnchor: 'Relaxado', highAnchor: 'Muito estressado' },
  { key: 'nutrition', label: 'Alimentacao', lowAnchor: 'Pessima', highAnchor: 'Excelente' },
  { key: 'sleep', label: 'Qualidade do sono', lowAnchor: 'Pessima', highAnchor: 'Excelente' },
];

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
  const [notes, setNotes] = useState('');

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.key] !== undefined).length,
    [answers]
  );

  const progressPct = (answeredCount / QUESTIONS.length) * 100;

  const handleAnswer = useCallback((key: QuestionKey, value: number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async () => {
    await onSubmit({ slotId, questionnaire: answers, notes });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
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
              Feedback — {slotName} ({dayLabel})
            </h3>
            <p className="text-xs text-ceramic-text-secondary mt-0.5">
              Avalie cada aspecto do treino
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {answeredCount}/{QUESTIONS.length} respondidas
            </span>
            {answeredCount === QUESTIONS.length && (
              <span className="text-[10px] font-bold text-amber-600">Completo</span>
            )}
          </div>
          <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Questions list - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-5">
          {QUESTIONS.map((q, i) => (
            <div key={q.key} className="space-y-2">
              <label className="text-sm font-medium text-ceramic-text-primary">
                {i + 1}. {q.label}
              </label>
              <ScaleInput
                value={answers[q.key]}
                onChange={(v) => handleAnswer(q.key, v)}
                lowAnchor={q.lowAnchor}
                highAnchor={q.highAnchor}
                disabled={isSubmitting}
              />
            </div>
          ))}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ceramic-text-primary">
              Observacoes (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma dor, desconforto ou observacao sobre o treino?"
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 text-sm border border-ceramic-border/50 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all bg-white"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="px-5 py-4 border-t border-ceramic-border/30 flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </motion.div>
  );
}
