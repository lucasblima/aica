import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarRange,
} from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';
import { getTransactionsByDateRange } from '../services/financeService';
import type { FinanceTransaction } from '../types';
import { CATEGORY_LABELS, formatCurrency } from '../constants';

const log = createNamespacedLogger('MonthComparisonView');

// =====================================================
// MonthComparisonView — Side-by-Side Month Comparison
// =====================================================

interface MonthComparisonViewProps {
  userId: string;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const formatPercentage = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

interface MonthKey {
  year: number;
  month: number;
}

interface MonthSummary {
  income: number;
  expenses: number;
  balance: number;
  byCategory: Record<string, { income: number; expenses: number }>;
  transactionCount: number;
}

function getMonthRange(mk: MonthKey): { start: string; end: string } {
  const first = new Date(mk.year, mk.month, 1);
  const last = new Date(mk.year, mk.month + 1, 0);
  return {
    start: first.toISOString().split('T')[0],
    end: last.toISOString().split('T')[0],
  };
}

function summarizeTransactions(transactions: FinanceTransaction[]): MonthSummary {
  const byCategory: Record<string, { income: number; expenses: number }> = {};
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount));
    if (tx.type === 'income') {
      income += amount;
    } else {
      expenses += amount;
    }

    if (!byCategory[tx.category]) {
      byCategory[tx.category] = { income: 0, expenses: 0 };
    }
    if (tx.type === 'income') {
      byCategory[tx.category].income += amount;
    } else {
      byCategory[tx.category].expenses += amount;
    }
  }

  return {
    income,
    expenses,
    balance: income - expenses,
    byCategory,
    transactionCount: transactions.length,
  };
}

