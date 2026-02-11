/**
 * ProcessingProgress
 * Visual stepper for the 3-stage intelligence pipeline.
 * Shows: dossier → threads → entities with animated progress.
 */

import React from 'react'
import { Brain, MessageSquare, Route, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessingProgress as ProgressData } from '../../hooks/useContactIntelligence'

interface ProcessingProgressProps {
  progress: ProgressData
  className?: string
}

const STAGES = [
  { key: 'dossier', label: 'Dossiê', icon: Brain },
  { key: 'threads', label: 'Conversas', icon: MessageSquare },
  { key: 'entities', label: 'Ações', icon: Route },
] as const

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  progress,
  className,
}) => {
  // Map stage to visual index (enabling=0, dossier=0, threads=1, entities=2, fetching=2)
  const activeIndex =
    progress.stage === 'enabling' || progress.stage === 'dossier'
      ? 0
      : progress.stage === 'threads'
        ? 1
        : 2

  return (
    <div className={cn('space-y-3', className)}>
      {/* Stage label */}
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
        <span className="text-sm font-medium text-ceramic-text-primary">
          {progress.label}
        </span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isCompleted = i < activeIndex
          const isActive = i === activeIndex
          const isPending = i > activeIndex

          return (
            <React.Fragment key={stage.key}>
              {/* Stage dot */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300',
                  isCompleted && 'bg-ceramic-success/15 text-ceramic-success',
                  isActive && 'bg-amber-500/15 text-amber-600 ring-2 ring-amber-500/30',
                  isPending && 'bg-ceramic-cool text-ceramic-text-tertiary'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 rounded-full transition-all duration-500',
                    i < activeIndex ? 'bg-ceramic-success/40' : 'bg-ceramic-border'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Stage labels below dots */}
      <div className="flex items-center">
        {STAGES.map((stage, i) => (
          <div
            key={stage.key}
            className={cn(
              'flex-1 text-center text-[10px] font-medium',
              i < activeIndex && 'text-ceramic-success',
              i === activeIndex && 'text-amber-600',
              i > activeIndex && 'text-ceramic-text-tertiary'
            )}
          >
            {stage.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProcessingProgress
