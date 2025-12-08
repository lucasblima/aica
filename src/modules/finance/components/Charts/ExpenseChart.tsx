/**
 * Expense Chart Component
 *
 * Displays expense breakdown by category as a donut chart.
 */

import React, { useMemo } from 'react';
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
  health: 'Saude',
  education: 'Educacao',
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
  // Calculate donut segments
  const segments = useMemo(() => {
    let startAngle = 0;

    return data.slice(0, 6).map((item) => {
      const angle = (item.percentage / 100) * 360;
      const segment = {
        category: item.category,
        percentage: item.percentage,
        amount: item.amount,
        startAngle,
        endAngle: startAngle + angle,
        color: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
        label: CATEGORY_LABELS[item.category] || item.category,
      };
      startAngle += angle;
      return segment;
    });
  }, [data]);

  // Create SVG path for donut segment
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
          Nenhuma transacao encontrada
        </div>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">
        Gastos por Categoria
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={createArcPath(segment.startAngle, segment.endAngle, 25, 40)}
                fill={segment.color}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-ceramic-text-secondary">Total</p>
            <p className="text-lg font-bold text-ceramic-text-primary">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ceramic-text-primary truncate">
                  {segment.label}
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  {segment.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
