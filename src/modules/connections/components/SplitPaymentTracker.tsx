/**
 * Split Payment Tracker Component
 *
 * Visualizes payment status of a split expense transaction
 */

import React from 'react';
import { useSplitPaymentStatus, useMarkSplitAsPaid } from '../hooks/useFinanceIntegration';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('SplitPaymentTracker');

interface SplitPaymentTrackerProps {
  transactionId: string;
  description: string;
  onMemberClick?: (memberId: string) => void;
}

export const SplitPaymentTracker: React.FC<SplitPaymentTrackerProps> = ({
  transactionId,
  description,
  onMemberClick,
}) => {
  const { data: status, isLoading } = useSplitPaymentStatus(transactionId);
  const markAsPaid = useMarkSplitAsPaid();

  const handleMarkPaid = async (memberId: string) => {
    try {
      await markAsPaid.mutateAsync({ transactionId, memberId });
    } catch (error) {
      log.error('Error marking split as paid:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-lg border-2 border-ceramic-border p-4 animate-pulse">
        <div className="h-4 bg-ceramic-cool rounded w-2/3 mb-3" />
        <div className="h-3 bg-ceramic-base rounded mb-4" />
        <div className="space-y-2">
          <div className="h-12 bg-ceramic-base rounded" />
          <div className="h-12 bg-ceramic-base rounded" />
        </div>
      </div>
    );
  }

  if (!status) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const paymentProgress = status.total > 0 ? (status.paid / status.total) * 100 : 0;
  const allPaid = status.paid === status.total;

  return (
    <div className="bg-ceramic-base rounded-lg border-2 border-ceramic-border p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h4 className="font-semibold text-ceramic-text-primary mb-1">{description}</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ceramic-text-secondary">Total: {formatCurrency(status.total)}</span>
          <span className={allPaid ? 'text-ceramic-success font-medium' : 'text-amber-600'}>
            {allPaid ? '✓ Concluído' : `${paymentProgress.toFixed(0)}% pago`}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="relative h-3 bg-ceramic-base rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              allPaid
                ? 'bg-gradient-to-r from-ceramic-success to-ceramic-success/80'
                : 'bg-gradient-to-r from-amber-500 to-amber-600'
            }`}
            style={{ width: `${paymentProgress}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1 text-xs">
          <span className="text-ceramic-success font-medium">
            Pago: {formatCurrency(status.paid)}
          </span>
          {status.pending > 0 && (
            <span className="text-amber-600 font-medium">
              Pendente: {formatCurrency(status.pending)}
            </span>
          )}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {status.members.map((member, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              member.paid
                ? 'bg-ceramic-success/10 border-ceramic-success/20'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  member.paid
                    ? 'bg-ceramic-success text-white'
                    : 'bg-amber-700 text-white'
                }`}
              >
                {member.paid ? '✓' : '⏳'}
              </div>

              <div className="flex-1">
                <div className="font-medium text-ceramic-text-primary">{member.name}</div>
                <div className="text-sm text-ceramic-text-secondary">
                  {formatCurrency(member.amount)}
                </div>
              </div>
            </div>

            {!member.paid && (
              <button
                onClick={() => handleMarkPaid(member.memberId)}
                disabled={markAsPaid.isPending}
                className="px-3 py-1.5 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markAsPaid.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
