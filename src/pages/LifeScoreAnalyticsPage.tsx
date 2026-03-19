/**
 * LifeScoreAnalyticsPage — Full-page Life Score analytics
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Detailed view with:
 * - Current score hero
 * - Domain breakdown grid (only active domains)
 * - Historical line chart (SVG)
 * - Domain weight adjuster with active domain toggles
 * - Spiral alert details
 *
 * Follows Ceramic Design System.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useLifeScore } from '@/hooks/useLifeScore';
import { LifeScoreRadar } from '@/components/features/LifeScoreRadar';
import { DomainWeightSliders } from '@/components/features/DomainWeightSliders';
import { DOMAIN_LABELS } from '@/services/scoring/lifeScoreService';
import type { AicaDomain, ScoreTrend, SufficiencyLevel } from '@/services/scoring/types';
import { ALL_AICA_DOMAINS } from '@/services/scoring/types';
import {
  getSufficiencyColor,
  getSufficiencyDisplayText,
  getTrendDisplayText,
} from '@/services/scoring/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DOMAIN_ICONS: Record<AicaDomain, string> = {
  atlas: '🎯',
  journey: '🧘',
  connections: '🤝',
  finance: '💰',
  grants: '🎓',
  studio: '🎙️',
  flux: '💪',
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function TrendIcon({ trend, size = 16 }: { trend: ScoreTrend; size?: number }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp size={size} style={{ color: 'var(--color-ceramic-success, #6B7B5C)' }} />;
    case 'declining':
      return <TrendingDown size={size} style={{ color: 'var(--color-ceramic-error, #9B4D3A)' }} />;
    case 'stable':
      return <Minus size={size} style={{ color: 'var(--color-ceramic-text-secondary, #948D82)' }} />;
  }
}

function DomainCard({ domain, score, trend, confidence }: {
  domain: AicaDomain;
  score: number;
  trend: ScoreTrend;
  confidence?: number;
}) {
  const percentage = Math.round(score * 100);
  const level: SufficiencyLevel =
    score >= 0.80 ? 'thriving' :
    score >= 0.66 ? 'sufficient' :
    score >= 0.40 ? 'growing' : 'attention_needed';
  const color = getSufficiencyColor(level);

  return (
    <motion.div
      className="bg-ceramic-base rounded-xl p-3 border border-ceramic-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{DOMAIN_ICONS[domain]}</span>
          <span className="text-xs font-medium text-ceramic-text-primary">
            {DOMAIN_LABELS[domain]}
          </span>
        </div>
        <TrendIcon trend={trend} size={14} />
      </div>

      {/* Score bar */}
      <div className="mb-1.5">
        <div className="flex items-end justify-between mb-1">
          <span className="text-xl font-bold" style={{ color }}>
            {percentage}
          </span>
          <span className="text-[10px] text-ceramic-text-secondary">
            {getSufficiencyDisplayText(level)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-ceramic-border overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(percentage, 3)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Confidence indicator */}
      {confidence !== undefined && confidence < 0.5 && (
        <span className="text-[10px] text-ceramic-text-secondary italic">
          Dados limitados
        </span>
      )}
    </motion.div>
  );
}

// ============================================================================
// HISTORY CHART (SVG)
// ============================================================================

