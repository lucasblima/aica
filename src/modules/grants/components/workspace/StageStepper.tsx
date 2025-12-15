/**
 * StageStepper - Horizontal permeable navigation for workspace stages
 * All stages are always clickable regardless of completion status
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ListChecks,
  Sparkles,
  FolderOpen,
  CalendarClock,
  Check,
  Circle,
} from 'lucide-react';
import type { StageId, StageCompletionStatus, StageCompletionMap } from '../../types/workspace';
import { EDITAL_STAGES } from '../../types/workspace';

// Icon mapping for stages
const STAGE_ICONS: Record<StageId, React.ComponentType<{ className?: string }>> = {
  setup: FileText,
  structure: ListChecks,
  drafting: Sparkles,
  docs: FolderOpen,
  timeline: CalendarClock,
};

interface StageStepperProps {
  currentStage: StageId;
  stageCompletions: StageCompletionMap;
  onStageSelect: (stageId: StageId) => void;
  className?: string;
}

export const StageStepper: React.FC<StageStepperProps> = ({
  currentStage,
  stageCompletions,
  onStageSelect,
  className = '',
}) => {
  return (
    <div className={`w-full border-b border-[#5C554B]/10 ${className}`}>
      <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
        {EDITAL_STAGES.map((stage, index) => {
          const isActive = stage.id === currentStage;
          const completion = stageCompletions[stage.id];
          const Icon = STAGE_ICONS[stage.id];

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => onStageSelect(stage.id)}
                className={`
                  group relative flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all
                  ${isActive
                    ? 'text-[#5C554B]'
                    : 'text-[#948D82] hover:text-[#5C554B]/70'
                  }
                `}
              >
                {/* Icon with completion indicator */}
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                      isActive ? 'text-[#D97706]' : ''
                    }`}
                  />
                  {/* Completion badge */}
                  <CompletionBadge status={completion} />
                </div>

                {/* Label - hidden on mobile, shown on larger screens */}
                <span className="hidden sm:inline whitespace-nowrap">
                  {stage.label}
                </span>
                <span className="sm:hidden whitespace-nowrap">
                  {stage.shortLabel}
                </span>

                {/* Active Tab Indicator ("Ceramic Glaze") */}
                {isActive && (
                  <motion.div
                    layoutId="activeStageTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#D97706] rounded-t-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>

              {/* Connector line between stages */}
              {index < EDITAL_STAGES.length - 1 && (
                <div
                  className={`
                    hidden sm:block flex-shrink-0 w-6 h-0.5 mx-1
                    ${completion === 'complete'
                      ? 'bg-green-400'
                      : 'bg-[#948D82]/20'
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Small badge showing completion status
 */
const CompletionBadge: React.FC<{ status: StageCompletionStatus }> = ({ status }) => {
  if (status === 'none') return null;

  return (
    <div
      className={`
        absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center
        ${status === 'complete'
          ? 'bg-green-500'
          : 'bg-amber-500'
        }
      `}
    >
      {status === 'complete' ? (
        <Check className="w-2 h-2 text-white" />
      ) : (
        <Circle className="w-1.5 h-1.5 text-white fill-white" />
      )}
    </div>
  );
};

export default StageStepper;
