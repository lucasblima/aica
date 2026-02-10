import React from 'react';
import { VenturesStakeholder, formatPercentage } from '../types';

interface EquityTableProps {
  stakeholders: VenturesStakeholder[];
  onStakeholderClick?: (stakeholder: VenturesStakeholder) => void;
  showVesting?: boolean;
  className?: string;
}

/**
 * EquityTable Component
 *
 * Cap table view showing equity distribution and vesting status.
 */
export function EquityTable({
  stakeholders,
  onStakeholderClick,
  showVesting = true,
  className = '',
}: EquityTableProps) {
  // Filter stakeholders with equity
  const stakeholdersWithEquity = React.useMemo(
    () =>
      stakeholders
        .filter((s) => s.equity_pct !== undefined && s.equity_pct !== null && s.equity_pct > 0)
        .sort((a, b) => (b.equity_pct || 0) - (a.equity_pct || 0)),
    [stakeholders]
  );

  // Calculate total allocated equity
  const totalAllocated = React.useMemo(
    () =>
      stakeholdersWithEquity.reduce((sum, s) => sum + (s.equity_pct || 0), 0),
    [stakeholdersWithEquity]
  );

  // Calculate available equity
  const available = 100 - totalAllocated;

  // Calculate vested percentage for a stakeholder
  const calculateVestedPercentage = (stakeholder: VenturesStakeholder): number => {
    if (!stakeholder.vesting_start_date || !stakeholder.vesting_period_months) {
      return 100; // Fully vested if no vesting schedule
    }

    const startDate = new Date(stakeholder.vesting_start_date);
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());

    // Check if cliff has been reached
    if (stakeholder.vesting_cliff_months && monthsElapsed < stakeholder.vesting_cliff_months) {
      return 0; // No vesting until cliff
    }

    // Calculate vested percentage
    const vestedPct = Math.min(
      (monthsElapsed / stakeholder.vesting_period_months) * 100,
      100
    );

    return vestedPct;
  };

  const typeLabels: Record<string, string> = {
    founder: 'Fundador',
    'co-founder': 'Co-fundador',
    investor: 'Investidor',
    advisor: 'Advisor',
    employee: 'Funcionário',
    contractor: 'Contractor',
    board: 'Board Member',
  };

  return (
    <div className={className}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="text-xs font-medium text-amber-700 mb-1">Total Alocado</div>
          <div className="text-2xl font-bold text-amber-900">
            {formatPercentage(totalAllocated)}
          </div>
        </div>
        <div className="bg-ceramic-cool rounded-lg p-4 border border-ceramic-border">
          <div className="text-xs font-medium text-ceramic-text-primary mb-1">Disponível</div>
          <div className="text-2xl font-bold text-ceramic-text-primary">
            {formatPercentage(available)}
          </div>
        </div>
      </div>

      {/* Equity Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ceramic-border">
              <th className="text-left text-xs font-semibold text-ceramic-text-primary pb-2 pr-4">
                Nome/Tipo
              </th>
              <th className="text-left text-xs font-semibold text-ceramic-text-primary pb-2 pr-4">
                Equity
              </th>
              {showVesting && (
                <>
                  <th className="text-left text-xs font-semibold text-ceramic-text-primary pb-2 pr-4">
                    Vesting
                  </th>
                  <th className="text-left text-xs font-semibold text-ceramic-text-primary pb-2 pr-4">
                    Vested
                  </th>
                </>
              )}
              <th className="text-left text-xs font-semibold text-ceramic-text-primary pb-2">
                Shares
              </th>
            </tr>
          </thead>
          <tbody>
            {stakeholdersWithEquity.map((stakeholder) => {
              const vestedPct = calculateVestedPercentage(stakeholder);
              const vestedEquity = ((stakeholder.equity_pct || 0) * vestedPct) / 100;

              return (
                <tr
                  key={stakeholder.id}
                  onClick={() => onStakeholderClick?.(stakeholder)}
                  className={`
                    border-b border-ceramic-border/50 last:border-b-0
                    hover:bg-ceramic-cool
                    ${onStakeholderClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {/* Name/Type */}
                  <td className="py-3 pr-4">
                    <div className="text-sm font-medium text-ceramic-text-primary">
                      {stakeholder.role_title ||
                        typeLabels[stakeholder.stakeholder_type] ||
                        stakeholder.stakeholder_type}
                    </div>
                    <div className="text-xs text-ceramic-text-secondary">
                      {stakeholder.stakeholder_type}
                    </div>
                  </td>

                  {/* Equity % */}
                  <td className="py-3 pr-4">
                    <div className="text-sm font-semibold text-amber-700">
                      {formatPercentage(stakeholder.equity_pct)}
                    </div>
                  </td>

                  {showVesting && (
                    <>
                      {/* Vesting Schedule */}
                      <td className="py-3 pr-4">
                        {stakeholder.vesting_period_months ? (
                          <div className="text-xs text-ceramic-text-secondary">
                            {stakeholder.vesting_period_months}m
                            {stakeholder.vesting_cliff_months && (
                              <span className="text-ceramic-text-secondary">
                                {' '}
                                (cliff: {stakeholder.vesting_cliff_months}m)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-ceramic-text-tertiary">Sem vesting</div>
                        )}
                      </td>

                      {/* Vested Amount */}
                      <td className="py-3 pr-4">
                        {stakeholder.vesting_period_months ? (
                          <div>
                            <div className="text-sm font-medium text-ceramic-success">
                              {formatPercentage(vestedEquity)}
                            </div>
                            <div className="text-xs text-ceramic-text-secondary">
                              {vestedPct.toFixed(0)}% vested
                            </div>
                            {/* Vesting Progress Bar */}
                            <div className="w-full bg-ceramic-cool rounded-full h-1.5 mt-1">
                              <div
                                className="bg-ceramic-success h-1.5 rounded-full transition-all"
                                style={{ width: `${vestedPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-ceramic-success">
                            {formatPercentage(stakeholder.equity_pct)}
                          </div>
                        )}
                      </td>
                    </>
                  )}

                  {/* Shares Count */}
                  <td className="py-3">
                    {stakeholder.shares_count ? (
                      <div className="text-sm text-ceramic-text-primary">
                        {stakeholder.shares_count.toLocaleString('pt-BR')}
                        {stakeholder.share_class && (
                          <span className="text-xs text-ceramic-text-secondary ml-1">
                            ({stakeholder.share_class})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-ceramic-text-tertiary">-</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {stakeholdersWithEquity.length === 0 && (
        <div className="text-center py-12 border-t border-ceramic-border">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-ceramic-text-secondary">Nenhuma equity alocada ainda</p>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            Adicione stakeholders com participação acionária para visualizar o cap table
          </p>
        </div>
      )}

      {/* Warning if over-allocated */}
      {totalAllocated > 100 && (
        <div className="mt-4 bg-ceramic-error/10 border border-ceramic-error/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-ceramic-error text-lg">⚠️</span>
            <div>
              <div className="text-sm font-semibold text-ceramic-error">Equity sobre-alocada</div>
              <div className="text-xs text-ceramic-error/80 mt-0.5">
                O total de equity alocada ({formatPercentage(totalAllocated)}) excede 100%.
                Revise a distribuição de participação.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
