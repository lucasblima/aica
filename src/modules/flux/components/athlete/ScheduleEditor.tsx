/**
 * ScheduleEditor — Inline day + time picker for rescheduling workouts
 *
 * 7 circular day pills (Mon-Sun) + native time input.
 * Only calls onSave when the user confirms a change.
 */

import { useState, useEffect } from 'react';

export interface ScheduleEditorProps {
  currentDay: number; // 1-7 (Mon=1, Sun=7)
  currentTime: string | null;
  onSave: (newDay: number, newTime: string) => void;
  disabled?: boolean;
}

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function ScheduleEditor({
  currentDay,
  currentTime,
  onSave,
  disabled = false,
}: ScheduleEditorProps) {
  const [day, setDay] = useState(currentDay);
  const [time, setTime] = useState(currentTime || '');

  useEffect(() => {
    setDay(currentDay);
    setTime(currentTime || '');
  }, [currentDay, currentTime]);

  const hasChanges = day !== currentDay || time !== (currentTime || '');

  return (
    <div className="bg-ceramic-cool/50 rounded-xl p-3 space-y-3">
      {/* Day selector */}
      <div className="flex items-center justify-between gap-1 overflow-hidden max-w-full">
        {DAY_LABELS.map((label, idx) => {
          const dayValue = idx + 1; // 1=Mon ... 7=Sun
          const isSelected = day === dayValue;

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => setDay(dayValue)}
              className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-cool'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Time input + save */}
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={disabled}
          className="flex-1 ceramic-inset px-3 py-1.5 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50"
        />
        {hasChanges && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave(day, time)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Salvar
          </button>
        )}
      </div>
    </div>
  );
}
