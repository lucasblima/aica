/**
 * CategoryTrendChart Component
 *
 * Bar chart showing one category's spending over 6 months.
 */

import React, { useState, useRef, useEffect } from 'react';

interface CategoryTrendDataPoint {
  month: string;
  amount: number;
}

interface CategoryTrendChartProps {
  data: CategoryTrendDataPoint[];
  category: string;
  color: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const CategoryTrendChart: React.FC<CategoryTrendChartProps> = ({
  data,
  category,
  color,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

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

  if (data.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-sm font-semibold text-ceramic-text-primary mb-4">
          {category}
        </h3>
        <div className="flex items-center justify-center h-32 text-ceramic-text-secondary text-xs">
          Sem dados para esta categoria
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const padding = { top: 12, right: 8, bottom: 28, left: 8 };
  const height = 160;
  const chartWidth = containerWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barGap = 8;
  const barWidth = Math.max(
    12,
    (chartWidth - barGap * (data.length + 1)) / data.length
  );

  return (
    <div className="ceramic-card p-5">
      <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">
        {category}
      </h3>

      <div ref={containerRef} className="w-full">
        <svg
          width={containerWidth}
          height={height}
          viewBox={`0 0 ${containerWidth} ${height}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Bars */}
          {data.map((d, i) => {
            const x =
              padding.left +
              barGap +
              i * ((chartWidth - barGap) / data.length) +
              ((chartWidth - barGap) / data.length - barWidth) / 2;
            const barHeight = (d.amount / maxAmount) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Bar */}
                <rect
                  x={x}
                  y={mounted ? y : padding.top + chartHeight}
                  width={barWidth}
                  height={mounted ? barHeight : 0}
                  rx={4}
                  fill={color}
                  opacity={isHovered ? 1 : 0.75}
                  style={{
                    transition: `y 0.5s ease ${i * 0.08}s, height 0.5s ease ${i * 0.08}s, opacity 0.15s ease`,
                  }}
                />

                {/* X label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-ceramic-text-secondary fill-current"
                  fontSize={10}
                >
                  {d.month}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x + barWidth / 2 - 40}
                      y={y - 24}
                      width={80}
                      height={20}
                      rx={4}
                      className="fill-ceramic-base text-ceramic-border"
                      stroke="currentColor"
                      strokeWidth={0.5}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 10}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="600"
                      className="fill-current text-ceramic-text-primary"
                    >
                      {formatCurrency(d.amount)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default CategoryTrendChart;
