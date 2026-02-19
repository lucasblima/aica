/**
 * FinanceNotificationCard Component
 *
 * Displays budget-related alerts with icons and colors.
 * Collapsible list showing top 3 with expand for more.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import type { BudgetAlert } from '../types';

interface FinanceNotificationCardProps {
  alerts: BudgetAlert[];
  onDismiss?: (id: string) => void;
}

const ALERT_CONFIG: Record<
  BudgetAlert['type'],
  {
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
  }
> = {
  exceeded: {
    icon: AlertTriangle,
    colorClass: 'text-ceramic-error',
    bgClass: 'bg-ceramic-error/5',
  },
  warning: {
    icon: AlertCircle,
    colorClass: 'text-ceramic-warning',
    bgClass: 'bg-ceramic-warning/5',
  },
  unusual: {
    icon: TrendingUp,
    colorClass: 'text-ceramic-info',
    bgClass: 'bg-ceramic-info/5',
  },
  recurring_missed: {
    icon: Clock,
    colorClass: 'text-ceramic-text-secondary',
    bgClass: 'bg-ceramic-cool',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const FinanceNotificationCard: React.FC<FinanceNotificationCardProps> = ({
  alerts,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) {
    return null;
  }

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 3);
  const hasMore = alerts.length > 3;

  return (
    <div className="ceramic-card p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="ceramic-concave w-8 h-8 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-ceramic-warning" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Alertas Financeiros
            </h3>
            <p className="text-[10px] text-ceramic-text-secondary">
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} ativo{alerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const config = ALERT_CONFIG[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`ceramic-inset p-3 ${config.bgClass} flex items-start gap-3`}
            >
              <Icon className={`w-4 h-4 ${config.colorClass} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${config.colorClass}`}>
                  {alert.message}
                </p>
                {alert.amount != null && alert.threshold != null && (
                  <p className="text-[10px] text-ceramic-text-secondary mt-0.5">
                    {formatCurrency(alert.amount)} de {formatCurrency(alert.threshold)}
                  </p>
                )}
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-ceramic-cool transition-colors"
                  title="Marcar como visto"
                >
                  <X className="w-3 h-3 text-ceramic-text-secondary" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand/collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Ver mais {alerts.length - 3} alertas
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default FinanceNotificationCard;
