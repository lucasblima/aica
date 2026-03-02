/**
 * FeedbackRadarChart -- Pure SVG radar/spider chart for feedback questionnaire data.
 *
 * Shows exactly 6 indicators from the athlete questionnaire:
 *   1. Volume adequado
 *   2. Intensidade adequada
 *   3. Cuidado com alimentacao
 *   4. Cumpriu com volume
 *   5. Cumpriu com intensidade
 *   6. Qualidade do sono
 *
 * Stress and fatigue are displayed as separate gauges (StressFatigueGauges).
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
 * Derive exactly 6 radar dimensions from the raw questionnaire fields.
 * Returns null if fewer than 3 fields are populated (not enough data to render).
 *
 * The 6 indicators are:
 *   1. Volume adequado   (volume_adequate)
 *   2. Intensidade adequada (intensity_adequate)
 *   3. Cuidado com alimentacao (nutrition)
 *   4. Cumpriu com volume (volume_completed)
 *   5. Cumpriu com intensidade (intensity_completed)
 *   6. Qualidade do sono  (sleep)
 */
function extractDimensions(q: QuestionnaireData): RadarDimension[] | null {
  const dims: { label: string; raw: number | undefined }[] = [
    { label: 'Volume adequado', raw: q.volume_adequate },
    { label: 'Intensidade adequada', raw: q.intensity_adequate },
    { label: 'Alimentacao', raw: q.nutrition },
    { label: 'Cumpriu volume', raw: q.volume_completed },
    { label: 'Cumpriu intensidade', raw: q.intensity_completed },
    { label: 'Qualidade do sono', raw: q.sleep },
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

        {/* Numeric scale labels along first axis (12 o'clock) */}
        {rings.map((ring) => {
          const r = (ring / MAX_VALUE) * radius;
          const { x, y } = polarToCartesian(cx, cy, r, 0);
          return (
            <text
              key={`scale-${ring}`}
              x={x + 8}
              y={y}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-ceramic-text-secondary text-[8px] font-bold"
            >
              {ring}
            </text>
          );
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
