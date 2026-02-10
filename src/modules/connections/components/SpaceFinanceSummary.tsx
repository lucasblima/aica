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
      <div className="bg-ceramic-base rounded-xl border-2 border-ceramic-border p-6 animate-pulse">
        <div className="h-6 bg-ceramic-border rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-ceramic-cool rounded" />
          <div className="h-16 bg-ceramic-cool rounded" />
          <div className="h-16 bg-ceramic-cool rounded" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-ceramic-warning/10 border-2 border-ceramic-warning/20 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-ceramic-text-secondary">Nenhuma transação encontrada</p>
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
    <div className="bg-ceramic-base rounded-xl border-2 border-ceramic-border p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Resumo Financeiro</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Income */}
        <div className="bg-ceramic-success-bg border-2 border-ceramic-success/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <span className="text-sm text-ceramic-success font-medium">Receitas</span>
          </div>
          <div className="text-2xl font-bold text-ceramic-success">
            {formatCurrency(summary.totalIncome)}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-ceramic-error-bg border-2 border-ceramic-error/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💸</span>
            <span className="text-sm text-ceramic-error font-medium">Despesas</span>
          </div>
          <div className="text-2xl font-bold text-ceramic-error">
            {formatCurrency(summary.totalExpenses)}
          </div>
        </div>

        {/* Net Balance */}
        <div
          className={`border-2 rounded-lg p-4 ${
            summary.netBalance >= 0
              ? 'bg-ceramic-info-bg border-ceramic-info/20'
              : 'bg-ceramic-warning/10 border-ceramic-warning/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📈</span>
            <span
              className={`text-sm font-medium ${
                summary.netBalance >= 0 ? 'text-ceramic-info' : 'text-ceramic-warning'
              }`}
            >
              Saldo
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              summary.netBalance >= 0 ? 'text-ceramic-info' : 'text-ceramic-warning'
            }`}
          >
            {formatCurrency(summary.netBalance)}
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {summary.pendingPayments > 0 && (
        <div className="bg-ceramic-warning/10 border-2 border-ceramic-warning/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <div className="font-semibold text-ceramic-warning">Pagamentos Pendentes</div>
              <div className="text-sm text-ceramic-warning">
                {formatCurrency(summary.pendingPayments)} aguardando confirmação
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary.byCategory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-ceramic-text-primary mb-3">Por Categoria</h4>
          <div className="space-y-2">
            {summary.byCategory.slice(0, 5).map((cat, idx) => {
              const percentage = summary.totalExpenses > 0
                ? (cat.amount / summary.totalExpenses) * 100
                : 0;

              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-ceramic-text-primary capitalize">{cat.category}</span>
                    <span className="text-sm font-medium text-ceramic-text-primary">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ceramic-warning to-ceramic-warning/80 transition-all"
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
          <h4 className="text-sm font-semibold text-ceramic-text-primary mb-3">Por Membro</h4>
          <div className="space-y-2">
            {summary.byMember.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-ceramic-cool rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-ceramic-text-primary">{member.name}</div>
                  <div className="text-xs text-ceramic-text-secondary">
                    Pago: {formatCurrency(member.paid)}
                    {member.pending > 0 && (
                      <span className="text-ceramic-warning ml-2">
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
