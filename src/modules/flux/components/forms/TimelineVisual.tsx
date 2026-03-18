/**
 * TimelineVisual Component
 *
 * Horizontal bar visualization showing intensity zone distribution across all series.
 * Only displays for cardio modalities (running, swimming, cycling) as strength doesn't have zones.
 *
 * Features:
 * - Color-coded segments for each series
 * - Hover tooltips with series details
 * - Responsive width distribution
 * - Legend showing total series count
 */

import React from 'react';
import type {
  WorkoutSeries,
  RunningSeries,
  SwimmingSeries,
  CyclingSeries,
} from '../../types/series';
import { ZONE_CONFIGS, isCardioSeries } from '../../types/series';

interface TimelineVisualProps {
  series: WorkoutSeries[];
}

export default function TimelineVisual({ series }: TimelineVisualProps) {
  // Filter only cardio series (strength doesn't have zones)
  const cardioSeries = series.filter(isCardioSeries);

  if (cardioSeries.length === 0) {
    return (
      <div className="p-4 ceramic-inset rounded-lg text-center">
        <p className="text-sm text-ceramic-text-secondary">
          Adicione séries com zonas para visualizar a timeline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ceramic-text-primary">
        Timeline Visual
      </label>

      {/* Horizontal bar */}
      <div className="flex items-center gap-0.5 h-16 rounded-lg overflow-hidden shadow-inner bg-ceramic-inset/50">
        {cardioSeries.map((s, idx) => {
          const config = ZONE_CONFIGS[s.zone] ?? ZONE_CONFIGS['Z2'];
          const width = `${(1 / cardioSeries.length) * 100}%`;

          return (
            <div
              key={idx}
              className={`${config.bgColor} h-full flex items-center justify-center text-white font-bold text-sm transition-all hover:scale-105 hover:shadow-lg cursor-pointer relative group`}
              style={{ width }}
              title={`Série ${idx + 1}: ${s.zone} (${config.range})`}
            >
              <span className="relative z-10">{s.zone}</span>

              {/* Hover tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-ceramic-text-primary text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                <div className="font-bold">Série {idx + 1}</div>
                <div>{s.zone} ({config.range})</div>
                {/* Triangular pointer */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-ceramic-text-primary"></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Início
        </span>
        <span className="font-medium">
          {cardioSeries.length} série{cardioSeries.length > 1 ? 's' : ''} • {getTimelineInsight(cardioSeries)}
        </span>
        <span className="flex items-center gap-1">
          Fim
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
        </span>
      </div>

      {/* Zone distribution summary */}
      <div className="flex items-center justify-center gap-3 text-xs">
        {getZoneDistribution(cardioSeries).map(({ zone, count, percentage }) => {
          if (count === 0) return null;
          const config = ZONE_CONFIGS[zone] ?? ZONE_CONFIGS['Z2'];
          return (
            <div key={zone} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-sm ${config.bgColor}`}></div>
              <span className="text-ceramic-text-secondary">
                {zone}: {count} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate zone distribution across all series
 */
function getZoneDistribution(series: (RunningSeries | SwimmingSeries | CyclingSeries)[]) {
  const zoneCounts = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };

  series.forEach((s) => {
    zoneCounts[s.zone]++;
  });

  const total = series.length;

  return Object.entries(zoneCounts).map(([zone, count]) => ({
    zone: zone as keyof typeof zoneCounts,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

/**
 * Generate insight text about the timeline
 */
function getTimelineInsight(series: (RunningSeries | SwimmingSeries | CyclingSeries)[]): string {
  const avgZone = calculateAverageZone(series);

  if (avgZone <= 1.5) return 'Treino leve';
  if (avgZone <= 2.5) return 'Treino moderado';
  if (avgZone <= 3.5) return 'Treino intenso';
  if (avgZone <= 4.5) return 'Treino muito intenso';
  return 'Treino extremo';
}

/**
 * Calculate average zone as a number (Z1=1, Z2=2, ..., Z5=5)
 */
function calculateAverageZone(series: (RunningSeries | SwimmingSeries | CyclingSeries)[]): number {
  const zoneValues = series.map((s) => {
    switch (s.zone) {
      case 'Z1':
        return 1;
      case 'Z2':
        return 2;
      case 'Z3':
        return 3;
      case 'Z4':
        return 4;
      case 'Z5':
        return 5;
      default:
        return 2;
    }
  });

  const sum = zoneValues.reduce((acc, val) => acc + val, 0);
  return sum / zoneValues.length;
}
