/**
 * Member Balance Card Component
 *
 * Shows what each member owes or is owed in a space
 */

import React from 'react';
import { useUserBalance } from '../hooks/useFinanceIntegration';
import { useMarkSplitAsPaid } from '../hooks/useFinanceIntegration';

interface MemberBalanceCardProps {
  spaceId: string;
  onPaymentClick?: (transactionId: string) => void;
}

export const MemberBalanceCard: React.FC<MemberBalanceCardProps> = ({
  spaceId,
  onPaymentClick,
}) => {
  const { data: balance, isLoading } = useUserBalance(spaceId);
  const markAsPaid = useMarkSplitAsPaid();

  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-xl border-2 border-ceramic-border p-6 animate-pulse">
        <div className="h-6 bg-ceramic-border rounded w-1/2 mb-4" />
        <div className="h-20 bg-ceramic-cool rounded" />
      </div>
    );
  }

  if (!balance) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="bg-ceramic-base rounded-xl border-2 border-ceramic-border p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Seu Saldo</h3>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Owed */}
        <div className="bg-ceramic-error-bg border-2 border-ceramic-error/20 rounded-lg p-4">
          <div className="text-sm text-ceramic-error font-medium mb-1">Você deve</div>
          <div className="text-2xl font-bold text-ceramic-error">
            {formatCurrency(balance.totalOwed)}
          </div>
        </div>

        {/* Total to Receive */}
        <div className="bg-ceramic-success-bg border-2 border-ceramic-success/20 rounded-lg p-4">
          <div className="text-sm text-ceramic-success font-medium mb-1">A receber</div>
          <div className="text-2xl font-bold text-ceramic-success">
            {formatCurrency(balance.totalToReceive)}
          </div>
        </div>

        {/* Net Balance */}
        <div
          className={`border-2 rounded-lg p-4 ${
            balance.netBalance >= 0
              ? 'bg-ceramic-info-bg border-ceramic-info/20'
              : 'bg-ceramic-warning/10 border-ceramic-warning/20'
          }`}
        >
          <div className="text-sm font-medium mb-1">
            <span
              className={balance.netBalance >= 0 ? 'text-ceramic-info' : 'text-ceramic-warning'}
            >
              Saldo líquido
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              balance.netBalance >= 0 ? 'text-ceramic-info' : 'text-ceramic-warning'
            }`}
          >
            {formatCurrency(Math.abs(balance.netBalance))}
          </div>
        </div>
      </div>

      {/* Pending Items */}
      {balance.pendingItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ceramic-text-primary mb-3">Itens Pendentes</h4>
          <div className="space-y-2">
            {balance.pendingItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  item.type === 'owed'
                    ? 'bg-ceramic-error-bg border-ceramic-error/20'
                    : 'bg-ceramic-success-bg border-ceramic-success/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-ceramic-text-primary">{item.description}</div>
                    <div className="text-xs text-ceramic-text-secondary mt-1">
                      {formatDate(item.date)}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      item.type === 'owed' ? 'text-ceramic-error' : 'text-ceramic-success'
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.type === 'owed'
                        ? 'bg-ceramic-error-bg text-ceramic-error'
                        : 'bg-ceramic-success-bg text-ceramic-success'
                    }`}
                  >
                    {item.type === 'owed' ? 'Você deve' : 'A receber'}
                  </span>

                  {item.type === 'owed' && (
                    <button
                      onClick={() => onPaymentClick?.(item.transactionId)}
                      className="ml-auto px-3 py-1.5 bg-ceramic-error text-white text-sm font-medium rounded-lg hover:bg-ceramic-error/90 transition-colors"
                    >
                      Marcar como pago
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Pending Items */}
      {balance.pendingItems.length === 0 && (
        <div className="bg-ceramic-success-bg border-2 border-ceramic-success/20 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-medium text-ceramic-success">Tudo em dia!</div>
          <div className="text-sm text-ceramic-success/80 mt-1">
            Não há pagamentos pendentes
          </div>
        </div>
      )}
    </div>
  );
};
