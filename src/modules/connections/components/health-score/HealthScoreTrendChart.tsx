/**
 * HealthScoreTrendChart Component
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Visual chart showing health score trend over time.
 * Uses SVG for lightweight rendering without external chart libraries.
 *
 * @example
 * <HealthScoreTrendChart history={historyData} />
 * <HealthScoreTrendChart contactId="uuid" days={30} />
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { getRiskColor, getRiskLevel, type HealthScoreHistory } from '@/types/healthScore';

// ============================================================================
// TYPES
// ============================================================================

interface HealthScoreTrendChartProps {
  /** Health score history entries */
  history: HealthScoreHistory[];
  /** Chart height in pixels */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show data points */
  showPoints?: boolean;
  /** Show area fill */
  showArea?: boolean;
  /** Time window label */
  timeLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

interface DataPoint {
  x: number;
  y: number;
  score: number;
  date: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate SVG path from data points
 */
function generateLinePath(points: DataPoint[]): string {
  if (points.length === 0) return '';

  const pathParts = points.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x} ${point.y}`;
  });

  return pathParts.join(' ');
}

/**
 * Generate SVG area path (for fill)
 */
function generateAreaPath(points: DataPoint[], height: number): string {
  if (points.length === 0) return '';

  const linePath = generateLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;
}

/**
 * Format date for tooltip
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface GridLinesProps {
  width: number;
  height: number;
  horizontalLines?: number;
}

function GridLines({ width, height, horizontalLines = 4 }: GridLinesProps) {
  const lines = [];
  const step = height / horizontalLines;

  for (let i = 1; i < horizontalLines; i++) {
    const y = step * i;
    lines.push(
      <line
        key={i}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#E5E7EB"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    );
  }

  return <g>{lines}</g>;
}

interface DataPointsProps {
  points: DataPoint[];
}

function DataPoints({ points }: DataPointsProps) {
  return (
    <g>
      {points.map((point, index) => {
        const color = getRiskColor(getRiskLevel(point.score));
        return (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="white"
            stroke={color}
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
          />
        );
      })}
    </g>
  );
}

interface YAxisLabelsProps {
  height: number;
}

function YAxisLabels({ height }: YAxisLabelsProps) {
  const labels = [100, 75, 50, 25, 0];
  const step = height / 4;

  return (
    <g>
      {labels.map((label, index) => (
        <text
          key={label}
          x={-8}
          y={step * index + 4}
          fill="#9CA3AF"
          fontSize={10}
          textAnchor="end"
        >
          {label}
        </text>
      ))}
    </g>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthScoreTrendChart({
  history,
  height = 200,
  showGrid = true,
  showPoints = true,
  showArea = true,
  timeLabel = 'Últimos 30 dias',
  className = '',
}: HealthScoreTrendChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 320; // Will be responsive with viewBox
  const chartHeight = height - padding.top - padding.bottom;

  // Process data into points
  const dataPoints = useMemo((): DataPoint[] => {
    if (history.length === 0) return [];

    // Sort by date ascending
    const sorted = [...history].sort(
      (a, b) => new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime()
    );

    const points: DataPoint[] = sorted.map((entry, index) => {
      const x = (index / Math.max(sorted.length - 1, 1)) * (chartWidth - padding.left - padding.right) + padding.left;
      const y = padding.top + chartHeight - (entry.score / 100) * chartHeight;

      return {
        x,
        y,
        score: entry.score,
        date: new Date(entry.calculated_at),
      };
    });

    return points;
  }, [history, chartWidth, chartHeight, padding]);

  // Calculate trend stats
  const stats = useMemo(() => {
    if (history.length < 2) return null;

    const sorted = [...history].sort(
      (a, b) => new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime()
    );

    const first = sorted[0].score;
    const last = sorted[sorted.length - 1].score;
    const change = last - first;
    const average = Math.round(sorted.reduce((sum, h) => sum + h.score, 0) / sorted.length);
    const min = Math.min(...sorted.map(h => h.score));
    const max = Math.max(...sorted.map(h => h.score));

    return { first, last, change, average, min, max };
  }, [history]);

  // Generate paths
  const linePath = generateLinePath(dataPoints);
  const areaPath = generateAreaPath(dataPoints, padding.top + chartHeight);

  // Get gradient color based on current score
  const currentScore = history.length > 0 ? history[0].score : 50;
  const gradientColor = getRiskColor(getRiskLevel(currentScore));

  return (
    <motion.div
      className={`ceramic-card p-6 rounded-3xl space-y-4 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave p-2 rounded-lg">
            <TrendingUp className="w-4 h-4 text-ceramic-accent" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ceramic-text-primary">
              Evolução do Score
            </h4>
            <p className="text-xs text-ceramic-text-secondary">
              {timeLabel}
            </p>
          </div>
        </div>

        {/* Change Indicator */}
        {stats && (
          <div
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${stats.change >= 0 ? '#22C55E' : '#EF4444'}15`,
              color: stats.change >= 0 ? '#22C55E' : '#EF4444',
            }}
          >
            {stats.change >= 0 ? '+' : ''}{stats.change} pontos
          </div>
        )}
      </div>

      {/* Chart */}
      {dataPoints.length > 0 ? (
        <div className="ceramic-inset p-4 rounded-xl">
          <svg
            viewBox={`0 0 ${chartWidth} ${height}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Definitions */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={gradientColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* Grid */}
            {showGrid && (
              <GridLines
                width={chartWidth}
                height={chartHeight + padding.top}
              />
            )}

            {/* Y-Axis Labels */}
            <g transform={`translate(${padding.left - 5}, 0)`}>
              <YAxisLabels height={chartHeight + padding.top} />
            </g>

            {/* Area Fill */}
            {showArea && (
              <motion.path
                d={areaPath}
                fill="url(#areaGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            )}

            {/* Line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke={gradientColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />

            {/* Data Points */}
            {showPoints && <DataPoints points={dataPoints} />}

            {/* X-Axis Labels (first and last date) */}
            {dataPoints.length > 0 && (
              <g>
                <text
                  x={dataPoints[0].x}
                  y={height - 8}
                  fill="#9CA3AF"
                  fontSize={10}
                  textAnchor="start"
                >
                  {formatDate(dataPoints[0].date)}
                </text>
                {dataPoints.length > 1 && (
                  <text
                    x={dataPoints[dataPoints.length - 1].x}
                    y={height - 8}
                    fill="#9CA3AF"
                    fontSize={10}
                    textAnchor="end"
                  >
                    {formatDate(dataPoints[dataPoints.length - 1].date)}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
      ) : (
        /* Empty State */
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <Activity className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-ceramic-text-secondary">
            Sem dados suficientes para o gráfico
          </p>
          <p className="text-xs text-ceramic-text-tertiary mt-1">
            Os dados aparecerão após algumas medições
          </p>
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-ceramic-text-primary">
              {stats.average}
            </p>
            <p className="text-[10px] text-ceramic-text-secondary">
              Média
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-ceramic-text-primary">
              {stats.min}
            </p>
            <p className="text-[10px] text-ceramic-text-secondary">
              Mínimo
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-ceramic-text-primary">
              {stats.max}
            </p>
            <p className="text-[10px] text-ceramic-text-secondary">
              Máximo
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-ceramic-text-primary">
              {history.length}
            </p>
            <p className="text-[10px] text-ceramic-text-secondary">
              Medições
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default HealthScoreTrendChart;
