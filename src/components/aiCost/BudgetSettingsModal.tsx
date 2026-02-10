import React, { useState } from 'react';
import { X, DollarSign, Save } from 'lucide-react';
import { updateUserAIBudget } from '../../services/userSettingsService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('BudgetSettingsModal');

interface BudgetSettingsModalProps {
  currentBudget: number;
  onSave: (newBudget: number) => void;
  onClose: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  currentBudget,
  onSave,
  onClose
}) => {
  const [budget, setBudget] = useState(currentBudget.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const budgetValue = parseFloat(budget);

    if (isNaN(budgetValue) || budgetValue < 0) {
      setError('Digite um valor válido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateUserAIBudget(budgetValue);
      onSave(budgetValue);
    } catch (err) {
      setError('Erro ao salvar orçamento');
      log.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="ceramic-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 ceramic-inset flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-ceramic-accent" />
            </div>
            <h2 className="text-xl font-black text-ceramic-text-primary text-etched">
              Definir Orçamento Mensal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 ceramic-inset hover:scale-105 transition-transform flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Orçamento Mensal (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-text-secondary">$</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full pl-8 pr-4 py-3 ceramic-inset rounded-xl text-lg font-bold text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              placeholder="50.00"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-ceramic-error mt-2">{error}</p>}

          <p className="text-xs text-ceramic-text-secondary mt-2">
            Você receberá alertas ao atingir 80%, 90% e 100% do orçamento.
          </p>
        </div>

        {/* Sugestões */}
        <div className="mb-6">
          <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Sugestões
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((val) => (
              <button
                key={val}
                onClick={() => setBudget(val.toString())}
                className="ceramic-inset hover:scale-105 transition-transform py-2 px-3 rounded-lg text-sm font-bold text-ceramic-text-primary"
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 ceramic-inset py-3 rounded-xl text-sm font-bold text-ceramic-text-secondary hover:scale-105 transition-transform"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 ceramic-button py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
