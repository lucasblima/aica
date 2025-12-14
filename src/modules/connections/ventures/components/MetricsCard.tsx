import React from 'react';
import { formatCurrency, formatPercentage, formatNumberAbbreviated } from '../types';

interface MetricsCardProps {
  label: string;
  value?: number;
  previousValue?: number;
  format?: 'currency' | 'percentage' | 'number' | 'abbreviated';
  currency?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

/**
 * MetricsCard Component
 *
 * Display card for a single KPI with value, trend, and optional comparison.
 */
export function MetricsCard({
  label,
  value,
  previousValue,
  format = 'currency',
  currency = 'BRL',
  icon,
  trend,
  className = '',
}: MetricsCardProps) {
  // Format value based on type
  const formattedValue = React.useMemo(() => {
    if (value === undefined || value === null) return '-';

    switch (format) {
      case 'currency':
        return formatCurrency(value, currency);
      case 'percentage':
        return formatPercentage(value);
      case 'abbreviated':
        return formatNumberAbbreviated(value);
      case 'number':
        return value.toLocaleString('pt-BR');
      default:
        return value.toString();
    }
  }, [value, format, currency]);

  // Calculate change percentage
  const changePercent = React.useMemo(() => {
    if (!value || !previousValue || previousValue === 0) return null;
    return ((value - previousValue) / previousValue) * 100;
  }, [value, previousValue]);

  // Determine trend if not explicitly provided
  const actualTrend = React.useMemo(() => {
    if (trend) return trend;
    if (!changePercent) return 'neutral';
    if (changePercent > 0) return 'up';
    if (changePercent < 0) return 'down';
    return 'neutral';
  }, [trend, changePercent]);

  const trendConfig = {
    up: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '↑',
    },
    down: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '↓',
    },
    neutral: {
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50',
      icon: '→',
    },
  };

  const trendStyle = trendConfig[actualTrend];

  return (
    <div
      className={`bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-2xl font-bold text-neutral-900">{formattedValue}</span>
      </div>

      {/* Trend */}
      {changePercent !== null && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${trendStyle.color} ${trendStyle.bgColor}`}
          >
            <span className="mr-1">{trendStyle.icon}</span>
            {Math.abs(changePercent).toFixed(1)}%
          </span>
          <span className="text-xs text-neutral-500">vs. período anterior</span>
        </div>
      )}

      {/* Previous value (if no change percent but previous value exists) */}
      {changePercent === null && previousValue !== undefined && (
        <div className="text-xs text-neutral-500">
          Anterior:{' '}
          {format === 'currency'
            ? formatCurrency(previousValue, currency)
            : format === 'percentage'
            ? formatPercentage(previousValue)
            : format === 'abbreviated'
            ? formatNumberAbbreviated(previousValue)
            : previousValue.toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  );
}
