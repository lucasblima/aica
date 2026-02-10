import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Settings } from 'lucide-react';
import type { MonthlyCostSummary } from '../../types/aiCost';
import { formatUSD, formatPercentage } from '../../types/aiCost';
import { cardElevationVariants } from '../../lib/animations/ceramic-motion';

// =====================================================
// Monthly Cost Card Component - Ceramic Design
// =====================================================

interface MonthlyCostCardProps {
  summary: MonthlyCostSummary;
  onEditBudget?: () => void;
}

export const MonthlyCostCard: React.FC<MonthlyCostCardProps> = ({ summary, onEditBudget }) => {
  const {
    current_month_cost,
    budget,
    percentage_used,
    days_remaining,
    projected_month_end_cost,
    is_over_budget
  } = summary;

  // Determine status color
  const getStatusColor = (): string => {
    if (is_over_budget) return 'text-ceramic-negative';
    if (percentage_used >= 90) return 'text-ceramic-warning';
    if (percentage_used >= 80) return 'text-ceramic-warning';
    return 'text-ceramic-positive';
  };

  // Determine if projection is good or bad
  const isProjectionGood = projected_month_end_cost <= budget;

  return (
    <motion.div
      className="ceramic-card p-6 cursor-pointer"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 ceramic-inset flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-ceramic-accent" />
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Custo Mensal de IA
            </p>
            <h2 className="text-2xl font-black text-ceramic-text-primary text-etched">
              {formatUSD(current_month_cost)}
            </h2>
          </div>
        </div>

        {onEditBudget && (
          <button
            onClick={onEditBudget}
            className="w-10 h-10 ceramic-inset hover:scale-105 transition-transform flex items-center justify-center"
            title="Editar Orçamento"
          >
            <Settings className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        )}
      </div>

      {/* Budget Status */}
      {budget > 0 ? (
        <>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                Orçamento
              </span>
              <span className={`text-sm font-bold ${getStatusColor()}`}>
                {formatPercentage(percentage_used)}
              </span>
            </div>

            <div className="h-3 ceramic-inset rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  is_over_budget
                    ? 'bg-gradient-to-r from-ceramic-error to-ceramic-error/80'
                    : percentage_used >= 90
                    ? 'bg-gradient-to-r from-ceramic-warning to-ceramic-warning/80'
                    : percentage_used >= 80
                    ? 'bg-gradient-to-r from-ceramic-warning/80 to-ceramic-warning/60'
                    : 'bg-gradient-to-r from-ceramic-success to-ceramic-success/80'
                }`}
                style={{ width: `${Math.min(percentage_used, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-ceramic-text-secondary">
                {formatUSD(0)}
              </span>
              <span className="text-xs font-bold text-ceramic-text-primary">
                {formatUSD(budget)}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Days Remaining */}
            <div className="ceramic-inset p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3 h-3 text-ceramic-accent" />
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                  Dias Restantes
                </span>
              </div>
              <p className="text-xl font-black text-ceramic-text-primary text-etched">
                {days_remaining}
              </p>
            </div>

            {/* Projected Cost */}
            <div className="ceramic-inset p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                {isProjectionGood ? (
                  <TrendingDown className="w-3 h-3 text-ceramic-positive" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-ceramic-negative" />
                )}
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                  Projeção
                </span>
              </div>
              <p
                className={`text-xl font-black text-etched ${
                  isProjectionGood ? 'text-ceramic-positive' : 'text-ceramic-negative'
                }`}
              >
                {formatUSD(projected_month_end_cost)}
              </p>
            </div>
          </div>

          {/* Budget Remaining/Exceeded */}
          <div className="mt-4 ceramic-inset p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                {is_over_budget ? 'Excedido' : 'Disponível'}
              </span>
              <span
                className={`text-lg font-black text-etched ${
                  is_over_budget ? 'text-ceramic-negative' : 'text-ceramic-positive'
                }`}
              >
                {formatUSD(Math.abs(budget - current_month_cost))}
              </span>
            </div>
          </div>
        </>
      ) : (
        /* No Budget Set */
        <div className="ceramic-inset p-4 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary mb-2">
            Nenhum orçamento definido
          </p>
          {onEditBudget && (
            <button
              onClick={onEditBudget}
              className="text-xs font-bold text-ceramic-accent hover:underline uppercase"
            >
              Definir Orçamento Mensal
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
