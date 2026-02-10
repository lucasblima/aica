import React from 'react';
import { VenturesMetrics, formatCurrency } from '../types';

interface MRRChartProps {
  metricsHistory: VenturesMetrics[];
  showARR?: boolean;
  className?: string;
}

/**
 * MRRChart Component
 *
 * Line chart showing MRR (and optionally ARR) trend over time.
 * Simple, clean visualization for the cockpit view.
 */
export function MRRChart({
  metricsHistory,
  showARR = false,
  className = '',
}: MRRChartProps) {
  // Sort metrics by period_start ascending
  const sortedMetrics = React.useMemo(
    () =>
      [...metricsHistory]
        .filter((m) => m.period_type === 'monthly')
        .sort(
          (a, b) =>
            new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        )
        .slice(-12), // Last 12 months
    [metricsHistory]
  );

  // Calculate chart dimensions and scales
  const maxMRR = React.useMemo(
    () =>
      Math.max(
        ...sortedMetrics.map((m) => m.mrr || 0),
        1000 // Minimum scale
      ),
    [sortedMetrics]
  );

  const maxARR = React.useMemo(
    () =>
      Math.max(
        ...sortedMetrics.map((m) => m.arr || 0),
        1000 // Minimum scale
      ),
    [sortedMetrics]
  );

  const chartHeight = 200;
  const chartWidth = 800;
  const paddingTop = 20;
  const paddingBottom = 40;
  const paddingLeft = 60;
  const paddingRight = 20;

  const dataHeight = chartHeight - paddingTop - paddingBottom;
  const dataWidth = chartWidth - paddingLeft - paddingRight;

  // Calculate points for MRR line
  const mrrPoints = React.useMemo(() => {
    if (sortedMetrics.length === 0) return '';

    const points = sortedMetrics
      .map((metric, index) => {
        const x = paddingLeft + (index / Math.max(sortedMetrics.length - 1, 1)) * dataWidth;
        const y =
          paddingTop + dataHeight - ((metric.mrr || 0) / maxMRR) * dataHeight;
        return `${x},${y}`;
      })
      .join(' ');

    return points;
  }, [sortedMetrics, maxMRR, dataWidth, dataHeight]);

  // Calculate points for ARR line (if enabled)
  const arrPoints = React.useMemo(() => {
    if (!showARR || sortedMetrics.length === 0) return '';

    const points = sortedMetrics
      .map((metric, index) => {
        const x = paddingLeft + (index / Math.max(sortedMetrics.length - 1, 1)) * dataWidth;
        const y =
          paddingTop + dataHeight - ((metric.arr || 0) / maxARR) * dataHeight;
        return `${x},${y}`;
      })
      .join(' ');

    return points;
  }, [sortedMetrics, showARR, maxARR, dataWidth, dataHeight]);

  // Format date for label
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  // Calculate growth rate
  const growthRate = React.useMemo(() => {
    if (sortedMetrics.length < 2) return null;

    const latest = sortedMetrics[sortedMetrics.length - 1].mrr || 0;
    const previous = sortedMetrics[sortedMetrics.length - 2].mrr || 0;

    if (previous === 0) return null;

    return ((latest - previous) / previous) * 100;
  }, [sortedMetrics]);

  if (sortedMetrics.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-2">📈</div>
        <p className="text-sm text-ceramic-text-secondary">Sem dados de MRR ainda</p>
        <p className="text-xs text-ceramic-text-secondary mt-1">
          Adicione métricas mensais para visualizar a evolução da receita
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ceramic-text-primary">
            Monthly Recurring Revenue (MRR)
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-2xl font-bold text-amber-700">
              {formatCurrency(sortedMetrics[sortedMetrics.length - 1].mrr)}
            </div>
            {growthRate !== null && (
              <div
                className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${
                    growthRate >= 0
                      ? 'bg-ceramic-success/10 text-ceramic-success'
                      : 'bg-ceramic-error/10 text-ceramic-error'
                  }
                `}
              >
                {growthRate >= 0 ? '↑' : '↓'} {Math.abs(growthRate).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="text-ceramic-text-secondary">MRR</span>
          </div>
          {showARR && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-ceramic-info rounded-full" />
              <span className="text-ceramic-text-secondary">ARR</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + dataHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + dataWidth}
                y2={y}
                stroke="#e5e5e5"
                strokeWidth="1"
                strokeDasharray={ratio === 0 || ratio === 1 ? '0' : '4,4'}
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-ceramic-text-secondary"
              >
                {formatCurrency(maxMRR * ratio)}
              </text>
            </g>
          );
        })}

        {/* MRR Line */}
        <polyline
          points={mrrPoints}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ARR Line */}
        {showARR && arrPoints && (
          <polyline
            points={arrPoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5,5"
          />
        )}

        {/* Data points */}
        {sortedMetrics.map((metric, index) => {
          const x =
            paddingLeft + (index / Math.max(sortedMetrics.length - 1, 1)) * dataWidth;
          const y =
            paddingTop + dataHeight - ((metric.mrr || 0) / maxMRR) * dataHeight;

          return (
            <g key={metric.id}>
              <circle cx={x} cy={y} r="4" fill="#f59e0b" stroke="white" strokeWidth="2" />
              {/* X-axis label */}
              <text
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="text-xs fill-ceramic-text-secondary"
              >
                {formatDate(metric.period_start)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-ceramic-border">
        <div>
          <div className="text-xs text-ceramic-text-secondary mb-1">Média (12m)</div>
          <div className="text-sm font-semibold text-ceramic-text-primary">
            {formatCurrency(
              sortedMetrics.reduce((sum, m) => sum + (m.mrr || 0), 0) /
                sortedMetrics.length
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-ceramic-text-secondary mb-1">Maior</div>
          <div className="text-sm font-semibold text-ceramic-success">
            {formatCurrency(Math.max(...sortedMetrics.map((m) => m.mrr || 0)))}
          </div>
        </div>
        <div>
          <div className="text-xs text-ceramic-text-secondary mb-1">Menor</div>
          <div className="text-sm font-semibold text-ceramic-text-primary">
            {formatCurrency(Math.min(...sortedMetrics.map((m) => m.mrr || 0)))}
          </div>
        </div>
      </div>
    </div>
  );
}
