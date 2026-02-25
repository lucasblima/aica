/**
 * ProgressTimeline — 4-week horizontal microcycle overview
 *
 * Shows week pills with completion progress, date ranges, and focus labels.
 * Current week gets amber accent, completed weeks get a green check.
 */

import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';

export interface ProgressTimelineProps {
  weeks: Array<{
    weekNumber: number;
    focus: string;
    totalSlots: number;
    completedSlots: number;
    dateRange?: string;
  }>;
  currentWeek: number;
  microcycleName: string;
  status: string;
  selectedWeek?: number;
  onWeekSelect?: (week: number) => void;
}

const FOCUS_COLORS: Record<string, string> = {
  volume: 'text-blue-500',
  intensidade: 'text-amber-500',
  intensity: 'text-amber-500',
  recuperação: 'text-green-500',
  recuperacao: 'text-green-500',
  recovery: 'text-green-500',
  teste: 'text-purple-500',
  test: 'text-purple-500',
};

const FOCUS_BG: Record<string, string> = {
  volume: 'bg-blue-500',
  intensidade: 'bg-amber-500',
  intensity: 'bg-amber-500',
  recuperação: 'bg-green-500',
  recuperacao: 'bg-green-500',
  recovery: 'bg-green-500',
  teste: 'bg-purple-500',
  test: 'bg-purple-500',
};

function getFocusColor(focus: string): string {
  const key = focus.toLowerCase().trim();
  return FOCUS_COLORS[key] || 'text-ceramic-text-secondary';
}

function getFocusBg(focus: string): string {
  const key = focus.toLowerCase().trim();
  return FOCUS_BG[key] || 'bg-ceramic-text-secondary';
}

export function ProgressTimeline({
  weeks,
  currentWeek,
  microcycleName,
  status,
  selectedWeek,
  onWeekSelect,
}: ProgressTimelineProps) {
  const activeSelected = selectedWeek ?? currentWeek;
  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
          {microcycleName.replace(/^Microciclo\s*/i, 'Ciclo ')}
        </h3>
        {status === 'draft' && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        )}
      </div>

      {/* Section label */}
      <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
        Treinos Cumpridos
      </p>

      {/* Week pills */}
      <div className="flex gap-2">
        {weeks.map((week, i) => {
          const isCurrent = week.weekNumber === currentWeek;
          const isSelected = week.weekNumber === activeSelected;
          const isComplete =
            week.totalSlots > 0 && week.completedSlots >= week.totalSlots;
          const pct =
            week.totalSlots > 0
              ? Math.round((week.completedSlots / week.totalSlots) * 100)
              : 0;
          const clickable = !!onWeekSelect;

          let pillStyle = 'bg-white shadow-sm';
          if (isCurrent && isSelected) {
            pillStyle = 'bg-white ring-2 ring-amber-400 shadow-md';
          } else if (isSelected) {
            pillStyle = 'bg-white ring-2 ring-sky-400 shadow-md';
          } else if (isCurrent) {
            pillStyle = 'bg-white ring-2 ring-amber-400/50 shadow-sm';
          }

          return (
            <motion.div
              key={week.weekNumber}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              onClick={clickable ? () => onWeekSelect(week.weekNumber) : undefined}
              className={`flex-1 rounded-2xl p-3 relative overflow-hidden transition-all duration-200 ${pillStyle} ${
                clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''
              }`}
            >
              {/* Completed overlay */}
              {isComplete && !isCurrent && (
                <div className="absolute top-2 right-2">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
              )}

              {/* Week date range or number */}
              <p
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isCurrent && isSelected
                    ? 'text-amber-600'
                    : isSelected
                      ? 'text-sky-600'
                      : isCurrent
                        ? 'text-amber-500'
                        : 'text-ceramic-text-secondary'
                }`}
              >
                {week.dateRange || `Sem ${week.weekNumber}`}
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden mb-1.5">
                <motion.div
                  className={`h-full rounded-full ${
                    isComplete ? 'bg-green-500' : 'bg-amber-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                />
              </div>

              {/* Fraction */}
              <p className="text-[10px] text-ceramic-text-secondary">
                {week.totalSlots > 0
                  ? `${week.completedSlots}/${week.totalSlots} treinos`
                  : 'Sem treinos'}
              </p>

              {/* Focus label */}
              {week.focus && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getFocusBg(week.focus)}`}
                  />
                  <span
                    className={`text-[10px] font-medium capitalize ${getFocusColor(week.focus)}`}
                  >
                    {week.focus}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