function buildMonthOptions(): MonthKey[] {
  const now = new Date();
  const options: MonthKey[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return options;
}

function monthLabel(mk: MonthKey): string {
  return `${MONTH_NAMES[mk.month]} ${mk.year}`;
}

function monthValue(mk: MonthKey): string {
  return `${mk.year}-${String(mk.month).padStart(2, '0')}`;
}

function parseMonthValue(val: string): MonthKey {
  const [y, m] = val.split('-');
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

export const MonthComparisonView: React.FC<MonthComparisonViewProps> = ({
  userId,
}) => {
  const now = new Date();
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const [monthA, setMonthA] = useState<MonthKey>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [monthB, setMonthB] = useState<MonthKey>(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: prev.getFullYear(), month: prev.getMonth() };
  });

  const [summaryA, setSummaryA] = useState<MonthSummary | null>(null);
  const [summaryB, setSummaryB] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rangeA = getMonthRange(monthA);
      const rangeB = getMonthRange(monthB);

      const [txA, txB] = await Promise.all([
        getTransactionsByDateRange(userId, rangeA.start, rangeA.end),
        getTransactionsByDateRange(userId, rangeB.start, rangeB.end),
      ]);

      setSummaryA(summarizeTransactions(txA));
      setSummaryB(summarizeTransactions(txB));
    } catch (err) {
      log.error('Failed to fetch comparison data', err);
      setError('Erro ao carregar dados de comparacao.');
    } finally {
      setLoading(false);
    }
  }, [userId, monthA, monthB]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Delta calculation helper
  const getDelta = (a: number, b: number) => {
    const diff = a - b;
    const pct = b !== 0 ? ((a - b) / Math.abs(b)) * 100 : a !== 0 ? 100 : 0;
    return { diff, pct };
  };

  // Highlights
  const highlights = useMemo(() => {
    if (!summaryA || !summaryB) return [];

    const allCategories = new Set([
      ...Object.keys(summaryA.byCategory),
      ...Object.keys(summaryB.byCategory),
    ]);

    const changes: Array<{
      category: string;
      diff: number;
      pct: number;
    }> = [];

    for (const cat of allCategories) {
      const expA = summaryA.byCategory[cat]?.expenses || 0;
      const expB = summaryB.byCategory[cat]?.expenses || 0;
      const diff = expA - expB;
      const pct = expB !== 0 ? (diff / expB) * 100 : expA !== 0 ? 100 : 0;
      if (Math.abs(diff) > 0) {
        changes.push({ category: cat, diff, pct });
      }
    }

    changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const biggest_increase = changes.find((c) => c.diff > 0);
    const biggest_decrease = changes.find((c) => c.diff < 0);

    const result = [];
    if (biggest_increase) {
      result.push({
        label: `Maior aumento: ${CATEGORY_LABELS[biggest_increase.category] || biggest_increase.category}`,
        value: `+${formatCurrency(biggest_increase.diff)} (${formatPercentage(biggest_increase.pct)})`,
        isPositive: false,
      });
    }
    if (biggest_decrease) {
      result.push({
        label: `Maior economia: ${CATEGORY_LABELS[biggest_decrease.category] || biggest_decrease.category}`,
        value: `${formatCurrency(biggest_decrease.diff)} (${formatPercentage(biggest_decrease.pct)})`,
        isPositive: true,
      });
    }

    return result;
  }, [summaryA, summaryB]);

  // All categories for the comparison bars
  const allCategories = useMemo(() => {
    if (!summaryA || !summaryB) return [];
    const cats = new Set([
      ...Object.keys(summaryA.byCategory),
      ...Object.keys(summaryB.byCategory),
    ]);
    const entries = Array.from(cats).map((cat) => {
      const expA = summaryA.byCategory[cat]?.expenses || 0;
      const expB = summaryB.byCategory[cat]?.expenses || 0;
      return { category: cat, a: expA, b: expB, max: Math.max(expA, expB) };
    });
    entries.sort((a, b) => b.max - a.max);
    return entries;
  }, [summaryA, summaryB]);

  const maxCategoryAmount = useMemo(
    () => Math.max(...allCategories.map((c) => c.max), 1),
    [allCategories]
  );

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-3">
          <div className="h-10 bg-ceramic-cool rounded-lg flex-1" />
          <div className="h-10 bg-ceramic-cool rounded-lg flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ceramic-card p-4">
              <div className="h-4 bg-ceramic-cool rounded w-20 mb-3" />
              <div className="h-8 bg-ceramic-cool rounded w-28 mb-2" />
              <div className="h-3 bg-ceramic-cool rounded w-16" />
            </div>
          ))}
        </div>
        <div className="ceramic-card p-4">
          <div className="h-4 bg-ceramic-cool rounded w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="h-3 bg-ceramic-cool rounded w-20" />
              <div className="h-4 bg-ceramic-cool rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="ceramic-inset p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-ceramic-error" />
        </div>
        <p className="text-ceramic-text-primary font-medium mb-1">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors mt-3"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!summaryA || !summaryB) return null;

  const incomeDelta = getDelta(summaryA.income, summaryB.income);
  const expenseDelta = getDelta(summaryA.expenses, summaryB.expenses);
  const balanceDelta = getDelta(summaryA.balance, summaryB.balance);

  const DeltaIndicator = ({
    pct,
    invertColor = false,
  }: {
    pct: number;
    invertColor?: boolean;
  }) => {
    const isUp = pct > 0;
    const isPositive = invertColor ? !isUp : isUp;
    if (Math.abs(pct) < 0.5) {
      return (
        <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
          <Minus className="w-3 h-3" />
          Estavel
        </span>
      );
    }
    return (
      <span
        className={`flex items-center gap-1 text-xs font-medium ${
          isPositive ? 'text-ceramic-success' : 'text-ceramic-error'
        }`}
      >
        {isUp ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {formatPercentage(pct)}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Month selectors ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs text-ceramic-text-secondary block mb-1">
            Mes A
          </label>
          <select
            value={monthValue(monthA)}
            onChange={(e) => setMonthA(parseMonthValue(e.target.value))}
            className="w-full text-sm ceramic-inset px-3 py-2.5 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-transparent"
          >
            {monthOptions.map((mk) => (
              <option key={monthValue(mk)} value={monthValue(mk)}>
                {monthLabel(mk)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-center pb-2">
          <CalendarRange className="w-5 h-5 text-ceramic-text-secondary" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-ceramic-text-secondary block mb-1">
            Mes B
          </label>
          <select
            value={monthValue(monthB)}
            onChange={(e) => setMonthB(parseMonthValue(e.target.value))}
            className="w-full text-sm ceramic-inset px-3 py-2.5 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-transparent"
          >
            {monthOptions.map((mk) => (
              <option key={monthValue(mk)} value={monthValue(mk)}>
                {monthLabel(mk)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Summary comparison cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Income */}
        <div className="ceramic-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4 text-ceramic-success" />
            <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
              Receitas
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div>
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthA)}
              </p>
              <p className="text-sm font-bold text-ceramic-success">
                {formatCurrency(summaryA.income)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthB)}
              </p>
              <p className="text-sm font-bold text-ceramic-success/70">
                {formatCurrency(summaryB.income)}
              </p>
            </div>
          </div>
          <DeltaIndicator pct={incomeDelta.pct} />
        </div>

        {/* Expenses */}
        <div className="ceramic-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-ceramic-error" />
            <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
              Despesas
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div>
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthA)}
              </p>
              <p className="text-sm font-bold text-ceramic-error">
                {formatCurrency(summaryA.expenses)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthB)}
              </p>
              <p className="text-sm font-bold text-ceramic-error/70">
                {formatCurrency(summaryB.expenses)}
              </p>
            </div>
          </div>
          <DeltaIndicator pct={expenseDelta.pct} invertColor />
        </div>

        {/* Balance */}
        <div className="ceramic-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarRange className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
              Saldo
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div>
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthA)}
              </p>
              <p
                className={`text-sm font-bold ${
                  summaryA.balance >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'
                }`}
              >
                {formatCurrency(summaryA.balance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ceramic-text-secondary">
                {monthLabel(monthB)}
              </p>
              <p
                className={`text-sm font-bold ${
                  summaryB.balance >= 0 ? 'text-ceramic-success/70' : 'text-ceramic-error/70'
                }`}
              >
                {formatCurrency(summaryB.balance)}
              </p>
            </div>
          </div>
          <DeltaIndicator pct={balanceDelta.pct} />
        </div>
      </div>

      {/* ── Category comparison bars ── */}
      {allCategories.length > 0 && (
        <div className="ceramic-card p-4">
          <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
            Comparacao por Categoria (Despesas)
          </h4>
          <div className="space-y-3">
            {allCategories.map(({ category, a, b, max }) => {
              if (max === 0) return null;
              const widthA = (a / maxCategoryAmount) * 100;
              const widthB = (b / maxCategoryAmount) * 100;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ceramic-text-primary font-medium">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <span className="text-[10px] text-ceramic-text-secondary">
                      {formatCurrency(a)} / {formatCurrency(b)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-ceramic-text-secondary w-4">A</span>
                      <div className="flex-1 h-2.5 ceramic-inset rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${widthA}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-ceramic-text-secondary w-4">B</span>
                      <div className="flex-1 h-2.5 ceramic-inset rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-300 rounded-full transition-all duration-300"
                          style={{ width: `${widthB}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Highlights ── */}
      {highlights.length > 0 && (
        <div className="ceramic-card p-4">
          <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
            Destaques
          </h4>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between ceramic-inset rounded-lg px-3 py-2`}
              >
                <span className="text-xs text-ceramic-text-primary">{h.label}</span>
                <span
                  className={`text-xs font-bold ${
                    h.isPositive ? 'text-ceramic-success' : 'text-ceramic-error'
                  }`}
                >
                  {h.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
