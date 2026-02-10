/**
 * Sync to Finance Button Component
 *
 * Button with modal to sync a connection transaction to personal finance
 */

import React, { useState } from 'react';
import { useSyncToPersonalFinance } from '../hooks/useFinanceIntegration';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('SyncToFinanceButton');

interface SyncToFinanceButtonProps {
  transactionId: string;
  transactionDescription: string;
  amount: number;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const SyncToFinanceButton: React.FC<SyncToFinanceButtonProps> = ({
  transactionId,
  transactionDescription,
  amount,
  variant = 'secondary',
  size = 'md',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [autoSync, setAutoSync] = useState(false);
  const syncToPersonal = useSyncToPersonalFinance();

  const handleSync = async () => {
    try {
      await syncToPersonal.mutateAsync({
        transactionId,
        options: {
          personalCategoryId: selectedCategory || undefined,
          autoSync,
        },
      });
      setShowModal(false);
    } catch (error) {
      log.error('Error syncing to personal finance:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Button size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Button variant classes
  const variantClasses = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700',
    secondary: 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border',
    ghost: 'bg-transparent text-ceramic-info hover:bg-ceramic-info-bg',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`font-medium rounded-lg transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        💰 Sincronizar com Finanças
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ceramic-base rounded-xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-ceramic-border">
              <h3 className="text-xl font-bold text-ceramic-text-primary">
                Sincronizar com Finanças Pessoais
              </h3>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                Adicione esta transação ao seu controle financeiro pessoal
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Transaction Info */}
              <div className="bg-ceramic-base rounded-lg p-4 border-2 border-ceramic-border">
                <div className="text-sm text-ceramic-text-secondary mb-1">Transação</div>
                <div className="font-semibold text-ceramic-text-primary">{transactionDescription}</div>
                <div className="text-lg font-bold text-ceramic-info mt-2">
                  {formatCurrency(amount)}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                  Categoria (opcional)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-ceramic-border rounded-lg focus:border-ceramic-info focus:outline-none"
                >
                  <option value="">Detectar automaticamente</option>
                  <option value="housing">Moradia</option>
                  <option value="food">Alimentação</option>
                  <option value="transport">Transporte</option>
                  <option value="health">Saúde</option>
                  <option value="education">Educação</option>
                  <option value="entertainment">Entretenimento</option>
                  <option value="shopping">Compras</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              {/* Auto Sync Option */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="mt-1 w-4 h-4 text-ceramic-info border-ceramic-border rounded focus:ring-ceramic-accent/30"
                />
                <label htmlFor="autoSync" className="text-sm text-ceramic-text-primary">
                  Sincronizar automaticamente transações futuras deste tipo
                </label>
              </div>

              {/* Info Note */}
              <div className="bg-ceramic-info/10 border-2 border-ceramic-info/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <div className="text-xs text-ceramic-info">
                    Apenas sua parte da despesa será adicionada às suas finanças pessoais.
                    A transação original permanecerá no espaço compartilhado.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-ceramic-border flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={syncToPersonal.isPending}
                className="flex-1 px-4 py-2 bg-ceramic-cool text-ceramic-text-primary font-medium rounded-lg hover:bg-ceramic-border transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSync}
                disabled={syncToPersonal.isPending}
                className="flex-1 px-4 py-2 bg-ceramic-info text-white font-medium rounded-lg hover:bg-ceramic-info/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncToPersonal.isPending ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>

            {/* Success Message */}
            {syncToPersonal.isSuccess && (
              <div className="mx-6 mb-6 bg-ceramic-success/10 border-2 border-ceramic-success/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-ceramic-success">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium">
                    Transação sincronizada com sucesso!
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {syncToPersonal.isError && (
              <div className="mx-6 mb-6 bg-ceramic-error/10 border-2 border-ceramic-error/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-ceramic-error">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm">
                    Erro ao sincronizar. Tente novamente.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
