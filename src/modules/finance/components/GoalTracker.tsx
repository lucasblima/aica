/**
 * GoalTracker Component
 *
 * Displays financial goals in a grid with SVG progress rings,
 * deadline countdowns, and amount tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { FinanceGoal } from '../types';
import { GOAL_TYPE_LABELS } from '../types';
import { GoalForm } from './GoalForm';

interface GoalTrackerProps {
  userId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getProgressColor = (pct: number): string => {
  if (pct >= 100) return 'var(--color-ceramic-success, #22c55e)';
  if (pct >= 80) return 'var(--color-ceramic-success, #22c55e)';
  if (pct >= 50) return 'var(--color-ceramic-info, #3B82F6)';
  return 'var(--color-ceramic-accent, #D97706)'; // amber accent
};

const getDaysRemaining = (deadline: string | null): string | null => {
  if (!deadline) return null;
  const today = new Date();
  const target = new Date(deadline);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Prazo encerrado';
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Falta 1 dia';
  return `Faltam ${diff} dias`;
};

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 64,
  strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const color = getProgressColor(percentage);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-ceramic-border"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
};

export const GoalTracker: React.FC<GoalTrackerProps> = ({ userId }) => {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | undefined>();

  const loadGoals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGoals(data as FinanceGoal[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleSave = async (goalData: Partial<FinanceGoal>) => {
    if (editingGoal) {
      await supabase
        .from('finance_goals')
        .update({ ...goalData, updated_at: new Date().toISOString() })
        .eq('id', editingGoal.id);
    } else {
      await supabase.from('finance_goals').insert({
        user_id: userId,
        ...goalData,
        current_amount: goalData.current_amount ?? 0,
        is_active: true,
      });
    }
    setShowForm(false);
    setEditingGoal(undefined);
    await loadGoals();
  };

  const handleEdit = (goal: FinanceGoal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGoal(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="ceramic-concave w-8 h-8 flex items-center justify-center">
            <Target className="w-4 h-4 text-ceramic-accent" />
          </div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Metas Financeiras
          </h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-accent text-white text-xs font-medium hover:bg-ceramic-accent-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar meta
        </button>
      </div>

      {/* Goal Form Modal */}
      {showForm && (
        <GoalForm
          goal={editingGoal}
          onSave={handleSave}
          onClose={handleCloseForm}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="ceramic-card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-ceramic-cool" />
                <div className="flex-1">
                  <div className="h-4 bg-ceramic-cool rounded w-24 mb-2" />
                  <div className="h-3 bg-ceramic-cool rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && goals.length === 0 && (
        <div className="ceramic-card p-8 text-center">
          <Target className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-ceramic-text-secondary">
            Defina metas financeiras para acompanhar seu progresso
          </p>
        </div>
      )}

      {/* Goal Grid */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct =
              goal.target_amount > 0
                ? (goal.current_amount / goal.target_amount) * 100
                : 0;
            const daysText = getDaysRemaining(goal.deadline);
            const isComplete = pct >= 100;

            return (
              <button
                key={goal.id}
                onClick={() => handleEdit(goal)}
                className="ceramic-card p-5 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Progress ring */}
                  <div className="relative flex-shrink-0">
                    <ProgressRing percentage={pct} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-ceramic-text-primary">
                        {isComplete ? '\u2713' : `${Math.round(pct)}%`}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-ceramic-text-primary truncate">
                        {goal.title}
                      </p>
                      {isComplete && (
                        <span className="text-xs">&#127881;</span>
                      )}
                    </div>

                    {/* Type badge */}
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-ceramic-cool text-ceramic-text-secondary mb-2">
                      {GOAL_TYPE_LABELS[goal.goal_type]}
                    </span>

                    {/* Amounts */}
                    <p className="text-xs text-ceramic-text-secondary">
                      {formatCurrency(goal.current_amount)}{' '}
                      <span className="text-ceramic-text-secondary/60">de</span>{' '}
                      {formatCurrency(goal.target_amount)}
                    </p>

                    {/* Deadline */}
                    {daysText && (
                      <p
                        className={`text-[10px] mt-1 ${
                          daysText === 'Prazo encerrado'
                            ? 'text-ceramic-error'
                            : 'text-ceramic-text-secondary'
                        }`}
                      >
                        {daysText}
                      </p>
                    )}

                    {/* Category badge */}
                    {goal.category && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] bg-ceramic-info/10 text-ceramic-info">
                        {goal.category}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
