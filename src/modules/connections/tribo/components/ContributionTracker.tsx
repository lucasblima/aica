import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GroupFund, FundContribution } from '../types';
import { SyncToFinanceButton } from '../../components/SyncToFinanceButton';

interface ContributionTrackerProps {
  fund: GroupFund;
  contributions: FundContribution[];
  members?: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  showPending?: boolean;
}

export const ContributionTracker: React.FC<ContributionTrackerProps> = ({
  fund,
  contributions,
  members = [],
  showPending = true,
}) => {
  // Calculate stats
  const totalContributed = contributions
    .filter((c) => c.isConfirmed)
    .reduce((sum, c) => sum + c.amount, 0);

  const pendingAmount = contributions
    .filter((c) => !c.isConfirmed)
    .reduce((sum, c) => sum + c.amount, 0);

  const progress = (totalContributed / fund.targetAmount) * 100;
  const remaining = Math.max(0, fund.targetAmount - totalContributed);

  // Group contributions by member
  const contributionsByMember = contributions.reduce((acc, contrib) => {
    const memberId = contrib.memberId;
    if (!acc[memberId]) {
      acc[memberId] = {
        total: 0,
        confirmed: 0,
        pending: 0,
        contributions: [],
      };
    }

    acc[memberId].total += contrib.amount;
    if (contrib.isConfirmed) {
      acc[memberId].confirmed += contrib.amount;
    } else {
      acc[memberId].pending += contrib.amount;
    }
    acc[memberId].contributions.push(contrib);

    return acc;
  }, {} as Record<string, { total: number; confirmed: number; pending: number; contributions: FundContribution[] }>);

  // Calculate suggested amount if proportional
  const suggestedAmount =
    fund.contributionType === 'proportional' && members.length > 0
      ? fund.targetAmount / members.length
      : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ceramic-900">
          💰 Contribuições
        </h3>
        <div className="text-right">
          <div className="text-sm text-ceramic-600">Total arrecadado</div>
          <div className="text-xl font-bold text-[#9B4D3A]">
            R$ {totalContributed.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative h-8 bg-ceramic-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#9B4D3A] to-[#9B4D3A]/80 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-ceramic-900">
            {progress.toFixed(0)}%
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-ceramic-600">
            Meta: R$ {fund.targetAmount.toFixed(2)}
          </span>
          <span className="text-ceramic-600">
            Faltam: R$ {remaining.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Pending Amount */}
      {showPending && pendingAmount > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span>⏳</span>
            <span className="text-sm">
              R$ {pendingAmount.toFixed(2)} em confirmação
            </span>
          </div>
        </div>
      )}

      {/* Contribution Type Info */}
      {fund.contributionType === 'mandatory' && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <span>ℹ️</span>
            <span className="text-sm">Contribuição obrigatória</span>
          </div>
        </div>
      )}

      {fund.contributionType === 'proportional' && suggestedAmount && (
        <div className="p-3 bg-[#9B4D3A]/10 rounded-lg">
          <div className="text-sm text-[#9B4D3A]">
            Valor sugerido por pessoa: R$ {suggestedAmount.toFixed(2)}
          </div>
        </div>
      )}

      {/* Member Contributions */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-ceramic-700">
          Contribuintes ({Object.keys(contributionsByMember).length})
        </div>

        {Object.entries(contributionsByMember).map(([memberId, data]) => {
          const member =
            members.find((m) => m.id === memberId) ||
            data.contributions[0]?.member;

          if (!member) return null;

          const hasFullyContributed =
            suggestedAmount && data.confirmed >= suggestedAmount;

          return (
            <div
              key={memberId}
              className={`p-3 rounded-lg border-2 transition-all ${
                hasFullyContributed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-ceramic-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#9B4D3A]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#9B4D3A] font-medium">
                      {member.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ceramic-900">
                    {member.displayName}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 font-medium">
                      R$ {data.confirmed.toFixed(2)}
                    </span>
                    {data.pending > 0 && (
                      <span className="text-yellow-600">
                        +R$ {data.pending.toFixed(2)} pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                {hasFullyContributed && (
                  <div className="flex-shrink-0">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                )}
              </div>

              {/* Detailed Contributions */}
              {data.contributions.length >= 1 && (
                <div className="mt-2 pl-13 space-y-1">
                  {data.contributions.map((contrib) => (
                    <div
                      key={contrib.id}
                      className="flex items-center justify-between text-xs text-ceramic-600"
                    >
                      <div className="flex-1">
                        <span>
                          {format(new Date(contrib.contributedAt), 'd/MM/yyyy', {
                            locale: ptBR,
                          })}
                          {contrib.paymentMethod && ` • ${contrib.paymentMethod}`}
                        </span>
                        <span
                          className={
                            contrib.isConfirmed ? 'text-green-600 ml-2' : 'text-yellow-600 ml-2'
                          }
                        >
                          R$ {contrib.amount.toFixed(2)}
                          {!contrib.isConfirmed && ' (pendente)'}
                        </span>
                      </div>
                      {contrib.isConfirmed && (
                        <SyncToFinanceButton
                          transactionId={contrib.id}
                          transactionDescription={`Contribuição: ${fund.title}`}
                          amount={contrib.amount}
                          variant="ghost"
                          size="sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(contributionsByMember).length === 0 && (
          <div className="text-center py-8 text-ceramic-500">
            Nenhuma contribuição ainda
          </div>
        )}
      </div>

      {/* Members who haven't contributed */}
      {fund.contributionType === 'mandatory' && members.length > 0 && (
        <div className="pt-4 border-t border-ceramic-100">
          <div className="text-sm font-medium text-ceramic-700 mb-2">
            Aguardando contribuição
          </div>
          <div className="flex flex-wrap gap-2">
            {members
              .filter((m) => !contributionsByMember[m.id])
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
                >
                  {member.avatarUrl && (
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span className="text-sm text-red-800">
                    {member.displayName}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
