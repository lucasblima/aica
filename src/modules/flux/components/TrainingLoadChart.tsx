/**
 * TrainingLoadChart
 * Sprint 6 — Flux Training Science
 *
 * SVG chart showing CTL (blue), ATL (red), TSB (green fill area)
 * over ~60 day window with fatigue zone markings.
 */

import React, { useMemo } from 'react';
import type { StressHistoryRow } from '../services/fatigueModeling';

export interface TrainingLoadChartProps {
  history: StressHistoryRow[];
  className?: string;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 45 };

const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * TSB zone color bands
 */
const TSB_ZONES = [
  { min: -Infinity, max: -30, color: '#ef4444', label: 'Overtraining' },
  { min: -30, max: -10, color: '#f97316', label: 'Fadiga alta' },
  { min: -10, max: 5, color: '#eab308', label: 'Moderada' },
  { min: 5, max: Infinity, color: '#22c55e', label: 'Descansado' },
];

function scaleX(index: number, total: number): number {
  if (total <= 1) return PADDING.left;
  return PADDING.left + (index / (total - 1)) * INNER_WIDTH;
}

function scaleY(value: number, min: number, max: number): number {
  const range = max - min || 1;
  return PADDING.top + INNER_HEIGHT - ((value - min) / range) * INNER_HEIGHT;
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export const TrainingLoadChart: React.FC<TrainingLoadChartProps> = ({ history, className = '' }) => {
  const { ctlPath, atlPath, tsbFillPath, yMin, yMax, yTicks, xLabels } = useMemo(() => {
    if (history.length === 0) {
      return { ctlPath: '', atlPath: '', tsbFillPath: '', yMin: 0, yMax: 100, yTicks: [0, 50, 100], xLabels: [] };
    }

    const allValues = history.flatMap(h => [h.ctl, h.atl, h.tsb]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const padding = Math.max((rawMax - rawMin) * 0.1, 5);
    const yMin = Math.floor(rawMin - padding);
    const yMax = Math.ceil(rawMax + padding);

    const total = history.length;

    // CTL line points
    const ctlPoints = history.map((h, i) => ({
      x: scaleX(i, total),
      y: scaleY(h.ctl, yMin, yMax),
    }));

    // ATL line points
    const atlPoints = history.map((h, i) => ({
      x: scaleX(i, total),
      y: scaleY(h.atl, yMin, yMax),
    }));

    // TSB fill area (from zero line to TSB value)
    const zeroY = scaleY(0, yMin, yMax);
    const tsbPoints = history.map((h, i) => ({
      x: scaleX(i, total),
      y: scaleY(h.tsb, yMin, yMax),
    }));

    const tsbFillPath = tsbPoints.length > 0
      ? `M ${tsbPoints[0].x.toFixed(1)} ${zeroY.toFixed(1)} ` +
        tsbPoints.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
        ` L ${tsbPoints[tsbPoints.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
      : '';

    const ctlPath = buildPath(ctlPoints);
    const atlPath = buildPath(atlPoints);

    // Y-axis ticks
    const tickCount = 5;
    const step = (yMax - yMin) / (tickCount - 1);
    const yTicks = Array.from({ length: tickCount }, (_, i) => Math.round(yMin + i * step));

    // X-axis labels (show a few dates)
    const labelIndices = [0, Math.floor(total / 4), Math.floor(total / 2), Math.floor(3 * total / 4), total - 1]
      .filter((v, i, arr) => arr.indexOf(v) === i && v < total);
    const xLabels = labelIndices.map(i => ({
      x: scaleX(i, total),
      label: history[i].date.slice(5), // MM-DD
    }));

    return { ctlPath, atlPath, tsbFillPath, yMin, yMax, yTicks, xLabels };
  }, [history]);

  if (history.length < 2) {
    return (
      <div className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}>
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-2">Carga de Treino</h3>
        <p className="text-xs text-ceramic-text-secondary">
          Dados insuficientes. Registre pelo menos 2 sessoes para visualizar o grafico.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-ceramic-text-primary">Carga de Treino</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
            CTL
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
            ATL
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-emerald-500/30 inline-block rounded" />
            TSB
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map(tick => {
          const y = scaleY(tick, yMin, yMax);
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <text
                x={PADDING.left - 5}
                y={y + 3}
                textAnchor="end"
                fill="#6b7280"
                fontSize="9"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PADDING.left}
            y1={scaleY(0, yMin, yMax)}
            x2={CHART_WIDTH - PADDING.right}
            y2={scaleY(0, yMin, yMax)}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}

        {/* X-axis labels */}
        {xLabels.map(({ x, label }) => (
          <text
            key={label}
            x={x}
            y={CHART_HEIGHT - 5}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="9"
          >
            {label}
          </text>
        ))}

        {/* TSB fill area */}
        <path
          d={tsbFillPath}
          fill="#22c55e"
          fillOpacity="0.2"
        />

        {/* CTL line (blue) */}
        <path
          d={ctlPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ATL line (red) */}
        <path
          d={atlPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Zone legend */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-ceramic-text-secondary">
        {TSB_ZONES.map(zone => (
          <span key={zone.label} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: zone.color }}
            />
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  );
};
