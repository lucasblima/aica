/**
 * TrendLineChart Component
 *
 * SVG line chart showing 6-12 months of income vs expense trends.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';

interface TrendDataPoint {
  month: string;
  income: number;
  expense: number;
}

interface TrendLineChartProps {
  data: TrendDataPoint[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const padding = { top: 20, right: 16, bottom: 32, left: 56 };
  const height = 220;
  const chartWidth = containerWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { maxValue, yTicks, incomePath, expensePath, incomePoints, expensePoints } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          maxValue: 1,
          yTicks: [],
          incomePath: '',
          expensePath: '',
          incomePoints: [],
          expensePoints: [],
        };
      }

      const allValues = data.flatMap((d) => [d.income, d.expense]);
      const max = Math.max(...allValues, 1);
      const roundedMax = Math.ceil(max / 1000) * 1000;

      const ticks = [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax];

      const getX = (i: number) =>
        padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const getY = (val: number) =>
        padding.top + chartHeight - (val / roundedMax) * chartHeight;

      const incPts = data.map((d, i) => ({ x: getX(i), y: getY(d.income) }));
      const expPts = data.map((d, i) => ({ x: getX(i), y: getY(d.expense) }));

      const toPath = (pts: { x: number; y: number }[]) =>
        pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

      return {
        maxValue: roundedMax,
        yTicks: ticks,
        incomePath: toPath(incPts),
        expensePath: toPath(expPts),
        incomePoints: incPts,
        expensePoints: expPts,
      };
    }, [data, chartWidth, chartHeight]);

  if (data.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">
          Tendencia Mensal
        </h3>
        <div className="flex items-center justify-center h-48 text-ceramic-text-secondary text-sm">
          Dados insuficientes para gerar tendencia
        </div>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ceramic-text-primary">
          Tendencia Mensal
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-ceramic-success rounded-full" />
            <span className="text-[10px] text-ceramic-text-secondary">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-ceramic-error rounded-full" />
            <span className="text-[10px] text-ceramic-text-secondary">Despesa</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        <svg
          width={containerWidth}
          height={height}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Y-axis grid lines */}
          {yTicks.map((tick, i) => {
            const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={containerWidth - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-ceramic-border"
                  strokeDasharray="4 4"
                  strokeWidth={0.5}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-ceramic-text-secondary fill-current"
                  fontSize={9}
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x =
              padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="text-ceramic-text-secondary fill-current"
                fontSize={10}
              >
                {d.month}
              </text>
            );
          })}

          {/* Income line */}
          <path
            d={incomePath}
            fill="none"
            stroke="var(--color-ceramic-success, #22c55e)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Expense line */}
          <path
            d={expensePath}
            fill="none"
            stroke="var(--color-ceramic-error, #ef4444)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points - income */}
          {incomePoints.map((pt, i) => (
            <circle
              key={`inc-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5 : 3}
              fill="var(--color-ceramic-success, #22c55e)"
              className="transition-all duration-150"
            />
          ))}

          {/* Data points - expense */}
          {expensePoints.map((pt, i) => (
            <circle
              key={`exp-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 5 : 3}
              fill="var(--color-ceramic-error, #ef4444)"
              className="transition-all duration-150"
            />
          ))}

          {/* Invisible hover areas */}
          {data.map((_, i) => {
            const x =
              padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
            return (
              <rect
                key={`hover-${i}`}
                x={x - chartWidth / data.length / 2}
                y={padding.top}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}

          {/* Tooltip */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            <g>
              {/* Vertical guide line */}
              <line
                x1={incomePoints[hoveredIndex].x}
                y1={padding.top}
                x2={incomePoints[hoveredIndex].x}
                y2={padding.top + chartHeight}
                stroke="currentColor"
                className="text-ceramic-border"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />

              {/* Tooltip background */}
              <rect
                x={incomePoints[hoveredIndex].x - 60}
                y={padding.top - 6}
                width={120}
                height={36}
                rx={6}
                fill="white"
                stroke="currentColor"
                className="text-ceramic-border"
                strokeWidth={0.5}
                filter="url(#shadow)"
              />
              <text
                x={incomePoints[hoveredIndex].x}
                y={padding.top + 8}
                textAnchor="middle"
                fontSize={9}
                className="fill-current text-ceramic-success"
              >
                Rec: {formatCurrency(data[hoveredIndex].income)}
              </text>
              <text
                x={incomePoints[hoveredIndex].x}
                y={padding.top + 22}
                textAnchor="middle"
                fontSize={9}
                className="fill-current text-ceramic-error"
              >
                Desp: {formatCurrency(data[hoveredIndex].expense)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default TrendLineChart;
