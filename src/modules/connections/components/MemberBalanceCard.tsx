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
      <div className="bg-white rounded-xl border-2 border-stone-200 p-6 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/2 mb-4" />
        <div className="h-20 bg-stone-100 rounded" />
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
    <div className="bg-white rounded-xl border-2 border-stone-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-800 mb-4">Seu Saldo</h3>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Owed */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700 font-medium mb-1">Você deve</div>
          <div className="text-2xl font-bold text-red-800">
            {formatCurrency(balance.totalOwed)}
          </div>
        </div>

        {/* Total to Receive */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium mb-1">A receber</div>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(balance.totalToReceive)}
          </div>
        </div>

        {/* Net Balance */}
        <div
          className={`border-2 rounded-lg p-4 ${
            balance.netBalance >= 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="text-sm font-medium mb-1">
            <span
              className={balance.netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}
            >
              Saldo líquido
            </span>
          </div>
          <div
            className={`text-2xl font-bold ${
              balance.netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}
          >
            {formatCurrency(Math.abs(balance.netBalance))}
          </div>
        </div>
      </div>

      {/* Pending Items */}
      {balance.pendingItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Itens Pendentes</h4>
          <div className="space-y-2">
            {balance.pendingItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  item.type === 'owed'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-stone-800">{item.description}</div>
                    <div className="text-xs text-stone-600 mt-1">
                      {formatDate(item.date)}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      item.type === 'owed' ? 'text-red-800' : 'text-green-800'
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.type === 'owed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.type === 'owed' ? 'Você deve' : 'A receber'}
                  </span>

                  {item.type === 'owed' && (
                    <button
                      onClick={() => onPaymentClick?.(item.transactionId)}
                      className="ml-auto px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
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
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-medium text-green-800">Tudo em dia!</div>
          <div className="text-sm text-green-600 mt-1">
            Não há pagamentos pendentes
          </div>
        </div>
      )}
    </div>
  );
};
