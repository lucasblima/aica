import React, { useState, useMemo } from 'react';
import { X, Tag, Loader2, Sparkles, CheckSquare } from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceTransaction, TransactionCategory } from '../types';
import { TRANSACTION_CATEGORIES } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency } from '../constants';

const log = createNamespacedLogger('RecategorizeModal');

// =====================================================
// RecategorizeModal — Bulk Re-Categorize Transactions
// =====================================================

interface RecategorizeModalProps {
  transactions: FinanceTransaction[];
  onClose: () => void;
  onSave: (updates: Array<{ id: string; category: string }>) => Promise<void>;
}

export const RecategorizeModal: React.FC<RecategorizeModalProps> = ({
  transactions,
  onClose,
  onSave,
}) => {
  const [newCategory, setNewCategory] = useState<string>(
    transactions[0]?.category || 'other'
  );
  const [applySimilar, setApplySimilar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryDescription = transactions[0]?.description || '';

  const affectedCount = useMemo(() => {
    if (!applySimilar) return transactions.length;
    const normalizedPrimary = primaryDescription.toLowerCase().trim();
    return transactions.filter(
      (tx) => tx.description.toLowerCase().trim() === normalizedPrimary
    ).length;
  }, [applySimilar, transactions, primaryDescription]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      let toUpdate: FinanceTransaction[];

      if (applySimilar) {
        const normalizedPrimary = primaryDescription.toLowerCase().trim();
        toUpdate = transactions.filter(
          (tx) => tx.description.toLowerCase().trim() === normalizedPrimary
        );
      } else {
        toUpdate = transactions;
      }

      const updates = toUpdate.map((tx) => ({
        id: tx.id,
        category: newCategory,
      }));

      await onSave(updates);
      onClose();
    } catch (err) {
      log.error('Failed to recategorize', err);
      setError('Erro ao recategorizar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md ceramic-card p-5 shadow-xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="ceramic-concave w-8 h-8 rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h3 className="text-base font-bold text-ceramic-text-primary">
              Recategorizar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ceramic-inset p-2 rounded-lg hover:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Selected transactions preview */}
        <div className="ceramic-inset rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
          <p className="text-xs text-ceramic-text-secondary mb-2">
            {transactions.length} transação{transactions.length !== 1 ? 'es' : ''}{' '}
            selecionada{transactions.length !== 1 ? 's' : ''}
          </p>
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-1.5 border-b border-ceramic-border/50 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ceramic-text-primary truncate">
                  {tx.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.other
                  }`}
                >
                  {CATEGORY_LABELS[tx.category] || tx.category}
                </span>
                <span
                  className={`text-xs font-medium ${
                    tx.type === 'income' ? 'text-ceramic-success' : 'text-ceramic-error'
                  }`}
                >
                  {formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            </div>
          ))}
          {transactions.length > 5 && (
            <p className="text-[10px] text-ceramic-text-secondary mt-1">
              +{transactions.length - 5} mais...
            </p>
          )}
        </div>

        {/* New category selector */}
        <div className="mb-4">
          <label className="text-xs text-ceramic-text-secondary block mb-1.5">
            Nova categoria
          </label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full text-sm ceramic-inset px-3 py-2.5 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 bg-transparent"
          >
            {TRANSACTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </option>
            ))}
          </select>
        </div>

        {/* Apply to similar checkbox */}
        {transactions.length === 1 && (
          <label className="flex items-start gap-2.5 mb-4 cursor-pointer group">
            <div
              className={`shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-colors ${
                applySimilar
                  ? 'bg-ceramic-accent text-white'
                  : 'ceramic-inset group-hover:ring-2 group-hover:ring-ceramic-accent/20'
              }`}
              onClick={() => setApplySimilar(!applySimilar)}
            >
              {applySimilar && <CheckSquare className="w-3.5 h-3.5" />}
            </div>
            <div onClick={() => setApplySimilar(!applySimilar)}>
              <p className="text-xs font-medium text-ceramic-text-primary">
                Aplicar a similares
              </p>
              <p className="text-[10px] text-ceramic-text-secondary">
                Recategoriza todas as transações com a mesma descrição
              </p>
            </div>
          </label>
        )}

        {/* AI suggestion placeholder */}
        <button
          className="flex items-center gap-2 w-full ceramic-inset rounded-lg px-3 py-2.5 mb-4 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          onClick={() => {
            // Placeholder for AI category suggestion
            log.info('AI suggestion requested for:', primaryDescription);
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-ceramic-accent" />
          Sugerir categoria com IA
        </button>

        {/* Error */}
        {error && (
          <p className="text-xs text-ceramic-error mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-ceramic-text-secondary">
            {affectedCount} transação{affectedCount !== 1 ? 'es' : ''} será
            {affectedCount !== 1 ? 'o' : ''} atualizada{affectedCount !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs ceramic-inset px-4 py-2 rounded-lg text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-ceramic-accent hover:bg-ceramic-accent-dark text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Tag className="w-3.5 h-3.5" />
              )}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
