/**
 * ReadingProgressBar Component
 *
 * Shows reading progress with visual indicator.
 * Design: Minimalist progress bar with elegant typography.
 *
 * @stub - To be implemented
 */

import React from 'react';

interface ReadingProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  compact?: boolean;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  compact = false,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
      {/* Label and Stats */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span
              className={`
              text-stone-600 font-light
              ${compact ? 'text-xs' : 'text-sm'}
            `}
            >
              {label}
            </span>
          )}
          {showPercentage && (
            <span
              className={`
              text-stone-500 font-light
              ${compact ? 'text-xs' : 'text-sm'}
            `}
            >
              {current} / {total} ({percentage}%)
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="relative w-full bg-stone-100 rounded-full overflow-hidden h-2">
        <div
          className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Milestone Markers (optional enhancement) */}
      {!compact && total >= 10 && (
        <div className="flex justify-between text-xs text-stone-400 font-light">
          <span>Start</span>
          <span>Complete</span>
        </div>
      )}
    </div>
  );
};

export default ReadingProgressBar;
