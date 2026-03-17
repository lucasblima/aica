import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { BurnRateData } from '../types';

interface BurnRateCardProps {
  burnRate: BurnRateData;
  currentBalance?: number;
}

export const BurnRateCard: React.FC<BurnRateCardProps> = ({ burnRate, currentBalance }) => {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const monthsOfReserve = currentBalance && burnRate.averageMonthlyExpense > 0
    ? (currentBalance / burnRate.averageMonthlyExpense).toFixed(1)
    : null;

  const TrendIcon = burnRate.trend === 'decreasing' ? TrendingDown : burnRate.trend === 'increasing' ? TrendingUp : Minus;
  const trendColor = burnRate.trend === 'decreasing' ? 'text-ceramic-success' : burnRate.trend === 'increasing' ? 'text-ceramic-error' : 'text-ceramic-text-secondary';

  return (
    <div className="ceramic-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">Burn Rate Mensal</h3>
          <p className="text-xs text-ceramic-text-secondary">Media de gastos mensais</p>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-ceramic-text-primary">{formatCurrency(burnRate.averageMonthlyExpense)}</span>
        <span className={`text-sm font-bold ${trendColor}`}>
          {burnRate.trend === 'decreasing' ? '\u2193' : burnRate.trend === 'increasing' ? '\u2191' : '\u2192'} {Math.abs(burnRate.percentageChange).toFixed(1)}%
        </span>
      </div>
      {monthsOfReserve && (
        <p className="text-xs text-ceramic-text-secondary">
          Reserva para <span className="font-bold text-ceramic-text-primary">{monthsOfReserve} meses</span> no ritmo atual
        </p>
      )}
    </div>
  );
};
