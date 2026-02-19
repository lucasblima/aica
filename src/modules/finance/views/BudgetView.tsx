/**
 * Budget View - Jony Ive Style
 *
 * Minimalista, focado em orcamento por categorias.
 * Now backed by finance_budgets table via budgetService.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

const log = createNamespacedLogger('BudgetView');
import { statementService } from '../services/statementService';
import { getBudgetSummary, upsertBudget } from '../services/budgetService';
import { supabase } from '../../../services/supabaseClient';
import type { FinanceStatement, FinanceTransaction, BudgetSummaryRow } from '../types';

// =====================================================
// Types
// =====================================================

interface BudgetViewProps {
  userId: string;
  onBack?: () => void;
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
// Constants - Categorias com Orcamentos Default
// =====================================================

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; defaultBudget: number; color: string }> = {
  housing: { icon: '\uD83C\uDFE0', label: 'Moradia', defaultBudget: 1500, color: '#6366f1' },
  food: { icon: '\uD83C\uDF7D\uFE0F', label: 'Alimentacao', defaultBudget: 800, color: '#f59e0b' },
  transport: { icon: '\uD83D\uDE97', label: 'Transporte', defaultBudget: 400, color: '#10b981' },
  health: { icon: '\uD83D\uDC8A', label: 'Saude', defaultBudget: 300, color: '#ec4899' },
  education: { icon: '\uD83D\uDCDA', label: 'Educacao', defaultBudget: 200, color: '#3b82f6' },
  entertainment: { icon: '\uD83C\uDFAC', label: 'Lazer', defaultBudget: 200, color: '#8b5cf6' },
  shopping: { icon: '\uD83D\uDECD\uFE0F', label: 'Compras', defaultBudget: 300, color: '#f97316' },
  other: { icon: '\uD83D\uDCE6', label: 'Outros', defaultBudget: 150, color: '#6b7280' },
};

// =====================================================
// Helpers
// =====================================================

function getProgressColorClass(percentage: number): string {
  if (percentage > 100) return 'from-ceramic-error to-ceramic-error/80';
  if (percentage > 80) return 'from-ceramic-accent to-ceramic-accent/80';
  if (percentage > 60) return 'from-ceramic-warning to-ceramic-warning/80';
  return 'from-ceramic-success to-ceramic-success/80';
}

// =====================================================
// Component
// =====================================================

export const BudgetView: React.FC<BudgetViewProps> = ({ userId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [dbBudgetSummary, setDbBudgetSummary] = useState<BudgetSummaryRow[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Inline budget editing state
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId, selectedYear, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get first and last day of selected month
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const lastDayStr = lastDay.toISOString().split('T')[0];

      // Fetch transactions for the selected month + budget summary from DB
      const [txResult, statementsData, budgetData] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('transaction_date', firstDayStr)
          .lte('transaction_date', lastDayStr),
        statementService.getStatements(userId),
        getBudgetSummary(userId, selectedMonth, selectedYear).catch(() => []),
      ]);

      if (txResult.error) throw txResult.error;

      setTransactions(txResult.data || []);
      setStatements(statementsData);
      setDbBudgetSummary(budgetData);
    } catch (error) {
      log.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate category spending for selected month, merging DB budgets with defaults
  const budgetCategories: CategoryBudget[] = useMemo(() => {
    // Build a map of DB budget data keyed by category
    const dbMap = new Map<string, BudgetSummaryRow>();
    dbBudgetSummary.forEach((row) => {
      dbMap.set(row.category, row);
    });

    return Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
      const dbRow = dbMap.get(key);

      const spent = dbRow
        ? dbRow.spent
        : transactions
            .filter(t => t.type === 'expense' && t.category === key)
            .reduce((sum, t) => sum + Number(t.amount), 0);

      const budget = dbRow ? dbRow.budget_amount : config.defaultBudget;

      return {
        category: key,
        icon: config.icon,
        label: config.label,
        spent,
        budget,
        color: config.color,
        fromDb: !!dbRow,
      };
    });
  }, [transactions, dbBudgetSummary]);

  // Calculate month balance (income - expenses)
  const monthIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthBalance = monthIncome - monthExpenses;

  const totalBudget = budgetCategories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);

  // Get month name
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="h-screen bg-ceramic-base flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-64 bg-ceramic-base rounded" />
          <div className="h-12 w-48 bg-ceramic-base rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-ceramic-base overflow-y-auto">
      {/* Header */}
      {onBack && (
        <div className="fixed top-0 left-0 right-0 bg-ceramic-base/80 backdrop-blur-lg z-10 border-b border-ceramic-text-secondary/10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section - Saldo Grande e Minimalista */}
      <div className="min-h-[60vh] md:min-h-screen flex items-center justify-center px-4 md:px-6">
        <div className="text-center max-w-2xl">
          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={goToPreviousMonth}
              className="w-12 h-12 rounded-full hover:bg-ceramic-base flex items-center justify-center transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-6 h-6 text-ceramic-text-secondary" />
            </button>

            <p className="text-sm uppercase tracking-[0.3em] text-ceramic-text-secondary font-medium min-w-[200px]">
              {monthName.toUpperCase()}
            </p>

            <button
              onClick={goToNextMonth}
              className="w-12 h-12 rounded-full hover:bg-ceramic-base flex items-center justify-center transition-colors"
              aria-label="Proximo mes"
            >
              <ChevronRight className="w-6 h-6 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Balance - Typography Hero */}
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-thin text-ceramic-text-primary mb-4 tracking-tight text-etched">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2,
            }).format(monthBalance)}
          </h1>

          {/* Subtitle - Month Summary */}
          <div className="mb-12">
            <div className="inline-block">
              <div className="h-px w-24 bg-ceramic-text-secondary/30 mb-6 mx-auto" />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-ceramic-text-secondary">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1">Receitas</p>
                  <p className="text-lg font-medium text-ceramic-success">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(monthIncome)}
                  </p>
                </div>
                <div className="text-ceramic-border">|</div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1">Despesas</p>
                  <p className="text-lg font-medium text-ceramic-error">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(monthExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="max-w-md mx-auto">
            <div className="h-1 bg-ceramic-cool rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColorClass((totalSpent / totalBudget) * 100)} transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-ceramic-text-secondary">
              <span>R$ {totalSpent.toFixed(2)}</span>
              <span>{((totalSpent / totalBudget) * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <div className="w-6 h-10 border-2 border-ceramic-border rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-ceramic-border rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-20">
        <div className="space-y-8">
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
                        title="Clique para editar orcamento"
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
                          <span className="text-[9px] text-ceramic-text-secondary/50">(padrao)</span>
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
                        Voce ultrapassou o orcamento desta categoria
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
                      Voce ja gastou {percentage.toFixed(0)}% do orcamento desta categoria
                    </p>
                  </div>
                )}

                {/* "Definir orcamento" for categories with spending but no DB budget */}
                {!cat.fromDb && cat.spent > 0 && !isEditing && (
                  <button
                    onClick={() => startEditing(cat.category, cat.budget)}
                    className="mt-3 text-xs text-ceramic-accent hover:text-amber-600 transition-colors font-medium"
                  >
                    Definir orcamento personalizado
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
      </div>

      {/* Debug Panel - only in development */}
      {import.meta.env.DEV && <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="ceramic-card p-8">
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">Auditoria de Saldo - {monthName}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Receitas */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Receitas</p>
              <p className="text-2xl font-bold text-ceramic-success">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(monthIncome)}
              </p>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                {transactions.filter(t => t.type === 'income').length} lancamento(s)
              </p>
            </div>

            {/* Despesas */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Despesas</p>
              <p className="text-2xl font-bold text-ceramic-error">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(monthExpenses)}
              </p>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                {transactions.filter(t => t.type === 'expense').length} lancamento(s)
              </p>
            </div>

            {/* Saldo Calculado */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Saldo Calculado</p>
              <p className={`text-2xl font-bold ${monthBalance >= 0 ? 'text-ceramic-warning' : 'text-ceramic-error'}`}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(monthBalance)}
              </p>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                Receitas - Despesas
              </p>
            </div>
          </div>

          {/* Formula Visual */}
          <div className="ceramic-tray p-4">
            <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-3">Calculo:</p>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className="text-ceramic-success font-bold">
                R$ {monthIncome.toFixed(2)}
              </span>
              <span className="text-ceramic-text-secondary">-</span>
              <span className="text-ceramic-error font-bold">
                R$ {monthExpenses.toFixed(2)}
              </span>
              <span className="text-ceramic-text-secondary">=</span>
              <span className={`font-bold ${monthBalance >= 0 ? 'text-ceramic-warning' : 'text-ceramic-error'}`}>
                R$ {monthBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Breakdown por Categoria */}
          <div className="mt-6 ceramic-tray p-4">
            <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-3">Despesas por Categoria:</p>
            <div className="space-y-2">
              {budgetCategories
                .filter(cat => cat.spent > 0)
                .sort((a, b) => b.spent - a.spent)
                .map(cat => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-ceramic-text-primary">{cat.label}</span>
                      <span className="text-ceramic-text-secondary text-xs">
                        ({transactions.filter(t => t.type === 'expense' && t.category === cat.category).length})
                      </span>
                    </div>
                    <span className="font-bold text-ceramic-text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(cat.spent)}
                    </span>
                  </div>
                ))}

              {/* Total Check */}
              <div className="flex items-center justify-between text-sm pt-3 mt-3 border-t border-ceramic-text-secondary/20">
                <span className="font-medium text-ceramic-text-primary">Total Categorizado</span>
                <span className="font-bold text-ceramic-text-primary">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(budgetCategories.reduce((sum, cat) => sum + cat.spent, 0))}
                </span>
              </div>

              {/* Validation */}
              {Math.abs(monthExpenses - budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)) > 0.01 && (
                <div className="mt-3 p-3 bg-ceramic-error/10 rounded-lg border border-ceramic-error/20">
                  <p className="text-xs text-ceramic-error font-medium">
                    Discrepancia: Total de despesas nao bate com soma das categorias!
                  </p>
                  <p className="text-xs text-ceramic-error mt-1">
                    Diferenca: R$ {Math.abs(monthExpenses - budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>}

      {/* Income Transactions Section */}
      {monthIncome > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-medium text-ceramic-text-primary mb-6">Receitas do Mes</h2>
          <div className="ceramic-card p-8">
            <div className="space-y-2">
              {transactions
                .filter(t => t.type === 'income')
                .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between py-3 text-sm hover:bg-ceramic-highlight rounded-lg px-4 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-ceramic-text-primary">{tx.description}</p>
                      <p className="text-xs text-ceramic-text-secondary mt-1">
                        {new Date(tx.transaction_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-ceramic-success ml-4">
                      +{new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(tx.amount))}
                    </p>
                  </div>
                ))}

              {/* Total */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-ceramic-success/20">
                <p className="text-base font-medium text-ceramic-text-primary">Total de Receitas</p>
                <p className="text-lg font-bold text-ceramic-success">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(monthIncome)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Section -- only show when there are transactions */}
      {transactions.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <div className="space-y-6">
            <h2 className="text-2xl font-medium text-ceramic-text-primary mb-8">Insights do Mes</h2>

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
                    <h4 className="text-lg font-bold text-ceramic-text-primary mb-3">Orcamento Excedido</h4>
                    <p className="text-ceramic-text-secondary leading-relaxed">
                      {budgetCategories
                        .filter(c => c.spent > c.budget)
                        .map(c => c.label)
                        .join(', ')}{' '}
                      {budgetCategories.filter(c => c.spent > c.budget).length === 1
                        ? 'ultrapassou o orcamento definido'
                        : 'ultrapassaram os orcamentos definidos'}.
                      Considere revisar seus gastos nestas categorias.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Positive balance insight */}
            {monthBalance > 0 && (
              <div className="bg-gradient-to-br from-ceramic-success/10 to-transparent p-8 rounded-3xl border border-ceramic-success/20">
                <div className="flex gap-6">
                  <div className="text-5xl">{'\uD83D\uDCCA'}</div>
                  <div>
                    <h4 className="text-lg font-bold text-ceramic-text-primary mb-3">Saldo Positivo</h4>
                    <p className="text-ceramic-text-secondary leading-relaxed">
                      Suas receitas superaram as despesas em{' '}
                      <span className="font-medium text-ceramic-success">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthBalance)}
                      </span>{' '}
                      este mes. Continue assim!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
