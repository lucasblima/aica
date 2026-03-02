import React, { useState } from 'react';

export interface HeatmapDay {
  date: string;
  intensity: number;
  label?: string;
  emoji?: string;
}

interface HeatmapGridProps {
  days: HeatmapDay[];
  intensityColors?: string[];
  columns?: number;
  cellSize?: number;
  gap?: number;
  onDayHover?: (day: HeatmapDay) => void;
  onDayClick?: (day: HeatmapDay) => void;
  className?: string;
}

const DEFAULT_COLORS = ['#E0DDD5', '#fde68a', '#fbbf24', '#f59e0b'];

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  days, intensityColors = DEFAULT_COLORS, columns = 7, cellSize = 8, gap = 2,
  onDayHover, onDayClick, className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  return (
    <div className={`inline-grid ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`, gap: `${gap}px` }} role="grid" aria-label="Activity heatmap">
      {days.map((day, i) => {
        const color = intensityColors[Math.min(day.intensity, intensityColors.length - 1)] || intensityColors[0];
        return (
          <div key={day.date} data-testid={`heatmap-cell-${i}`} className="rounded-sm cursor-pointer transition-transform hover:scale-125" style={{ width: cellSize, height: cellSize, backgroundColor: color }} role="gridcell" aria-label={day.label || day.date}
            onMouseEnter={() => { setHoveredIndex(i); onDayHover?.(day); }}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onDayClick?.(day)}
          />
        );
      })}
    </div>
  );
};
