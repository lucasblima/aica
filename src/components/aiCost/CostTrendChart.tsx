import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { DailyCostSummary } from '../../types/aiCost';
import { formatCredits } from '../../types/aiCost';

// =====================================================
// Cost Trend Chart Component - Credits (Custom SVG)
// =====================================================

interface CostTrendChartProps {
  data: DailyCostSummary[];
  height?: number;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ data, height = 240 }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxCredits = Math.max(...data.map((d) => d.total_credits), 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 800;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Create path for line chart
    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (d.total_credits / maxCredits) * chartHeight;
      return { x, y, credits: d.total_credits, date: d.date };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Create area path (fill below line)
    const areaPath =
      linePath + ` L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Y-axis labels
    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks }, (_, i) => {
      const value = Math.round((maxCredits / (yTicks - 1)) * (yTicks - 1 - i));
      return {
        y: padding.top + (chartHeight / (yTicks - 1)) * i,
        label: `${value}`
      };
    });

    // X-axis labels (show every N days)
    const xLabelInterval = Math.ceil(data.length / 7);
    const xLabels = data
      .filter((_, i) => i % xLabelInterval === 0 || i === data.length - 1)
      .map((d) => {
        const originalIndex = data.indexOf(d);
        return {
          x: padding.left + (originalIndex / (data.length - 1)) * chartWidth,
          label: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        };
      });

    return {
      linePath,
      areaPath,
      points,
      yLabels,
      xLabels,
      width,
      height,
      padding,
      maxCredits,
      totalCredits: data.reduce((sum, d) => sum + d.total_credits, 0)
    };
  }, [data, height]);

  if (!chartData) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">
          Tendencia de Créditos (30 dias)
        </h3>
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary">
            Nenhum dado disponível para exibir a tendencia
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 ceramic-inset flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ceramic-text-primary">
              Tendencia de Créditos
            </h3>
            <p className="text-xs text-ceramic-text-secondary">Ultimos 30 dias</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-ceramic-text-secondary uppercase font-bold">Total</p>
          <p className="text-xl font-black text-ceramic-text-primary text-etched">
            {formatCredits(chartData.totalCredits)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="ceramic-inset p-3 rounded-lg overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full"
          style={{ minWidth: '500px' }}
        >
          {/* Grid lines */}
          {chartData.yLabels.map((label, i) => (
            <line
              key={`grid-${i}`}
              x1={chartData.padding.left}
              y1={label.y}
              x2={chartData.width - chartData.padding.right}
              y2={label.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <path d={chartData.areaPath} fill="url(#areaGradient)" opacity="0.2" />

          {/* Line path */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <g key={`point-${i}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="#3b82f6" />
              <circle cx={point.x} cy={point.y} r="3" fill="white" />
            </g>
          ))}

          {/* Y-axis labels */}
          {chartData.yLabels.map((label, i) => (
            <text
              key={`ylabel-${i}`}
              x={chartData.padding.left - 8}
              y={label.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6b7280"
              fontFamily="system-ui"
            >
              {label.label}
            </text>
          ))}

          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <text
              key={`xlabel-${i}`}
              x={label.x}
              y={chartData.height - chartData.padding.bottom + 25}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              fontFamily="system-ui"
            >
              {label.label}
            </text>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
