/**
 * LifeScoreWidget — Compact Life Score card for VidaPage
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Full-width card displaying composite Life Score with mini domain bars.
 * Only renders bars for active domains.
 * Follows Ceramic Design System and matches JourneyHeroCard visual style.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  Activity,
  Loader2,
} from 'lucide-react';
import { useLifeScore } from '@/hooks/useLifeScore';
import type { AicaDomain, ScoreTrend, SufficiencyLevel } from '@/services/scoring/types';
import { ALL_AICA_DOMAINS } from '@/services/scoring/types';
import {
  getSufficiencyColor,
  getSufficiencyDisplayText,
  getTrendDisplayText,
} from '@/services/scoring/types';
import { DOMAIN_LABELS } from '@/services/scoring/lifeScoreService';

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

function SufficiencyBadge({ level }: { level: SufficiencyLevel }) {
  const color = getSufficiencyColor(level);
  const text = getSufficiencyDisplayText(level);

  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {text}
    </span>
  );
}

function MiniDomainBar({ domain, score }: { domain: AicaDomain; score: number }) {
  const percentage = Math.round(score * 100);
  const color = getSufficiencyColor(
    score >= 0.80 ? 'thriving' :
    score >= 0.66 ? 'sufficient' :
    score >= 0.40 ? 'growing' : 'attention_needed'
  );

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-xs" title={DOMAIN_LABELS[domain]}>
        {DOMAIN_ICONS[domain]}
      </span>
      <div className="w-full h-1.5 rounded-full bg-ceramic-border overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percentage, 3)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[9px] text-ceramic-text-secondary truncate w-full text-center">
        {DOMAIN_LABELS[domain].slice(0, 6)}
      </span>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LifeScoreWidgetSkeleton() {
  return (
    <div
      className="rounded-xl p-4 border border-ceramic-border animate-pulse"
      style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #E8ECF0 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-ceramic-border rounded" />
        <div className="h-4 w-16 bg-ceramic-border rounded-full" />
      </div>
      <div className="h-10 w-16 bg-ceramic-border rounded mb-3" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-1">
            <div className="h-3 w-3 bg-ceramic-border rounded mx-auto" />
            <div className="h-1.5 w-full bg-ceramic-border rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface LifeScoreWidgetProps {
  /** Callback when "Ver detalhes" is clicked */
  onViewDetails?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const LifeScoreWidget: React.FC<LifeScoreWidgetProps> = ({
  onViewDetails,
  className = '',
}) => {
  const { lifeScore, isLoading, isComputing, compute } = useLifeScore();

  // Filter to only active domains, preserving canonical order
  const visibleDomains = useMemo(() => {
    const active = lifeScore?.activeDomains;
    if (active && active.length > 0) {
      return ALL_AICA_DOMAINS.filter(d => active.includes(d));
    }
    return ALL_AICA_DOMAINS;
  }, [lifeScore?.activeDomains]);

  // Loading state
  if (isLoading) {
    return <LifeScoreWidgetSkeleton />;
  }

  // Empty state — no score yet
  if (!lifeScore) {
    return (
      <div
        className={`rounded-xl p-4 border border-ceramic-border ${className}`}
        style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #E8ECF0 100%)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-ceramic-accent" />
          <span className="text-sm font-medium text-ceramic-text-primary">Life Score</span>
        </div>
        <p className="text-xs text-ceramic-text-secondary mb-3">
          Calcule seu score de vida integrado para acompanhar seu progresso em todas as areas.
        </p>
        <button
          onClick={() => compute()}
          disabled={isComputing}
          className="w-full flex items-center justify-center gap-2 bg-ceramic-accent hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {isComputing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Calculando...
            </>
          ) : (
            'Calcular Agora'
          )}
        </button>
      </div>
    );
  }

  // Main display
  const compositeDisplay = Math.round(lifeScore.composite * 100);

  return (
    <motion.div
      className={`rounded-xl p-4 border border-ceramic-border ${className}`}
      style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #E8ECF0 100%)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top row: label + sufficiency badge + trend */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-ceramic-accent" />
          <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Life Score
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SufficiencyBadge level={lifeScore.sufficiency} />
          <div className="flex items-center gap-1">
            <TrendIcon trend={lifeScore.trend} size={14} />
            <span className="text-[10px] text-ceramic-text-secondary">
              {getTrendDisplayText(lifeScore.trend)}
            </span>
          </div>
        </div>
      </div>

      {/* Large composite score */}
      <div className="flex items-end gap-1.5 mb-3">
        <span
          className="text-3xl font-bold leading-none"
          style={{ color: getSufficiencyColor(lifeScore.sufficiency) }}
        >
          {compositeDisplay}
        </span>
        <span className="text-xs text-ceramic-text-secondary pb-0.5">/100</span>
      </div>

      {/* Mini domain bars — only active domains */}
      <div className="flex gap-2 mb-3">
        {visibleDomains.map(domain => (
          <MiniDomainBar
            key={domain}
            domain={domain}
            score={lifeScore.domainScores[domain] ?? 0}
          />
        ))}
      </div>

      {/* Spiral alert */}
      {lifeScore.spiralAlert && (
        <div className="flex items-center gap-2 bg-ceramic-warning/10 border border-ceramic-warning/20 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle size={14} className="text-ceramic-warning shrink-0" />
          <span className="text-xs text-ceramic-warning">
            Espiral negativa detectada em{' '}
            {lifeScore.spiralDomains
              .map(d => DOMAIN_LABELS[d])
              .join(', ')}
          </span>
        </div>
      )}

      {/* Ver detalhes link */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-xs text-ceramic-accent hover:text-amber-600 transition-colors ml-auto"
        >
          Ver detalhes
          <ChevronRight size={12} />
        </button>
      )}
    </motion.div>
  );
};
