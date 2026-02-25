/**
 * HPSparkline — Pure SVG sparkline for HP history visualization.
 * No external dependencies, follows EntityStatRadar pattern.
 */

import React, { useId } from 'react';
import type { HPDataPoint } from '../../hooks/useHPHistory';

interface HPSparklineProps {
  data: HPDataPoint[];
  width?: number;
  height?: number;
}

export const HPSparkline: React.FC<HPSparklineProps> = ({
  data,
  width = 200,
  height = 40,
}) => {
  if (data.length < 2) return null;

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  // Normalize: HP is 0-100
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * w,
    y: padding + h - (d.hp / 100) * h,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Color based on last value
  const lastHP = data[data.length - 1].hp;
  const color = lastHP >= 70 ? '#10B981' : lastHP >= 40 ? '#F59E0B' : '#EF4444';

  // Gradient fill path
  const fillPath = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  // Unique gradient ID per component instance
  const gradientId = `hp-grad-${useId()}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={color}
      />
    </svg>
  );
};
