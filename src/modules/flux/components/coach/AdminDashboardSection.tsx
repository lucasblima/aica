/**
 * AdminDashboardSection - Coach admin overview with athlete groupings
 *
 * Displays athlete groups by status (pending health form, pending financial,
 * needs feedback), by modality, and by level.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, DollarSign, MessageSquare, BookOpen, Dumbbell } from 'lucide-react';
import type { Athlete } from '../../types/flux';

interface AdminDashboardSectionProps {
  athletes: Athlete[];
  templateCount?: number;
}

interface StatusGroup {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClasses: string;
  filterKey: string;
}

export function AdminDashboardSection({ athletes, templateCount }: AdminDashboardSectionProps) {
  const navigate = useNavigate();
  const activeAthletes = athletes.filter((a) => a.status === 'active' || a.status === 'trial');

  // --- Status groups ---
  const pendingHealthForm = activeAthletes.filter(
    (a) => a.parq_clearance_status === 'pending' || (!a.parq_clearance_status && a.allow_parq_onboarding)
  ).length;

  const pendingFinancial = activeAthletes.filter(
    (a) => a.financial_status === 'pending' || a.financial_status === 'overdue'
  ).length;

  const needsFeedback = activeAthletes.filter(
    (a) => !a.current_block_id
  ).length;

  const statusGroups: StatusGroup[] = [
    {
      label: 'Ficha de saude pendente',
      count: pendingHealthForm,
      icon: <AlertTriangle className="w-4 h-4" />,
      colorClasses: 'bg-ceramic-warning/10 text-ceramic-warning',
      filterKey: 'health_pending',
    },
    {
      label: 'Financeiro pendente',
      count: pendingFinancial,
      icon: <DollarSign className="w-4 h-4" />,
      colorClasses: 'bg-ceramic-warning/10 text-ceramic-warning',
      filterKey: 'financial_pending',
    },
    {
      label: 'Sem bloco ativo',
      count: needsFeedback,
      icon: <MessageSquare className="w-4 h-4" />,
      colorClasses: 'bg-ceramic-info/10 text-ceramic-info',
      filterKey: 'no_block',
    },
  ];

  if (athletes.length === 0) {
    return null;
  }

  return (
    <div className="px-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-ceramic-info/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-ceramic-info" />
        </div>
        <h2 className="text-lg font-bold text-ceramic-text-primary">Painel Administrativo</h2>
      </div>

      {/* Resumo Geral */}
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
        <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
          Resumo Geral
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ceramic-border/30">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ceramic-success/10">
              <Users className="w-4 h-4 text-ceramic-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-ceramic-text-primary">{activeAthletes.length}</p>
              <p className="text-xs text-ceramic-text-secondary">Atletas ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ceramic-border/30">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
              <BookOpen className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-ceramic-text-primary">{templateCount ?? 0}</p>
              <p className="text-xs text-ceramic-text-secondary">Exercicios na biblioteca</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ceramic-border/30">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ceramic-info/10">
              <Dumbbell className="w-4 h-4 text-ceramic-info" />
            </div>
            <div>
              <p className="text-xl font-bold text-ceramic-text-primary">{activeAthletes.filter(a => a.current_block_id).length}</p>
              <p className="text-xs text-ceramic-text-secondary">Com bloco ativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status groups */}
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
        <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
          Pendencias
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statusGroups.map((group) => (
            <button
              key={group.label}
              onClick={() => navigate(`/flux/crm?filter=${group.filterKey}`)}
              className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ceramic-border/30 hover:shadow-md hover:border-ceramic-accent/30 transition-all cursor-pointer text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.colorClasses}`}>
                {group.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-ceramic-text-primary">{group.count}</p>
                <p className="text-xs text-ceramic-text-secondary truncate">{group.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
