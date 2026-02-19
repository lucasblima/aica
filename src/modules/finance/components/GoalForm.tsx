/**
 * GoalForm Component
 *
 * Modal for creating/editing financial goals.
 * Includes preset templates for common goals.
 */

import React, { useState } from 'react';
import { X, Target, Zap } from 'lucide-react';
import type { FinanceGoal } from '../types';
import { GOAL_TYPE_LABELS, TRANSACTION_CATEGORIES } from '../types';

interface GoalFormProps {
  goal?: FinanceGoal;
  onSave: (data: Partial<FinanceGoal>) => Promise<void>;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Moradia',
  food: 'Alimentacao',
  transport: 'Transporte',
  health: 'Saude',
  education: 'Educacao',
  entertainment: 'Lazer',
  shopping: 'Compras',
  salary: 'Salario',
  freelance: 'Freelance',
  investment: 'Investimentos',
  transfer: 'Transferencias',
  other: 'Outros',
};

interface GoalTemplate {
  title: string;
  goal_type: FinanceGoal['goal_type'];
  suggested_amount: number;
  description: string;
}

const TEMPLATES: GoalTemplate[] = [
  {
    title: 'Reserva de Emergencia (3 meses)',
    goal_type: 'emergency_fund',
    suggested_amount: 15000,
    description: '3 meses de despesas',
  },
  {
    title: 'Quitar Cartao',
    goal_type: 'debt_payoff',
    suggested_amount: 5000,
    description: 'Zerar fatura pendente',
  },
  {
    title: 'Viagem dos Sonhos',
    goal_type: 'savings',
    suggested_amount: 10000,
    description: 'Fundo para viagem',
  },
];

export const GoalForm: React.FC<GoalFormProps> = ({ goal, onSave, onClose }) => {
  const [title, setTitle] = useState(goal?.title || '');
  const [goalType, setGoalType] = useState<FinanceGoal['goal_type']>(
    goal?.goal_type || 'savings'
  );
  const [targetAmount, setTargetAmount] = useState(
    goal?.target_amount?.toString() || ''
  );
  const [currentAmount, setCurrentAmount] = useState(
    goal?.current_amount?.toString() || '0'
  );
  const [deadline, setDeadline] = useState(goal?.deadline || '');
  const [category, setCategory] = useState(goal?.category || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount) return;

    setSaving(true);
    await onSave({
      title: title.trim(),
      goal_type: goalType,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
      category: category || null,
    });
    setSaving(false);
  };

  const applyTemplate = (template: GoalTemplate) => {
    setTitle(template.title);
    setGoalType(template.goal_type);
    setTargetAmount(template.suggested_amount.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ceramic-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="ceramic-concave w-8 h-8 flex items-center justify-center">
              <Target className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              {goal ? 'Editar Meta' : 'Nova Meta'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Templates (only on create) */}
        {!goal && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-ceramic-accent" />
              <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Modelos Rapidos
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="ceramic-tray px-3 py-2 flex-shrink-0 text-left hover:shadow-sm transition-shadow"
                >
                  <p className="text-xs font-medium text-ceramic-text-primary whitespace-nowrap">
                    {template.title}
                  </p>
                  <p className="text-[10px] text-ceramic-text-secondary">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Titulo da Meta
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reserva para investir"
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
              required
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Tipo
            </label>
            <select
              value={goalType}
              onChange={(e) =>
                setGoalType(e.target.value as FinanceGoal['goal_type'])
              }
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
            >
              {(
                Object.entries(GOAL_TYPE_LABELS) as [
                  FinanceGoal['goal_type'],
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Target amount */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Valor Alvo (R$)
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000"
              min="0"
              step="0.01"
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
              required
            />
          </div>

          {/* Current amount (only on edit) */}
          {goal && (
            <div>
              <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
                Valor Atual (R$)
              </label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                min="0"
                step="0.01"
                className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
              />
            </div>
          )}

          {/* Deadline */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Prazo (opcional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Categoria (opcional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
            >
              <option value="">Nenhuma</option>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim() || !targetAmount}
              className="flex-1 px-4 py-2.5 rounded-lg bg-ceramic-accent text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : goal ? 'Salvar Alteracoes' : 'Criar Meta'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg ceramic-inset text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;
