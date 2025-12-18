/**
 * StageStepper - Horizontal stage navigation with completion indicators
 * Allows users to navigate between podcast workspace stages
 */

import React from 'react';
import { User, Sparkles, FileText, Mic, Check } from 'lucide-react';
import type { PodcastStageId, StageCompletionMap, StageCompletionStatus } from '../../types/workspace';
import { PODCAST_STAGES } from '../../types/workspace';

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
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-1 overflow-x-auto">
        {PODCAST_STAGES.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const isActive = currentStage === stage.id;
          const completion = completions[stage.id];
          const isLast = index === PODCAST_STAGES.length - 1;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Button */}
              <button
                onClick={() => onStageChange(stage.id)}
                className={`
                  relative flex items-center space-x-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-orange-50 text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                {/* Icon with completion badge */}
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                  {completion !== 'none' && (
                    <CompletionBadge completion={completion} />
                  )}
                </div>

                {/* Label */}
                <span className={`font-medium whitespace-nowrap ${
                  isActive ? 'text-orange-600' : 'text-gray-700'
                }`}>
                  {/* Full label on desktop */}
                  <span className="hidden md:inline">{stage.label}</span>
                  {/* Short label on mobile */}
                  <span className="md:hidden">{stage.shortLabel}</span>
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>

              {/* Connector line (desktop only) */}
              {!isLast && (
                <div className={`hidden md:block w-8 h-0.5 ${
                  completion === 'complete' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Completion badge component
 */
function CompletionBadge({ completion }: { completion: StageCompletionStatus }) {
  if (completion === 'complete') {
    return (
      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
        <Check className="w-3 h-3 text-white" />
      </div>
    );
  }

  if (completion === 'partial') {
    return (
      <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-2 h-2" />
    );
  }

  return null;
}
