/**
 * Budget View - Jony Ive Style
 *
 * Minimalista, focado em orçamento por categorias
 * Filosofia: "Simplicity is the ultimate sophistication"
 */

import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { statementService } from '../services/statementService';
import { supabase } from '../../../services/supabaseClient';
import type { FinanceStatement, FinanceTransaction } from '../types';

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
}

// =====================================================
// Constants - Categorias com Orçamentos Default
// =====================================================

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; defaultBudget: number; color: string }> = {
  housing: { icon: '🏠', label: 'Moradia', defaultBudget: 1500, color: '#6366f1' },
  food: { icon: '🍽️', label: 'Alimentação', defaultBudget: 800, color: '#f59e0b' },
  transport: { icon: '🚗', label: 'Transporte', defaultBudget: 400, color: '#10b981' },
  health: { icon: '💊', label: 'Saúde', defaultBudget: 300, color: '#ec4899' },
  education: { icon: '📚', label: 'Educação', defaultBudget: 200, color: '#3b82f6' },
  entertainment: { icon: '🎬', label: 'Lazer', defaultBudget: 200, color: '#8b5cf6' },
  shopping: { icon: '🛍️', label: 'Compras', defaultBudget: 300, color: '#f97316' },
  other: { icon: '📦', label: 'Outros', defaultBudget: 150, color: '#6b7280' },
};

// =====================================================
// Component
// =====================================================

