/**
 * Income vs Expense Chart Component
 *
 * Displays a comparison bar chart of income and expenses.
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// =====================================================
// Types
// =====================================================

interface IncomeVsExpenseProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
}

// =====================================================
// Component
// =====================================================

export const IncomeVsExpense: React.FC<IncomeVsExpenseProps> = ({
  income,
  expenses,
  previousIncome,
  previousExpenses,
}) => {
  const balance = income - expenses;
  const maxValue = Math.max(income, expenses, 1);

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
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-ceramic-text-primary">Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-600">{formatCurrency(income)}</span>
              {incomeChange !== null && (
                <span
                  className={`text-xs ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {incomeChange >= 0 ? '+' : ''}
                  {incomeChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="ceramic-trough p-1 rounded-full">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
              style={{ width: `${(income / maxValue) * 100}%` }}
            />
          </div>
        </div>

        {/* Expense Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-ceramic-text-primary">Despesas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-red-600">{formatCurrency(expenses)}</span>
              {expenseChange !== null && (
                <span
                  className={`text-xs ${expenseChange <= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {expenseChange >= 0 ? '+' : ''}
                  {expenseChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="ceramic-trough p-1 rounded-full">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
              style={{ width: `${(expenses / maxValue) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div
        className={`
          p-4 rounded-2xl text-center
          ${balance >= 0 ? 'bg-green-50' : 'bg-red-50'}
        `}
      >
        <p className="text-xs text-gray-600 mb-1">Saldo do Periodo</p>
        <p
          className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}
        >
          {formatCurrency(balance)}
        </p>
        {balance >= 0 ? (
          <p className="text-xs text-green-600 mt-1">Voce economizou este mes!</p>
        ) : (
          <p className="text-xs text-red-600 mt-1">Atencao: gastos excederam receitas</p>
        )}
      </div>
    </div>
  );
};

export default IncomeVsExpense;
