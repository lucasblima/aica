/**
 * Finance Overview Card - Ventures
 *
 * Shows financial metrics for a venture/business:
 * - Revenue comparison (current month vs previous)
 * - Operating expenses
 * - Profit margin
 * - Link to detailed metrics
 */

import React from 'react';
import { useSpaceFinanceSummary } from '../../hooks/useFinanceIntegration';
import { getDefaultDateRange } from '../../services/financeIntegrationService';

interface FinanceOverviewCardProps {
  spaceId: string;
  onViewDetails?: () => void;
}

export const FinanceOverviewCard: React.FC<FinanceOverviewCardProps> = ({
  spaceId,
  onViewDetails,
}) => {
  const currentMonth = getDefaultDateRange();

  // Get current month data
  const { data: currentData, isLoading: currentLoading } = useSpaceFinanceSummary(
    spaceId,
    currentMonth
  );

  // Get previous month data for comparison
  const now = new Date();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const previousMonth = {
    start: prevMonthStart.toISOString().split('T')[0],
    end: prevMonthEnd.toISOString().split('T')[0],
  };

  const { data: previousData, isLoading: previousLoading } = useSpaceFinanceSummary(
    spaceId,
    previousMonth
  );

  if (currentLoading || previousLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-amber-200 p-6 animate-pulse">
        <div className="h-6 bg-amber-100 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-amber-50 rounded" />
          <div className="h-20 bg-amber-50 rounded" />
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-stone-600">Nenhum dado financeiro disponível</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate revenue growth
  const revenueGrowth = previousData?.totalIncome
    ? ((currentData.totalIncome - previousData.totalIncome) / previousData.totalIncome) * 100
    : 0;

  // Calculate expense growth
  const expenseGrowth = previousData?.totalExpenses
    ? ((currentData.totalExpenses - previousData.totalExpenses) / previousData.totalExpenses) * 100
    : 0;

  // Calculate profit margin
  const profitMargin = currentData.totalIncome > 0
    ? ((currentData.netBalance / currentData.totalIncome) * 100)
    : 0;

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const prevMonthName = prevMonthStart.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-amber-900">Panorama Financeiro</h3>
          <p className="text-sm text-amber-700 capitalize">
            {currentMonthName} {now.getFullYear()}
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
        >
          Ver Detalhes
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Revenue */}
        <div className="bg-white rounded-lg border-2 border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💰</span>
            <span className="text-sm text-green-700 font-medium">Receita</span>
          </div>
          <div className="text-2xl font-bold text-green-800 mb-1">
            {formatCurrency(currentData.totalIncome)}
          </div>
          {previousData && (
            <div className="flex items-center gap-1 text-xs">
              <span className={revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}%
              </span>
              <span className="text-stone-500">vs {prevMonthName}</span>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-lg border-2 border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💸</span>
            <span className="text-sm text-red-700 font-medium">Despesas</span>
          </div>
          <div className="text-2xl font-bold text-red-800 mb-1">
            {formatCurrency(currentData.totalExpenses)}
          </div>
          {previousData && (
            <div className="flex items-center gap-1 text-xs">
              <span className={expenseGrowth >= 0 ? 'text-red-600' : 'text-green-600'}>
                {expenseGrowth >= 0 ? '↑' : '↓'} {Math.abs(expenseGrowth).toFixed(1)}%
              </span>
              <span className="text-stone-500">vs {prevMonthName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profit & Margin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Net Profit */}
        <div
          className={`bg-white rounded-lg border-2 p-4 ${
            currentData.netBalance >= 0
              ? 'border-blue-200'
              : 'border-orange-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📈</span>
            <span
              className={`text-sm font-medium ${
                currentData.netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}
            >
              Lucro Líquido
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              currentData.netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}
          >
            {formatCurrency(Math.abs(currentData.netBalance))}
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <span className="text-sm text-purple-700 font-medium">Margem</span>
          </div>
          <div className="text-2xl font-bold text-purple-800">
            {profitMargin.toFixed(1)}%
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {profitMargin >= 20 ? 'Excelente' : profitMargin >= 10 ? 'Bom' : 'Atenção'}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {currentData.byCategory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-amber-900 mb-3">
            Maiores Despesas
          </h4>
          <div className="space-y-2">
            {currentData.byCategory.slice(0, 3).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-stone-700 capitalize">{cat.category}</span>
                <span className="font-medium text-stone-800">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payments Alert */}
      {currentData.pendingPayments > 0 && (
        <div className="mt-4 bg-amber-100 border-2 border-amber-300 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="text-lg">⚠️</span>
            <div className="text-sm">
              <span className="font-semibold">
                {formatCurrency(currentData.pendingPayments)}
              </span>
              <span className="ml-1">em pagamentos pendentes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
