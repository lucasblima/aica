import React from 'react';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import type { MonthlyCostSummary } from '../../types/aiCost';
import { formatPercentage, getAlertMessage } from '../../types/aiCost';

interface BudgetAlertBannerProps {
  summary: MonthlyCostSummary;
}

export const BudgetAlertBanner: React.FC<BudgetAlertBannerProps> = ({ summary }) => {
  const { percentage_used, is_over_budget } = summary;

  const getAlertConfig = () => {
    if (is_over_budget || percentage_used >= 100) {
      return {
        icon: XCircle,
        bgClass: 'bg-ceramic-error/10 border-ceramic-error',
        iconClass: 'text-ceramic-error',
        textClass: 'text-ceramic-text-primary',
        title: 'Orçamento Excedido!'
      };
    } else if (percentage_used >= 90) {
      return {
        icon: AlertTriangle,
        bgClass: 'bg-ceramic-warning/10 border-ceramic-warning',
        iconClass: 'text-ceramic-warning',
        textClass: 'text-ceramic-text-primary',
        title: 'Alerta Crítico'
      };
    } else {
      return {
        icon: AlertCircle,
        bgClass: 'bg-ceramic-warning/10 border-ceramic-warning',
        iconClass: 'text-ceramic-warning',
        textClass: 'text-ceramic-text-primary',
        title: 'Atenção'
      };
    }
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgClass} border-2 rounded-2xl p-4 flex items-start gap-3`}>
      <Icon className={`w-6 h-6 ${config.iconClass} flex-shrink-0 mt-0.5`} />
      <div>
        <h4 className={`font-bold ${config.textClass} mb-1`}>{config.title}</h4>
        <p className={`text-sm ${config.textClass}`}>
          {getAlertMessage(
            percentage_used >= 100 ? 'danger' : percentage_used >= 90 ? 'critical' : 'warning',
            percentage_used
          )}
        </p>
        {summary.projected_month_end_cost > summary.budget && (
          <p className={`text-xs ${config.textClass} mt-2`}>
            Projeção de fim de mês: {formatPercentage((summary.projected_month_end_cost / summary.budget) * 100)} do orçamento
          </p>
        )}
      </div>
    </div>
  );
};
