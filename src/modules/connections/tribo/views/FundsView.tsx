import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFunds, useContributions } from '../hooks/useFunds';
import { GroupFundCard } from '../components/GroupFundCard';
import { ContributionTracker } from '../components/ContributionTracker';
import type { FundStatus } from '../types';

interface FundsViewProps {
  memberId?: string;
  isAdmin?: boolean;
}

export const FundsView: React.FC<FundsViewProps> = ({
  memberId,
  isAdmin = false,
}) => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [statusFilter, setStatusFilter] = useState<FundStatus | 'all'>('active');
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);

  const { data: funds, isLoading: loadingFunds } = useFunds(spaceId || '');
  const { data: contributions, isLoading: loadingContributions } = useContributions(
    selectedFundId || ''
  );

  const isLoading = loadingFunds;

  // Filter funds
  const filteredFunds = funds?.filter((fund) => {
    if (statusFilter === 'all') return true;
    return fund.status === statusFilter;
  });

  const selectedFund = funds?.find((f) => f.id === selectedFundId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando vaquinhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9B4D3A]/5 via-ceramic-base to-ceramic-50">
      {/* Header */}
      <div className="bg-ceramic-base border-b border-ceramic-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-3xl font-bold text-ceramic-900">
              Vaquinhas do Grupo
            </h1>
          </div>
          <p className="text-ceramic-600">
            Financiamento coletivo para objetivos comuns
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-ceramic-base border-b border-ceramic-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#9B4D3A] text-white'
                  : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === 'active'
                  ? 'bg-ceramic-success text-white'
                  : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
              }`}
            >
              Ativas
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === 'completed'
                  ? 'bg-ceramic-info text-white'
                  : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                statusFilter === 'cancelled'
                  ? 'bg-ceramic-error text-white'
                  : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredFunds && filteredFunds.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funds List */}
            <div className="space-y-4">
              {filteredFunds.map((fund) => (
                <div
                  key={fund.id}
                  onClick={() => setSelectedFundId(fund.id)}
                  className="cursor-pointer"
                >
                  <GroupFundCard
                    fund={fund}
                    memberId={memberId}
                    isSelected={selectedFundId === fund.id}
                  />
                </div>
              ))}
            </div>

            {/* Contribution Detail */}
            {selectedFund && (
              <div className="lg:sticky lg:top-4 lg:h-fit">
                <div className="bg-ceramic-base rounded-2xl border-2 border-ceramic-200 p-6">
                  {loadingContributions ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-ceramic-600">
                        Carregando contribuições...
                      </p>
                    </div>
                  ) : (
                    <ContributionTracker
                      fund={selectedFund}
                      contributions={contributions || []}
                      showPending={true}
                    />
                  )}
                </div>
              </div>
            )}

            {!selectedFund && (
              <div className="lg:sticky lg:top-4 lg:h-fit">
                <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-200 p-12 text-center">
                  <span className="text-6xl mb-4 block">👈</span>
                  <p className="text-ceramic-600">
                    Selecione uma vaquinha para ver os detalhes e contribuições
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-200 p-12 text-center">
            <span className="text-6xl mb-4 block">💰</span>
            <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
              Nenhuma vaquinha encontrada
            </h2>
            <p className="text-ceramic-600 mb-6">
              {statusFilter !== 'all'
                ? `Nenhuma vaquinha ${
                    statusFilter === 'active'
                      ? 'ativa'
                      : statusFilter === 'completed'
                      ? 'concluída'
                      : 'cancelada'
                  }`
                : 'Crie a primeira vaquinha para o grupo'}
            </p>
            {isAdmin && statusFilter !== 'completed' && statusFilter !== 'cancelled' && (
              <button className="px-6 py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors">
                Criar Vaquinha
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {funds && funds.length > 0 && (
        <div className="bg-ceramic-base border-t border-ceramic-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {funds.filter((f) => f.status === 'active').length}
                </div>
                <div className="text-sm text-ceramic-600">Vaquinhas ativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-success">
                  {funds
                    .filter((f) => f.status === 'active')
                    .reduce((sum, f) => sum + f.currentAmount, 0)
                    .toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                </div>
                <div className="text-sm text-ceramic-600">Arrecadado (ativas)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-info">
                  {funds.filter((f) => f.status === 'completed').length}
                </div>
                <div className="text-sm text-ceramic-600">Concluídas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {funds
                    .reduce((sum, f) => sum + f.currentAmount, 0)
                    .toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                </div>
                <div className="text-sm text-ceramic-600">Total arrecadado</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
