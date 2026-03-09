/**
 * MicrocycleProgressBar - Visual progress indicator for microcycle completion
 *
 * Features:
 * - Real-time updates via useWorkoutSlots subscription
 * - Per-week breakdown
 * - Color-coded by completion percentage
 * - Animated transitions
 */

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface MicrocycleProgressBarProps {
  completionPercentage: number;
  weekStats?: Array<{ week: number; total: number; completed: number }>;
  className?: string;
}

export function MicrocycleProgressBar({
  completionPercentage,
  weekStats = [],
  className = '',
}: MicrocycleProgressBarProps) {
  // Guard against NaN/Infinity: clamp to 0-100 range
  const safeClamp = (value: number): number => {
    if (!isFinite(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  };

  const safeCompletionPercentage = safeClamp(completionPercentage);

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-ceramic-success';
    if (percentage >= 50) return 'bg-ceramic-warning';
    return 'bg-ceramic-info';
  };

  const getWeekPercentage = (week: { total: number; completed: number }): number => {
    if (week.total === 0) return 0;
    return safeClamp((week.completed / week.total) * 100);
  };

  return (
    <div className={`ceramic-card p-4 ${className}`}>
      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`w-5 h-5 transition-colors ${
                safeCompletionPercentage === 100
                  ? 'text-ceramic-success'
                  : 'text-ceramic-text-secondary'
              }`}
            />
            <span className="text-sm font-bold text-ceramic-text-primary">
              Progresso Geral
            </span>
          </div>

          <span className="text-2xl font-black text-ceramic-text-primary tabular-nums">
            {safeCompletionPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-ceramic-cool/30 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${getProgressColor(
              safeCompletionPercentage
            )} transition-all duration-500 ease-out`}
            style={{ width: `${safeCompletionPercentage}%` }}
          />
        </div>
      </div>

      {/* Week Breakdown */}
      {weekStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {weekStats.map(({ week, total, completed }) => {
            const weekPercentage = getWeekPercentage({ total, completed });

            return (
              <div
                key={week}
                className="ceramic-inset p-3 rounded-lg transition-all hover:bg-white/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
                    Sem {week}
                  </span>
                  <span className="text-xs font-bold text-ceramic-text-primary tabular-nums">
                    {completed}/{total}
                  </span>
                </div>

                <div className="relative h-2 bg-ceramic-cool/20 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${getProgressColor(
                      weekPercentage
                    )} transition-all duration-300`}
                    style={{ width: `${weekPercentage}%` }}
                  />
                </div>

                {/* Week Status Icons */}
                <div className="flex items-center gap-0.5 mt-2">
                  {Array.from({ length: total }).map((_, idx) => (
                    <div key={idx} className="flex-1 flex items-center justify-center">
                      {idx < completed ? (
                        <Circle className="w-2 h-2 fill-ceramic-success text-ceramic-success" />
                      ) : (
                        <Circle className="w-2 h-2 text-ceramic-text-secondary/30" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Message */}
      {safeCompletionPercentage === 100 && (
        <div className="mt-4 p-3 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg">
          <p className="text-sm text-ceramic-success font-medium text-center">
            🎉 Microciclo completo! Excelente trabalho!
          </p>
        </div>
      )}
    </div>
  );
}
