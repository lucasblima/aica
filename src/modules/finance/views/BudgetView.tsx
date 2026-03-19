/**
 * Budget View - Orçamento Tab
 *
 * Compact month navigation, Resumo do Mes, BurnRateCard,
 * budget per category with progress bars & inline editing,
 * and contextual insights.
 *
 * Now backed by finance_budgets table via budgetService.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

const log = createNamespacedLogger('BudgetView');
import { getBudgetSummary, upsertBudget } from '../services/budgetService';
import { getBurnRate, getAllTimeSummary } from '../services/financeService';
import { supabase } from '../../../services/supabaseClient';
import { BurnRateCard } from '../components/BurnRateCard';
import { GoalTracker } from '../components/GoalTracker';
import { SavingsGoalProjection } from '../components/SavingsGoalProjection';
import type { FinanceTransaction, BudgetSummaryRow, BurnRateData, FinanceGoal } from '../types';
import { useFinanceContext } from '../contexts/FinanceContext';
import { CATEGORY_LABELS } from '../constants';

// =====================================================
// Types
// =====================================================

interface BudgetViewProps {
  userId: string;
}

interface CategoryBudget {
  category: string;
  icon: string;
  label: string;
  spent: number;
  budget: number;
  color: string;
  fromDb: boolean;
}

// =====================================================
// Helpers
// =====================================================

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

function getProgressColorClass(percentage: number): string {
  if (percentage > 100) return 'from-ceramic-error to-ceramic-error/80';
  if (percentage > 80) return 'from-ceramic-accent to-ceramic-accent/80';
  if (percentage > 60) return 'from-ceramic-warning to-ceramic-warning/80';
  return 'from-ceramic-success to-ceramic-success/80';
}

// =====================================================
// Component
// =====================================================

export const BudgetView: React.FC<BudgetViewProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [dbBudgetSummary, setDbBudgetSummary] = useState<BudgetSummaryRow[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | undefined>(undefined);
  const [goals, setGoals] = useState<FinanceGoal[]>([]);

  const { categories: dbCategories, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth } = useFinanceContext();

  // Inline budget editing state
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get first and last day of selected month
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const lastDayStr = lastDay.toISOString().split('T')[0];

      // Fetch transactions for the selected month + budget summary + burn rate + balance + goals
      const [txResult, budgetData, burnRateData, summaryData, goalsData] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('transaction_date', firstDayStr)
          .lte('transaction_date', lastDayStr),
        getBudgetSummary(userId, selectedMonth, selectedYear).catch(() => []),
        getBurnRate(userId).catch(() => null),
        getAllTimeSummary(userId).catch(() => null),
        supabase
          .from('finance_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .then(({ data }) => (data || []) as FinanceGoal[]),
      ]);

      if (txResult.error) throw txResult.error;

      setTransactions(txResult.data || []);
      setDbBudgetSummary(budgetData);
      setBurnRate(burnRateData);
      setCurrentBalance(summaryData?.currentBalance);
      setGoals(goalsData);
    } catch (error) {
      log.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Handle saving an inline budget edit
  const handleSaveBudget = async (category: string) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;

    try {
      setSavingBudget(true);
      await upsertBudget(userId, category, amount, selectedMonth, selectedYear);
      setEditingBudget(null);
      setEditAmount('');
      await loadData();
    } catch (error) {
      log.error('Error saving budget:', error);
    } finally {
      setSavingBudget(false);
    }
  };

  const startEditing = (category: string, currentBudget: number) => {
    setEditingBudget(category);
    setEditAmount(currentBudget.toString());
  };

  const cancelEditing = () => {
    setEditingBudget(null);
    setEditAmount('');
  };

  // Calculate category spending for selected month, using dynamic categories from DB
  const budgetCategories: CategoryBudget[] = useMemo(() => {
    const dbMap = new Map<string, BudgetSummaryRow>();
    dbBudgetSummary.forEach((row) => {
      dbMap.set(row.category, row);
    });

    // Use expense categories from DB (auto-seeded if empty by categoryService)
    const expenseCategories = dbCategories.filter(c => c.is_expense);

    return expenseCategories.map((cat) => {
      const dbRow = dbMap.get(cat.key);

      const spent = dbRow
        ? dbRow.spent
        : transactions
            .filter(t => t.type === 'expense' && t.category === cat.key)
            .reduce((sum, t) => sum + Number(t.amount), 0);

      const budget = dbRow ? dbRow.budget_amount : 0;

      return {
        category: cat.key,
        icon: cat.icon,
        label: cat.label || CATEGORY_LABELS[cat.key] || cat.key,
        spent,
        budget,
        color: cat.color || '#6b7280',
        fromDb: !!dbRow,
      };
    });
  }, [transactions, dbBudgetSummary, dbCategories]);

  // Calculate month totals
  const monthIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalBudget = budgetCategories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const monthlySavings = monthIncome - totalSpent;

  // Get month name
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-64 bg-ceramic-cool rounded" />
          <div className="h-12 w-48 bg-ceramic-cool rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-ceramic-base space-y-6">
      {/* Month Navigation — compact */}
      <div className="ceramic-card p-4">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={goToPreviousMonth}
            className="w-10 h-10 rounded-full hover:bg-ceramic-cool flex items-center justify-center transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5 text-ceramic-text-secondary" />
          </button>

          <p className="text-sm uppercase tracking-[0.2em] text-ceramic-text-primary font-bold min-w-[200px] text-center">
            {monthName.toUpperCase()}
          </p>

          <button
            onClick={goToNextMonth}
            className="w-10 h-10 rounded-full hover:bg-ceramic-cool flex items-center justify-center transition-colors"
            aria-label="Próximo mes"
          >
            <ChevronRight className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>
      </div>

      {/* Resumo do Mes — key numbers */}
      <div className="ceramic-card p-6">
        <h3 className="text-sm font-bold text-ceramic-text-primary mb-4">Resumo do Mes</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Receita</p>
            <p className="text-lg font-black text-ceramic-success">{formatCurrency(monthIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Orcado</p>
            <p className="text-lg font-black text-ceramic-info">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Gasto</p>
            <p className="text-lg font-black text-ceramic-error">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Disponível</p>
            <p className={`text-lg font-black ${(totalBudget - totalSpent) >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
              {formatCurrency(totalBudget - totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* BurnRateCard */}
      {burnRate && (
        <BurnRateCard burnRate={burnRate} currentBalance={currentBalance} />
      )}

      {/* Overall Progress */}
      <div className="ceramic-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ceramic-text-primary">Progresso Geral</h3>
          <span className="text-sm font-bold text-ceramic-text-secondary">
            {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColorClass(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)} transition-all duration-1000 ease-out`}
            style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-ceramic-text-secondary">
          <span>{formatCurrency(totalSpent)} gasto</span>
          <span>de {formatCurrency(totalBudget)}</span>
        </div>
      </div>

      {/* Categories Section */}
      <div className="space-y-4">
        {budgetCategories.map((cat) => {
          const percentage = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
          const isOverBudget = percentage > 100;
          const isWarning = percentage > 80 && !isOverBudget;
          const isEditing = editingBudget === cat.category;

          return (
            <div
              key={cat.category}
              className="group ceramic-card transition-all duration-300 p-4 md:p-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-2xl md:text-4xl">{cat.icon}</span>
                  <h3 className="text-lg md:text-xl font-medium text-ceramic-text-primary">{cat.label}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xl md:text-3xl font-bold text-ceramic-text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(cat.spent)}
                  </p>

                  {/* Budget amount — clickable for editing */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="text-xs text-ceramic-text-secondary">de R$</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 text-sm text-right ceramic-inset px-2 py-1 rounded text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
                        min="0"
                        step="50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveBudget(cat.category);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => handleSaveBudget(cat.category)}
                        disabled={savingBudget}
                        className="p-1 rounded hover:bg-ceramic-success/10 transition-colors"
                        title="Salvar"
                      >
                        <Check className="w-4 h-4 text-ceramic-success" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 rounded hover:bg-ceramic-cool transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4 text-ceramic-text-secondary" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(cat.category, cat.budget)}
                      className="group/edit flex items-center gap-1 mt-1 justify-end hover:opacity-80 transition-opacity"
                      title="Clique para editar orçamento"
                    >
                      <p className="text-sm text-ceramic-text-secondary">
                        de{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                        }).format(cat.budget)}
                      </p>
                      <Pencil className="w-3 h-3 text-ceramic-text-secondary opacity-0 group-hover:opacity-50 group-hover/edit:opacity-100 transition-opacity" />
                      {!cat.fromDb && (
                        <span className="text-[9px] text-ceramic-text-secondary/50">(padrão)</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-3 bg-ceramic-cool rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out bg-gradient-to-r ${getProgressColorClass(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Alerts */}
              {isOverBudget && (
                <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 rounded-2xl border border-ceramic-error/20">
                  <span className="text-xl">{'\u26A0\uFE0F'}</span>
                  <div>
                    <p className="text-sm font-medium text-ceramic-error">
                      Você ultrapassou o orçamento desta categoria
                    </p>
                    <p className="text-xs text-ceramic-error mt-1">
                      {percentage.toFixed(0)}% do orcamento usado
                    </p>
                  </div>
                </div>
              )}

              {isWarning && !isOverBudget && (
                <div className="flex items-start gap-3 p-4 bg-ceramic-warning/10 rounded-2xl border border-ceramic-warning/20">
                  <span className="text-xl">{'\uD83D\uDCA1'}</span>
                  <p className="text-sm text-ceramic-warning">
                    Você já gastou {percentage.toFixed(0)}% do orcamento desta categoria
                  </p>
                </div>
              )}

              {/* "Definir orçamento" for categories with spending but no DB budget */}
              {!cat.fromDb && cat.spent > 0 && !isEditing && (
                <button
                  onClick={() => startEditing(cat.category, cat.budget)}
                  className="mt-3 text-xs text-ceramic-accent hover:text-amber-600 transition-colors font-medium"
                >
                  Definir orçamento personalizado
                </button>
              )}

              {/* Transactions List - Expandable */}
              {cat.spent > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                    className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    {expandedCategory === cat.category ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span>
                      {expandedCategory === cat.category ? 'Ocultar' : 'Ver'} lancamentos (
                      {transactions.filter(t => t.type === 'expense' && t.category === cat.category).length})
                    </span>
                  </button>

                  {expandedCategory === cat.category && (
                    <div className="mt-4 space-y-2 pl-6 border-l-2 border-ceramic-cool">
                      {transactions
                        .filter(t => t.type === 'expense' && t.category === cat.category)
                        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                        .map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-start justify-between py-2 text-sm hover:bg-ceramic-highlight rounded-lg px-3 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-ceramic-text-primary">{tx.description}</p>
                              <p className="text-xs text-ceramic-text-secondary mt-1">
                                {new Date(tx.transaction_date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-ceramic-error ml-4">
                              -{new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(Number(tx.amount))}
                            </p>
                          </div>
                        ))}

                      {/* Total */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-ceramic-border">
                        <p className="text-sm font-medium text-ceramic-text-primary">Total da categoria</p>
                        <p className="text-sm font-bold text-ceramic-text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(cat.spent)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Section 4: Metas Financeiras */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-ceramic-text-primary">Metas Financeiras</h2>
        <GoalTracker userId={userId} />

        {/* Savings Projections for active goals with remaining target */}
        {goals.filter(g => g.target_amount > (g.current_amount || 0)).map(goal => (
          <SavingsGoalProjection
            key={goal.id}
            goalTitle={goal.title}
            targetAmount={goal.target_amount}
            currentAmount={goal.current_amount || 0}
            monthlyContribution={monthlySavings > 0 ? monthlySavings : 0}
            deadline={goal.deadline}
          />
        ))}
      </div>

      {/* Insights Section -- only show when there are transactions */}
      {transactions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-ceramic-text-primary">Insights do Mes</h2>

          {/* Top category insight */}
          {(() => {
            const topCategory = budgetCategories
              .filter(c => c.spent > 0)
              .sort((a, b) => b.spent - a.spent)[0];
            if (!topCategory) return null;
            const pct = ((topCategory.spent / totalSpent) * 100).toFixed(0);
            return (
              <div className="bg-gradient-to-br from-ceramic-info/10 to-transparent p-8 rounded-3xl border border-ceramic-info/20">
                <div className="flex gap-6">
                  <div className="text-5xl">{topCategory.icon}</div>
                  <div>
                    <h4 className="text-lg font-bold text-ceramic-text-primary mb-3">Maior Categoria</h4>
                    <p className="text-ceramic-text-secondary leading-relaxed">
                      <span className="font-medium text-ceramic-text-primary">{topCategory.label}</span> representa{' '}
                      <span className="font-medium text-ceramic-text-primary">{pct}%</span> das suas despesas
                      este mes, totalizando{' '}
                      <span className="font-medium text-ceramic-text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(topCategory.spent)}
                      </span>.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Over-budget alert */}
          {budgetCategories.some(c => c.spent > c.budget) && (
            <div className="bg-gradient-to-br from-ceramic-error/10 to-transparent p-8 rounded-3xl border border-ceramic-error/20">
              <div className="flex gap-6">
                <div className="text-5xl">{'\u26A0\uFE0F'}</div>
                <div>
                  <h4 className="text-lg font-bold text-ceramic-text-primary mb-3">Orçamento Excedido</h4>
                  <p className="text-ceramic-text-secondary leading-relaxed">
                    {budgetCategories
                      .filter(c => c.spent > c.budget)
                      .map(c => c.label)
                      .join(', ')}{' '}
                    {budgetCategories.filter(c => c.spent > c.budget).length === 1
                      ? 'ultrapassou o orçamento definido'
                      : 'ultrapassaram os orcamentos definidos'}.
                    Considere revisar seus gastos nestas categorias.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Positive balance insight */}
          {(monthIncome - totalSpent) > 0 && (
            <div className="bg-gradient-to-br from-ceramic-success/10 to-transparent p-8 rounded-3xl border border-ceramic-success/20">
              <div className="flex gap-6">
                <div className="text-5xl">{'\uD83D\uDCCA'}</div>
                <div>
                  <h4 className="text-lg font-bold text-ceramic-text-primary mb-3">Saldo Positivo</h4>
                  <p className="text-ceramic-text-secondary leading-relaxed">
                    Suas receitas superaram as despesas em{' '}
                    <span className="font-medium text-ceramic-success">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthIncome - totalSpent)}
                    </span>{' '}
                    este mes. Continue assim!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