export const BudgetView: React.FC<BudgetViewProps> = ({ userId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

      // Fetch transactions for the selected month
      const { data: txData, error: txError } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', firstDayStr)
        .lte('transaction_date', lastDayStr);

      if (txError) throw txError;

      // Fetch statements
      const statementsData = await statementService.getStatements(userId);

      setTransactions(txData || []);
      setStatements(statementsData);
    } catch (error) {
      console.error('Error loading budget data:', error);
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

  // Calculate category spending for selected month
  const budgetCategories: CategoryBudget[] = useMemo(() => {
    return Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === key)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        category: key,
        icon: config.icon,
        label: config.label,
        spent,
        budget: config.defaultBudget,
        color: config.color,
      };
    });
  }, [transactions]);

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
          <div className="h-24 w-64 bg-gray-100 rounded" />
          <div className="h-12 w-48 bg-gray-100 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-ceramic-base overflow-y-scroll">
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
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={goToPreviousMonth}
              className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <p className="text-sm uppercase tracking-[0.3em] text-gray-400 font-medium min-w-[200px]">
              {monthName.toUpperCase()}
            </p>

            <button
              onClick={goToNextMonth}
              className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Balance - Typography Hero */}
          <h1 className="text-8xl md:text-9xl font-thin text-ceramic-text-primary mb-4 tracking-tight text-etched">
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
              <div className="flex items-center justify-center gap-8 text-ceramic-text-secondary">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1">Receitas</p>
                  <p className="text-lg font-medium text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(monthIncome)}
                  </p>
                </div>
                <div className="text-gray-300">|</div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1">Despesas</p>
                  <p className="text-lg font-medium text-red-600">
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
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>R$ {totalSpent.toFixed(2)}</span>
              <span>{((totalSpent / totalBudget) * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <div className="w-6 h-10 border-2 border-gray-300 rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-gray-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-8">
          {budgetCategories.map((cat) => {
            const percentage = (cat.spent / cat.budget) * 100;
            const isOverBudget = percentage > 100;
            const isWarning = percentage > 80 && !isOverBudget;

            return (
              <div
                key={cat.category}
                className="group ceramic-card transition-all duration-300 p-8"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{cat.icon}</span>
                    <h3 className="text-xl font-medium text-ceramic-text-primary">{cat.label}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-ceramic-text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(cat.spent)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      de{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(cat.budget)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ease-out ${
                        isOverBudget
                          ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : isWarning
                          ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                          : 'bg-gradient-to-r from-blue-500 to-blue-400'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Alerts */}
                {isOverBudget && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Você ultrapassou o orçamento desta categoria
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {percentage.toFixed(0)}% do orçamento usado
                      </p>
                    </div>
                  </div>
                )}

                {isWarning && !isOverBudget && (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <span className="text-xl">💡</span>
                    <p className="text-sm text-orange-900">
                      Você já gastou {percentage.toFixed(0)}% do orçamento desta categoria
                    </p>
                  </div>
                )}

                {/* Transactions List - Expandable */}
                {cat.spent > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {expandedCategory === cat.category ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span>
                        {expandedCategory === cat.category ? 'Ocultar' : 'Ver'} lançamentos (
                        {transactions.filter(t => t.type === 'expense' && t.category === cat.category).length})
                      </span>
                    </button>

                    {expandedCategory === cat.category && (
                      <div className="mt-4 space-y-2 pl-6 border-l-2 border-gray-100">
                        {transactions
                          .filter(t => t.type === 'expense' && t.category === cat.category)
                          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                          .map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-start justify-between py-2 text-sm hover:bg-gray-50 rounded-lg px-3 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{tx.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(tx.transaction_date).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-red-600 ml-4">
                                -{new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(Number(tx.amount))}
                              </p>
                            </div>
                          ))}

                        {/* Total */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Total da categoria</p>
                          <p className="text-sm font-bold text-gray-900">
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

      {/* Debug Panel - Auditoria de Saldo */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="ceramic-card p-8">
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">🔍 Auditoria de Saldo - {monthName}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Receitas */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Receitas</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(monthIncome)}
              </p>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                {transactions.filter(t => t.type === 'income').length} lançamento(s)
              </p>
            </div>

            {/* Despesas */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Despesas</p>
              <p className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(monthExpenses)}
              </p>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                {transactions.filter(t => t.type === 'expense').length} lançamento(s)
              </p>
            </div>

            {/* Saldo Calculado */}
            <div className="ceramic-tray p-4">
              <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-2">Saldo Calculado</p>
              <p className={`text-2xl font-bold ${monthBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
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

          {/* Fórmula Visual */}
          <div className="ceramic-tray p-4">
            <p className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-3">Cálculo:</p>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className="text-green-600 font-bold">
                R$ {monthIncome.toFixed(2)}
              </span>
              <span className="text-gray-400">-</span>
              <span className="text-red-600 font-bold">
                R$ {monthExpenses.toFixed(2)}
              </span>
              <span className="text-gray-400">=</span>
              <span className={`font-bold ${monthBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
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
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ Discrepância: Total de despesas não bate com soma das categorias!
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Diferença: R$ {Math.abs(monthExpenses - budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Income Transactions Section */}
      {monthIncome > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-medium text-ceramic-text-primary mb-6">Receitas do Mês</h2>
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
                    <p className="text-sm font-bold text-green-600 ml-4">
                      +{new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(tx.amount))}
                    </p>
                  </div>
                ))}

              {/* Total */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-green-200">
                <p className="text-base font-medium text-gray-700">Total de Receitas</p>
                <p className="text-lg font-bold text-green-700">
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

      {/* Insights Section */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-gray-900 mb-8">Insights Inteligentes</h2>

          {/* Insight Card */}
          <div className="bg-gradient-to-br from-blue-50 to-transparent p-8 rounded-3xl border border-blue-100">
            <div className="flex gap-6">
              <div className="text-5xl">💡</div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Padrão Detectado</h4>
                <p className="text-gray-600 leading-relaxed">
                  Com base no seu histórico, você tende a gastar{' '}
                  <span className="font-medium text-gray-900">R$ 150 a mais</span> em alimentação
                  nas duas últimas semanas do mês. Considere ajustar seu orçamento ou reduzir
                  gastos neste período.
                </p>
              </div>
            </div>
          </div>

          {/* Trend Insight */}
          <div className="bg-gradient-to-br from-green-50 to-transparent p-8 rounded-3xl border border-green-100">
            <div className="flex gap-6">
              <div className="text-5xl">📊</div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Tendência Positiva</h4>
                <p className="text-gray-600 leading-relaxed">
                  Seus gastos com transporte diminuíram{' '}
                  <span className="font-medium text-green-700">23%</span> comparado ao mês passado.
                  Continue assim!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
