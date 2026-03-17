/**
 * MonthlyDigestCard
 *
 * Proactive monthly financial digest with AI insights.
 * Displays grade, highlights, savings opportunities, risk alerts,
 * and a tip for the next month.
 *
 * For closed months: auto-loads persisted digest from DB, or generates
 * and persists one if not found.
 * For the current month: shows a placeholder — analysis is only
 * available when the month closes.
 *
 * Ceramic Design System + Jony Ive inspired.
 */

import React, { useState } from 'react'
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Loader2,
  Database,
} from 'lucide-react'
import { AIThinkingState } from '@/components/ui'
import { useMonthlyDigest } from '../hooks/useMonthlyDigest'

// =============================================================================
// Types
// =============================================================================

interface MonthlyDigestCardProps {
  userId: string
  selectedYear: number
  selectedMonth: number // 1-indexed (1=Jan, 12=Dec)
}

// =============================================================================
// Helpers
// =============================================================================

const GRADE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-ceramic-success/15', text: 'text-ceramic-success', label: 'Excelente' },
  B: { bg: 'bg-ceramic-info/15', text: 'text-ceramic-info', label: 'Bom' },
  C: { bg: 'bg-ceramic-warning/15', text: 'text-ceramic-warning', label: 'Regular' },
  D: { bg: 'bg-amber-500/15', text: 'text-amber-600', label: 'Atenção' },
  F: { bg: 'bg-ceramic-error/15', text: 'text-ceramic-error', label: 'Critico' },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// =============================================================================
// Component
// =============================================================================

export const MonthlyDigestCard: React.FC<MonthlyDigestCardProps> = ({
  userId,
  selectedYear,
  selectedMonth,
}) => {
  const {
    digest,
    stats,
    isLoading,
    isGenerating,
    isCurrentMonth,
    error,
    isCached,
    regenerate,
    monthName,
  } = useMonthlyDigest(userId, selectedYear, selectedMonth)

  const [savingsExpanded, setSavingsExpanded] = useState(false)

  // ── Current month — show placeholder ──
  if (isCurrentMonth) {
    return (
      <div className="ceramic-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Resumo Mensal IA
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {monthName}
            </p>
          </div>
        </div>

        <div className="ceramic-inset p-4">
          <p className="text-xs text-ceramic-text-secondary leading-relaxed">
            O resumo com análise de IA estara disponível quando o mes fechar.
            Navegue para um mes anterior para ver a análise completa.
          </p>
        </div>
      </div>
    )
  }

  // ── Loading state ──
  if (isLoading || isGenerating) {
    return (
      <div className="ceramic-card p-6">
        <AIThinkingState
          message={isGenerating ? 'Gerando análise com IA...' : 'Carregando resumo...'}
        />
      </div>
    )
  }

  // ── Error state ──
  if (error && !digest) {
    return (
      <div className="ceramic-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Resumo Mensal IA
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {monthName}
            </p>
          </div>
        </div>

        <div className="ceramic-inset p-3 bg-ceramic-error/5">
          <p className="text-xs text-ceramic-error">{error}</p>
          <button
            onClick={regenerate}
            className="mt-2 text-sm text-ceramic-info hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── No digest available ──
  if (!digest) {
    return (
      <div className="ceramic-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Resumo Mensal IA
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {monthName}
            </p>
          </div>
        </div>

        <div className="ceramic-inset p-3">
          <p className="text-xs text-ceramic-text-secondary">
            Nenhuma transação encontrada para {monthName}. Faca upload de um extrato primeiro.
          </p>
        </div>
      </div>
    )
  }

  // ── Digest loaded ──
  const gradeConfig = GRADE_CONFIG[digest.month_grade] || GRADE_CONFIG.C

  return (
    <div className="ceramic-card p-6 space-y-5">
      {/* Header with grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Resumo de {monthName}
            </h3>
            <div className="flex items-center gap-2">
              {stats && (
                <p className="text-xs text-ceramic-text-secondary">
                  {stats.transactionCount} transacoes analisadas
                </p>
              )}
              {isCached && (
                <span className="inline-flex items-center gap-1 text-[10px] text-ceramic-info" title="Carregado do cache">
                  <Database className="w-2.5 h-2.5" />
                  cache
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={regenerate}
            disabled={isGenerating}
            className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
            title="Regenerar resumo"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 text-ceramic-text-secondary animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            )}
          </button>

          {/* Grade badge */}
          <div className={`${gradeConfig.bg} px-3 py-1.5 rounded-lg flex items-center gap-2`}>
            <span className={`text-xl font-black ${gradeConfig.text}`}>
              {digest.month_grade}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${gradeConfig.text}`}>
              {gradeConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Grade explanation */}
      <div className="ceramic-inset p-3">
        <p className="text-xs text-ceramic-text-secondary leading-relaxed">
          {digest.grade_explanation}
        </p>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="ceramic-tray p-3 text-center">
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mb-1">Receita</p>
            <p className="text-sm font-bold text-ceramic-success">{formatCurrency(stats.totalIncome)}</p>
          </div>
          <div className="ceramic-tray p-3 text-center">
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mb-1">Despesa</p>
            <p className="text-sm font-bold text-ceramic-error">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="ceramic-tray p-3 text-center">
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mb-1">Saldo</p>
            <p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
              {formatCurrency(stats.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-ceramic-text-primary uppercase tracking-wider">
            Destaques
          </p>
          <div className="space-y-2">
            {digest.highlights.map((highlight, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="ceramic-inset w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-ceramic-accent">{i + 1}</span>
                </div>
                <p className="text-xs text-ceramic-text-secondary leading-relaxed">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings opportunities — collapsible */}
      {digest.savings_opportunities.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setSavingsExpanded(!savingsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-ceramic-success" />
              <p className="text-xs font-bold text-ceramic-text-primary uppercase tracking-wider">
                Oportunidades de Economia
              </p>
            </div>
            {savingsExpanded ? (
              <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>

          {savingsExpanded && (
            <div className="space-y-2 pl-1">
              {digest.savings_opportunities.map((opp, i) => (
                <div key={i} className="ceramic-tray p-3 flex items-start gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-ceramic-success flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-ceramic-text-secondary leading-relaxed">{opp}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk alerts — only if non-empty */}
      {digest.risk_alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-ceramic-warning" />
            <p className="text-xs font-bold text-ceramic-text-primary uppercase tracking-wider">
              Alertas
            </p>
          </div>
          <div className="space-y-2">
            {digest.risk_alerts.map((alert, i) => (
              <div key={i} className="ceramic-inset p-3 bg-ceramic-warning/5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-ceramic-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-ceramic-warning leading-relaxed">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next month tip */}
      {digest.next_month_tip && (
        <div className="ceramic-tray p-4 bg-gradient-to-br from-ceramic-accent/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="ceramic-concave w-8 h-8 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-ceramic-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-ceramic-accent uppercase tracking-wider mb-1">
                Dica para o próximo mes
              </p>
              <p className="text-xs text-ceramic-text-primary leading-relaxed">
                {digest.next_month_tip}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
