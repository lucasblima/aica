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
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Saudável',
      icon: '✓',
    },
    warning: {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      label: 'Atenção',
      icon: '⚠',
    },
    critical: {
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      label: 'Crítico',
      icon: '!',
    },
  };

  const config = statusConfig[healthStatus];

  return (
    <div className={`rounded-xl border-2 p-6 ${config.bgColor} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-600">Saúde do Negócio</h3>
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} bg-white border border-current text-xs font-bold`}
        >
          {config.icon}
        </span>
      </div>

      {/* Status Badge */}
      <div className={`inline-block px-3 py-1 rounded-full ${config.color} bg-white mb-4`}>
        <span className="text-sm font-semibold">{config.label}</span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Runway */}
        {runwayMonths !== undefined && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-neutral-600">Runway</span>
              <span className={`text-2xl font-bold ${config.color}`}>
                {runwayMonths}
                <span className="text-sm font-normal ml-1">meses</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  healthStatus === 'healthy'
                    ? 'bg-green-500'
                    : healthStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
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
            <span className="text-xs text-neutral-600">Burn Rate</span>
            <span className="text-sm font-semibold text-neutral-700">
              R$ {(burnRate / 1000).toFixed(0)}k/mês
            </span>
          </div>
        )}

        {/* Cash Balance */}
        {cashBalance !== undefined && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-neutral-600">Caixa Atual</span>
            <span className="text-sm font-semibold text-neutral-700">
              R$ {(cashBalance / 1000).toFixed(0)}k
            </span>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {healthStatus === 'warning' && (
        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-xs text-amber-700">
            Considere reduzir custos ou buscar nova rodada de investimento.
          </p>
        </div>
      )}

      {healthStatus === 'critical' && (
        <div className="mt-4 pt-4 border-t border-red-200">
          <p className="text-xs text-red-700 font-medium">
            Ação urgente necessária. Runway crítico.
          </p>
        </div>
      )}
    </div>
  );
}
