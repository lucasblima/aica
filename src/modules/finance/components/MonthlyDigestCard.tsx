/**
 * MonthlyDigestCard
 *
 * Proactive monthly financial digest with AI insights.
 * Displays grade, highlights, savings opportunities, risk alerts,
 * and a tip for the next month.
 *
 * Ceramic Design System + Jony Ive inspired.
 */

import React, { useState, useCallback } from 'react'
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'
import { AIThinkingState } from '@/components/ui'
import {
  getMonthlyDigest,
  type MonthlyDigest,
  type DigestStats,
} from '../services/financeDigestService'

// =============================================================================
// Types
// =============================================================================

interface MonthlyDigestCardProps {
  userId: string
}

// =============================================================================
// Helpers
// =============================================================================

const GRADE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-ceramic-success/15', text: 'text-ceramic-success', label: 'Excelente' },
  B: { bg: 'bg-ceramic-info/15', text: 'text-ceramic-info', label: 'Bom' },
  C: { bg: 'bg-ceramic-warning/15', text: 'text-ceramic-warning', label: 'Regular' },
  D: { bg: 'bg-amber-500/15', text: 'text-amber-600', label: 'Atencao' },
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

export const MonthlyDigestCard: React.FC<MonthlyDigestCardProps> = ({ userId }) => {
  const [digest, setDigest] = useState<MonthlyDigest | null>(null)
  const [stats, setStats] = useState<DigestStats | null>(null)
  const [monthName, setMonthName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noData, setNoData] = useState(false)
  const [savingsExpanded, setSavingsExpanded] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNoData(false)

    try {
      const response = await getMonthlyDigest()

      if (!response.success) {
        setError(response.error || 'Erro ao gerar resumo')
        return
      }

      if (!response.digest) {
        setNoData(true)
        setMonthName(response.monthName || '')
        return
      }

      setDigest(response.digest)
      setStats(response.stats || null)
      setMonthName(response.monthName || '')
      setGenerated(true)
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Not yet generated — show CTA
  if (!generated && !loading) {
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
              Análise inteligente dos seus gastos
            </p>
          </div>
        </div>

        {error && (
          <div className="ceramic-inset p-3 bg-ceramic-error/5">
            <p className="text-xs text-ceramic-error">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-sm text-ceramic-info hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {noData && (
          <div className="ceramic-inset p-3">
            <p className="text-xs text-ceramic-text-secondary">
              Nenhuma transação encontrada{monthName ? ` para ${monthName}` : ''}. Faça upload de um extrato primeiro.
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="w-full ceramic-tray p-4 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
        >
          <Sparkles className="w-4 h-4 text-ceramic-accent" />
          <span className="text-sm font-bold text-ceramic-accent">
            Gerar Resumo do Mês
          </span>
        </button>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="ceramic-card p-6">
        <AIThinkingState message="Analisando suas finanças" />
      </div>
    )
  }

  // Digest loaded
  if (!digest) return null

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
            {stats && (
              <p className="text-xs text-ceramic-text-secondary">
                {stats.transactionCount} transações analisadas
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform"
            title="Regenerar resumo"
          >
            <RefreshCw className="w-3.5 h-3.5 text-ceramic-text-secondary" />
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
      <div className="ceramic-tray p-4 bg-gradient-to-br from-ceramic-accent/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="ceramic-concave w-8 h-8 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-ceramic-accent" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-ceramic-accent uppercase tracking-wider mb-1">
              Dica para o próximo mês
            </p>
            <p className="text-xs text-ceramic-text-primary leading-relaxed">
              {digest.next_month_tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
