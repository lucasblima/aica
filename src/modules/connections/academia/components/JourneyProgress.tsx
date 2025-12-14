/**
 * JourneyProgress Component
 *
 * Detailed progress tracking with module checklist, time tracking, and estimates.
 * Design: Clean checklist interface with elegant typography.
 */

import React, { useState } from 'react';
import { AcademiaJourney, UpdateJourneyPayload } from '../types';

interface JourneyProgressProps {
  journey: AcademiaJourney;
  onUpdateProgress?: (completed: number) => Promise<void>;
  onLogTime?: (hours: number) => Promise<void>;
  onUpdate?: (payload: UpdateJourneyPayload) => Promise<void>;
}

export const JourneyProgress: React.FC<JourneyProgressProps> = ({
  journey,
  onUpdateProgress,
  onLogTime,
  onUpdate,
}) => {
  const [timeToLog, setTimeToLog] = useState<string>('');
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  const handleLogTime = async () => {
    const hours = parseFloat(timeToLog);
    if (!hours || hours <= 0 || !onLogTime) return;

    try {
      setIsLoggingTime(true);
      await onLogTime(hours);
      setTimeToLog('');
    } catch (error) {
      console.error('Error logging time:', error);
    } finally {
      setIsLoggingTime(false);
    }
  };

  const handleModuleToggle = async (moduleNumber: number) => {
    if (!onUpdateProgress) return;

    const newCompleted =
      journey.completed_modules === moduleNumber
        ? moduleNumber - 1
        : moduleNumber;

    try {
      await onUpdateProgress(newCompleted);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Calculate estimated completion
  const getEstimatedCompletion = (): string | null => {
    if (
      !journey.estimated_hours ||
      !journey.logged_hours ||
      journey.logged_hours === 0
    ) {
      return null;
    }

    const remainingHours = journey.estimated_hours - journey.logged_hours;
    if (remainingHours <= 0) return 'Complete!';

    const avgHoursPerWeek = 5; // Assume 5 hours per week
    const weeksRemaining = Math.ceil(remainingHours / avgHoursPerWeek);

    if (weeksRemaining === 1) return '1 week';
    if (weeksRemaining < 4) return `${weeksRemaining} weeks`;
    if (weeksRemaining < 8) return '1 month';
    return `${Math.ceil(weeksRemaining / 4)} months`;
  };

  const estimatedCompletion = getEstimatedCompletion();

  return (
    <div className="space-y-8">
      {/* Overall Progress */}
      <div className="bg-white border border-stone-200 rounded-sm p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-normal text-stone-900">Overall Progress</h3>
          <span className="text-2xl font-light text-stone-900">
            {journey.progress_pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-600 transition-all duration-500"
            style={{ width: `${journey.progress_pct}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-light text-stone-900">
              {journey.completed_modules}
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Completed
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-light text-stone-900">
              {journey.total_modules
                ? journey.total_modules - journey.completed_modules
                : '-'}
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Remaining
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-light text-stone-900">
              {journey.logged_hours}h
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Time Logged
            </div>
          </div>
        </div>

        {estimatedCompletion && (
          <div className="mt-4 pt-4 border-t border-stone-100 text-center">
            <span className="text-xs text-stone-500 font-light tracking-wide">
              Estimated completion:{' '}
              <span className="text-stone-700">{estimatedCompletion}</span>
            </span>
          </div>
        )}
      </div>

      {/* Module Checklist */}
      {journey.total_modules && (
        <div className="bg-white border border-stone-200 rounded-sm p-6">
          <h3 className="text-lg font-normal text-stone-900 mb-4">Modules</h3>

          <div className="space-y-2">
            {Array.from({ length: journey.total_modules }, (_, i) => i + 1).map(
              (moduleNum) => {
                const isCompleted = moduleNum <= journey.completed_modules;

                return (
                  <button
                    key={moduleNum}
                    onClick={() => handleModuleToggle(moduleNum)}
                    disabled={!onUpdateProgress}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-sm
                      transition-all duration-200
                      ${
                        isCompleted
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-stone-50 border border-stone-200 hover:bg-stone-100'
                      }
                      ${onUpdateProgress ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    {/* Checkbox */}
                    <div
                      className={`
                        w-5 h-5 rounded-sm border-2 flex items-center justify-center
                        transition-colors duration-200
                        ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-stone-300'
                        }
                      `}
                    >
                      {isCompleted && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Module label */}
                    <span
                      className={`
                        flex-1 text-left text-sm font-light tracking-wide
                        ${isCompleted ? 'text-emerald-900' : 'text-stone-700'}
                      `}
                    >
                      Module {moduleNum}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Time Tracking */}
      {onLogTime && (
        <div className="bg-white border border-stone-200 rounded-sm p-6">
          <h3 className="text-lg font-normal text-stone-900 mb-4">
            Time Tracking
          </h3>

          <div className="flex gap-3">
            <input
              type="number"
              value={timeToLog}
              onChange={(e) => setTimeToLog(e.target.value)}
              placeholder="Hours"
              step="0.5"
              min="0"
              className="flex-1 px-4 py-2 border border-stone-200 rounded-sm text-sm font-light focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={handleLogTime}
              disabled={!timeToLog || isLoggingTime}
              className="px-6 py-2 bg-emerald-600 text-white text-sm font-light tracking-wide rounded-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoggingTime ? 'Logging...' : 'Log Time'}
            </button>
          </div>

          {/* Time breakdown */}
          {journey.estimated_hours && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-stone-500 font-light tracking-wide">
                  Progress
                </span>
                <span className="text-sm text-stone-700 font-light">
                  {journey.logged_hours}h / {journey.estimated_hours}h
                </span>
              </div>
              <div className="relative h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (journey.logged_hours / journey.estimated_hours) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JourneyProgress;
