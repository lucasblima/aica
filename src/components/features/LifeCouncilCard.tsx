/**
 * LifeCouncilCard — Daily AI Insight from the Life Council
 * OpenClaw Adaptation (Issue #254)
 *
 * Shows the synthesized daily insight with status indicator,
 * headline, synthesis text, and actionable recommendations.
 */

import { useState } from 'react'
import {
  Brain,
  Target,
  Heart,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type {
  CouncilInsight,
  CouncilStatus,
  CouncilAction,
} from '@/hooks/useLifeCouncil'

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG: Record<CouncilStatus, { label: string; color: string; bg: string; icon: string }> = {
  thriving: {
    label: 'Prosperando',
    color: 'text-ceramic-success',
    bg: 'bg-ceramic-success/10',
    icon: '🌟',
  },
  balanced: {
    label: 'Equilibrado',
    color: 'text-ceramic-info',
    bg: 'bg-ceramic-info/10',
    icon: '⚖️',
  },
  strained: {
    label: 'Sob Pressao',
    color: 'text-ceramic-warning',
    bg: 'bg-ceramic-warning/10',
    icon: '⚠️',
  },
  burnout_risk: {
    label: 'Risco de Burnout',
    color: 'text-ceramic-error',
    bg: 'bg-ceramic-error/10',
    icon: '🔥',
  },
}

const MODULE_ICONS: Record<string, typeof Brain> = {
  journey: Heart,
  atlas: Target,
  connections: Brain,
  flux: Activity,
}

// =============================================================================
// PROPS
// =============================================================================

interface LifeCouncilCardProps {
  insight: CouncilInsight | null
  isLoading: boolean
  isRunning: boolean
  error: string | null
  onRun: () => void
  onMarkViewed?: () => void
  /** Compact mode for Home dashboard — shows headline + status only */
  compact?: boolean
  /** Callback when user wants to see full details (navigates to Journey) */
  onViewMore?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LifeCouncilCard({
  insight,
  isLoading,
  isRunning,
  error,
  onRun,
  onMarkViewed,
  compact = false,
  onViewMore,
}: LifeCouncilCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-ceramic-text-secondary/10 rounded w-48 mb-3" />
        <div className="h-4 bg-ceramic-text-secondary/10 rounded w-full mb-2" />
        {!compact && <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4" />}
      </div>
    )
  }

  // No insight yet — prompt to generate
  if (!insight) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-5 border border-ceramic-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ceramic-text-primary">
              Conselho de Vida
            </h3>
            {!compact && (
              <p className="text-xs text-ceramic-text-secondary">
                3 personas AI analisam seu dia
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-ceramic-error/10">
            <AlertCircle className="w-4 h-4 text-ceramic-error mt-0.5 shrink-0" />
            <p className="text-xs text-ceramic-error">{error}</p>
          </div>
        )}

        <button
          onClick={onRun}
          disabled={isRunning}
          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar Insight
            </>
          )}
        </button>
      </div>
    )
  }

  const status = STATUS_CONFIG[insight.overall_status] || STATUS_CONFIG.balanced
  const isToday = insight.insight_date === new Date().toISOString().split('T')[0]

  // ── Compact mode: headline + status only ──
  if (compact) {
    return (
      <div
        className="bg-ceramic-base rounded-2xl border border-ceramic-border p-4 cursor-pointer hover:scale-[1.01] transition-transform"
        onClick={onViewMore}
      >
        <div className="flex items-center gap-3 mb-2.5">
          <div className={`w-9 h-9 rounded-xl ${status.bg} flex items-center justify-center text-base shrink-0`}>
            {status.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-ceramic-text-secondary">
                Conselho de Vida
              </h3>
              <span className={`text-[10px] font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm font-medium text-ceramic-text-primary truncate mt-0.5">
              {insight.headline}
            </p>
          </div>
        </div>
        <p className="text-xs text-ceramic-text-secondary line-clamp-2 leading-relaxed">
          {insight.synthesis}
        </p>
        {onViewMore && (
          <button className="flex items-center gap-1 mt-2 text-xs text-amber-500 font-medium">
            <ChevronDown className="w-3 h-3" /> Ver completo
          </button>
        )}
      </div>
    )
  }

  // ── Full mode ──
  return (
    <div className="bg-ceramic-base rounded-2xl border border-ceramic-border overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center text-lg`}>
              {status.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ceramic-text-primary">
                Conselho de Vida
              </h3>
              <span className={`text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          {!isToday && (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1"
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Atualizar
            </button>
          )}
        </div>

        {/* Headline */}
        <p className="text-sm font-medium text-ceramic-text-primary mb-2">
          {insight.headline}
        </p>

        {/* Synthesis (collapsible) */}
        <p className={`text-xs text-ceramic-text-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
          {insight.synthesis}
        </p>

        <button
          onClick={() => {
            setIsExpanded(!isExpanded)
            if (!isExpanded && onMarkViewed && !insight.viewed_at) {
              onMarkViewed()
            }
          }}
          className="flex items-center gap-1 mt-2 text-xs text-ceramic-text-tertiary hover:text-ceramic-text-secondary"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Mais detalhes
            </>
          )}
        </button>
      </div>

      {/* Actions */}
      {insight.actions && insight.actions.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-medium text-ceramic-text-secondary mb-2 uppercase tracking-wide">
            Acoes Recomendadas
          </p>
          <div className="space-y-2">
            {insight.actions.map((action: CouncilAction, i: number) => {
              const Icon = MODULE_ICONS[action.module] || Target
              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-ceramic-cool/50"
                >
                  <Icon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-ceramic-text-primary leading-relaxed">
                    {action.action}
                  </p>
                  {action.priority === 'high' && (
                    <span className="text-[10px] font-medium text-ceramic-warning bg-ceramic-warning/10 px-1.5 py-0.5 rounded-full shrink-0">
                      Alta
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expanded: Persona details */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-ceramic-border pt-4 space-y-3">
          <PersonaSection
            icon={<Heart className="w-4 h-4 text-rose-400" />}
            title="Filosofo"
            content={insight.philosopher_output?.reflection || 'Sem dados'}
          />
          <PersonaSection
            icon={<Target className="w-4 h-4 text-blue-400" />}
            title="Estrategista"
            content={insight.strategist_output?.tacticalAdvice || 'Sem dados'}
          />
          <PersonaSection
            icon={<Activity className="w-4 h-4 text-green-400" />}
            title="Bio-Hacker"
            content={insight.biohacker_output?.routineAdvice || 'Sem dados'}
          />
        </div>
      )}
    </div>
  )
}

function PersonaSection({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode
  title: string
  content: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-ceramic-text-secondary">{title}</p>
        <p className="text-xs text-ceramic-text-primary leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
