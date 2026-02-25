/**
 * FeedbackRadarChart -- Pure SVG radar/spider chart for feedback questionnaire data.
 *
 * Shows 6 dimensions derived from the athlete questionnaire:
 *   Volume (avg of volume_adequate + volume_completed)
 *   Intensidade (avg of intensity_adequate + intensity_completed)
 *   Fadiga (inverted: low fatigue = good score)
 *   Stress (inverted: low stress = good score)
 *   Nutricao
 *   Sono
 *
 * Reference implementation: EntityStatRadar.tsx (Life RPG module)
 */

import React, { useMemo } from 'react';
import type { QuestionnaireData } from '../../hooks/useAthleteFeedback';

export interface FeedbackRadarChartProps {
  questionnaire: QuestionnaireData;
  /** SVG logical size (viewBox). Defaults to 220. */
  size?: number;
  /** Fill color for the value polygon. Defaults to amber-500 (#F59E0B). */
  accentColor?: string;
  /** Optional title displayed above the chart */
  title?: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
}

// ---- Geometry helpers (same pattern as EntityStatRadar) ----

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleRad - Math.PI / 2),
    y: cy + radius * Math.sin(angleRad - Math.PI / 2),
  };
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  maxValue: number,
): string {
  const count = values.length;
  return values
    .map((v, i) => {
      const angle = (2 * Math.PI * i) / count;
      const r = (v / maxValue) * radius;
      const { x, y } = polarToCartesian(cx, cy, r, angle);
      return `${x},${y}`;
    })
    .join(' ');
}

// ---- Dimension extraction ----

interface RadarDimension {
  label: string;
  value: number; // 0-5 scale
}

const MAX_VALUE = 5;

/**
 * Derive 6 radar dimensions from the raw 8-field questionnaire.
 * Returns null if fewer than 3 fields are populated (not enough data to render).
 */
function extractDimensions(q: QuestionnaireData): RadarDimension[] | null {
  const avg = (a?: number, b?: number): number | undefined => {
    if (a != null && b != null) return (a + b) / 2;
    return a ?? b;
  };

  const invert = (v?: number): number | undefined => {
    if (v == null) return undefined;
    return MAX_VALUE - v;
  };

  const dims: { label: string; raw: number | undefined }[] = [
    { label: 'Volume', raw: avg(q.volume_adequate, q.volume_completed) },
    { label: 'Intensidade', raw: avg(q.intensity_adequate, q.intensity_completed) },
    { label: 'Fadiga', raw: invert(q.fatigue) },
    { label: 'Stress', raw: invert(q.stress) },
    { label: 'Nutricao', raw: q.nutrition },
    { label: 'Sono', raw: q.sleep },
  ];

  // Need at least 3 populated dimensions
  const populated = dims.filter((d) => d.raw != null);
  if (populated.length < 3) return null;

  // Fill missing with 0 so the polygon still closes
  return dims.map((d) => ({
    label: d.label,
    value: d.raw ?? 0,
  }));
}

// ---- Component ----

export const FeedbackRadarChart: React.FC<FeedbackRadarChartProps> = ({
  questionnaire,
  size = 220,
  accentColor = '#F59E0B', // amber-500
  title,
  subtitle,
}) => {
  const dimensions = useMemo(() => extractDimensions(questionnaire), [questionnaire]);

  if (!dimensions) return null;

  const labels = dimensions.map((d) => d.label);
  const values = dimensions.map((d) => d.value);
  const count = labels.length;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 32;

  const rings = [1, 2, 3, 4, 5];

  // Radial grid lines from center to each vertex
  const gridLines = labels.map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const { x, y } = polarToCartesian(cx, cy, radius, angle);
    return { x, y };
  });

  // Label positions (slightly outside the outermost ring)
  const labelPositions = labels.map((label, i) => {
    const angle = (2 * Math.PI * i) / count;
    const { x, y } = polarToCartesian(cx, cy, radius + 20, angle);
    return { label, x, y };
  });

  // Ideal (max) polygon -- dashed reference at 100%
  const idealPoints = buildPolygonPoints(
    cx,
    cy,
    radius,
    labels.map(() => MAX_VALUE),
    MAX_VALUE,
  );

  // Actual values polygon
  const valuePoints = buildPolygonPoints(cx, cy, radius, values, MAX_VALUE);

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="text-sm font-bold text-ceramic-text-primary mb-1">{title}</h4>
      )}
      {subtitle && (
        <p className="text-xs text-ceramic-text-secondary mb-2">{subtitle}</p>
      )}
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-[220px]"
        role="img"
        aria-label="Radar de feedback do atleta"
      >
        {/* Background rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={buildPolygonPoints(
              cx,
              cy,
              radius,
              labels.map(() => ring),
              MAX_VALUE,
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-ceramic-border"
          />
        ))}

        {/* Radial grid lines from center */}
        {gridLines.map((point, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={point.x}
            y2={point.y}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-ceramic-border"
          />
        ))}

        {/* Ideal polygon (dashed, faint reference at max) */}
        <polygon
          points={idealPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 2"
          className="text-ceramic-border"
        />

        {/* Actual value polygon */}
        <polygon
          points={valuePoints}
          fill={accentColor}
          fillOpacity={0.2}
          stroke={accentColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Value dots on each vertex */}
        {values.map((v, i) => {
          const angle = (2 * Math.PI * i) / count;
          const r = (v / MAX_VALUE) * radius;
          const { x, y } = polarToCartesian(cx, cy, r, angle);
          return <circle key={i} cx={x} cy={y} r={3} fill={accentColor} />;
        })}

        {/* Axis labels */}
        {labelPositions.map(({ label, x, y }, i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ceramic-text-secondary text-[9px] font-medium"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
};
