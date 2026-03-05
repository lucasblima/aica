/**
 * CurrentWeekList — Vertical 7-day list for the current training week
 *
 * Shows all 7 days of the week as a list. Days with workouts are clickable
 * and expand to show exercises in an accordion. Rest days are shown but
 * not expandable.
 *
 * Used by: AthleteDetailView ("Semana Atual" section)
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Dumbbell, Coffee } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface CurrentWeekExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface CurrentWeekDay {
  /** Day of week number (1=Monday, 7=Sunday) */
  dayOfWeek: number;
  /** Short day abbreviation: 'seg', 'ter', etc. */
  dayShort: string;
  /** Full day name: 'Segunda-feira', 'Terca-feira', etc. */
  dayFull: string;
  /** Workout modality label (null if rest day) */
  modality: string | null;
  /** Hex color for the modality */
  color: string;
  /** Workout name */
  workoutName?: string;
  /** Exercises list */
  exercises: CurrentWeekExercise[];
}

export interface CurrentWeekListProps {
  days: CurrentWeekDay[];
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_DAYS: { dayOfWeek: number; dayShort: string; dayFull: string }[] = [
  { dayOfWeek: 1, dayShort: 'seg', dayFull: 'Segunda-feira' },
  { dayOfWeek: 2, dayShort: 'ter', dayFull: 'Terca-feira' },
  { dayOfWeek: 3, dayShort: 'qua', dayFull: 'Quarta-feira' },
  { dayOfWeek: 4, dayShort: 'qui', dayFull: 'Quinta-feira' },
  { dayOfWeek: 5, dayShort: 'sex', dayFull: 'Sexta-feira' },
  { dayOfWeek: 6, dayShort: 'sab', dayFull: 'Sabado' },
  { dayOfWeek: 7, dayShort: 'dom', dayFull: 'Domingo' },
];

const NEUTRAL_COLOR = {
  bg: 'bg-ceramic-cool',
  text: 'text-ceramic-text-primary',
  border: 'border-ceramic-border',
};

const DEFAULT_COLOR = {
  bg: 'bg-ceramic-cool/50',
  text: 'text-ceramic-text-secondary',
  border: 'border-ceramic-border/30',
};

function getColors(_hex: string) {
  return NEUTRAL_COLOR;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CurrentWeekList({ days, className = '' }: CurrentWeekListProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Build a map of dayOfWeek -> workout data
  const dayMap = new Map<number, CurrentWeekDay>();
  for (const d of days) {
    dayMap.set(d.dayOfWeek, d);
  }

  // Determine today's day of week (1=Mon..7=Sun)
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const todayDow = jsDay === 0 ? 7 : jsDay;

  const toggleDay = (dow: number) => {
    setExpandedDay((prev) => (prev === dow ? null : dow));
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {ALL_DAYS.map(({ dayOfWeek, dayShort, dayFull }) => {
        const workout = dayMap.get(dayOfWeek);
        const hasWorkout = !!workout && !!workout.modality;
        const isToday = dayOfWeek === todayDow;
        const isExpanded = expandedDay === dayOfWeek;
        const colors = hasWorkout ? getColors(workout.color) : DEFAULT_COLOR;

        return (
          <div key={dayOfWeek}>
            {/* Day row */}
            <button
              type="button"
              onClick={() => hasWorkout && toggleDay(dayOfWeek)}
              disabled={!hasWorkout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                hasWorkout
                  ? `${colors.bg} hover:brightness-95 cursor-pointer`
                  : 'bg-ceramic-cool/50 cursor-default'
              } ${isToday ? 'ring-2 ring-ceramic-accent/40' : ''}`}
            >
              {/* Day label */}
              <div className="w-10 flex-shrink-0">
                <p className={`text-xs font-bold uppercase ${
                  isToday ? 'text-ceramic-accent' : hasWorkout ? colors.text : 'text-ceramic-text-secondary/60'
                }`}>
                  {dayShort}
                </p>
              </div>

              {/* Workout info or rest */}
              <div className="flex-1 min-w-0">
                {hasWorkout ? (
                  <div className="flex items-center gap-2">
                    <Dumbbell className={`w-3.5 h-3.5 flex-shrink-0 ${colors.text}`} />
                    <span className={`text-sm font-medium truncate ${colors.text}`}>
                      {workout.modality}
                    </span>
                    {workout.exercises.length > 0 && (
                      <span className={`text-[10px] ${colors.text} opacity-60`}>
                        ({workout.exercises.length} ex.)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Coffee className="w-3.5 h-3.5 flex-shrink-0 text-ceramic-text-secondary/40" />
                    <span className="text-sm text-ceramic-text-secondary/50">Descanso</span>
                  </div>
                )}
              </div>

              {/* Today badge */}
              {isToday && (
                <span className="text-[10px] font-bold text-ceramic-accent bg-ceramic-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">
                  HOJE
                </span>
              )}

              {/* Expand chevron */}
              {hasWorkout && (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                  )}
                </div>
              )}
            </button>

            {/* Expanded exercises accordion */}
            {isExpanded && hasWorkout && workout.exercises.length > 0 && (
              <div className={`ml-13 mt-1 mb-1 rounded-lg border ${colors.border} overflow-hidden`}>
                <div className="divide-y divide-ceramic-text-secondary/5">
                  {workout.exercises.map((ex, idx) => (
                    <div
                      key={`${ex.name}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 text-xs bg-white/60"
                    >
                      <span className="text-ceramic-text-primary truncate min-w-0">{ex.name}</span>
                      {(ex.sets > 0 || ex.reps) && (
                        <span className="text-ceramic-text-secondary shrink-0 ml-2 font-medium">
                          {ex.sets > 0 && ex.reps ? `${ex.sets}x${ex.reps}` : ex.reps || `${ex.sets}x`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && hasWorkout && workout.exercises.length === 0 && (
              <div className="ml-13 mt-1 mb-1 px-3 py-2 text-xs text-ceramic-text-secondary/60 italic">
                Sem exercicios detalhados
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CurrentWeekList;
