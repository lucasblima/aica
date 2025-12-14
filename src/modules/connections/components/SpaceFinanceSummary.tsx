/**
 * Space Finance Summary Component
 *
 * Displays financial overview for a connection space including:
 * - Total income/expenses
 * - Net balance
 * - Category breakdown (pie chart)
 * - Member contributions
 */

import React from 'react';
import { useSpaceFinanceSummary } from '../hooks/useFinanceIntegration';
import { getDefaultDateRange } from '../services/financeIntegrationService';

interface SpaceFinanceSummaryProps {
  spaceId: string;
  dateRange?: { start: string; end: string };
}

export const SpaceFinanceSummary: React.FC<SpaceFinanceSummaryProps> = ({
  spaceId,
  dateRange,
}) => {
  const range = dateRange || getDefaultDateRange();
  const { data: summary, isLoading } = useSpaceFinanceSummary(spaceId, range);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-stone-200 p-6 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-stone-100 rounded" />
          <div className="h-16 bg-stone-100 rounded" />
          <div className="h-16 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-stone-600">Nenhuma transação encontrada</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-stone-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-800 mb-4">Resumo Financeiro</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Income */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <span className="text-sm text-green-700 font-medium">Receitas</span>
          </div>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(summary.totalIncome)}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💸</span>
            <span className="text-sm text-red-700 font-medium">Despesas</span>
          </div>
          <div className="text-2xl font-bold text-red-800">
            {formatCurrency(summary.totalExpenses)}
          </div>
        </div>

        {/* Net Balance */}
        <div
          className={`border-2 rounded-lg p-4 ${
            summary.netBalance >= 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📈</span>
            <span
              className={`text-sm font-medium ${
                summary.netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}
            >
              Saldo
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              summary.netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}
          >
            {formatCurrency(summary.netBalance)}
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {summary.pendingPayments > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <div className="font-semibold text-amber-900">Pagamentos Pendentes</div>
              <div className="text-sm text-amber-700">
                {formatCurrency(summary.pendingPayments)} aguardando confirmação
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary.byCategory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Por Categoria</h4>
          <div className="space-y-2">
            {summary.byCategory.slice(0, 5).map((cat, idx) => {
              const percentage = summary.totalExpenses > 0
                ? (cat.amount / summary.totalExpenses) * 100
                : 0;

              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-stone-700 capitalize">{cat.category}</span>
                    <span className="text-sm font-medium text-stone-800">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Contributions */}
      {summary.byMember.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Por Membro</h4>
          <div className="space-y-2">
            {summary.byMember.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-stone-800">{member.name}</div>
                  <div className="text-xs text-stone-600">
                    Pago: {formatCurrency(member.paid)}
                    {member.pending > 0 && (
                      <span className="text-amber-600 ml-2">
                        • Pendente: {formatCurrency(member.pending)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
