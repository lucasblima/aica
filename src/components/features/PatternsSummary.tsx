/**
 * PatternsSummary — User Behavioral Patterns Overview
 * OpenClaw Adaptation (Issue #255)
 *
 * Shows discovered behavioral patterns with confidence bars,
 * categorized by type. Supports manual synthesis trigger.
 */

import {
  Brain,
  TrendingUp,
  Heart,
  Clock,
  Users,
  Activity,
  BookOpen,
  Zap,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { UserPattern, PatternType } from '@/hooks/useUserPatterns'

// =============================================================================
// CONFIG
// =============================================================================

const PATTERN_TYPE_CONFIG: Record<PatternType, { label: string; icon: typeof Brain; color: string }> = {
  productivity: { label: 'Produtividade', icon: TrendingUp, color: 'text-blue-500' },
  emotional: { label: 'Emocional', icon: Heart, color: 'text-rose-500' },
  routine: { label: 'Rotina', icon: Clock, color: 'text-amber-500' },
  social: { label: 'Social', icon: Users, color: 'text-purple-500' },
  health: { label: 'Saude', icon: Activity, color: 'text-green-500' },
  learning: { label: 'Aprendizado', icon: BookOpen, color: 'text-cyan-500' },
  trigger: { label: 'Gatilho', icon: Zap, color: 'text-ceramic-warning' },
  strength: { label: 'Forca', icon: Shield, color: 'text-ceramic-success' },
}

// =============================================================================
// PROPS
// =============================================================================

interface PatternsSummaryProps {
  patterns: UserPattern[]
  isLoading: boolean
  isSynthesizing: boolean
  error: string | null
  onSynthesize: () => void
  /** Compact mode for Home — shows top 3 patterns only, no synthesize button */
  compact?: boolean
  /** Callback when user wants full view (navigates to Journey) */
  onViewMore?: () => void
  /** ISO date string for "last updated" display */
  lastUpdated?: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function PatternsSummary({
  patterns,
  isLoading,
  isSynthesizing,
  error,
  onSynthesize,
  compact = false,
  onViewMore,
  lastUpdated,
}: PatternsSummaryProps) {
  const displayPatterns = compact ? patterns.slice(0, 3) : patterns
  const hasMore = compact && patterns.length > 3

  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-5 animate-pulse">
        <div className="h-5 bg-ceramic-text-secondary/10 rounded w-40 mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-3">
            <div className="h-3 bg-ceramic-text-secondary/10 rounded w-full mb-1" />
            <div className="h-2 bg-ceramic-text-secondary/10 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`bg-ceramic-base rounded-2xl border border-ceramic-border p-4 ${compact ? 'cursor-pointer hover:scale-[1.01] transition-transform' : 'p-5'}`}
      onClick={compact ? onViewMore : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4.5 h-4.5 text-amber-500" />
          <h3 className="text-sm font-semibold text-ceramic-text-primary">
            Seus Padroes
          </h3>
          {patterns.length > 0 && (
            <span className="text-[10px] font-medium text-ceramic-text-tertiary bg-ceramic-cool px-1.5 py-0.5 rounded-full">
              {patterns.length}
            </span>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-ceramic-text-tertiary">
                {formatRelativeDate(lastUpdated)}
              </span>
            )}
            <button
              onClick={onSynthesize}
              disabled={isSynthesizing}
              className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1"
            >
              {isSynthesizing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isSynthesizing ? 'Analisando...' : 'Sintetizar'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-ceramic-error mb-3">{error}</p>
      )}

      {/* Empty state */}
      {patterns.length === 0 && !error && (
        <div className="text-center py-4">
          <Brain className="w-7 h-7 text-ceramic-text-tertiary mx-auto mb-2" />
          <p className="text-xs text-ceramic-text-secondary">
            Nenhum padrao identificado ainda.
          </p>
          {!compact && (
            <p className="text-xs text-ceramic-text-tertiary mt-1">
              Gere insights diarios para que a IA descubra seus padroes.
            </p>
          )}
        </div>
      )}

      {/* Pattern list */}
      <div className="space-y-2.5">
        {displayPatterns.map(pattern => (
          <PatternRow key={pattern.id} pattern={pattern} />
        ))}
      </div>

      {/* View more link in compact mode */}
      {hasMore && onViewMore && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewMore(); }}
          className="flex items-center gap-1 mt-2.5 text-xs text-amber-500 font-medium"
        >
          +{patterns.length - 3} padroes
        </button>
      )}
    </div>
  )
}

// =============================================================================
// PATTERN ROW
// =============================================================================

function PatternRow({ pattern }: { pattern: UserPattern }) {
  const config = PATTERN_TYPE_CONFIG[pattern.pattern_type] || PATTERN_TYPE_CONFIG.routine
  const Icon = config.icon
  const confidencePercent = Math.round(pattern.confidence_score * 100)

  return (
    <div className="p-3 rounded-xl bg-ceramic-cool/50">
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-ceramic-text-primary truncate">
              {pattern.description}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-ceramic-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confidencePercent >= 70
                    ? 'bg-ceramic-success'
                    : confidencePercent >= 40
                    ? 'bg-amber-400'
                    : 'bg-ceramic-text-tertiary'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-ceramic-text-tertiary shrink-0 w-8 text-right">
              {confidencePercent}%
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-[10px] font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="text-[10px] text-ceramic-text-tertiary">
              {pattern.times_observed}x observado
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
