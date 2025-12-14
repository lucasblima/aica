/**
 * JourneyCard Component
 *
 * Displays a learning journey with progress visualization.
 * Design: Paper-like card with progress ring and elegant typography.
 */

import React from 'react';
import { AcademiaJourney } from '../types';

interface JourneyCardProps {
  journey: AcademiaJourney;
  onClick?: () => void;
}

/**
 * Get journey type emoji
 */
const getJourneyTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    course: '📚',
    book: '📖',
    certification: '🎓',
    mentorship: '🤝',
    workshop: '🔧',
  };
  return icons[type] || '📝';
};

/**
 * Get status color classes
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    planned: 'text-stone-400 bg-stone-50',
    active: 'text-emerald-700 bg-emerald-50',
    paused: 'text-amber-700 bg-amber-50',
    completed: 'text-green-700 bg-green-50',
    abandoned: 'text-rose-700 bg-rose-50',
  };
  return colors[status] || 'text-stone-400 bg-stone-50';
};

/**
 * Progress Ring Component
 */
const ProgressRing: React.FC<{ progress: number; size?: number }> = ({
  progress,
  size = 80,
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-stone-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-emerald-600 transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-light text-stone-900">{progress}%</span>
      </div>
    </div>
  );
};

export const JourneyCard: React.FC<JourneyCardProps> = ({ journey, onClick }) => {
  const {
    title,
    journey_type,
    provider,
    instructor,
    progress_pct,
    total_modules,
    completed_modules,
    status,
    logged_hours,
    estimated_hours,
  } = journey;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-stone-200 rounded-sm p-6
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl">{getJourneyTypeIcon(journey_type)}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-normal text-stone-900 mb-1 truncate">
              {title}
            </h3>
            {(provider || instructor) && (
              <p className="text-xs text-stone-500 font-light tracking-wide">
                {provider && instructor
                  ? `${provider} • ${instructor}`
                  : provider || instructor}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`
            text-xs font-light tracking-wider uppercase px-2 py-1 rounded-sm
            ${getStatusColor(status)}
          `}
        >
          {status}
        </span>
      </div>

      {/* Progress Ring */}
      <div className="flex items-center justify-center my-6">
        <ProgressRing progress={progress_pct} />
      </div>

      {/* Progress Details */}
      <div className="space-y-2 mb-4">
        {total_modules && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-stone-500 font-light tracking-wide">
              Modules
            </span>
            <span className="text-sm text-stone-700 font-light">
              {completed_modules} / {total_modules}
            </span>
          </div>
        )}

        {(logged_hours > 0 || estimated_hours) && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-stone-500 font-light tracking-wide">
              Time
            </span>
            <span className="text-sm text-stone-700 font-light">
              {logged_hours}h
              {estimated_hours && ` / ${estimated_hours}h`}
            </span>
          </div>
        )}
      </div>

      {/* Footer - Next Milestone or Completion */}
      {status === 'completed' ? (
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2 text-green-700">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-xs font-light tracking-wide">Completed</span>
          </div>
        </div>
      ) : status === 'active' && total_modules ? (
        <div className="pt-3 border-t border-stone-100">
          <span className="text-xs text-stone-500 font-light tracking-wide">
            Next: Module {completed_modules + 1}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default JourneyCard;
