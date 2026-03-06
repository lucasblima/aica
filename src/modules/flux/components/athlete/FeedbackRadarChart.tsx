/**
 * FeedbackRadarChart -- Pure SVG radar/spider chart for feedback questionnaire data.
 *
 * Shows exactly 6 scientific training indicators:
 *   1. Volume      (volume_adequate — coach prescription vs perception)
 *   2. Intensidade (intensity_adequate — coach prescription vs perception)
 *   3. Aderencia   (average of volume_completed + intensity_completed)
 *   4. Carga sRPE  (session RPE derived from stress, scaled 0-5)
 *   5. Recuperacao  (Hooper-inspired: avg of sleep + inverted fatigue)
 *   6. Alimentacao (nutrition)
 *
 * Stress and fatigue feed into derived axes (sRPE and Recovery).
 * Raw stress/fatigue + ACWR are displayed as separate gauges (StressFatigueGauges).
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
 * Derive exactly 6 scientific radar dimensions from the raw questionnaire fields.
 * Returns null if fewer than 3 source fields are populated (not enough data to render).
 *
 * The 6 scientific axes (#769):
 *   1. Volume        — volume_adequate (prescription perception)
 *   2. Intensidade   — intensity_adequate (prescription perception)
 *   3. Aderencia     — avg(volume_completed, intensity_completed) (compliance)
 *   4. Carga (sRPE)  — stress field as session RPE proxy, scaled 0-5
 *   5. Recuperacao   — Hooper-inspired: avg(sleep, 5-fatigue)
 *   6. Alimentacao   — nutrition
 */
function extractDimensions(q: QuestionnaireData): RadarDimension[] | null {
  // Count raw source fields that have data
  const sources = [
    q.volume_adequate,
    q.intensity_adequate,
    q.volume_completed,
    q.intensity_completed,
    q.stress,
    q.sleep,
    q.fatigue,
    q.nutrition,
  ];
  const populated = sources.filter((v) => v != null).length;
  if (populated < 3) return null;

  // Derived: Aderencia = average of compliance metrics
  const adherence =
    q.volume_completed != null && q.intensity_completed != null
      ? (q.volume_completed + q.intensity_completed) / 2
      : q.volume_completed ?? q.intensity_completed ?? 0;

  // Derived: Carga (sRPE proxy) — stress 0-5 mapped directly
  const load = q.stress ?? 0;

  // Derived: Recuperacao (Hooper-inspired) — avg(sleep, inverted fatigue)
  // Higher = better recovery. Fatigue inverted: 5 - fatigue.
  const sleepVal = q.sleep ?? 0;
  const invertedFatigue = q.fatigue != null ? MAX_VALUE - q.fatigue : 0;
  const recovery =
    q.sleep != null || q.fatigue != null
      ? (sleepVal + invertedFatigue) / (q.sleep != null && q.fatigue != null ? 2 : 1)
      : 0;

  return [
    { label: 'Volume', value: q.volume_adequate ?? 0 },
    { label: 'Intensidade', value: q.intensity_adequate ?? 0 },
    { label: 'Aderencia', value: adherence },
    { label: 'Carga (sRPE)', value: load },
    { label: 'Recuperacao', value: recovery },
    { label: 'Alimentacao', value: q.nutrition ?? 0 },
  ];
}

// ---- Component ----

/**
 * Interpolate between cool (blue) and warm (red/amber) based on
 * area coverage ratio (0 = coldest, 1 = warmest).
 */
function getHeatColor(ratio: number): string {
  // Clamp ratio between 0 and 1
  const t = Math.max(0, Math.min(1, ratio));
  // Gradient: blue (cold) -> cyan -> green -> amber -> red (hot)
  if (t < 0.25) {
    // Blue to Cyan
    const p = t / 0.25;
    const r = Math.round(59 + (6 - 59) * p);
    const g = Math.round(130 + (182 - 130) * p);
    const b = Math.round(246 + (212 - 246) * p);
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.5) {
    // Cyan to Green
    const p = (t - 0.25) / 0.25;
    const r = Math.round(6 + (34 - 6) * p);
    const g = Math.round(182 + (197 - 182) * p);
    const b = Math.round(212 + (94 - 212) * p);
    return `rgb(${r},${g},${b})`;
  }
  if (t < 0.75) {
    // Green to Amber
    const p = (t - 0.5) / 0.25;
    const r = Math.round(34 + (245 - 34) * p);
    const g = Math.round(197 + (158 - 197) * p);
    const b = Math.round(94 + (11 - 94) * p);
    return `rgb(${r},${g},${b})`;
  }
  // Amber to Red
  const p = (t - 0.75) / 0.25;
  const r = Math.round(245 + (239 - 245) * p);
  const g = Math.round(158 + (68 - 158) * p);
  const b = Math.round(11 + (68 - 11) * p);
  return `rgb(${r},${g},${b})`;
}

export const FeedbackRadarChart: React.FC<FeedbackRadarChartProps> = ({
  questionnaire,
  size = 260,
  accentColor,
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
  const radius = size / 2 - 48; // More padding for larger labels

  const rings = [0, 1, 2, 3, 4, 5]; // Include 0 at center (#689)

  // Calculate area ratio for heat color (#688)
  const avgValue = values.reduce((s, v) => s + v, 0) / values.length;
  const areaRatio = avgValue / MAX_VALUE;
  const heatColor = accentColor || getHeatColor(areaRatio);

  // Radial grid lines from center to each vertex
  const gridLines = labels.map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const { x, y } = polarToCartesian(cx, cy, radius, angle);
    return { x, y };
  });

  // Label positions — pushed further out to avoid truncation (#689)
  const labelPositions = labels.map((label, i) => {
    const angle = (2 * Math.PI * i) / count;
    const { x, y } = polarToCartesian(cx, cy, radius + 30, angle);
    return { label, x, y, angle };
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
        className="max-w-[260px]"
        role="img"
        aria-label="Radar de feedback do atleta"
      >
        {/* Background rings — include ring 0 at center */}
        {rings.map((ring) => {
          if (ring === 0) {
            // Center dot for 0
            return <circle key={ring} cx={cx} cy={cy} r={2} fill="currentColor" className="text-ceramic-border" />;
          }
          return (
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
          );
        })}

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

        {/* Actual value polygon — heat-colored (#688) */}
        <polygon
          points={valuePoints}
          fill={heatColor}
          fillOpacity={0.25}
          stroke={heatColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Value dots on each vertex */}
        {values.map((v, i) => {
          const angle = (2 * Math.PI * i) / count;
          const r = (v / MAX_VALUE) * radius;
          const { x, y } = polarToCartesian(cx, cy, r, angle);
          return <circle key={i} cx={x} cy={y} r={3.5} fill={heatColor} />;
        })}

        {/* Numeric scale labels along first axis (12 o'clock) — include 0 (#689) */}
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
              className="fill-ceramic-text-secondary text-[9px] font-bold"
            >
              {ring}
            </text>
          );
        })}

        {/* Axis labels — larger font, no truncation (#689) */}
        {labelPositions.map(({ label, x, y, angle }, i) => {
          // Determine text anchor based on position to avoid cutoff
          const normalizedAngle = angle % (2 * Math.PI);
          let anchor: 'start' | 'middle' | 'end' = 'middle';
          if (normalizedAngle > 0.3 && normalizedAngle < Math.PI - 0.3) {
            anchor = 'start';
          } else if (normalizedAngle > Math.PI + 0.3 && normalizedAngle < 2 * Math.PI - 0.3) {
            anchor = 'end';
          }

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-ceramic-text-primary text-[11px] font-medium"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
