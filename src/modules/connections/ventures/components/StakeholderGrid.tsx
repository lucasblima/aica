import React from 'react';
import { VenturesStakeholder, formatPercentage } from '../types';

interface StakeholderGridProps {
  stakeholders: VenturesStakeholder[];
  onStakeholderClick?: (stakeholder: VenturesStakeholder) => void;
  groupByType?: boolean;
  className?: string;
}

/**
 * StakeholderGrid Component
 *
 * Displays team members, investors, and stakeholders in a grid layout.
 * Supports grouping by stakeholder type.
 */
export function StakeholderGrid({
  stakeholders,
  onStakeholderClick,
  groupByType = true,
  className = '',
}: StakeholderGridProps) {
  // Safe array reference with fallback
  const safeStakeholders = stakeholders || [];

  // Group stakeholders by type
  const groupedStakeholders = React.useMemo(() => {
    if (!groupByType) {
      return { all: safeStakeholders };
    }

    return safeStakeholders.reduce((acc, stakeholder) => {
      const type = stakeholder.stakeholder_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(stakeholder);
      return acc;
    }, {} as Record<string, VenturesStakeholder[]>);
  }, [safeStakeholders, groupByType]);

  const typeLabels: Record<string, string> = {
    founder: 'Fundadores',
    'co-founder': 'Co-fundadores',
    investor: 'Investidores',
    advisor: 'Advisors',
    employee: 'Funcionários',
    contractor: 'Contractors',
    board: 'Board Members',
  };

  const typeIcons: Record<string, string> = {
    founder: '👑',
    'co-founder': '🤝',
    investor: '💰',
    advisor: '🎯',
    employee: '👨‍💼',
    contractor: '🛠️',
    board: '🏛️',
  };

  const typeColors: Record<string, { bg: string; text: string }> = {
    founder: { bg: 'bg-amber-50', text: 'text-amber-700' },
    'co-founder': { bg: 'bg-amber-50', text: 'text-amber-600' },
    investor: { bg: 'bg-green-50', text: 'text-green-700' },
    advisor: { bg: 'bg-blue-50', text: 'text-blue-700' },
    employee: { bg: 'bg-neutral-50', text: 'text-neutral-700' },
    contractor: { bg: 'bg-neutral-50', text: 'text-neutral-600' },
    board: { bg: 'bg-purple-50', text: 'text-purple-700' },
  };

  return (
    <div className={className}>
      {Object.entries(groupedStakeholders).map(([type, stakeholdersInGroup]) => (
        <div key={type} className="mb-6 last:mb-0">
          {/* Group Header */}
          {groupByType && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{typeIcons[type] || '👤'}</span>
              <h3 className="text-sm font-semibold text-neutral-900">
                {typeLabels[type] || type}
              </h3>
              <span className="text-xs text-neutral-500">({stakeholdersInGroup.length})</span>
            </div>
          )}

          {/* Stakeholders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stakeholdersInGroup.map((stakeholder) => {
              const colors = typeColors[stakeholder.stakeholder_type] || {
                bg: 'bg-neutral-50',
                text: 'text-neutral-700',
              };

              return (
                <div
                  key={stakeholder.id}
                  onClick={() => onStakeholderClick?.(stakeholder)}
                  className={`
                    border border-neutral-200 rounded-lg p-4
                    hover:shadow-md transition-shadow
                    ${onStakeholderClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">
                        {stakeholder.role_title || stakeholder.stakeholder_type}
                      </div>
                      {stakeholder.member_id && (
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Member ID: {stakeholder.member_id.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                    <span
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${colors.bg} ${colors.text}
                      `}
                    >
                      {typeIcons[stakeholder.stakeholder_type] || '👤'}
                    </span>
                  </div>

                  {/* Equity */}
                  {stakeholder.equity_pct !== undefined && stakeholder.equity_pct !== null && (
                    <div className="mb-2">
                      <div className="text-xs text-neutral-500">Equity</div>
                      <div className="text-lg font-bold text-amber-600">
                        {formatPercentage(stakeholder.equity_pct)}
                      </div>
                    </div>
                  )}

                  {/* Investment */}
                  {stakeholder.investment_amount && (
                    <div className="mb-2">
                      <div className="text-xs text-neutral-500">Investimento</div>
                      <div className="text-sm font-semibold text-green-600">
                        R$ {stakeholder.investment_amount.toLocaleString('pt-BR')}
                      </div>
                      {stakeholder.investment_round && (
                        <div className="text-xs text-neutral-500">
                          {stakeholder.investment_round}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vesting */}
                  {stakeholder.vesting_period_months && (
                    <div className="text-xs text-neutral-500">
                      Vesting: {stakeholder.vesting_period_months} meses
                      {stakeholder.vesting_cliff_months && (
                        <> (cliff: {stakeholder.vesting_cliff_months}m)</>
                      )}
                    </div>
                  )}

                  {/* Employment Dates */}
                  {stakeholder.start_date && (
                    <div className="text-xs text-neutral-500 mt-1">
                      Desde{' '}
                      {new Date(stakeholder.start_date).toLocaleDateString('pt-BR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                      {stakeholder.end_date && (
                        <>
                          {' até '}
                          {new Date(stakeholder.end_date).toLocaleDateString('pt-BR', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {/* LinkedIn */}
                  {stakeholder.linkedin_url && (
                    <a
                      href={stakeholder.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {safeStakeholders.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2"></div>
          <p className="text-sm text-neutral-600">Nenhum stakeholder cadastrado</p>
        </div>
      )}
    </div>
  );
}