function HistoryChart({ data }: {
  data: { composite: number; computedAt: string }[];
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-ceramic-text-secondary">
        Dados insuficientes para o grafico (mínimo 2 pontos)
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Scores in chronological order (data comes most recent first)
  const sorted = [...data].reverse();

  const minY = 0;
  const maxY = 100;

  const points = sorted.map((d, i) => {
    const x = padding.left + (i / (sorted.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.composite * 100 - minY) / (maxY - minY)) * chartH;
    return { x, y, score: d.composite, date: d.computedAt };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area fill path
  const areaPath = `M${points[0].x},${padding.top + chartH} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${padding.top + chartH} Z`;

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // Sufficiency threshold line at 66
  const thresholdY = padding.top + chartH - ((66 - minY) / (maxY - minY)) * chartH;

  // X-axis date labels (show max 6 dates)
  const xLabelCount = Math.min(sorted.length, 6);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round(i * (sorted.length - 1) / (xLabelCount - 1))
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {yLabels.map(val => {
        const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
        return (
          <g key={val}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              stroke="var(--color-ceramic-border, #D1CBC2)"
              strokeWidth={0.5}
              opacity={0.5}
            />
            <text
              x={padding.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[9px]"
              fill="var(--color-ceramic-text-secondary, #948D82)"
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* Sufficiency threshold */}
      <line
        x1={padding.left}
        y1={thresholdY}
        x2={padding.left + chartW}
        y2={thresholdY}
        stroke="var(--color-ceramic-accent, #D97706)"
        strokeWidth={1}
        strokeDasharray="4,3"
        opacity={0.6}
      />
      <text
        x={padding.left + chartW + 4}
        y={thresholdY}
        dominantBaseline="middle"
        className="text-[8px]"
        fill="var(--color-ceramic-accent, #D97706)"
      >
        66
      </text>

      {/* Area fill */}
      <path
        d={areaPath}
        fill="var(--color-ceramic-accent, #D97706)"
        fillOpacity={0.08}
      />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--color-ceramic-accent, #D97706)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--color-ceramic-accent, #D97706)"
          stroke="var(--color-ceramic-base, #F0EFE9)"
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis date labels */}
      {xLabelIndices.map(idx => {
        const p = points[idx];
        const dateStr = new Date(sorted[idx].computedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        return (
          <text
            key={idx}
            x={p.x}
            y={padding.top + chartH + 16}
            textAnchor="middle"
            className="text-[9px]"
            fill="var(--color-ceramic-text-secondary, #948D82)"
          >
            {dateStr}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LifeScoreAnalyticsPage() {
  const navigate = useNavigate();
  const {
    lifeScore,
    history,
    weights,
    activeDomains,
    isLoading,
    isComputing,
    error,
    spiralAlert,
    refresh,
    compute,
    updateWeights,
    updateActiveDomains,
    fetchHistory,
  } = useLifeScore();

  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [localWeights, setLocalWeights] = useState(weights);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory(30);
  }, [fetchHistory]);

  // Sync local weights with hook
  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  const handleSaveWeights = useCallback(async (w: Record<AicaDomain, number>) => {
    setIsSavingWeights(true);
    try {
      await updateWeights(w, 'slider');
    } finally {
      setIsSavingWeights(false);
    }
  }, [updateWeights]);

  const handleRefresh = useCallback(async () => {
    await compute();
    await fetchHistory(30);
  }, [compute, fetchHistory]);

  // Filter to active domains preserving canonical order
  const visibleDomains = useMemo(() => {
    return ALL_AICA_DOMAINS.filter(d => activeDomains.includes(d));
  }, [activeDomains]);

  // Derive domain trends from history
  const domainTrends = useMemo((): Record<AicaDomain, ScoreTrend> => {
    const result: Record<string, ScoreTrend> = {};
    for (const domain of ALL_AICA_DOMAINS) {
      if (history.length < 3) {
        result[domain] = 'stable';
        continue;
      }
      const recent = history.slice(0, 5);
      const scores = recent.map(h => h.domainScores?.[domain] ?? 0).reverse();
      if (scores.length < 2) {
        result[domain] = 'stable';
        continue;
      }
      const first = scores[0];
      const last = scores[scores.length - 1];
      const diff = last - first;
      if (diff > 0.03) result[domain] = 'improving';
      else if (diff < -0.03) result[domain] = 'declining';
      else result[domain] = 'stable';
    }
    return result as Record<AicaDomain, ScoreTrend>;
  }, [history]);

  const compositeDisplay = lifeScore ? Math.round(lifeScore.composite * 100) : 0;

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm border-b border-ceramic-border px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} className="text-ceramic-text-primary" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ceramic-text-primary">Life Score</h1>
              <p className="text-xs text-ceramic-text-secondary">Análise integrada da sua vida</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lifeScore && (
              <span
                className="text-xl font-bold"
                style={{ color: getSufficiencyColor(lifeScore.sufficiency) }}
              >
                {compositeDisplay}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isComputing}
              className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors disabled:opacity-50"
              aria-label="Recalcular"
            >
              {isComputing ? (
                <Loader2 size={18} className="text-ceramic-accent animate-spin" />
              ) : (
                <RefreshCw size={18} className="text-ceramic-text-secondary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-24 space-y-6 pt-4">
        {/* Error state */}
        {error && (
          <div className="bg-ceramic-error/10 border border-ceramic-error/20 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-ceramic-error shrink-0" />
            <span className="text-xs text-ceramic-error">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !lifeScore && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-ceramic-accent animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !lifeScore && !error && (
          <div className="text-center py-16 space-y-4">
            <Activity size={48} className="text-ceramic-text-secondary mx-auto" />
            <h2 className="text-lg font-medium text-ceramic-text-primary">
              Nenhum Life Score encontrado
            </h2>
            <p className="text-sm text-ceramic-text-secondary max-w-sm mx-auto">
              Calcule seu primeiro Life Score para acompanhar seu progresso em todas as areas da vida.
            </p>
            <button
              onClick={() => compute()}
              disabled={isComputing}
              className="mx-auto flex items-center gap-2 bg-ceramic-accent hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-6 py-2.5 transition-colors"
            >
              {isComputing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Calculando...
                </>
              ) : (
                'Calcular Life Score'
              )}
            </button>
          </div>
        )}

        {/* Score content */}
        {lifeScore && (
          <>
            {/* Section 1: Current Score Hero with Radar */}
            <motion.section
              className="bg-ceramic-base rounded-xl border border-ceramic-border p-4"
              style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #E8ECF0 100%)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col items-center">
                <LifeScoreRadar lifeScore={lifeScore} className="mb-2" />
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getSufficiencyColor(lifeScore.sufficiency)}20`,
                      color: getSufficiencyColor(lifeScore.sufficiency),
                    }}
                  >
                    {getSufficiencyDisplayText(lifeScore.sufficiency)}
                  </span>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={lifeScore.trend} size={14} />
                    <span className="text-xs text-ceramic-text-secondary">
                      {getTrendDisplayText(lifeScore.trend)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-ceramic-text-secondary mt-2">
                  Calculado em{' '}
                  {new Date(lifeScore.computedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </motion.section>

            {/* Section 2: Domain Breakdown — only active domains */}
            <section>
              <h2 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                Dominios
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {visibleDomains.map(domain => (
                  <DomainCard
                    key={domain}
                    domain={domain}
                    score={lifeScore.domainScores[domain] ?? 0}
                    trend={domainTrends[domain]}
                  />
                ))}
              </div>
            </section>

            {/* Section 3: Spiral Alert */}
            {spiralAlert && lifeScore.spiralDomains.length > 0 && (
              <motion.section
                className="bg-ceramic-warning/10 border border-ceramic-warning/20 rounded-xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-ceramic-warning shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-ceramic-warning mb-1">
                      Espiral Negativa Detectada
                    </h3>
                    <p className="text-xs text-ceramic-text-secondary">
                      Os seguintes dominios estão em declinio correlacionado:{' '}
                      <strong>
                        {lifeScore.spiralDomains
                          .map(d => DOMAIN_LABELS[d])
                          .join(', ')}
                      </strong>.
                      Isso pode indicar que um problema em uma area esta afetando as outras.
                      Foque em estabilizar pelo menos um dominio para quebrar o ciclo.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Section 4: Historical Chart */}
            <section>
              <h2 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                Histórico
              </h2>
              <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-4">
                <HistoryChart
                  data={history.map(h => ({
                    composite: h.composite,
                    computedAt: h.computedAt,
                  }))}
                />
              </div>
            </section>

            {/* Section 5: Domain Weights with Active Domain Toggles */}
            <section>
              <h2 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                Pesos dos Dominios
              </h2>
              <DomainWeightSliders
                weights={localWeights}
                onWeightsChange={setLocalWeights}
                onSave={handleSaveWeights}
                activeDomains={activeDomains}
                onActiveDomainsChange={updateActiveDomains}
                isSaving={isSavingWeights}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
