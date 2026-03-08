/**
 * FeedbackEntryCard — displays a past feedback entry
 *
 * Ceramic neumorphic card showing date, type, overall RPE,
 * summary, and workout count. Exercises are grouped by day
 * to avoid duplicate day labels. Modality icon shown per exercise.
 */

import { motion } from 'framer-motion';
import { Calendar, Dumbbell, MessageSquare } from 'lucide-react';
import type { FeedbackEntry, FeedbackSlotSummary } from '../../hooks/useAthleteFeedback';
import { MODALITY_CONFIG } from '../../types';
import type { TrainingModality } from '../../types';

function getRpeTextColor(rpe: number): string {
  if (rpe <= 3) return 'text-green-600';
  if (rpe <= 6) return 'text-amber-600';
  if (rpe <= 8) return 'text-orange-600';
  return 'text-red-600';
}

function getRpeLabel(rpe: number): string {
  if (rpe <= 3) return 'Leve';
  if (rpe <= 6) return 'Moderado';
  if (rpe <= 8) return 'Intenso';
  return 'Maximo';
}

const DAY_NAMES_SHORT: Record<number, string> = {
  1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab', 7: 'Dom',
};

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

export interface FeedbackEntryCardProps {
  entry: FeedbackEntry;
  index?: number;
  modality?: TrainingModality;
}

export function FeedbackEntryCard({ entry, index = 0, modality }: FeedbackEntryCardProps) {
  const modalityIcon = modality ? MODALITY_CONFIG[modality]?.icon : undefined;
  const dateObj = entry.date ? new Date(entry.date) : null;
  const dateFormatted = dateObj
    ? `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm p-5 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {entry.overallRpe != null && (
            <div className="w-10 h-10 rounded-xl bg-ceramic-cool flex items-center justify-center">
              <span className={`text-sm font-black ${getRpeTextColor(entry.overallRpe)}`}>
                {entry.overallRpe}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ceramic-text-primary">
                Semana {entry.weekNumber}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-secondary">
                {entry.type === 'weekly' ? 'Semanal' : 'Diário'}
              </span>
            </div>
            {dateFormatted && (
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-ceramic-text-secondary" />
                <span className="text-xs text-ceramic-text-secondary">{dateFormatted}</span>
              </div>
            )}
          </div>
        </div>
        {entry.overallRpe != null && (
          <span className={`text-xs font-medium ${getRpeTextColor(entry.overallRpe)}`}>
            RPE {entry.overallRpe}/10 · {getRpeLabel(entry.overallRpe)}
          </span>
        )}
      </div>

      {/* Workout count bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          <span className="text-xs text-ceramic-text-secondary">
            {entry.completedCount}/{entry.slotsCount} treinos
          </span>
        </div>
        <div className="flex-1 h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all"
            style={{
              width: `${entry.slotsCount > 0 ? Math.round((entry.completedCount / entry.slotsCount) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Slot details — grouped by day */}
      <div className="space-y-2">
        {groupSlotsByDay(entry.slots).map((dayGroup) => (
          <div key={dayGroup.day}>
            {/* Day header */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black text-ceramic-text-secondary/60 uppercase tracking-wider">
                {DAY_NAMES_SHORT[dayGroup.day] || ''}
              </span>
              <div className="h-px flex-1 bg-ceramic-border/20" />
            </div>
            {/* Exercises for this day */}
            <div className="space-y-0.5 pl-1">
              {dayGroup.slots.map((slot) => (
                <div key={slot.slotId} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${slot.isCompleted ? 'bg-green-500' : 'bg-ceramic-border'}`} />
                  {modalityIcon && (
                    <span className="text-xs leading-none flex-shrink-0" aria-hidden="true">{modalityIcon}</span>
                  )}
                  <span className={`flex-1 truncate ${slot.isCompleted ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'}`}>
                    {slot.templateName}
                  </span>
                  {slot.rpe != null && (
                    <span className={`font-medium ${getRpeTextColor(slot.rpe)}`}>{slot.rpe}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes preview */}
      {entry.notes && (
        <div className="flex items-start gap-2 pt-2 border-t border-ceramic-border/30">
          <MessageSquare className="w-3.5 h-3.5 text-ceramic-text-secondary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-ceramic-text-secondary leading-relaxed line-clamp-2">{entry.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
