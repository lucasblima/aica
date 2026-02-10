import React from 'react';
import type { GroupFund } from '../types';
import { SyncToFinanceButton } from '../../components/SyncToFinanceButton';

interface GroupFundCardProps {
  fund: GroupFund;
  onClick?: () => void;
}

export const GroupFundCard: React.FC<GroupFundCardProps> = ({ fund, onClick }) => {
  const progress = fund.progress || 0;
  const isExpiringSoon = fund.daysRemaining !== undefined && fund.daysRemaining <= 7;
  const isCompleted = fund.status === 'completed';

  return (
    <div
      onClick={onClick}
      className={`bg-ceramic-base rounded-2xl p-4 border-2 transition-all cursor-pointer ${
        isCompleted
          ? 'border-ceramic-success/30 bg-ceramic-success/5'
          : isExpiringSoon
          ? 'border-ceramic-warning/30 hover:border-ceramic-warning/40 hover:shadow-lg'
          : 'border-[#9B4D3A]/20 hover:border-[#9B4D3A]/40 hover:shadow-lg'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ceramic-900 mb-1">{fund.title}</h3>
          {fund.purpose && (
            <p className="text-sm text-ceramic-600 line-clamp-2">{fund.purpose}</p>
          )}
        </div>

        <div className="flex-shrink-0 ml-3">
          <div className="text-2xl">💰</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-ceramic-700">
            R$ {fund.currentAmount.toFixed(2)}
          </span>
          <span className="text-sm text-ceramic-500">
            de R$ {fund.targetAmount.toFixed(2)}
          </span>
        </div>

        <div className="relative h-3 bg-ceramic-100 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-gradient-to-r from-ceramic-success to-ceramic-success/80'
                : 'bg-gradient-to-r from-[#9B4D3A] to-[#B85D4A]'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-ceramic-600">{progress.toFixed(0)}%</span>

          {fund.contributorCount !== undefined && (
            <span className="text-xs text-ceramic-600">
              {fund.contributorCount}{' '}
              {fund.contributorCount === 1 ? 'contribuinte' : 'contribuintes'}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {fund.deadline && !isCompleted ? (
          <div
            className={`text-sm ${
              isExpiringSoon ? 'text-ceramic-warning font-medium' : 'text-ceramic-600'
            }`}
          >
            {fund.daysRemaining !== undefined && (
              <>
                {fund.daysRemaining > 0 ? (
                  <>
                    {fund.daysRemaining}{' '}
                    {fund.daysRemaining === 1 ? 'dia' : 'dias'} restantes
                  </>
                ) : (
                  <span className="text-ceramic-error font-medium">Encerrado</span>
                )}
              </>
            )}
          </div>
        ) : isCompleted ? (
          <div className="text-sm text-ceramic-success font-medium flex items-center gap-1">
            <span>✓</span>
            <span>Concluído</span>
          </div>
        ) : (
          <div className="text-sm text-ceramic-600">Sem prazo</div>
        )}

        <div className="flex items-center gap-2">
          {fund.currentAmount > 0 && (
            <SyncToFinanceButton
              transactionId={fund.id}
              transactionDescription={fund.title}
              amount={fund.currentAmount}
              variant="ghost"
              size="sm"
            />
          )}
          <button className="px-3 py-1.5 bg-[#9B4D3A] text-white text-sm font-medium rounded-lg hover:bg-[#8A3D2A] transition-colors">
            Contribuir
          </button>
        </div>
      </div>

      {/* Type Badge */}
      {fund.contributionType !== 'voluntary' && (
        <div className="mt-3 pt-3 border-t border-ceramic-100">
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
              fund.contributionType === 'mandatory'
                ? 'bg-ceramic-error/10 text-ceramic-error'
                : 'bg-ceramic-info/10 text-ceramic-info'
            }`}
          >
            {fund.contributionType === 'mandatory'
              ? 'Contribuição obrigatória'
              : 'Contribuição proporcional'}
          </span>
        </div>
      )}
    </div>
  );
};
