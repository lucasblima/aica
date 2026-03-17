/**
 * NarrativeTensionChart Component
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * SVG line chart showing narrative tension arc over episode duration.
 * Marks peak, end, and hook zone (first 5 min shaded).
 * Based on Reagan et al. 2016 and Kahneman Peak-End Rule.
 * Ceramic Design System compliant.
 */

import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import type { NarrativeAnalysis } from '../../services/guestScoring';

interface NarrativeTensionChartProps {
  analysis: NarrativeAnalysis;
  durationMinutes: number;
  className?: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const PADDING = { top: 10, right: 15, bottom: 20, left: 30 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export const NarrativeTensionChart: React.FC<NarrativeTensionChartProps> = ({
  analysis,
  durationMinutes,
  className = '',
}) => {
  const { arc, peakMoment, endMoment, peakEndScore, hookStrength, suggestions } = analysis;

  // Build SVG path
  const points = arc.map(m => ({
    x: PADDING.left + (m.timestamp / Math.max(durationMinutes, 1)) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - (m.tension * INNER_HEIGHT),
  }));

  const linePath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  // Area fill below line
  const areaPath = points.length > 1
    ? linePath
      + ` L ${points[points.length - 1].x.toFixed(1)} ${(PADDING.top + INNER_HEIGHT).toFixed(1)}`
      + ` L ${points[0].x.toFixed(1)} ${(PADDING.top + INNER_HEIGHT).toFixed(1)} Z`
    : '';

  // Hook zone (first 5 min)
  const hookZoneWidth = Math.min(1, 5 / Math.max(durationMinutes, 1)) * INNER_WIDTH;

  // Peak marker position
  const peakPoint = peakMoment ? {
    x: PADDING.left + (peakMoment.timestamp / Math.max(durationMinutes, 1)) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - (peakMoment.tension * INNER_HEIGHT),
  } : null;

  // End marker position
  const endPoint = endMoment ? {
    x: PADDING.left + (endMoment.timestamp / Math.max(durationMinutes, 1)) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - (endMoment.tension * INNER_HEIGHT),
  } : null;

  const tensionPercent = Math.round(analysis.tensionScore * 100);
  const peakEndPercent = Math.round(peakEndScore * 100);

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}
      data-testid="narrative-tension-chart"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ceramic-text-primary flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-ceramic-info" aria-hidden="true" />
          Arco de Tensao Narrativa
        </h3>
        <div className="flex gap-3">
          <div className="text-right">
            <div className="text-xs text-ceramic-text-secondary">Tensao</div>
            <div className="text-sm font-bold text-ceramic-text-primary">{tensionPercent}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ceramic-text-secondary">Peak-End</div>
            <div className="text-sm font-bold text-ceramic-info">{peakEndPercent}%</div>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      {arc.length > 0 ? (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Grafico de tensao narrativa. Score: ${tensionPercent}%. Peak-End: ${peakEndPercent}%.`}
        >
          {/* Hook zone background */}
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={hookZoneWidth}
            height={INNER_HEIGHT}
            fill="currentColor"
            className="text-ceramic-warning/10"
          />
          <text
            x={PADDING.left + hookZoneWidth / 2}
            y={PADDING.top + 10}
            textAnchor="middle"
            className="text-ceramic-warning"
            fill="currentColor"
            fontSize="7"
          >
            Hook
          </text>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(v => {
            const y = PADDING.top + INNER_HEIGHT - v * INNER_HEIGHT;
            return (
              <line
                key={v}
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + INNER_WIDTH}
                y2={y}
                stroke="currentColor"
                className="text-ceramic-border"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="currentColor"
              className="text-ceramic-info/15"
            />
          )}

          {/* Main line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              className="text-ceramic-info"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Peak marker */}
          {peakPoint && (
            <g>
              <circle
                cx={peakPoint.x}
                cy={peakPoint.y}
                r="4"
                fill="currentColor"
                className="text-ceramic-warning"
              />
              <text
                x={peakPoint.x}
                y={peakPoint.y - 8}
                textAnchor="middle"
                fill="currentColor"
                className="text-ceramic-warning"
                fontSize="7"
                fontWeight="bold"
              >
                Pico
              </text>
            </g>
          )}

          {/* End marker */}
          {endPoint && endPoint !== peakPoint && (
            <g>
              <circle
                cx={endPoint.x}
                cy={endPoint.y}
                r="3"
                fill="currentColor"
                className="text-ceramic-success"
              />
              <text
                x={endPoint.x}
                y={endPoint.y - 8}
                textAnchor="middle"
                fill="currentColor"
                className="text-ceramic-success"
                fontSize="7"
              >
                Fim
              </text>
            </g>
          )}

          {/* X-axis label */}
          <text
            x={PADDING.left + INNER_WIDTH / 2}
            y={CHART_HEIGHT - 2}
            textAnchor="middle"
            fill="currentColor"
            className="text-ceramic-text-secondary"
            fontSize="7"
          >
            Tempo (min)
          </text>

          {/* Y-axis label */}
          <text
            x={4}
            y={PADDING.top + INNER_HEIGHT / 2}
            textAnchor="middle"
            fill="currentColor"
            className="text-ceramic-text-secondary"
            fontSize="7"
            transform={`rotate(-90, 4, ${PADDING.top + INNER_HEIGHT / 2})`}
          >
            Tensao
          </text>
        </svg>
      ) : (
        <div className="flex items-center justify-center h-24 text-ceramic-text-secondary text-xs">
          Sem dados de momentos para exibir o grafico.
        </div>
      )}

      {/* Hook Strength */}
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-ceramic-text-secondary">Força do Gancho:</span>
        <div className="flex-1 h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-ceramic-warning transition-all"
            style={{ width: `${Math.round(hookStrength * 100)}%` }}
          />
        </div>
        <span className="text-ceramic-text-secondary">{Math.round(hookStrength * 100)}%</span>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-ceramic-text-secondary">
              <AlertTriangle className="w-3 h-3 text-ceramic-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NarrativeTensionChart;
