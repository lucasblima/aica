/**
 * FeedbackTimeline -- week-grouped timeline for the redesigned Feedback tab
 *
 * Shows weeks in reverse order (most recent first).
 * Each week displays:
 *   - Weekly feedback status + radar chart (if submitted)
 *   - Daily feedback rows grouped by day of week
 *
 * Per-exercise questionnaire was removed (#431).
 * Radar chart added at top of each feedback entry (#432).
 */

import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { FeedbackStatusRow } from './FeedbackStatusRow';
import { FeedbackRadarChart } from './FeedbackRadarChart';
import { StressFatigueGauges } from './StressFatigueGauges';
import { MODALITY_CONFIG } from '../../types';
import type { TrainingModality } from '../../types';
import type { WeekFeedbackSummary, FeedbackSlotSummary } from '../../hooks/useAthleteFeedback';

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
  // Future week -- all slots locked
  if (weekNumber > currentWeek) return true;
  // Past week -- all slots unlocked
  if (weekNumber < currentWeek) return false;
  // Current week -- compare day of week with today
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun, 1=Mon
  const todayIso = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
  return dayOfWeek > todayIso;
}

export interface FeedbackTimelineProps {
  weekSummaries: WeekFeedbackSummary[];
  currentWeek: number;
  onOpenWeeklyFeedback?: (weekNumber: number) => void;
  isSubmitting: boolean;
  modality?: TrainingModality;
}

export function FeedbackTimeline({
  weekSummaries,
  currentWeek,
  onOpenWeeklyFeedback,
  isSubmitting: _isSubmitting,
  modality,
}: FeedbackTimelineProps) {
  const modalityIcon = modality ? MODALITY_CONFIG[modality]?.icon : undefined;

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

        // Weekly feedback questionnaire data for radar chart
        const weeklyQuestionnaire = ws.weeklyFeedback?.questionnaire;

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
                      : undefined
                  }
                />
              </div>

              {/* Weekly radar chart + stress/fatigue gauges (shown if weekly feedback has questionnaire data) */}
              {weeklyQuestionnaire && (
                <div className="px-4 py-3 space-y-3">
                  <FeedbackRadarChart questionnaire={weeklyQuestionnaire} />
                  <StressFatigueGauges
                    stress={weeklyQuestionnaire.stress}
                    fatigue={weeklyQuestionnaire.fatigue}
                  />
                </div>
              )}

              {/* Daily feedback rows grouped by day */}
              <div className="px-2 pb-2">
                {groupSlotsByDay(ws.slots).map((dayGroup) => {
                  return (
                    <div key={dayGroup.day}>
                      {/* Day header */}
                      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                        <span className="text-[10px] font-black text-ceramic-text-secondary/70 uppercase tracking-wider w-7">
                          {DAY_NAMES[dayGroup.day] || ''}
                        </span>
                        <div className="h-px flex-1 bg-ceramic-border/30" />
                      </div>

                      {/* Slot rows for this day (daily feedback indicators) */}
                      <div className="space-y-0.5">
                        {dayGroup.slots.map((slot) => {
                          const slotLocked = isSlotInFuture(ws.weekNumber, currentWeek, slot.dayOfWeek);
                          const isCompleted = slot.isCompleted;
                          const rpe = slot.rpe;
                          const summary = isCompleted && rpe != null
                            ? `RPE ${rpe}`
                            : isCompleted
                              ? 'Concluido'
                              : undefined;

                          // Daily feedback radar: show if this slot has a feedback entry with questionnaire
                          const slotQuestionnaire = slot.feedbackEntry?.questionnaire;

                          return (
                            <div key={slot.slotId}>
                              <FeedbackStatusRow
                                type="exercise"
                                label={slot.templateName}
                                isSubmitted={isCompleted}
                                locked={slotLocked}
                                summary={summary}
                                modalityIcon={modalityIcon}
                                dateLabel={
                                  slot.completedAt
                                    ? formatDate(slot.completedAt)
                                    : undefined
                                }
                              />
                              {/* Radar chart + gauges for daily feedback entry */}
                              {slotQuestionnaire && (
                                <div className="px-4 py-2 space-y-2">
                                  <FeedbackRadarChart
                                    questionnaire={slotQuestionnaire}
                                    size={180}
                                  />
                                  <StressFatigueGauges
                                    stress={slotQuestionnaire.stress}
                                    fatigue={slotQuestionnaire.fatigue}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
