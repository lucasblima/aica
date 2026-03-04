/**
 * LifeScoreRadar — Domain Radar Chart
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Radar/spider chart displaying all AICA domain scores.
 * Uses SVG for lightweight rendering without chart library dependency.
 * Follows Ceramic Design System.
 *
 * Restored: Issue #717 — accidentally deleted in PR #713.
 */

import React, { useMemo } from 'react';
import type { AicaDomain, LifeScore } from '@/services/scoring/types';
import { DOMAIN_LABELS } from '@/services/scoring/lifeScoreService';
import { getSufficiencyColor, getSufficiencyLevel } from '@/services/scoring/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DOMAINS_ORDER: AicaDomain[] = [
  'atlas', 'journey', 'connections', 'finance', 'grants', 'studio', 'flux',
];

/** Sufficiency threshold line (GNH-inspired: 0.66) */
const SUFFICIENCY_THRESHOLD = 0.66;

/** SVG dimensions */
const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 100;

/** Domain icons (emoji for lightweight rendering) */
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
// GEOMETRY HELPERS
// ============================================================================

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  // Start from top (-90 degrees) and go clockwise
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function buildPolygonPoints(values: number[], maxRadius: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (360 / n) * i;
      const r = Math.max(v, 0.05) * maxRadius;
      const { x, y } = polarToCartesian(angle, r);
      return `${x},${y}`;
    })
    .join(' ');
}

// ============================================================================
// COMPONENT
// ============================================================================

interface LifeScoreRadarProps {
  lifeScore: LifeScore;
  /** Show domain labels (default: true) */
  showLabels?: boolean;
  /** Show sufficiency threshold ring (default: true) */
  showThreshold?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const LifeScoreRadar: React.FC<LifeScoreRadarProps> = ({
  lifeScore,
  showLabels = true,
  showThreshold = true,
  className = '',
}) => {
  const n = DOMAINS_ORDER.length;

  // Get scores in order
  const scores = useMemo(
    () => DOMAINS_ORDER.map(d => lifeScore.domainScores[d] ?? 0),
    [lifeScore.domainScores]
  );

  // Grid rings (0.25, 0.50, 0.75, 1.0)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axis lines
  const axes = useMemo(
    () =>
      DOMAINS_ORDER.map((_, i) => {
        const angle = (360 / n) * i;
        return polarToCartesian(angle, RADIUS);
      }),
    [n]
  );

  // Score polygon
  const scorePoints = useMemo(
    () => buildPolygonPoints(scores, RADIUS),
    [scores]
  );

  // Threshold polygon
  const thresholdPoints = useMemo(
    () => buildPolygonPoints(Array(n).fill(SUFFICIENCY_THRESHOLD), RADIUS),
    [n]
  );

  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="life-score-radar">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
      >
        {/* Grid rings */}
        {rings.map(r => (
          <polygon
            key={r}
            points={buildPolygonPoints(Array(n).fill(r), RADIUS)}
            fill="none"
            stroke="var(--color-ceramic-border, #D1CBC2)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {axes.map((point, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={point.x}
            y2={point.y}
            stroke="var(--color-ceramic-border, #D1CBC2)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Sufficiency threshold ring */}
        {showThreshold && (
          <polygon
            points={thresholdPoints}
            fill="none"
            stroke="var(--color-ceramic-accent, #D97706)"
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.6}
          />
        )}

        {/* Score polygon — filled area */}
        <polygon
          points={scorePoints}
          fill="var(--color-ceramic-accent, #D97706)"
          fillOpacity={0.15}
          stroke="var(--color-ceramic-accent, #D97706)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {scores.map((s, i) => {
          const angle = (360 / n) * i;
          const r = Math.max(s, 0.05) * RADIUS;
          const { x, y } = polarToCartesian(angle, r);
          const sufficiency = getSufficiencyLevel(s);
          const color = getSufficiencyColor(sufficiency);

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill={color}
              stroke="var(--color-ceramic-base, #F0EFE9)"
              strokeWidth={2}
            />
          );
        })}

        {/* Labels */}
        {showLabels &&
          DOMAINS_ORDER.map((domain, i) => {
            const angle = (360 / n) * i;
            const labelR = RADIUS + 28;
            const { x, y } = polarToCartesian(angle, labelR);

            return (
              <g key={domain}>
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs"
                  fill="var(--color-ceramic-text-secondary, #948D82)"
                >
                  {DOMAIN_ICONS[domain]}
                </text>
                <text
                  x={x}
                  y={y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px]"
                  fill="var(--color-ceramic-text-secondary, #948D82)"
                >
                  {DOMAIN_LABELS[domain]}
                </text>
              </g>
            );
          })}

        {/* Center composite score */}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold"
          fill="var(--color-ceramic-text-primary, #5C554B)"
        >
          {(lifeScore.composite * 100).toFixed(0)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px]"
          fill="var(--color-ceramic-text-secondary, #948D82)"
        >
          Life Score
        </text>
      </svg>
    </div>
  );
};
