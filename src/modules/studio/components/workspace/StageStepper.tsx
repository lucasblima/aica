/**
 * StageStepper - Horizontal stage navigation with completion indicators
 *
 * Allows users to navigate between podcast workspace stages with visual feedback
 * on completion status. Shows active stage, completed stages, and partial completion.
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/components/workspace/StageStepper.tsx
 * Wave 6: Integration - Workspace Layout Components
 *
 * Changes:
 * - Updated type imports to @/modules/studio/types
 * - Applied Ceramic Design System classes
 * - Enhanced accessibility with aria-labels and roles
 * - Improved hover states and transitions
 * - Maintained completion badge logic
 *
 * Accessibility Features:
 * - navigation role for semantic structure
 * - aria-label on navigation container
 * - aria-current on active stage button
 * - Button labels describe stage and status
 * - Keyboard navigation support
 *
 * Design System: Ceramic Design System
 * - Surface: bg-white
 * - Text: text-ceramic-primary, text-ceramic-secondary
 * - Borders: border-ceramic-border
 * - Active: bg-orange-50, text-orange-600
 * - Interactive: hover:bg-ceramic-base
 *
 * @see PodcastWorkspace for parent component
 * @see StageCompletionMap for completion status types
 */

import React from 'react';
import { User, Sparkles, FileText, Mic, Check } from 'lucide-react';
import type { PodcastStageId, StageCompletionMap, StageCompletionStatus } from '@/modules/studio/types';
import { PODCAST_STAGES } from '@/modules/studio/types';

interface StageStepperProps {
  currentStage: PodcastStageId;
  completions: StageCompletionMap;
  onStageChange: (stageId: PodcastStageId) => void;
}

const STAGE_ICONS: Record<PodcastStageId, React.ComponentType<{ className?: string }>> = {
  setup: User,
  research: Sparkles,
  pauta: FileText,
  production: Mic,
};

export default function StageStepper({
  currentStage,
  completions,
  onStageChange,
}: StageStepperProps) {
  return (
    <nav
      className="bg-ceramic-base border-b border-ceramic-border px-6 py-3"
      aria-label="Navegação de estágios do episódio"
      role="navigation"
    >
      <div className="flex items-center space-x-1 overflow-x-auto">
        {PODCAST_STAGES.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const isActive = currentStage === stage.id;
          const completion = completions[stage.id];
          const isLast = index === PODCAST_STAGES.length - 1;

          // Build aria-label describing stage and status
          let ariaLabel = stage.label;
          if (isActive) {
            ariaLabel += ' (estágio atual)';
          }
          if (completion === 'complete') {
            ariaLabel += ' - Completo';
          } else if (completion === 'partial') {
            ariaLabel += ' - Parcialmente completo';
          }

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Button */}
              <button
                onClick={() => onStageChange(stage.id)}
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  relative flex items-center space-x-3 px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                  ${isActive
                    ? 'bg-orange-50 text-orange-600 shadow-sm'
                    : 'text-ceramic-secondary hover:bg-ceramic-base hover:text-ceramic-primary'
                  }
                `}
              >
                {/* Icon with completion badge */}
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-ceramic-text-secondary'}`}
                    aria-hidden="true"
                  />
                  {completion !== 'none' && (
                    <CompletionBadge completion={completion} />
                  )}
                </div>

                {/* Label */}
                <span className={`font-medium whitespace-nowrap ${
                  isActive ? 'text-orange-600' : 'text-ceramic-primary'
                }`}>
                  {/* Full label on desktop */}
                  <span className="hidden md:inline">{stage.label}</span>
                  {/* Short label on mobile */}
                  <span className="md:hidden">{stage.shortLabel}</span>
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" aria-hidden="true" />
                )}
              </button>

              {/* Connector line (desktop only) */}
              {!isLast && (
                <div
                  className={`hidden md:block w-8 h-0.5 ${
                    completion === 'complete' ? 'bg-ceramic-success' : 'bg-ceramic-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Completion badge component
 * Visual indicator for stage completion status
 */
function CompletionBadge({ completion }: { completion: StageCompletionStatus }) {
  if (completion === 'complete') {
    return (
      <div className="absolute -top-1 -right-1 bg-ceramic-success rounded-full p-0.5" aria-hidden="true">
        <Check className="w-3 h-3 text-white" />
      </div>
    );
  }

  if (completion === 'partial') {
    return (
      <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-2 h-2" aria-hidden="true" />
    );
  }

  return null;
}
