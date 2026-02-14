/**
 * ProcessingCTA
 * Call-to-action card for on-demand contact intelligence processing.
 *
 * States:
 * - pristine: show all 3 depth options (quick, standard, full)
 * - processing: show progress stepper
 * - completed: show upgrade options if deeper analysis is available
 */

import React from 'react'
import { Brain, Zap, BarChart3, History, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  IntelligenceState,
  ProcessingDepth,
  ProcessingProgress as ProgressData,
} from '../../hooks/useContactIntelligence'
import { ProcessingProgress } from './ProcessingProgress'

interface ProcessingCTAProps {
  messageCount: number
  state: IntelligenceState
  currentDepth: ProcessingDepth | null
  progress: ProgressData | null
  error: string | null
  onActivate: (depth: ProcessingDepth) => void
  className?: string
}

const DEPTH_OPTIONS: Array<{
  depth: ProcessingDepth
  label: string
  description: string
  icon: React.FC<{ className?: string }>
}> = [
  {
    depth: 'quick',
    label: 'Resumo rápido',
    description: '~50 mensagens',
    icon: Zap,
  },
  {
    depth: 'standard',
    label: 'Análise completa',
    description: '~200 mensagens',
    icon: BarChart3,
  },
  {
    depth: 'full',
    label: 'Histórico',
    description: 'todas as mensagens',
    icon: History,
  },
]

const DEPTH_ORDER: ProcessingDepth[] = ['quick', 'standard', 'full']

function getUpgradeOptions(currentDepth: ProcessingDepth): typeof DEPTH_OPTIONS {
  const currentIndex = DEPTH_ORDER.indexOf(currentDepth)
  return DEPTH_OPTIONS.filter((_, i) => i > currentIndex)
}

export const ProcessingCTA: React.FC<ProcessingCTAProps> = ({
  messageCount,
  state,
  currentDepth,
  progress,
  error,
  onActivate,
  className,
}) => {
  // Completed at max depth — nothing to show
  if (state === 'completed' && currentDepth === 'full') return null

  // Completed with upgrade available
  if (state === 'completed' && currentDepth) {
    const upgradeOptions = getUpgradeOptions(currentDepth)
    if (upgradeOptions.length === 0) return null

    return (
      <div
        className={cn(
          'rounded-2xl border border-ceramic-border bg-ceramic-cool/20 p-4',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <ArrowUp className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-ceramic-text-secondary">
            Aprofundar análise
          </span>
        </div>
        <div className="flex items-stretch gap-2">
          {upgradeOptions.map(({ depth, label, description, icon: Icon }) => (
            <button
              key={depth}
              onClick={() => onActivate(depth)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl',
                'border border-ceramic-border bg-ceramic-base',
                'hover:border-amber-400 hover:bg-amber-50/50',
                'active:scale-[0.97] transition-all duration-150',
                'text-center'
              )}
            >
              <Icon className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-ceramic-text-primary leading-tight">
                {label}
              </span>
              <span className="text-[10px] text-ceramic-text-tertiary">
                {description}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-ceramic-error mt-3 text-center">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-ceramic-border bg-ceramic-cool/30 p-5',
        className
      )}
    >
      {/* Processing state: show progress stepper */}
      {state === 'processing' && progress && (
        <ProcessingProgress progress={progress} />
      )}

      {/* Pristine state: show CTA */}
      {state === 'pristine' && (
        <>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ceramic-text-primary">
                Inteligência do Contato
              </h3>
              <p className="text-xs text-ceramic-text-secondary mt-0.5">
                {messageCount > 0
                  ? `${messageCount.toLocaleString('pt-BR')} mensagens disponíveis para análise.`
                  : 'Processar conversas para gerar insights?'}
              </p>
            </div>
          </div>

          {/* Depth options */}
          <div className="flex items-stretch gap-2">
            {DEPTH_OPTIONS.map(({ depth, label, description, icon: Icon }) => (
              <button
                key={depth}
                onClick={() => onActivate(depth)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl',
                  'border border-ceramic-border bg-ceramic-base',
                  'hover:border-amber-400 hover:bg-amber-50/50',
                  'active:scale-[0.97] transition-all duration-150',
                  'text-center'
                )}
              >
                <Icon className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-ceramic-text-primary leading-tight">
                  {label}
                </span>
                <span className="text-[10px] text-ceramic-text-tertiary">
                  {description}
                </span>
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-ceramic-error mt-3 text-center">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ProcessingCTA
