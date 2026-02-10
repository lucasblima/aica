import React from 'react';
import { calculateHealthStatus, type HealthStatus } from '../types';

interface HealthGaugeProps {
  runwayMonths?: number;
  burnRate?: number;
  cashBalance?: number;
  className?: string;
}

/**
 * HealthGauge Component
 *
 * Visual indicator of business health based on runway and burn rate.
 * Uses amber accent color for warnings, green for healthy, red for critical.
 */
export function HealthGauge({
  runwayMonths,
  burnRate,
  cashBalance,
  className = '',
}: HealthGaugeProps) {
  const healthStatus = calculateHealthStatus(runwayMonths);

  const statusConfig: Record<
    HealthStatus,
    { color: string; bgColor: string; label: string; icon: string }
  > = {
    healthy: {
      color: 'text-ceramic-success',
      bgColor: 'bg-ceramic-success/10 border-ceramic-success/30',
      label: 'Saudável',
      icon: '✓',
    },
    warning: {
      color: 'text-ceramic-warning',
      bgColor: 'bg-ceramic-warning/10 border-ceramic-warning/30',
      label: 'Atenção',
      icon: '⚠',
    },
    critical: {
      color: 'text-ceramic-error',
      bgColor: 'bg-ceramic-error/10 border-ceramic-error/30',
      label: 'Crítico',
      icon: '!',
    },
  };

  const config = statusConfig[healthStatus];

  return (
    <div className={`rounded-xl border-2 p-6 ${config.bgColor} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-ceramic-text-secondary">Saúde do Negócio</h3>
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} bg-ceramic-base border border-current text-xs font-bold`}
        >
          {config.icon}
        </span>
      </div>

      {/* Status Badge */}
      <div className={`inline-block px-3 py-1 rounded-full ${config.color} bg-ceramic-base mb-4`}>
        <span className="text-sm font-semibold">{config.label}</span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Runway */}
        {runwayMonths !== undefined && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-ceramic-text-secondary">Runway</span>
              <span className={`text-2xl font-bold ${config.color}`}>
                {runwayMonths}
                <span className="text-sm font-normal ml-1">meses</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-ceramic-base rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  healthStatus === 'healthy'
                    ? 'bg-ceramic-success'
                    : healthStatus === 'warning'
                    ? 'bg-ceramic-warning'
                    : 'bg-ceramic-error'
                }`}
                style={{
                  width: `${Math.min(100, (runwayMonths / 24) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Burn Rate */}
        {burnRate !== undefined && burnRate > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ceramic-text-secondary">Burn Rate</span>
            <span className="text-sm font-semibold text-ceramic-text-primary">
              R$ {(burnRate / 1000).toFixed(0)}k/mês
            </span>
          </div>
        )}

        {/* Cash Balance */}
        {cashBalance !== undefined && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ceramic-text-secondary">Caixa Atual</span>
            <span className="text-sm font-semibold text-ceramic-text-primary">
              R$ {(cashBalance / 1000).toFixed(0)}k
            </span>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {healthStatus === 'warning' && (
        <div className="mt-4 pt-4 border-t border-ceramic-warning/30">
          <p className="text-xs text-ceramic-warning">
            Considere reduzir custos ou buscar nova rodada de investimento.
          </p>
        </div>
      )}

      {healthStatus === 'critical' && (
        <div className="mt-4 pt-4 border-t border-ceramic-error/30">
          <p className="text-xs text-ceramic-error font-medium">
            Ação urgente necessária. Runway crítico.
          </p>
        </div>
      )}
    </div>
  );
}
