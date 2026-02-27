/**
 * AdminDashboardSection - Coach admin overview with athlete groupings
 *
 * Displays athlete groups by status (pending health form, pending financial,
 * needs feedback), by modality, and by level.
 */

import React from 'react';
import { Users, AlertTriangle, DollarSign, MessageSquare } from 'lucide-react';
import type { Athlete, TrainingModality, AthleteLevel } from '../../types/flux';
import { MODALITY_CONFIG, LEVEL_LABELS } from '../../types/flux';

interface AdminDashboardSectionProps {
  athletes: Athlete[];
}

interface StatusGroup {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClasses: string;
}

export function AdminDashboardSection({ athletes }: AdminDashboardSectionProps) {
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
    },
    {
      label: 'Financeiro pendente',
      count: pendingFinancial,
      icon: <DollarSign className="w-4 h-4" />,
      colorClasses: 'bg-ceramic-warning/10 text-ceramic-warning',
    },
    {
      label: 'Sem bloco ativo',
      count: needsFeedback,
      icon: <MessageSquare className="w-4 h-4" />,
      colorClasses: 'bg-ceramic-info/10 text-ceramic-info',
    },
  ];

  // --- Modality groups ---
  const modalityCounts = activeAthletes.reduce<Record<TrainingModality, number>>((acc, a) => {
    const mod = a.modality || 'strength';
    acc[mod] = (acc[mod] || 0) + 1;
    return acc;
  }, {} as Record<TrainingModality, number>);

  const totalActive = activeAthletes.length || 1; // avoid divide by zero

  // --- Level groups ---
  const levelCounts = activeAthletes.reduce<Record<AthleteLevel, number>>((acc, a) => {
    const lvl = a.level || 'iniciante';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {} as Record<AthleteLevel, number>);

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

      {/* Status groups */}
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
        <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
          Pendencias
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statusGroups.map((group) => (
            <div
              key={group.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ceramic-border/30"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.colorClasses}`}>
                {group.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-ceramic-text-primary">{group.count}</p>
                <p className="text-xs text-ceramic-text-secondary truncate">{group.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modality + Level side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By modality */}
        <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
          <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
            Por Modalidade
          </h3>
          <div className="space-y-3">
            {(Object.keys(MODALITY_CONFIG) as TrainingModality[]).map((mod) => {
              const count = modalityCounts[mod] || 0;
              if (count === 0) return null;
              const pct = Math.round((count / totalActive) * 100);
              const config = MODALITY_CONFIG[mod];
              return (
                <div key={mod} className="flex items-center gap-3">
                  <span className="text-lg">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ceramic-text-primary">{config.label}</span>
                      <span className="text-xs text-ceramic-text-secondary">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-ceramic-border/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ceramic-info rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {Object.values(modalityCounts).every((c) => c === 0) && (
              <p className="text-sm text-ceramic-text-secondary">Nenhum atleta ativo</p>
            )}
          </div>
        </div>

        {/* By level */}
        <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
          <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-4">
            Por Nivel
          </h3>
          <div className="space-y-3">
            {(Object.keys(LEVEL_LABELS) as AthleteLevel[]).map((lvl) => {
              const count = levelCounts[lvl] || 0;
              const pct = Math.round((count / totalActive) * 100);
              const colorMap: Record<AthleteLevel, string> = {
                iniciante: 'bg-ceramic-success',
                intermediario: 'bg-ceramic-warning',
                avancado: 'bg-ceramic-error',
              };
              return (
                <div key={lvl} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${colorMap[lvl]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ceramic-text-primary">{LEVEL_LABELS[lvl]}</span>
                      <span className="text-xs text-ceramic-text-secondary">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-ceramic-border/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorMap[lvl]} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
