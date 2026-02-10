/**
 * HealthScoreBadge Component
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Compact badge showing health score with color-coded indicator.
 * Used in contact lists, cards, and compact views.
 *
 * @example
 * <HealthScoreBadge score={75} trend="improving" />
 * <HealthScoreBadge score={35} size="lg" showTrend />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import {
  getRiskLevel,
  getRiskColor,
  type HealthScoreTrend,
  type RiskLevel,
} from '@/types/healthScore';

// ============================================================================
// TYPES
// ============================================================================

interface HealthScoreBadgeProps {
  /** Health score value (0-100) */
  score: number | null;
  /** Score trend direction */
  trend?: HealthScoreTrend | null;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show trend indicator */
  showTrend?: boolean;
  /** Show risk label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get risk label in Portuguese
 */
function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'Crítico';
    case 'high':
      return 'Alto Risco';
    case 'moderate':
      return 'Moderado';
    case 'healthy':
      return 'Saudável';
  }
}

/**
 * Get trend icon component
 */
function TrendIcon({ trend, className }: { trend: HealthScoreTrend; className?: string }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className={className} />;
    case 'declining':
      return <TrendingDown className={className} />;
    case 'stable':
      return <Minus className={className} />;
    case 'new':
      return <Sparkles className={className} />;
  }
}

/**
 * Get trend color
 */
function getTrendColor(trend: HealthScoreTrend): string {
  switch (trend) {
    case 'improving':
      return '#6B7B5C'; // ceramic-success
    case 'declining':
      return '#9B4D3A'; // ceramic-error
    case 'stable':
      return '#8C8279'; // ceramic-text-secondary
    case 'new':
      return '#7C6E58'; // ceramic-accent
  }
}

/**
 * Get size classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        container: 'h-6 min-w-6 px-1.5 text-xs',
        score: 'text-xs font-bold',
        icon: 'w-3 h-3',
        label: 'text-[10px]',
      };
    case 'md':
      return {
        container: 'h-8 min-w-8 px-2 text-sm',
        score: 'text-sm font-bold',
        icon: 'w-4 h-4',
        label: 'text-xs',
      };
    case 'lg':
      return {
        container: 'h-10 min-w-10 px-3 text-base',
        score: 'text-base font-bold',
        icon: 'w-5 h-5',
        label: 'text-sm',
      };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthScoreBadge({
  score,
  trend,
  size = 'md',
  showTrend = false,
  showLabel = false,
  className = '',
  onClick,
}: HealthScoreBadgeProps) {
  // Handle null score
  if (score === null) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-ceramic-base text-ceramic-text-tertiary ${getSizeClasses(size).container} ${className}`}
      >
        <span className={getSizeClasses(size).score}>--</span>
      </div>
    );
  }

  const riskLevel = getRiskLevel(score);
  const color = getRiskColor(riskLevel);
  const sizeClasses = getSizeClasses(size);

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${sizeClasses.container}
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
        ${className}
      `}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      {/* Score */}
      <span className={sizeClasses.score}>{score}</span>

      {/* Trend Icon */}
      {showTrend && trend && (
        <TrendIcon
          trend={trend}
          className={sizeClasses.icon}
          style={{ color: getTrendColor(trend) } as React.CSSProperties}
        />
      )}

      {/* Risk Label */}
      {showLabel && (
        <span className={`${sizeClasses.label} opacity-80`}>
          {getRiskLabel(riskLevel)}
        </span>
      )}
    </Component>
  );
}

// ============================================================================
// CIRCULAR VARIANT
// ============================================================================

interface HealthScoreCircleProps {
  /** Health score value (0-100) */
  score: number | null;
  /** Circle size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Show score number in center */
  showScore?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function HealthScoreCircle({
  score,
  size = 48,
  strokeWidth = 4,
  showScore = true,
  className = '',
}: HealthScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;
  const offset = circumference - progress;

  const color = score !== null ? getRiskColor(getRiskLevel(score)) : '#E5E7EB';

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        className="absolute transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {score !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
      </svg>

      {/* Score text */}
      {showScore && (
        <span
          className="text-sm font-bold"
          style={{ color: score !== null ? color : '#9CA3AF' }}
        >
          {score !== null ? score : '--'}
        </span>
      )}
    </div>
  );
}

export default HealthScoreBadge;
