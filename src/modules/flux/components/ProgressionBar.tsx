/**
 * ProgressionBar - 12-week cycle progression indicator
 *
 * Visual progress bar showing current week in 12-week training cycle.
 * Includes consistency rate and workout completion metrics.
 */

import React from 'react';
import type { ProgressionBarProps } from '../types';
import { Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

export function ProgressionBar({
  currentWeek,
  totalWeeks = 12,
  adherenceRate,
  completedWorkouts,
  totalWorkouts,
}: ProgressionBarProps) {
  // TODO: Backend calculation for progress line is incorrect — see issue #605
  const progressPercentage = (currentWeek / totalWeeks) * 100;

  // Consistência color logic
  const getConsistênciaColor = (rate: number): string => {
    if (rate >= 80) return 'text-ceramic-success';
    if (rate >= 60) return 'text-ceramic-warning';
    return 'text-ceramic-error';
  };

  const consistencyColorClass = getConsistênciaColor(adherenceRate);

  return (
    <div className="ceramic-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="ceramic-inset p-2">
            <Calendar className="w-5 h-5 text-ceramic-text-secondary" />
          </div>
          <div>
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Progresso do Ciclo
            </p>
            <p className="text-lg font-bold text-ceramic-text-primary">
              Semana {currentWeek} de {totalWeeks}
            </p>
          </div>
        </div>

        {/* Consistência Rate */}
        <div className="text-right">
          <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
            Adesão
          </p>
          <p className={`text-2xl font-bold ${consistencyColorClass}`}>
            {adherenceRate}%
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative h-3 bg-ceramic-text-secondary/10 rounded-full overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-ceramic-info to-ceramic-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Week markers */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {Array.from({ length: totalWeeks - 1 }, (_, i) => (
              <div
                key={i}
                className="w-px h-2 bg-white/30"
                style={{ marginLeft: i === 0 ? '0' : 'auto' }}
              />
            ))}
          </div>
        </div>

        {/* Week numbers */}
        <div className="flex justify-between text-[10px] text-ceramic-text-secondary font-medium">
          <span>1</span>
          <span>4</span>
          <span>8</span>
          <span>{totalWeeks}</span>
        </div>
      </div>

      {/* Workout Completion (if provided) */}
      {completedWorkouts !== undefined && totalWorkouts !== undefined && (
        <div className="flex items-center gap-3 pt-3 border-t border-ceramic-text-secondary/10">
          <div className="ceramic-inset p-2 bg-ceramic-success/10">
            <CheckCircle2 className="w-5 h-5 text-ceramic-success" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Treinos Completos
            </p>
            <p className="text-sm font-bold text-ceramic-text-primary">
              {completedWorkouts} de {totalWorkouts}
            </p>
          </div>

          {/* Completion Rate */}
          <div className="text-right">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              <span className="text-sm font-bold text-ceramic-text-primary">
                {Math.round((completedWorkouts / totalWorkouts) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
