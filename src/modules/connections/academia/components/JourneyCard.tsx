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
    planned: 'text-ceramic-text-tertiary bg-ceramic-cool',
    active: 'text-ceramic-success bg-ceramic-success/10',
    paused: 'text-ceramic-warning bg-ceramic-warning/10',
    completed: 'text-ceramic-success bg-ceramic-success/10',
    abandoned: 'text-ceramic-error bg-ceramic-error/10',
  };
  return colors[status] || 'text-ceramic-text-tertiary bg-ceramic-cool';
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
          className="text-ceramic-border"
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
          className="text-ceramic-success transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-light text-ceramic-text-primary">{progress}%</span>
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
        bg-ceramic-base border border-ceramic-border rounded-sm p-6
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl">{getJourneyTypeIcon(journey_type)}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-normal text-ceramic-text-primary mb-1 truncate">
              {title}
            </h3>
            {(provider || instructor) && (
              <p className="text-xs text-ceramic-text-secondary font-light tracking-wide">
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
            <span className="text-xs text-ceramic-text-secondary font-light tracking-wide">
              Modules
            </span>
            <span className="text-sm text-ceramic-text-primary font-light">
              {completed_modules} / {total_modules}
            </span>
          </div>
        )}

        {(logged_hours > 0 || estimated_hours) && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-ceramic-text-secondary font-light tracking-wide">
              Time
            </span>
            <span className="text-sm text-ceramic-text-primary font-light">
              {logged_hours}h
              {estimated_hours && ` / ${estimated_hours}h`}
            </span>
          </div>
        )}
      </div>

      {/* Footer - Next Milestone or Completion */}
      {status === 'completed' ? (
        <div className="pt-3 border-t border-ceramic-border">
          <div className="flex items-center gap-2 text-ceramic-success">
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
        <div className="pt-3 border-t border-ceramic-border">
          <span className="text-xs text-ceramic-text-secondary font-light tracking-wide">
            Next: Module {completed_modules + 1}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default JourneyCard;
