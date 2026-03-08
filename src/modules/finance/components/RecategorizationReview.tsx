/**
 * RecategorizationReview
 *
 * Interactive modal that shows AI category suggestions for poorly
 * categorized transactions. User can accept, reject, or change
 * each suggestion before applying.
 */

import React, { useState } from 'react';
import { X, Check, ArrowRight, Loader2, ChevronDown } from 'lucide-react';
import type { CategorySuggestion } from '../services/financeService';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  housing: 'Moradia',
  health: 'Saúde',
  education: 'Educação',
  entertainment: 'Entretenimento',
  shopping: 'Compras',
  bills: 'Contas',
  salary: 'Salário',
  freelance: 'Freelance',
  investment: 'Investimento',
  transfer: 'Transferência',
  pets: 'Pets',
  personal_care: 'Cuidados Pessoais',
  subscription: 'Assinatura',
  travel: 'Viagem',
  other: 'Outros',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

interface RecategorizationReviewProps {
  suggestions: CategorySuggestion[];
  onApply: (suggestions: CategorySuggestion[]) => void;
  onClose: () => void;
  isApplying: boolean;
}

export const RecategorizationReview: React.FC<RecategorizationReviewProps> = ({
  suggestions: initialSuggestions,
  onApply,
  onClose,
  isApplying,
}) => {
  const [items, setItems] = useState<CategorySuggestion[]>(
    initialSuggestions.map(s => ({ ...s, accepted: true }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleAccepted = (id: string) => {
    setItems(prev =>
      prev.map(s => (s.id === id ? { ...s, accepted: !s.accepted } : s))
    );
  };

  const changeCategory = (id: string, newCategory: string) => {
    setItems(prev =>
      prev.map(s => (s.id === id ? { ...s, suggestedCategory: newCategory, accepted: true } : s))
    );
    setEditingId(null);
  };

  const acceptedCount = items.filter(s => s.accepted).length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-ceramic-base w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ceramic-border">
          <div>
            <h2 className="text-base font-bold text-ceramic-text-primary">
              Revisar Categorias
            </h2>
            <p className="text-xs text-ceramic-text-secondary mt-0.5">
              {items.length} {items.length === 1 ? 'sugestão' : 'sugestões'} da IA
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 ceramic-inset flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`ceramic-card p-4 transition-opacity ${
                item.accepted ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ceramic-text-primary truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-ceramic-text-secondary mt-0.5">
                    {formatCurrency(item.amount)}
                  </p>

                  {/* Category change */}
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="px-2 py-0.5 bg-ceramic-cool rounded text-ceramic-text-secondary">
                      {CATEGORY_LABELS[item.currentCategory] || item.currentCategory}
                    </span>
                    <ArrowRight className="w-3 h-3 text-ceramic-text-secondary" />

                    {editingId === item.id ? (
                      <select
                        autoFocus
                        value={item.suggestedCategory}
                        onChange={e => changeCategory(item.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="px-2 py-0.5 bg-ceramic-base border border-ceramic-border rounded text-ceramic-text-primary text-xs"
                      >
                        {CATEGORY_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium inline-flex items-center gap-1 hover:bg-amber-200 transition-colors"
                      >
                        {CATEGORY_LABELS[item.suggestedCategory] || item.suggestedCategory}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Accept/Reject toggle */}
                <button
                  onClick={() => toggleAccepted(item.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.accepted
                      ? 'bg-ceramic-success/20 text-ceramic-success'
                      : 'bg-ceramic-cool text-ceramic-text-secondary'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ceramic-border flex items-center justify-between gap-3">
          <p className="text-xs text-ceramic-text-secondary">
            {acceptedCount} de {items.length} aceitas
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onApply(items)}
              disabled={isApplying || acceptedCount === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>Aplicar {acceptedCount} {acceptedCount === 1 ? 'alteração' : 'alterações'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
