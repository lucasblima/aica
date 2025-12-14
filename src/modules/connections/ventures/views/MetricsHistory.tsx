import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import { MRRChart, MetricsCard } from '../components';
import { formatCurrency, formatPercentage } from '../types';

/**
 * MetricsHistory View
 *
 * Historical view of business metrics with charts and trend analysis.
 */
export function MetricsHistory() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = React.useState<'monthly' | 'quarterly' | 'yearly'>(
    'monthly'
  );

  const { metrics, currentMetrics, loading, error } = useMetrics(entityId || '');

  // Filter metrics by selected period type
  const filteredMetrics = React.useMemo(
    () =>
      metrics
        .filter((m) => m.period_type === selectedPeriod)
        .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()),
    [metrics, selectedPeriod]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Erro ao carregar métricas</h2>
          <p className="text-sm text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-neutral-600 hover:text-neutral-900 mb-2"
          >
            ← Voltar
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-neutral-900">Histórico de Métricas</h1>

            {/* Period Selector */}
            <div className="flex gap-2">
              {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      selectedPeriod === period
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                    }
                  `}
                >
                  {period === 'monthly' ? 'Mensal' : period === 'quarterly' ? 'Trimestral' : 'Anual'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Metrics Summary */}
        {currentMetrics && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Período Atual</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                label="MRR"
                value={currentMetrics.mrr}
                format="currency"
                icon="📊"
              />
              <MetricsCard
                label="Total Revenue"
                value={currentMetrics.total_revenue}
                format="currency"
                icon="💰"
              />
              <MetricsCard
                label="Burn Rate"
                value={currentMetrics.burn_rate}
                format="currency"
                icon="🔥"
              />
              <MetricsCard
                label="Runway"
                value={currentMetrics.runway_months}
                format="number"
                icon="🛤️"
              />
            </div>
          </div>
        )}

        {/* MRR Chart */}
        {filteredMetrics.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <MRRChart metricsHistory={filteredMetrics} showARR={true} />
            </div>
          </div>
        )}

        {/* Metrics Table */}
        <div className="bg-white rounded-lg border border-neutral-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Histórico Detalhado</h2>

            {filteredMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        Período
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        MRR
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        Revenue
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        Expenses
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        Margin
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3 pr-4">
                        Customers
                      </th>
                      <th className="text-right text-xs font-semibold text-neutral-700 pb-3">
                        Runway
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMetrics.map((metric, index) => {
                      const prevMetric = index < filteredMetrics.length - 1 ? filteredMetrics[index + 1] : null;
                      const mrrGrowth = prevMetric && prevMetric.mrr
                        ? ((metric.mrr || 0) - prevMetric.mrr) / prevMetric.mrr * 100
                        : null;

                      return (
                        <tr
                          key={metric.id}
                          className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                        >
                          {/* Period */}
                          <td className="py-3 pr-4">
                            <div className="text-sm font-medium text-neutral-900">
                              {new Date(metric.period_start).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            {metric.is_projected && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                Projeção
                              </span>
                            )}
                          </td>

                          {/* MRR */}
                          <td className="py-3 pr-4 text-right">
                            <div className="text-sm font-semibold text-neutral-900">
                              {formatCurrency(metric.mrr)}
                            </div>
                            {mrrGrowth !== null && (
                              <div
                                className={`text-xs ${
                                  mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {mrrGrowth >= 0 ? '↑' : '↓'} {Math.abs(mrrGrowth).toFixed(1)}%
                              </div>
                            )}
                          </td>

                          {/* Revenue */}
                          <td className="py-3 pr-4 text-right text-sm text-neutral-700">
                            {formatCurrency(metric.total_revenue)}
                          </td>

                          {/* Expenses */}
                          <td className="py-3 pr-4 text-right text-sm text-neutral-700">
                            {formatCurrency(metric.total_expenses)}
                          </td>

                          {/* Margin */}
                          <td className="py-3 pr-4 text-right">
                            <div className="text-sm text-neutral-700">
                              {formatPercentage(metric.gross_margin_pct)}
                            </div>
                          </td>

                          {/* Customers */}
                          <td className="py-3 pr-4 text-right text-sm text-neutral-700">
                            {metric.active_customers?.toLocaleString('pt-BR') || '-'}
                          </td>

                          {/* Runway */}
                          <td className="py-3 text-right">
                            <div
                              className={`text-sm font-medium ${
                                !metric.runway_months
                                  ? 'text-neutral-400'
                                  : metric.runway_months >= 12
                                  ? 'text-green-700'
                                  : metric.runway_months >= 6
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {metric.runway_months ? `${metric.runway_months}m` : '-'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm text-neutral-600">Nenhuma métrica registrada</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Adicione métricas para acompanhar o desempenho do seu negócio
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
