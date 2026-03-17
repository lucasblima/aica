import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Calendar, Settings } from 'lucide-react';
import type { MonthlyCostSummary } from '../../types/aiCost';
import { formatBRL, formatCredits, formatPercentage } from '../../types/aiCost';
import { cardElevationVariants } from '../../lib/animations/ceramic-motion';

// =====================================================
// Monthly Cost Card Component - Credit System
// =====================================================

interface MonthlyCostCardProps {
  summary: MonthlyCostSummary;
  onEditBudget?: () => void;
}

export const MonthlyCostCard: React.FC<MonthlyCostCardProps> = ({ summary, onEditBudget }) => {
  const {
    current_month_cost,
    days_remaining,
    credits_used,
    credits_total,
    credits_percentage,
    plan_name
  } = summary;

  // Determine bar color based on credit usage
  const getBarColor = (): string => {
    if (credits_percentage > 85) return 'bg-gradient-to-r from-ceramic-error to-ceramic-error/80';
    if (credits_percentage > 60) return 'bg-gradient-to-r from-ceramic-warning to-ceramic-warning/80';
    return 'bg-gradient-to-r from-ceramic-success to-ceramic-success/80';
  };

  const getStatusColor = (): string => {
    if (credits_percentage > 85) return 'text-ceramic-negative';
    if (credits_percentage > 60) return 'text-ceramic-warning';
    return 'text-ceramic-positive';
  };

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
            <Coins className="w-6 h-6 text-ceramic-accent" />
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Créditos Mensais
            </p>
            <h2 className="text-2xl font-black text-ceramic-text-primary text-etched">
              {credits_used} / {credits_total}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ceramic-accent uppercase bg-ceramic-accent/10 px-2 py-1 rounded-lg">
            {plan_name}
          </span>
          {onEditBudget && (
            <button
              onClick={onEditBudget}
              className="w-10 h-10 ceramic-inset hover:scale-105 transition-transform flex items-center justify-center"
              title="Editar Plano"
            >
              <Settings className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Credit Progress Bar */}
      {credits_total > 0 ? (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                {formatCredits(credits_used)} usados
              </span>
              <span className={`text-sm font-bold ${getStatusColor()}`}>
                {formatPercentage(credits_percentage)}
              </span>
            </div>

            <div className="h-3 ceramic-inset rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getBarColor()}`}
                style={{ width: `${Math.min(credits_percentage, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-ceramic-text-secondary">
                0
              </span>
              <span className="text-xs font-bold text-ceramic-text-primary">
                {formatCredits(credits_total)}
              </span>
            </div>
          </div>

          {/* Secondary BRL cost */}
          <div className="mb-4 text-xs text-ceramic-text-secondary">
            Custo estimado: {formatBRL(current_month_cost)}
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

            {/* Credits Remaining */}
            <div className="ceramic-inset p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                {credits_percentage <= 85 ? (
                  <TrendingDown className="w-3 h-3 text-ceramic-positive" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-ceramic-negative" />
                )}
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                  Restantes
                </span>
              </div>
              <p
                className={`text-xl font-black text-etched ${
                  credits_percentage <= 85 ? 'text-ceramic-positive' : 'text-ceramic-negative'
                }`}
              >
                {Math.max(0, credits_total - credits_used)}
              </p>
            </div>
          </div>

          {/* Exceeded / Available */}
          <div className="mt-4 ceramic-inset p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                {credits_used > credits_total ? 'Excedido' : 'Disponível'}
              </span>
              <span
                className={`text-lg font-black text-etched ${
                  credits_used > credits_total ? 'text-ceramic-negative' : 'text-ceramic-positive'
                }`}
              >
                {formatCredits(Math.abs(credits_total - credits_used))}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="ceramic-inset p-4 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary mb-2">
            Nenhum plano ativo
          </p>
          {onEditBudget && (
            <button
              onClick={onEditBudget}
              className="text-xs font-bold text-ceramic-accent hover:underline uppercase"
            >
              Escolher Plano
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
