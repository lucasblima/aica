/**
 * Sync to Finance Button Component
 *
 * Button with modal to sync a connection transaction to personal finance
 */

import React, { useState } from 'react';
import { useSyncToPersonalFinance } from '../hooks/useFinanceIntegration';

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
      console.error('Error syncing to personal finance:', error);
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
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-stone-200 text-stone-800 hover:bg-stone-300',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50',
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
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-xl font-bold text-stone-800">
                Sincronizar com Finanças Pessoais
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Adicione esta transação ao seu controle financeiro pessoal
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Transaction Info */}
              <div className="bg-stone-50 rounded-lg p-4 border-2 border-stone-200">
                <div className="text-sm text-stone-600 mb-1">Transação</div>
                <div className="font-semibold text-stone-800">{transactionDescription}</div>
                <div className="text-lg font-bold text-blue-600 mt-2">
                  {formatCurrency(amount)}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Categoria (opcional)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-stone-200 rounded-lg focus:border-blue-500 focus:outline-none"
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
                  className="mt-1 w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoSync" className="text-sm text-stone-700">
                  Sincronizar automaticamente transações futuras deste tipo
                </label>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <div className="text-xs text-blue-800">
                    Apenas sua parte da despesa será adicionada às suas finanças pessoais.
                    A transação original permanecerá no espaço compartilhado.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-stone-200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={syncToPersonal.isPending}
                className="flex-1 px-4 py-2 bg-stone-200 text-stone-800 font-medium rounded-lg hover:bg-stone-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSync}
                disabled={syncToPersonal.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncToPersonal.isPending ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>

            {/* Success Message */}
            {syncToPersonal.isSuccess && (
              <div className="mx-6 mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium">
                    Transação sincronizada com sucesso!
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {syncToPersonal.isError && (
              <div className="mx-6 mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
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
