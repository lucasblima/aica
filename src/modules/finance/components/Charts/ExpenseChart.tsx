/**
 * Expense Chart Component
 *
 * Displays expense breakdown by category as a donut chart.
 * Enhanced with hover tooltips, responsive sizing, and draw-in animation.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { CategoryBreakdown } from '../../types';

// =====================================================
// Types
// =====================================================

interface ExpenseChartProps {
  data: CategoryBreakdown[];
  totalExpenses: number;
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  housing: '#6366f1',
  food: '#f59e0b',
  transport: '#10b981',
  health: '#ef4444',
  education: '#8b5cf6',
  entertainment: '#ec4899',
  shopping: '#14b8a6',
  salary: '#22c55e',
  freelance: '#3b82f6',
  investment: '#f97316',
  transfer: '#6b7280',
  other: '#94a3b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Moradia',
  food: 'Alimentacao',
  transport: 'Transporte',
  health: 'Saúde',
  education: 'Educação',
  entertainment: 'Lazer',
  shopping: 'Compras',
  salary: 'Salario',
  freelance: 'Freelance',
  investment: 'Investimentos',
  transfer: 'Transferencias',
  other: 'Outros',
};

// =====================================================
// Component
// =====================================================

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ data, totalExpenses }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState(140);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        // On mobile, use more of the width; on desktop, cap at 140
        setChartSize(Math.min(w * 0.35, 140));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sort data by amount descending and calculate donut segments
  const segments = useMemo(() => {
    const sorted = [...data]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const result: Array<{ category: string; percentage: number; amount: number; startAngle: number; endAngle: number; color: string; label: string }> = [];
    let runningAngle = 0;

    for (const item of sorted) {
      const angle = (item.percentage / 100) * 360;
      result.push({
        category: item.category,
        percentage: item.percentage,
        amount: item.amount,
        startAngle: runningAngle,
        endAngle: runningAngle + angle,
        color: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
        label: CATEGORY_LABELS[item.category] || item.category,
      });
      runningAngle += angle;
    }
    return result;
  }, [data]);

  // Cumulative offsets for stroke-dashoffset animation
  const strokeSegments = useMemo(() => {
    const outerRadius = 40;
    const innerRadius = 25;
    const midRadius = (outerRadius + innerRadius) / 2;
    const circumference = 2 * Math.PI * midRadius;

    let dashOffset = 0;
    return segments.map((seg, i) => {
      const fraction = seg.percentage / 100;
      const dashLength = fraction * circumference;
      const result = {
        ...seg,
        circumference,
        dashLength,
        dashOffset,
        delay: i * 0.12,
      };
      dashOffset += dashLength;
      return result;
    });
  }, [segments]);

  // Create SVG path for donut segment (used for hover hit testing)
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number
  ) => {
    const start = polarToCartesian(50, 50, outerRadius, endAngle);
    const end = polarToCartesian(50, 50, outerRadius, startAngle);
    const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
    const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `
      M ${start.x} ${start.y}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}
      Z
    `;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (data.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">
          Gastos por Categoria
        </h3>
        <div className="flex items-center justify-center h-48 text-ceramic-text-secondary">
          Nenhuma transação encontrada
        </div>
      </div>
    );
  }

  const hoveredSeg = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="ceramic-card p-4" ref={containerRef}>
      <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">
        Gastos por Categoria
      </h3>

      <div className="flex items-start gap-4">
        {/* Donut Chart — compact */}
        <div className="relative flex-shrink-0" style={{ width: Math.min(chartSize, 140), height: Math.min(chartSize, 140) }}>
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full transform -rotate-90"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Animated stroke-based segments */}
            {strokeSegments.map((seg, index) => {
              const midRadius = (25 + 40) / 2;
              const strokeW = 40 - 25;
              return (
                <circle
                  key={index}
                  cx={50}
                  cy={50}
                  r={midRadius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeW}
                  strokeDasharray={`${seg.dashLength} ${seg.circumference - seg.dashLength}`}
                  strokeDashoffset={mounted ? -seg.dashOffset : seg.circumference}
                  opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1}
                  style={{
                    transition: `stroke-dashoffset 0.6s ease ${seg.delay}s, opacity 0.2s ease`,
                  }}
                />
              );
            })}

            {/* Invisible hit areas for hover */}
            {segments.map((segment, index) => (
              <path
                key={`hit-${index}`}
                d={createArcPath(segment.startAngle, segment.endAngle, 25, 40)}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hoveredSeg ? (
              <>
                <p className="text-[9px] text-ceramic-text-secondary leading-tight">{hoveredSeg.label}</p>
                <p className="text-xs font-bold text-ceramic-text-primary leading-tight">
                  {formatCurrency(hoveredSeg.amount)}
                </p>
                <p className="text-[9px] text-ceramic-text-secondary leading-tight">
                  {hoveredSeg.percentage.toFixed(1)}%
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-ceramic-text-secondary leading-tight">Total</p>
                <p className="text-sm font-bold text-ceramic-text-primary leading-tight">
                  {formatCurrency(totalExpenses)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Category list — sorted descending by amount */}
        <div className="flex-1 min-w-0 space-y-1">
          {segments.map((segment, index) => (
            <button
              key={index}
              className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
                hoveredIndex === index ? 'bg-ceramic-cool' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs font-medium text-ceramic-text-primary truncate">
                {segment.label}
              </span>
              <span className="ml-auto text-xs tabular-nums text-ceramic-text-secondary whitespace-nowrap">
                {formatCurrency(segment.amount)}
              </span>
              <span className="text-[10px] tabular-nums text-ceramic-text-secondary w-10 text-right flex-shrink-0">
                {segment.percentage.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
