/**
 * RelationshipScoreBadge
 * Displays a health score with color-coded visual feedback
 *
 * Used in: WhatsAppContactCard, ContactCard, ContactDetailModal
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { RiskLevel, HealthScoreTrend } from '@/types/healthScore';

export interface RelationshipScoreBadgeProps {
  /** Health score value (0-100) */
  score: number | null | undefined;
  /** Optional trend indicator */
  trend?: HealthScoreTrend;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show trend icon */
  showTrend?: boolean;
  /** Show score label (e.g., "Saudável") */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get risk level from score value
 */
function getRiskLevel(score: number | null | undefined): RiskLevel {
  if (score === null || score === undefined) return 'moderate';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'high';
  return 'critical';
}

/**
 * Get color classes based on risk level
 */
function getColorClasses(riskLevel: RiskLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (riskLevel) {
    case 'healthy':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200'
      };
    case 'moderate':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      };
    case 'high':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200'
      };
    case 'critical':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200'
      };
  }
}

/**
 * Get label text for risk level
 */
function getLabel(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'healthy':
      return 'Saudável';
    case 'moderate':
      return 'Moderado';
    case 'high':
      return 'Atenção';
    case 'critical':
      return 'Crítico';
  }
}

/**
 * Get trend icon
 */
function TrendIcon({ trend }: { trend: HealthScoreTrend }) {
  switch (trend) {
    case 'improving':
      return (
        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    case 'declining':
      return (
        <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    case 'stable':
      return (
        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      );
    case 'new':
      return (
        <span className="text-xs text-blue-600">novo</span>
      );
  }
}

/**
 * Size classes for different variants
 */
const sizeClasses = {
  sm: {
    container: 'px-1.5 py-0.5 text-xs gap-1',
    score: 'text-xs font-medium'
  },
  md: {
    container: 'px-2 py-1 text-sm gap-1.5',
    score: 'text-sm font-semibold'
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2',
    score: 'text-base font-bold'
  }
};

export function RelationshipScoreBadge({
  score,
  trend,
  size = 'md',
  showTrend = false,
  showLabel = false,
  className
}: RelationshipScoreBadgeProps) {
  const riskLevel = getRiskLevel(score);
  const colors = getColorClasses(riskLevel);
  const sizes = sizeClasses[size];

  // Handle null/undefined score
  const displayScore = score !== null && score !== undefined ? Math.round(score) : '—';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        colors.bg,
        colors.border,
        sizes.container,
        className
      )}
      title={`Health Score: ${displayScore}${trend ? ` (${trend})` : ''}`}
    >
      {/* Score value */}
      <span className={cn(sizes.score, colors.text)}>
        {displayScore}
      </span>

      {/* Optional label */}
      {showLabel && (
        <span className={cn('text-opacity-80', colors.text)}>
          {getLabel(riskLevel)}
        </span>
      )}

      {/* Optional trend indicator */}
      {showTrend && trend && (
        <TrendIcon trend={trend} />
      )}
    </div>
  );
}

/**
 * Compact version showing just a colored dot with score
 */
export function ScoreDot({
  score,
  size = 'md',
  className
}: {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const riskLevel = getRiskLevel(score);
  const colors = getColorClasses(riskLevel);

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        dotSizes[size],
        colors.bg.replace('100', '500'),
        className
      )}
      title={`Health Score: ${score ?? 'N/A'}`}
    />
  );
}

export default RelationshipScoreBadge;
