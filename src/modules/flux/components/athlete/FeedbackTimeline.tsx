/**
 * FeedbackTimeline — week-grouped timeline for the redesigned Feedback tab
 *
 * Shows weeks in reverse order (most recent first).
 * Each week displays: weekly feedback status + per-exercise feedback status.
 * Exercises on the same day are grouped under a single day header.
 * Tapping a pending item opens the relevant form.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { FeedbackStatusRow } from './FeedbackStatusRow';
import { ExerciseQuestionnaireSheet } from './ExerciseQuestionnaireSheet';
import { MODALITY_CONFIG } from '../../types';
import type { TrainingModality } from '../../types';
import type { WeekFeedbackSummary, SubmitExerciseFeedbackInput, FeedbackSlotSummary } from '../../hooks/useAthleteFeedback';

const DAY_NAMES: Record<number, string> = {
  1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab', 7: 'Dom',
};

/** Group an array of slots by day_of_week, preserving order */
function groupSlotsByDay(slots: FeedbackSlotSummary[]): { day: number; slots: FeedbackSlotSummary[] }[] {
  const map = new Map<number, FeedbackSlotSummary[]>();
  for (const slot of slots) {
    const existing = map.get(slot.dayOfWeek);
    if (existing) existing.push(slot);
    else map.set(slot.dayOfWeek, [slot]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, daySlots]) => ({ day, slots: daySlots }));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

/** Check if a slot's calendar day is still in the future */
function isSlotInFuture(
  weekNumber: number,
  currentWeek: number,
  dayOfWeek: number,
): boolean {
  // Future week — all slots locked
  if (weekNumber > currentWeek) return true;
  // Past week — all slots unlocked
  if (weekNumber < currentWeek) return false;
  // Current week — compare day of week with today
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun, 1=Mon
  const todayIso = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
  return dayOfWeek > todayIso;
}

export interface FeedbackTimelineProps {
  weekSummaries: WeekFeedbackSummary[];
  currentWeek: number;
  onSubmitExercise: (input: SubmitExerciseFeedbackInput) => Promise<void>;
  onOpenWeeklyFeedback?: (weekNumber: number) => void;
  isSubmitting: boolean;
  modality?: TrainingModality;
}

