/**
 * Income vs Expense Chart Component
 *
 * Displays a comparison bar chart of income and expenses.
 * Enhanced with animated bar growth on mount and optional sparkline.
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChartSimple } from '@/components/features/visualizations';

// =====================================================
// Types
// =====================================================

interface IncomeVsExpenseProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
  monthlyTrend?: Array<{ month: string; income: number; expense: number }>;
}

// =====================================================
// Sparkline sub-component
// =====================================================

interface SparklineProps {
  data: Array<{ month: string; income: number; expense: number }>;
}

const Sparkline: React.FC<SparklineProps> = ({ data }) => {
  if (data.length < 2) return null;

  const width = 200;
  const height = 32;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const allValues = data.flatMap((d) => [d.income, d.expense]);
  const max = Math.max(...allValues, 1);

  const toPath = (values: number[]) =>
    values
      .map((v, i) => {
        const x = padding + (i / (values.length - 1)) * chartW;
        const y = padding + chartH - (v / max) * chartH;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const incomePath = toPath(data.map((d) => d.income));
  const expensePath = toPath(data.map((d) => d.expense));

  return (
    <div className="ceramic-inset p-2 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-ceramic-text-secondary">Ultimos {data.length} meses</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-ceramic-success rounded-full" />
            <span className="text-[8px] text-ceramic-text-secondary">Rec</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-ceramic-error rounded-full" />
            <span className="text-[8px] text-ceramic-text-secondary">Desp</span>
          </div>
        </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={incomePath}
          fill="none"
          stroke="var(--color-ceramic-success, #22c55e)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={expensePath}
          fill="none"
          stroke="var(--color-ceramic-error, #ef4444)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between mt-0.5">
        {data.map((d, i) => (
          <span key={i} className="text-[7px] text-ceramic-text-secondary">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// Component
// =====================================================

export const IncomeVsExpense: React.FC<IncomeVsExpenseProps> = ({
  income,
  expenses,
  previousIncome,
  previousExpenses,
  monthlyTrend,
}) => {
  const [mounted, setMounted] = useState(false);
  const balance = income - expenses;
  const maxValue = Math.max(income, expenses, 1);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculateChange(income, previousIncome);
  const expenseChange = calculateChange(expenses, previousExpenses);

  return (
    <div className="ceramic-card p-6 space-y-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary">
        Receitas vs Despesas
      </h3>

      {/* Bars */}
      <div className="space-y-4">
        {/* Income Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ceramic-success" />
              <span className="text-sm font-medium text-ceramic-text-primary">Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ceramic-success">{formatCurrency(income)}</span>
              {incomeChange !== null && (
                <span
                  className={`text-xs ${incomeChange >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}
                >
                  {incomeChange >= 0 ? '+' : ''}
                  {incomeChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="ceramic-trough p-1 rounded-full">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-ceramic-success/80 to-ceramic-success"
              style={{
                width: mounted ? `${(income / maxValue) * 100}%` : '0%',
                transition: 'width 0.8s ease 0.1s',
              }}
            />
          </div>
        </div>

        {/* Expense Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-ceramic-error" />
              <span className="text-sm font-medium text-ceramic-text-primary">Despesas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ceramic-error">{formatCurrency(expenses)}</span>
              {expenseChange !== null && (
                <span
                  className={`text-xs ${expenseChange <= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}
                >
                  {expenseChange >= 0 ? '+' : ''}
                  {expenseChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="ceramic-trough p-1 rounded-full">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-ceramic-error/80 to-ceramic-error"
              style={{
                width: mounted ? `${(expenses / maxValue) * 100}%` : '0%',
                transition: 'width 0.8s ease 0.25s',
              }}
            />
          </div>
        </div>
      </div>

      {/* Monthly sparkline */}
      {monthlyTrend && monthlyTrend.length >= 2 && (
        <Sparkline data={monthlyTrend} />
      )}

      {/* Monthly bar chart trend */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-3">Tendência Mensal</h4>
          <BarChartSimple
            data={monthlyTrend.map(m => ({ label: m.month, values: [{ key: 'income', value: m.income, color: 'bg-ceramic-success/80' }, { key: 'expense', value: m.expense, color: 'bg-ceramic-error/70' }] }))}
            legend={[{ key: 'income', label: 'Receita', color: 'bg-ceramic-success/80' }, { key: 'expense', label: 'Despesa', color: 'bg-ceramic-error/70' }]}
            formatValue={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
          />
        </div>
      )}

      {/* Balance Summary */}
      <div
        className={`
          p-4 rounded-2xl text-center
          ${balance >= 0 ? 'bg-ceramic-success/10' : 'bg-ceramic-error/10'}
        `}
      >
        <p className="text-xs text-ceramic-text-secondary mb-1">Saldo do Periodo</p>
        <p
          className={`text-2xl font-bold ${balance >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}
        >
          {formatCurrency(balance)}
        </p>
        {balance >= 0 ? (
          <p className="text-xs text-ceramic-success mt-1">Voce economizou este mes!</p>
        ) : (
          <p className="text-xs text-ceramic-error mt-1">Atencao: gastos excederam receitas</p>
        )}
      </div>
    </div>
  );
};

export default IncomeVsExpense;
