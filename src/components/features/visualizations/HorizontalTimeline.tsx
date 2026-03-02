/**
 * HorizontalTimeline — Production pipeline phase tracker
 *
 * Displays a horizontal sequence of phases with status indicators.
 * Phases can be completed, active, or pending. Includes connector lines
 * between phases to show progression.
 *
 * Designed to match the Ceramic Design System neumorphic style.
 *
 * Used by: Studio PodcastWorkspace (episode production pipeline)
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type TimelinePhaseStatus = 'completed' | 'active' | 'pending';

export interface TimelinePhase {
  /** Unique identifier for the phase */
  id: string;
  /** Display label shown below the phase node */
  label: string;
  /** Status of this phase */
  status: TimelinePhaseStatus;
  /** Emoji icon displayed inside the phase node */
  icon: string;
}

export interface HorizontalTimelineProps {
  phases: TimelinePhase[];
  /** Optional title displayed above the timeline */
  title?: string;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getNodeClasses(status: TimelinePhaseStatus): {
  outer: string;
  inner: string;
  label: string;
} {
  switch (status) {
    case 'completed':
      return {
        outer: 'bg-emerald-100 border-2 border-emerald-400',
        inner: 'text-emerald-700',
        label: 'text-emerald-700 font-semibold',
      };
    case 'active':
      return {
        outer: 'bg-orange-50 border-2 border-orange-400 shadow-md ring-2 ring-orange-300/50',
        inner: 'text-orange-600',
        label: 'text-orange-600 font-bold',
      };
    case 'pending':
    default:
      return {
        outer: 'bg-ceramic-cool border-2 border-ceramic-border',
        inner: 'text-ceramic-text-secondary opacity-60',
        label: 'text-ceramic-text-secondary',
      };
  }
}

function getConnectorClass(leftStatus: TimelinePhaseStatus): string {
  return leftStatus === 'completed'
    ? 'bg-emerald-300'
    : 'bg-ceramic-border';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HorizontalTimeline({
  phases,
  title,
  className = '',
}: HorizontalTimelineProps) {
  if (phases.length === 0) return null;

  return (
    <div className={`px-6 py-4 bg-white border-b border-ceramic-border ${className}`}>
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary mb-3">
          {title}
        </p>
      )}

      {/* Timeline row */}
      <div className="flex items-center">
        {phases.map((phase, idx) => {
          const { outer, inner, label } = getNodeClasses(phase.status);
          const isLast = idx === phases.length - 1;

          return (
            <React.Fragment key={phase.id}>
              {/* Phase node + label */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                {/* Circle node */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${outer}`}
                  role="listitem"
                  aria-label={`${phase.label}: ${phase.status === 'completed' ? 'concluído' : phase.status === 'active' ? 'em andamento' : 'pendente'}`}
                >
                  <span className={`text-lg leading-none select-none ${inner}`}>
                    {phase.icon}
                  </span>
                </div>

                {/* Label */}
                <span className={`text-[10px] whitespace-nowrap ${label}`}>
                  {phase.label}
                </span>
              </div>

              {/* Connector line between nodes */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${getConnectorClass(phase.status)}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default HorizontalTimeline;