export function FeedbackTimeline({
  weekSummaries,
  currentWeek,
  onSubmitExercise,
  onOpenWeeklyFeedback,
  isSubmitting,
  modality,
}: FeedbackTimelineProps) {
  const modalityIcon = modality ? MODALITY_CONFIG[modality]?.icon : undefined;
  const [openQuestionnaire, setOpenQuestionnaire] = useState<{
    slotId: string;
    slotName: string;
    dayLabel: string;
  } | null>(null);

  const handleOpenExercise = useCallback((slotId: string, slotName: string, dayOfWeek: number) => {
    setOpenQuestionnaire({
      slotId,
      slotName,
      dayLabel: DAY_NAMES[dayOfWeek] || '',
    });
  }, []);

  const handleSubmitQuestionnaire = useCallback(
    async (data: { slotId: string; questionnaire: Record<string, number | undefined>; notes: string }) => {
      await onSubmitExercise({
        slotId: data.slotId,
        questionnaire: data.questionnaire,
        notes: data.notes,
      });
      setOpenQuestionnaire(null);
    },
    [onSubmitExercise]
  );

  if (weekSummaries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-ceramic-cool/50 rounded-2xl p-8 text-center space-y-3"
      >
        <MessageSquare className="w-8 h-8 text-ceramic-text-secondary/40 mx-auto" />
        <p className="text-sm font-medium text-ceramic-text-primary">
          Nenhum treino disponivel
        </p>
        <p className="text-xs text-ceramic-text-secondary leading-relaxed">
          Registre como foram seus treinos para ajudar seu coach a ajustar o plano.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {weekSummaries.map((ws, i) => {
          const isCurrent = ws.weekNumber === currentWeek;
          const weeklySubmitted = !!ws.weeklyFeedback;
          const weeklyDate = ws.weeklyFeedback?.created_at;
          const weeklyNotes = ws.weeklyFeedback?.notes || ws.weeklyFeedback?.voice_transcript;
          const weeklyPreview = weeklyNotes
            ? weeklyNotes.length > 50
              ? weeklyNotes.slice(0, 50) + '...'
              : weeklyNotes
            : undefined;

          const isFutureWeek = ws.weekNumber > currentWeek;

          return (
            <motion.div
              key={ws.weekNumber}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="space-y-2"
            >
              {/* Week header */}
              <div className="flex items-center gap-2 px-1">
                <div className={`h-px flex-1 ${isCurrent ? 'bg-amber-300' : 'bg-ceramic-border/50'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider px-2 ${isCurrent ? 'text-amber-600' : 'text-ceramic-text-secondary'}`}>
                  Semana {ws.weekNumber} {isCurrent ? '(atual)' : ''}
                </span>
                <div className={`h-px flex-1 ${isCurrent ? 'bg-amber-300' : 'bg-ceramic-border/50'}`} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Weekly feedback row */}
                <div className="px-2 pt-2">
                  <FeedbackStatusRow
                    type="weekly"
                    label="Feedback Semanal"
                    isSubmitted={weeklySubmitted}
                    locked={isFutureWeek}
                    summary={weeklyPreview}
                    dateLabel={weeklyDate ? formatDate(weeklyDate) : undefined}
                    onTap={
                      !weeklySubmitted && isCurrent && onOpenWeeklyFeedback
                        ? () => onOpenWeeklyFeedback(ws.weekNumber)
                        : weeklySubmitted
                          ? undefined
                          : undefined
                    }
                  />
                </div>

                {/* Exercise rows grouped by day */}
                <div className="px-2 pb-2">
                  {groupSlotsByDay(ws.slots).map((dayGroup) => (
                    <div key={dayGroup.day}>
                      {/* Day header — shown once per day */}
                      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                        <span className="text-[10px] font-black text-ceramic-text-secondary/70 uppercase tracking-wider w-7">
                          {DAY_NAMES[dayGroup.day] || ''}
                        </span>
                        <div className="h-px flex-1 bg-ceramic-border/30" />
                      </div>

                      {/* Exercises for this day */}
                      <div className="space-y-0.5">
                        {dayGroup.slots.map((slot) => {
                          const hasExerciseFeedback = !!slot.feedbackEntry;
                          const slotLocked = isSlotInFuture(ws.weekNumber, currentWeek, slot.dayOfWeek);
                          const answered = slot.questionnaireAnswered;
                          const rpe = slot.rpe;
                          const summary = hasExerciseFeedback
                            ? `${answered}/8 resp.${rpe != null ? ` RPE ${rpe}` : ''}`
                            : slot.isCompleted && rpe != null
                              ? `RPE ${rpe}`
                              : undefined;

                          return (
                            <FeedbackStatusRow
                              key={slot.slotId}
                              type="exercise"
                              label={slot.templateName}
                              isSubmitted={hasExerciseFeedback}
                              locked={slotLocked}
                              summary={summary}
                              modalityIcon={modalityIcon}
                              dateLabel={
                                slot.feedbackEntry?.created_at
                                  ? formatDate(slot.feedbackEntry.created_at)
                                  : undefined
                              }
                              onTap={
                                !slotLocked && !hasExerciseFeedback
                                  ? () => handleOpenExercise(slot.slotId, slot.templateName, slot.dayOfWeek)
                                  : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Exercise questionnaire sheet (bottom sheet) */}
      <AnimatePresence>
        {openQuestionnaire && (
          <ExerciseQuestionnaireSheet
            slotId={openQuestionnaire.slotId}
            slotName={openQuestionnaire.slotName}
            dayLabel={openQuestionnaire.dayLabel}
            onSubmit={handleSubmitQuestionnaire}
            onClose={() => setOpenQuestionnaire(null)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>
    </>
  );
}
