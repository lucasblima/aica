/**
 * Efficiency Trend Chart Component
 *
 * Displays efficiency trends over time (7, 14, 30 days)
 * Uses custom SVG charts instead of external dependencies
 * Shows:
 * - Efficiency score line chart
 * - Productivity level indicators
 * - Weekly comparison
 * - Goal tracking
 */

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Target } from 'lucide-react';
import {
  getEfficiencyTrends,
  getProductivityColor,
  EfficiencyTrend,
} from '../services/efficiencyService';
import './EfficiencyTrendChart.css';

interface EfficiencyTrendChartProps {
  userId: string;
  days?: number;
}

/**
 * Simple Line Chart Component (Custom SVG)
 */
const SimpleLineChart: React.FC<{ data: any[]; width: number; height: number }> = ({
  data,
  width = 600,
  height = 300,
}) => {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const scores = data.map(d => d.score);
  const maxScore = Math.max(...scores, 100);
  const minScore = Math.min(...scores, 0);

  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const yRange = maxScore - minScore || 100;
  const yScale = chartHeight / yRange;

  // Create points for the line
  const points = data
    .map((d, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartHeight - (d.score - minScore) * yScale;
      return { x, y, data: d };
    });

  // Create path string for the line
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="trend-chart-svg">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding.top + chartHeight * (1 - ratio);
        return (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#e0e0e0"
            strokeDasharray="4"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#999" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#999" />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const value = Math.round(minScore + yRange * ratio);
        const y = padding.top + chartHeight * (1 - ratio);
        return (
          <text
            key={`label-${i}`}
            x={padding.left - 10}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="12"
            fill="#666"
          >
            {value}%
          </text>
        );
      })}

      {/* Line */}
      <path d={pathData} stroke="#667eea" strokeWidth="2" fill="none" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={`point-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill={getProductivityColor(p.data.productivityLevel)}
            stroke="white"
            strokeWidth="2"
          />
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
          const x = padding.left + i * xStep;
          return (
            <text
              key={`x-label-${i}`}
              x={x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {d.date}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
};

/**
 * Efficiency Trend Chart Component
 */
export const EfficiencyTrendChart: React.FC<EfficiencyTrendChartProps> = ({
  userId,
  days = 30,
}) => {
  const [trends, setTrends] = useState<EfficiencyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    loadTrends();
  }, [userId, selectedRange]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await getEfficiencyTrends(userId, selectedRange);
      setTrends(data);
    } catch (error) {
      console.error('Error loading efficiency trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="efficiency-trend-chart">
        <div className="chart-skeleton">
          <div className="h-8 bg-ceramic-text-secondary/10 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-ceramic-text-secondary/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-ceramic-text-secondary italic opacity-50">
          A mente está silenciosa hoje.
        </p>
      </div>
    );
  }

  // Calculate statistics
  const avgScore = Math.round(trends.reduce((sum, t) => sum + t.score, 0) / trends.length);
  const maxScore = Math.max(...trends.map(t => t.score));
  const minScore = Math.min(...trends.map(t => t.score));
  const excellentDays = trends.filter(t => t.productivityLevel === 'excellent').length;
  const goodDays = trends.filter(t => t.productivityLevel === 'good').length;

  // Color mapping for productivity levels
  const getPointColor = (level: string) => {
    return getProductivityColor(level as any);
  };

  // Format data for chart
  const chartData = trends.map(t => ({
    date: new Date(t.date).toLocaleDateString('pt-BR', {
      month: 'short',
      day: 'numeric',
    }),
    score: t.score,
    tasks: t.tasksCompleted,
    level: t.productivityLevel,
  }));

  return (
    <div className="efficiency-trend-chart">
      {/* Header with Range Selector */}
      <div className="chart-header">
        <div className="header-info">
          <h3 className="chart-title">Tendência de Eficiência</h3>
          <div className="stat-badges">
            <div className="stat-badge">
              <span className="badge-label">Média</span>
              <span className="badge-value">{avgScore}%</span>
            </div>
            <div className="stat-badge">
              <span className="badge-label">Máximo</span>
              <span className="badge-value">{maxScore}%</span>
            </div>
            <div className="stat-badge">
              <span className="badge-label">Dias Excelentes</span>
              <span className="badge-value">{excellentDays}</span>
            </div>
          </div>
        </div>

        <div className="range-selector">
          {([7, 14, 30] as const).map(range => (
            <button
              key={range}
              className={`range-btn ${selectedRange === range ? 'active' : ''}`}
              onClick={() => setSelectedRange(range)}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {/* Efficiency Score Chart */}
      <div className="chart-container">
        <div className="chart-wrapper">
          <SimpleLineChart data={chartData} width={600} height={300} />
        </div>
      </div>

      {/* Productivity Distribution */}
      <div className="distribution-section">
        <h4 className="distribution-title">Distribuição de Produtividade</h4>
        <div className="distribution-bars">
          {['excellent', 'good', 'fair', 'poor', 'critical'].map(level => {
            const count = trends.filter(t => t.productivityLevel === level).length;
            const percentage = (count / trends.length) * 100;
            return (
              <div key={level} className="distribution-item">
                <div className="distribution-info">
                  <span className="distribution-label">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </span>
                  <span className="distribution-count">({count})</span>
                </div>
                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getPointColor(level),
                    }}
                  ></div>
                </div>
                <span className="distribution-percent">{percentage.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="weekly-goals">
        <div className="goals-header">
          <Target className="w-4 h-4" />
          <h4 className="goals-title">Meta Semanal</h4>
        </div>
        <div className="goal-item">
          <span className="goal-name">Manter Eficiência {'>'} 70%</span>
          <div className="goal-progress">
            <div
              className="goal-bar"
              style={{
                width: `${((excellentDays + goodDays) / Math.min(7, trends.length)) * 100}%`,
              }}
            ></div>
          </div>
          <span className="goal-percentage">
            {Math.round(((excellentDays + goodDays) / Math.min(7, trends.length)) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyTrendChart;
