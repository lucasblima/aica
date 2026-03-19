/**
 * WeeklyFeedbackCard — per-DAY structured feedback (8-question questionnaire)
 *
 * Shows one feedback entry per day of the selected week.
 * Each day uses the same 8-question questionnaire as ExerciseQuestionnaireSheet
 * (volume, intensity, fatigue, stress, nutrition, sleep) on a 0-5 scale.
 * Stores to `athlete_feedback_entries` with feedback_type = 'daily'.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  SkipForward,
  Lock,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('WeeklyFeedbackCard');

const DAY_NAMES = ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

// ─── 8-question questionnaire (same as ExerciseQuestionnaireSheet) ──

interface QuestionnaireAnswers {
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
  { key: 'volume_adequate', label: 'Volume adequado ao perfil?', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'] },
  { key: 'volume_completed', label: 'Cumpriu o volume?', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Medio', 'Bastante', 'Totalmente'] },
  { key: 'intensity_adequate', label: 'Intensidade adequada?', scaleLabels: ['Pessima', 'Ruim', 'Regular', 'Boa', 'Muito Boa', 'Excelente'] },
  { key: 'intensity_completed', label: 'Cumpriu a intensidade?', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Medio', 'Bastante', 'Totalmente'] },
  { key: 'fatigue', label: 'Nivel de cansaco', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'] },
  { key: 'stress', label: 'Nivel de stress', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'] },
  { key: 'nutrition', label: 'Cuidado com alimentacao', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'] },
  { key: 'sleep', label: 'Qualidade do sono', scaleLabels: ['Nada', 'Muito Pouco', 'Pouco', 'Regular', 'Bastante', 'Extremo'] },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // 8 questions + 1 notes step

// ─── Per-day feedback entry ─────────────────────────────────────

interface DayFeedbackEntry {
  dayOfWeek: number;
  questionnaire: QuestionnaireAnswers;
  notes: string;
  isSubmitted: boolean;
  existingQuestionnaire: QuestionnaireAnswers | null;
  existingNotes: string | null;
}

// ─── DayFeedbackCard (per-day expandable questionnaire) ─────────

interface DayCardProps {
  entry: DayFeedbackEntry;
  dayDate: Date | null;
  isFuture: boolean;
  isExpanded: boolean;
  isSubmitting: boolean;
  onToggleExpand: () => void;
  onAnswer: (key: QuestionKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSubmit: () => void;
}

function DayFeedbackCard({
  entry,
  dayDate,
  isFuture,
  isExpanded,
  isSubmitting,
  onToggleExpand,
  onAnswer,
  onSetNotes,
  onSubmit,
}: DayCardProps) {
  const dayLabel = DAY_NAMES[entry.dayOfWeek];
  const dateStr = dayDate
    ? `${dayDate.getDate().toString().padStart(2, '0')}/${(dayDate.getMonth() + 1).toString().padStart(2, '0')}`
    : '';

  const [currentStep, setCurrentStep] = useState(0);

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => entry.questionnaire[q.key] !== undefined).length,
    [entry.questionnaire],
  );

  const handleAnswer = useCallback((key: QuestionKey, value: number) => {
    onAnswer(key, value);
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, 300);
  }, [onAnswer]);

  const progressPct = Math.round((currentStep / TOTAL_STEPS) * 100);
  const isOnNotesStep = currentStep >= QUESTIONS.length;
  const currentQuestion = !isOnNotesStep ? QUESTIONS[currentStep] : null;

  // Reset step when collapsed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isExpanded) setCurrentStep(0);
  }, [isExpanded]);

  // Future day — locked
  if (isFuture) {
    return (
      <div className="bg-ceramic-base rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 opacity-40">
        <Lock className="w-4 h-4 text-ceramic-text-secondary/50 flex-shrink-0" />
        <span className="text-xs font-bold text-ceramic-text-secondary">{dayLabel}</span>
        {dateStr && <span className="text-[10px] text-ceramic-text-secondary/60">{dateStr}</span>}
        <span className="text-[10px] text-ceramic-text-secondary/50 ml-auto">Ainda não disponível</span>
      </div>
    );
  }

  // Already submitted — show summary
  if (entry.isSubmitted) {
    const q = entry.existingQuestionnaire;
    const answered = q ? QUESTIONS.filter((qd) => q[qd.key] !== undefined).length : 0;
    return (
      <div className="bg-ceramic-base rounded-xl shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-ceramic-success inline-block flex-shrink-0" />
          <span className="text-xs font-bold text-ceramic-text-primary">{dayLabel}</span>
          {dateStr && <span className="text-[10px] text-ceramic-text-secondary">{dateStr}</span>}
          <span className="ml-auto text-[10px] text-ceramic-text-secondary">
            {answered}/{QUESTIONS.length} respondidas
          </span>
        </div>
        {entry.existingNotes && (
          <p className="text-[10px] text-ceramic-text-secondary italic mt-1 line-clamp-2 pl-6">
            &ldquo;{entry.existingNotes}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // Active / expandable — 8-question questionnaire
  return (
    <div className="bg-ceramic-base rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-ceramic-cool/20 transition-colors"
      >
        <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-xs font-bold text-ceramic-text-primary">{dayLabel}</span>
        {dateStr && <span className="text-[10px] text-ceramic-text-secondary">{dateStr}</span>}
        {answeredCount > 0 && (
          <span className="text-[10px] text-amber-600 font-medium ml-1">
            {answeredCount}/{QUESTIONS.length}
          </span>
        )}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          )}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-ceramic-border/20 pt-3">
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-ceramic-text-secondary">
                    {currentStep + 1}/{TOTAL_STEPS}
                  </span>
                  {answeredCount === QUESTIONS.length && (
                    <span className="text-[10px] font-bold text-amber-600">Completo</span>
                  )}
                </div>
                <div className="h-1 bg-ceramic-cool rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question or Notes step */}
              <AnimatePresence mode="wait">
                {currentQuestion ? (
                  <motion.div
                    key={currentQuestion.key}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2.5"
                  >
                    <p className="text-xs font-medium text-ceramic-text-primary">
                      {currentQuestion.label}
                    </p>

                    {/* Scale options */}
                    <div className="space-y-1.5">
                      {currentQuestion.scaleLabels.map((label, idx) => {
                        const isSelected = entry.questionnaire[currentQuestion.key] === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAnswer(currentQuestion.key, idx)}
                            disabled={isSubmitting}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left ${
                              isSelected
                                ? 'border-amber-400 bg-amber-50 shadow-sm'
                                : 'border-ceramic-border/30 bg-ceramic-cool/20 hover:border-ceramic-border/60'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-ceramic-base text-ceramic-text-secondary border border-ceramic-border/60'
                              }`}
                            >
                              {idx}
                            </span>
                            <span
                              className={`text-xs ${
                                isSelected ? 'font-bold text-amber-700' : 'text-ceramic-text-primary'
                              }`}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1 text-[10px] text-ceramic-text-secondary hover:text-ceramic-text-primary disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                        className="flex items-center gap-1 text-[10px] text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                      >
                        <SkipForward className="w-3 h-3" />
                        Pular
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="notes-step"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {/* Summary */}
                    {answeredCount > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                        <span className="text-[10px] text-amber-700">
                          {answeredCount} de {QUESTIONS.length} perguntas respondidas
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    <textarea
                      value={entry.notes}
                      onChange={(e) => onSetNotes(e.target.value)}
                      placeholder="Observacoes do dia (opcional)..."
                      rows={2}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs border border-ceramic-border/40 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all placeholder:text-ceramic-text-secondary/50"
                    />

                    {/* Navigation + Submit */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(QUESTIONS.length - 1)}
                        className="flex items-center gap-1 px-2 py-2 text-[10px] text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting || answeredCount === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Enviar
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export interface WeeklyFeedbackCardProps {
  athleteId: string;
  microcycleId: string;
  weekNumber: number;
  userId: string;
  currentWeek?: number;
  /** Start date of the microcycle (ISO string) */
  microcycleStartDate?: string;
  /** Days of week that have workouts in the selected week (1=Mon...7=Sun) */
  workoutDays?: number[];
  /** Called after a daily feedback is successfully submitted */
  onFeedbackSubmitted?: () => void;
}

export function WeeklyFeedbackCard({
  athleteId,
  microcycleId,
  weekNumber,
  userId,
  currentWeek,
  microcycleStartDate,
  workoutDays,
  onFeedbackSubmitted,
}: WeeklyFeedbackCardProps) {
  const isFutureWeek = currentWeek != null && weekNumber > currentWeek;

  // Only the days with workouts
  const daysToShow = useMemo(() => {
    if (workoutDays?.length) return [...workoutDays].sort((a, b) => a - b);
    return [1, 2, 3, 4, 5, 6, 7];
  }, [workoutDays]);

  // Per-day state
  const [dayEntries, setDayEntries] = useState<Record<number, DayFeedbackEntry>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [submittingDay, setSubmittingDay] = useState<number | null>(null);

  // Initialize day entries
  useEffect(() => {
    const entries: Record<number, DayFeedbackEntry> = {};
    for (const day of daysToShow) {
      entries[day] = {
        dayOfWeek: day,
        questionnaire: {},
        notes: '',
        isSubmitted: false,
        existingQuestionnaire: null,
        existingNotes: null,
      };
    }
    setDayEntries(entries);
  }, [daysToShow]);

  // Check for existing daily feedback entries
  useEffect(() => {
    if (!microcycleId || !weekNumber) return;
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from('athlete_feedback_entries')
        .select('id, day_of_week, notes, voice_transcript, questionnaire')
        .eq('microcycle_id', microcycleId)
        .eq('week_number', weekNumber)
        .eq('feedback_type', 'daily');

      if (cancelled || !data) return;

      setDayEntries((prev) => {
        const updated = { ...prev };
        for (const row of data) {
          const day = row.day_of_week as number;
          if (updated[day]) {
            updated[day] = {
              ...updated[day],
              isSubmitted: true,
              existingQuestionnaire: (row.questionnaire as QuestionnaireAnswers) || null,
              existingNotes: row.notes || row.voice_transcript || null,
            };
          }
        }
        return updated;
      });
    };

    check();
    return () => { cancelled = true; };
  }, [microcycleId, weekNumber]);

  const getDateForDay = useCallback((dayOfWeek: number): Date | null => {
    if (!microcycleStartDate) return null;
    const start = new Date(microcycleStartDate);
    const weekOffset = (weekNumber - 1) * 7;
    const dayOffset = dayOfWeek - 1;
    const date = new Date(start);
    date.setDate(start.getDate() + weekOffset + dayOffset);
    return date;
  }, [microcycleStartDate, weekNumber]);

  const isDayFuture = useCallback((dayOfWeek: number): boolean => {
    const date = getDateForDay(dayOfWeek);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }, [getDateForDay]);

  const handleAnswer = useCallback((day: number, key: QuestionKey, value: number) => {
    setDayEntries((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        questionnaire: { ...prev[day].questionnaire, [key]: value },
      },
    }));
  }, []);

  const handleSetNotes = useCallback((day: number, notes: string) => {
    setDayEntries((prev) => ({
      ...prev,
      [day]: { ...prev[day], notes },
    }));
  }, []);

  const handleSubmitDay = useCallback(async (day: number) => {
    const entry = dayEntries[day];
    if (!entry) return;

    const answered = QUESTIONS.filter((q) => entry.questionnaire[q.key] !== undefined).length;
    if (answered === 0) return;

    setSubmittingDay(day);
    try {
      const { error: insertError } = await supabase
        .from('athlete_feedback_entries')
        .insert({
          user_id: userId,
          athlete_id: athleteId,
          microcycle_id: microcycleId,
          feedback_type: 'daily',
          week_number: weekNumber,
          day_of_week: day,
          questionnaire: entry.questionnaire,
          notes: entry.notes.trim() || null,
        });

      if (insertError) throw insertError;

      setDayEntries((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          isSubmitted: true,
          existingQuestionnaire: entry.questionnaire,
          existingNotes: entry.notes.trim() || null,
        },
      }));
      setExpandedDay(null);
      onFeedbackSubmitted?.();
    } catch (err) {
      log.error('Failed to submit daily feedback:', err);
    } finally {
      setSubmittingDay(null);
    }
  }, [dayEntries, userId, athleteId, microcycleId, weekNumber, onFeedbackSubmitted]);

  // Count submitted days
  const submittedCount = Object.values(dayEntries).filter(e => e.isSubmitted).length;
  const totalDays = daysToShow.length;
  const singleDay = daysToShow.length === 1;

  // ─── Future week — locked ───
  if (isFutureWeek) {
    if (singleDay) return null;
    return (
      <div className="bg-ceramic-base rounded-2xl shadow-sm p-5 flex items-center gap-3 opacity-50">
        <Lock className="w-5 h-5 text-ceramic-text-secondary/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-secondary">
            Feedback Diário — Semana {weekNumber}
          </h3>
          <p className="text-xs text-ceramic-text-secondary/60 mt-0.5">
            Disponível quando a semana comecar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Section header — only when showing multiple days */}
      {!singleDay && (
        <div className="flex items-center justify-between px-1 mb-1">
          <h3 className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Feedback Diário — Semana {weekNumber}
          </h3>
          {submittedCount > 0 && (
            <span className="text-[10px] text-ceramic-text-secondary">
              {submittedCount}/{totalDays} dias
            </span>
          )}
        </div>
      )}

      {/* Day entries */}
      {daysToShow.map((day) => {
        const entry = dayEntries[day];
        if (!entry) return null;

        return (
          <DayFeedbackCard
            key={day}
            entry={entry}
            dayDate={getDateForDay(day)}
            isFuture={isDayFuture(day)}
            isExpanded={expandedDay === day}
            isSubmitting={submittingDay === day}
            onToggleExpand={() => setExpandedDay(expandedDay === day ? null : day)}
            onAnswer={(key, value) => handleAnswer(day, key, value)}
            onSetNotes={(notes) => handleSetNotes(day, notes)}
            onSubmit={() => handleSubmitDay(day)}
          />
        );
      })}
    </div>
  );
}
