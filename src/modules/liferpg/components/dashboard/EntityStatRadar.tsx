/**
 * EntityStatRadar — Pure SVG radar chart for entity stats.
 * Shows current stats vs ideal (100) as overlapping polygons.
 */

import React, { useMemo } from 'react';

interface EntityStatRadarProps {
  stats: Record<string, number>;
  size?: number;
  entityColor?: string;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
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
  maxValue: number
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

export const EntityStatRadar: React.FC<EntityStatRadarProps> = ({
  stats,
  size = 200,
  entityColor = '#3B82F6',
}) => {
  const entries = useMemo(() => Object.entries(stats), [stats]);
  const labels = useMemo(() => entries.map(([k]) => k), [entries]);
  const values = useMemo(() => entries.map(([, v]) => v), [entries]);

  if (entries.length < 3) {
    return (
      <div className="flex items-center justify-center text-ceramic-text-secondary text-sm p-4">
        Precisa de pelo menos 3 stats para o radar
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;

  // Grid rings (20, 40, 60, 80, 100)
  const rings = [20, 40, 60, 80, 100];

  // Grid lines from center to each vertex
  const gridLines = labels.map((_, i) => {
    const angle = (2 * Math.PI * i) / labels.length;
    const { x, y } = polarToCartesian(cx, cy, radius, angle);
    return { x, y };
  });

  // Label positions
  const labelPositions = labels.map((label, i) => {
    const angle = (2 * Math.PI * i) / labels.length;
    const { x, y } = polarToCartesian(cx, cy, radius + 18, angle);
    return { label, x, y };
  });

  const idealPoints = buildPolygonPoints(
    cx,
    cy,
    radius,
    labels.map(() => 100),
    100
  );
  const valuePoints = buildPolygonPoints(cx, cy, radius, values, 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Background rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={buildPolygonPoints(
            cx,
            cy,
            radius,
            labels.map(() => ring),
            100
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-ceramic-border"
        />
      ))}

      {/* Grid lines from center */}
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

      {/* Ideal polygon (faint) */}
      <polygon
        points={idealPoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="4 2"
        className="text-ceramic-border"
      />

      {/* Value polygon */}
      <polygon
        points={valuePoints}
        fill={entityColor}
        fillOpacity={0.2}
        stroke={entityColor}
        strokeWidth={2}
      />

      {/* Value dots */}
      {values.map((v, i) => {
        const angle = (2 * Math.PI * i) / labels.length;
        const r = (v / 100) * radius;
        const { x, y } = polarToCartesian(cx, cy, r, angle);
        return <circle key={i} cx={x} cy={y} r={3} fill={entityColor} />;
      })}

      {/* Labels */}
      {labelPositions.map(({ label, x, y }, i) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-ceramic-text-secondary text-[9px] font-medium capitalize"
        >
          {label}
        </text>
      ))}
    </svg>
  );
};
