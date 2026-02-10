/**
 * Finance Integration Examples
 *
 * Practical examples of using the Finance Integration in different scenarios
 */

import React from 'react';
import {
  useFinanceIntegration,
  useSyncToPersonalFinance,
  useMarkSplitAsPaid,
} from './hooks/useFinanceIntegration';
import {
  SpaceFinanceSummary,
  MemberBalanceCard,
  SplitPaymentTracker,
  SyncToFinanceButton,
} from './components';

// ============================================================================
// EXAMPLE 1: Habitat Dashboard Integration
// ============================================================================

export function HabitatFinanceExample({ spaceId }: { spaceId: string }) {
  const { summary, balance, isLoading } = useFinanceIntegration(spaceId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Finance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpaceFinanceSummary spaceId={spaceId} />
        <MemberBalanceCard
          spaceId={spaceId}
          onPaymentClick={(txId) => console.log('Mark as paid:', txId)}
        />
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="bg-ceramic-cool rounded-lg p-4">
          <h3 className="font-semibold mb-2">Resumo Rápido</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-ceramic-success">
                R$ {summary.totalIncome.toFixed(2)}
              </div>
              <div className="text-sm text-ceramic-text-secondary">Receitas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ceramic-error">
                R$ {summary.totalExpenses.toFixed(2)}
              </div>
              <div className="text-sm text-ceramic-text-secondary">Despesas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ceramic-info">
                R$ {summary.netBalance.toFixed(2)}
              </div>
              <div className="text-sm text-ceramic-text-secondary">Saldo</div>
            </div>
          </div>
        </div>
      )}

      {/* User Balance Alert */}
      {balance && balance.totalOwed > 0 && (
        <div className="bg-ceramic-warning/10 border-2 border-ceramic-warning rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-ceramic-warning">
                Você tem débitos pendentes
              </div>
              <div className="text-sm text-ceramic-warning">
                Total devido: R$ {balance.totalOwed.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Rent Payment with Split Tracking
// ============================================================================

export function RentPaymentExample({
  spaceId,
  transactionId,
}: {
  spaceId: string;
  transactionId: string;
}) {
  const markAsPaid = useMarkSplitAsPaid();
  const syncToPersonal = useSyncToPersonalFinance();

  const handleMarkPaid = async (memberId: string) => {
    try {
      await markAsPaid.mutateAsync({ transactionId, memberId });
      alert('Pagamento confirmado!');
    } catch (error) {
      alert('Erro ao confirmar pagamento');
    }
  };

  const handleSyncToFinance = async () => {
    try {
      await syncToPersonal.mutateAsync({
        transactionId,
        options: {
          personalCategoryId: 'housing',
          autoSync: true, // Sincronizar automaticamente no próximo mês
        },
      });
      alert('Sincronizado com suas finanças pessoais!');
    } catch (error) {
      alert('Erro ao sincronizar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-ceramic-base rounded-lg border-2 border-ceramic-border p-6">
        <h2 className="text-xl font-bold mb-4">Aluguel - Janeiro 2024</h2>

        {/* Split Tracker */}
        <SplitPaymentTracker
          transactionId={transactionId}
          description="Aluguel Janeiro"
        />

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSyncToFinance}
            className="px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90"
          >
            Sincronizar com Finanças
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Tribo Fund with Contributions
// ============================================================================

export function TriboFundExample({
  spaceId,
  fundId,
}: {
  spaceId: string;
  fundId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-ceramic-base rounded-lg border-2 border-ceramic-border p-6">
        <h2 className="text-xl font-bold mb-4">Vaquinha - Churrasco da Tribo</h2>

        {/* Fund Info */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-ceramic-text-secondary">Meta:</span>
            <span className="font-bold">R$ 500,00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ceramic-text-secondary">Arrecadado:</span>
            <span className="font-bold text-ceramic-success">R$ 320,00</span>
          </div>
        </div>

        {/* Sync Button */}
        <SyncToFinanceButton
          transactionId={fundId}
          transactionDescription="Contribuição: Churrasco da Tribo"
          amount={50} // Minha contribuição
          variant="primary"
          size="md"
        />

        <p className="text-sm text-ceramic-text-secondary mt-4">
          Sincronize sua contribuição com suas finanças pessoais para manter tudo
          organizado em um só lugar.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Ventures Finance Overview
// ============================================================================

export function VenturesFinanceExample({ spaceId }: { spaceId: string }) {
  const { summary, isLoading } = useFinanceIntegration(spaceId);

  if (isLoading) return <div>Loading...</div>;

  if (!summary) return null;

  // Calculate metrics
  const profitMargin =
    summary.totalIncome > 0
      ? (summary.netBalance / summary.totalIncome) * 100
      : 0;

  const isHealthy = profitMargin >= 20;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-6">
      <h3 className="text-lg font-bold text-amber-900 mb-4">
        Saúde Financeira
      </h3>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-ceramic-base rounded-lg p-4">
          <div className="text-sm text-ceramic-text-secondary mb-1">Receita</div>
          <div className="text-2xl font-bold text-ceramic-success">
            R$ {summary.totalIncome.toFixed(2)}
          </div>
        </div>

        <div className="bg-ceramic-base rounded-lg p-4">
          <div className="text-sm text-ceramic-text-secondary mb-1">Despesas</div>
          <div className="text-2xl font-bold text-ceramic-error">
            R$ {summary.totalExpenses.toFixed(2)}
          </div>
        </div>

        <div className="bg-ceramic-base rounded-lg p-4">
          <div className="text-sm text-ceramic-text-secondary mb-1">Lucro</div>
          <div
            className={`text-2xl font-bold ${
              summary.netBalance >= 0 ? 'text-ceramic-info' : 'text-ceramic-warning'
            }`}
          >
            R$ {summary.netBalance.toFixed(2)}
          </div>
        </div>

        <div className="bg-ceramic-base rounded-lg p-4">
          <div className="text-sm text-ceramic-text-secondary mb-1">Margem</div>
          <div
            className={`text-2xl font-bold ${
              isHealthy ? 'text-ceramic-success' : 'text-ceramic-warning'
            }`}
          >
            {profitMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Health Indicator */}
      <div
        className={`p-4 rounded-lg ${
          isHealthy ? 'bg-ceramic-success/10' : 'bg-ceramic-warning/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isHealthy ? '✅' : '⚠️'}</span>
          <div>
            <div
              className={`font-semibold ${
                isHealthy ? 'text-ceramic-success' : 'text-ceramic-warning'
              }`}
            >
              {isHealthy ? 'Margem Saudável' : 'Atenção à Margem'}
            </div>
            <div
              className={`text-sm ${
                isHealthy ? 'text-ceramic-success' : 'text-ceramic-warning'
              }`}
            >
              {isHealthy
                ? 'Suas finanças estão em boa forma!'
                : 'Considere reduzir custos ou aumentar receitas'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Expenses */}
      {summary.byCategory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-ceramic-text-primary mb-3">
            Maiores Despesas
          </h4>
          {summary.byCategory.slice(0, 3).map((cat, idx) => (
            <div key={idx} className="flex justify-between text-sm mb-2">
              <span className="text-ceramic-text-primary capitalize">{cat.category}</span>
              <span className="font-medium text-ceramic-text-primary">
                R$ {cat.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Programmatic Sync
// ============================================================================

export function ProgrammaticSyncExample() {
  const syncMutation = useSyncToPersonalFinance();

  const handleBulkSync = async (transactionIds: string[]) => {
    for (const txId of transactionIds) {
      try {
        await syncMutation.mutateAsync({
          transactionId: txId,
          options: {
            autoSync: true,
            syncRecurring: true,
          },
        });
      } catch (error) {
        console.error(`Failed to sync ${txId}:`, error);
      }
    }
  };

  return (
    <div className="p-6">
      <h3 className="font-bold mb-4">Sincronização em Lote</h3>

      <button
        onClick={() =>
          handleBulkSync(['tx-1', 'tx-2', 'tx-3'])
        }
        disabled={syncMutation.isPending}
        className="px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 disabled:opacity-50"
      >
        {syncMutation.isPending
          ? 'Sincronizando...'
          : 'Sincronizar Todas as Transações'}
      </button>

      {syncMutation.isSuccess && (
        <div className="mt-4 p-3 bg-ceramic-success/10 text-ceramic-success rounded-lg">
          ✓ Todas as transações foram sincronizadas!
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Custom Date Range Summary
// ============================================================================

export function CustomDateRangeSummary({
  spaceId,
  startDate,
  endDate,
}: {
  spaceId: string;
  startDate: string;
  endDate: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Resumo Personalizado</h3>
        <div className="text-sm text-ceramic-text-secondary">
          {startDate} até {endDate}
        </div>
      </div>

      <SpaceFinanceSummary
        spaceId={spaceId}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Integration Test Component
// ============================================================================

export function FinanceIntegrationTest({ spaceId }: { spaceId: string }) {
  const {
    summary,
    balance,
    isLoading,
    error,
    syncToPersonal,
    markAsPaid,
    refetchSummary,
  } = useFinanceIntegration(spaceId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6 space-y-6 bg-ceramic-cool">
      <h2 className="text-2xl font-bold">Finance Integration Test</h2>

      {/* Summary */}
      <div className="bg-ceramic-base rounded-lg p-6">
        <h3 className="font-bold mb-4">Summary</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(summary, null, 2)}
        </pre>
      </div>

      {/* Balance */}
      <div className="bg-ceramic-base rounded-lg p-6">
        <h3 className="font-bold mb-4">Balance</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(balance, null, 2)}
        </pre>
      </div>

      {/* Actions */}
      <div className="bg-ceramic-base rounded-lg p-6">
        <h3 className="font-bold mb-4">Actions</h3>
        <div className="flex gap-3">
          <button
            onClick={() => refetchSummary()}
            className="px-4 py-2 bg-ceramic-info text-white rounded hover:bg-ceramic-info/90"
          >
            Refetch Summary
          </button>
        </div>
      </div>
    </div>
  );
}
