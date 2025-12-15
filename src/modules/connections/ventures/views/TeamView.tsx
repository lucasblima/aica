import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStakeholders } from '../hooks/useStakeholders';
import { StakeholderGrid, EquityTable } from '../components';

/**
 * TeamView
 *
 * View for managing team members, investors, and stakeholders.
 * Includes both grid view and cap table.
 */
export function TeamView() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'grid' | 'equity'>('grid');

  const { stakeholders = [], loading, error } = useStakeholders(entityId || '');

  // Safe array reference with fallback
  const safeStakeholders = stakeholders || [];

  const handleStakeholderClick = (stakeholder: any) => {
    navigate(`/connections/ventures/${entityId}/team/${stakeholder.id}`);
  };

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
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Erro ao carregar stakeholders
          </h2>
          <p className="text-sm text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const active = safeStakeholders.filter((s) => s.is_active);
    const totalEquity = active.reduce((sum, s) => sum + (s.equity_pct || 0), 0);
    const totalInvestment = active
      .filter((s) => s.investment_amount)
      .reduce((sum, s) => sum + (s.investment_amount || 0), 0);

    const byType = active.reduce((acc, s) => {
      const type = s.stakeholder_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: active.length,
      totalEquity,
      totalInvestment,
      byType,
    };
  }, [safeStakeholders]);

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
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Time & Stakeholders</h1>
              <p className="text-sm text-neutral-600 mt-1">
                {summary.total} {summary.total === 1 ? 'stakeholder' : 'stakeholders'} ativos
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    viewMode === 'grid'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                  }
                `}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('equity')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    viewMode === 'equity'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                  }
                `}
              >
                Cap Table
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs font-medium text-neutral-500 mb-1">Total Stakeholders</div>
            <div className="text-2xl font-bold text-neutral-900">{summary.total}</div>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="text-xs font-medium text-amber-700 mb-1">Equity Alocada</div>
            <div className="text-2xl font-bold text-amber-900">
              {summary.totalEquity.toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="text-xs font-medium text-green-700 mb-1">Total Investido</div>
            <div className="text-2xl font-bold text-green-900">
              R$ {(summary.totalInvestment / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-xs font-medium text-blue-700 mb-1">Founders</div>
            <div className="text-2xl font-bold text-blue-900">
              {(summary.byType['founder'] || 0) + (summary.byType['co-founder'] || 0)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          {viewMode === 'grid' ? (
            <StakeholderGrid
              stakeholders={safeStakeholders.filter((s) => s.is_active)}
              onStakeholderClick={handleStakeholderClick}
              groupByType={true}
            />
          ) : (
            <EquityTable
              stakeholders={safeStakeholders.filter((s) => s.is_active)}
              onStakeholderClick={handleStakeholderClick}
              showVesting={true}
            />
          )}
        </div>

        {/* Add Stakeholder Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => navigate(`/connections/ventures/${entityId}/team/new`)}
            className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
          >
            + Adicionar Stakeholder
          </button>
        </div>
      </div>
    </div>
  );
}
