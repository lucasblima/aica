/**
 * CourseModuleCard Component
 *
 * Displays a course module with completion status.
 * Design: Paper-like card with elegant typography.
 *
 * @stub - To be implemented
 */

import React from 'react';

interface CourseModuleCardProps {
  moduleTitle: string;
  moduleNumber?: number;
  completed?: boolean;
  duration?: string;
  onClick?: () => void;
}

export const CourseModuleCard: React.FC<CourseModuleCardProps> = ({
  moduleTitle,
  moduleNumber,
  completed = false,
  duration,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card p-4 border border-ceramic-border rounded-sm
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${completed ? 'bg-ceramic-success/10' : 'bg-ceramic-base'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {moduleNumber && (
            <span className="text-xs text-ceramic-text-secondary font-light tracking-wide">
              Module {moduleNumber}
            </span>
          )}
          <h4 className="text-base font-normal text-ceramic-text-primary mt-1">
            {moduleTitle}
          </h4>
          {duration && (
            <span className="text-xs text-ceramic-text-tertiary font-light mt-2 block">
              {duration}
            </span>
          )}
        </div>
        {completed && (
          <svg
            className="w-5 h-5 text-ceramic-success"
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
        )}
      </div>
    </div>
  );
};

export default CourseModuleCard;
