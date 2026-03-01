/**
 * ScoreCard — Reusable Scientific Score Display
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Displays a single scientific score with trend, sufficiency level,
 * and a "How is this calculated?" explainer trigger.
 * Follows Ceramic Design System.
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle } from 'lucide-react';
import type { ScientificScore, ScoreExplanation, ScoreTrend, SufficiencyLevel } from '@/services/scoring/types';
import {
  getSufficiencyColor,
  getSufficiencyDisplayText,
  getTrendDisplayText,
} from '@/services/scoring/types';
import { ScoreExplainer } from './ScoreExplainer';

// ============================================================================
// TREND ICON
// ============================================================================

function TrendIcon({ trend, className = '' }: { trend: ScoreTrend; className?: string }) {
  const iconProps = { size: 16, className };
  switch (trend) {
    case 'improving':
      return <TrendingUp {...iconProps} style={{ color: 'var(--color-ceramic-success, #6B7B5C)' }} />;
    case 'declining':
      return <TrendingDown {...iconProps} style={{ color: 'var(--color-ceramic-error, #9B4D3A)' }} />;
    case 'stable':
      return <Minus {...iconProps} style={{ color: 'var(--color-ceramic-text-secondary, #948D82)' }} />;
  }
}

// ============================================================================
// SCORE CARD COMPONENT
// ============================================================================

interface ScoreCardProps {
  /** Score data */
  score: ScientificScore;
  /** Explanation data (from scoreExplainerService) */
  explanation?: ScoreExplanation | null;
  /** Card title override (defaults to explanation.title or score.dimension) */
  title?: string;
  /** Show the raw value instead of normalized (default: show percentage) */
  showRaw?: boolean;
  /** Compact mode (smaller, no explainer button) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  score,
  explanation,
  title,
  showRaw = false,
  compact = false,
  className = '',
}) => {
  const [showExplainer, setShowExplainer] = useState(false);

  const displayTitle = title ?? explanation?.title ?? score.dimension;
  const displayValue = showRaw
    ? score.rawValue.toFixed(1)
    : `${(score.value * 100).toFixed(0)}%`;
  const sufficiencyColor = getSufficiencyColor(score.sufficiency);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 bg-ceramic-50 ${className}`}
        data-testid={`score-card-${score.dimension}`}
      >
        <span
          className="text-lg font-semibold"
          style={{ color: sufficiencyColor }}
        >
          {displayValue}
        </span>
        <span className="text-sm text-ceramic-text-secondary truncate">
          {displayTitle}
        </span>
        <TrendIcon trend={score.trend} />
      </div>
    );
  }

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}
      data-testid={`score-card-${score.dimension}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-ceramic-text-primary">
          {displayTitle}
        </h3>
        <div className="flex items-center gap-1">
          {score.isContested && (
            <span title="Evidência científica mista — heurística prática">
              <AlertTriangle
                size={14}
                className="text-ceramic-warning"
              />
            </span>
          )}
          {explanation && (
            <button
              onClick={() => setShowExplainer(true)}
              className="p-1 rounded-md hover:bg-ceramic-cool transition-colors"
              title="Como isso é calculado?"
              aria-label="Como isso é calculado?"
            >
              <Info size={14} className="text-ceramic-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Score value */}
      <div className="flex items-end gap-2 mb-2">
        <span
          className="text-2xl font-bold"
          style={{ color: sufficiencyColor }}
        >
          {displayValue}
        </span>
        <div className="flex items-center gap-1 pb-1">
          <TrendIcon trend={score.trend} />
          <span className="text-xs text-ceramic-text-secondary">
            {getTrendDisplayText(score.trend)}
          </span>
        </div>
      </div>

      {/* Sufficiency badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${sufficiencyColor}20`,
            color: sufficiencyColor,
          }}
        >
          {getSufficiencyDisplayText(score.sufficiency)}
        </span>
        {score.confidence < 0.5 && (
          <span className="text-xs text-ceramic-text-secondary italic">
            Dados limitados
          </span>
        )}
      </div>

      {/* Explainer popover */}
      {showExplainer && explanation && (
        <ScoreExplainer
          explanation={explanation}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </div>
  );
};
