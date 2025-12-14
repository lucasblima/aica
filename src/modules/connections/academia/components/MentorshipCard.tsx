/**
 * MentorshipCard Component
 *
 * Displays mentorship relationship with session information.
 * Design: Clean card showing relationship type, focus areas, and next session.
 */

import React from 'react';
import { AcademiaMentorship } from '../types';

interface MentorshipCardProps {
  mentorship: AcademiaMentorship;
  onClick?: () => void;
}

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format time
 */
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get relationship type styling
 */
const getRelationshipStyle = (type: string) => {
  if (type === 'giving') {
    return {
      icon: '🌟',
      label: 'Mentoring',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
  return {
    icon: '🌱',
    label: 'Learning from',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
};

export const MentorshipCard: React.FC<MentorshipCardProps> = ({
  mentorship,
  onClick,
}) => {
  const {
    relationship_type,
    focus_areas,
    next_session_at,
    duration_minutes,
    frequency,
    status,
  } = mentorship;

  const relationshipStyle = getRelationshipStyle(relationship_type);

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
        <div className="flex items-center gap-2">
          <span className="text-2xl">{relationshipStyle.icon}</span>
          <span
            className={`
              px-2 py-1 text-xs font-light tracking-wider uppercase rounded-sm border
              ${relationshipStyle.color}
            `}
          >
            {relationshipStyle.label}
          </span>
        </div>

        {/* Status */}
        {status !== 'active' && (
          <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
            {status}
          </span>
        )}
      </div>

      {/* Focus Areas */}
      {focus_areas && focus_areas.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-stone-500 font-light tracking-wide mb-2">
            Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {focus_areas.map((area, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-stone-50 border border-stone-200 text-xs font-light text-stone-700 rounded-sm"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next Session */}
      {next_session_at && status === 'active' && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-xs text-stone-500 font-light tracking-wide mb-1">
                Next Session
              </h4>
              <div className="text-sm font-normal text-stone-900">
                {formatDate(next_session_at)}
              </div>
              <div className="text-xs text-stone-600 font-light mt-1">
                {formatTime(next_session_at)}
                {duration_minutes && ` • ${duration_minutes} min`}
              </div>
            </div>

            {/* Calendar icon */}
            <div className="text-stone-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Frequency */}
      {frequency && !next_session_at && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <span className="text-xs text-stone-500 font-light tracking-wide">
            Meeting {frequency}
          </span>
        </div>
      )}
    </div>
  );
};

export default MentorshipCard;
