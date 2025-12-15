import React from 'react';
import type { VenturesMilestone, MilestoneStatus } from '../types';

interface MilestoneTimelineProps {
  milestones: VenturesMilestone[];
  onMilestoneClick?: (milestone: VenturesMilestone) => void;
  className?: string;
}

/**
 * MilestoneTimeline Component
 *
 * Horizontal timeline visualization of milestones with status indicators.
 */
export function MilestoneTimeline({
  milestones,
  onMilestoneClick,
  className = '',
}: MilestoneTimelineProps) {
  // Safe array reference with fallback
  const safeMilestones = milestones || [];

  const statusConfig: Record<
    MilestoneStatus,
    { color: string; bgColor: string; borderColor: string; label: string }
  > = {
    pending: {
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50',
      borderColor: 'border-neutral-300',
      label: 'Pendente',
    },
    in_progress: {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-400',
      label: 'Em andamento',
    },
    achieved: {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      label: 'Alcançado',
    },
    missed: {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      label: 'Perdido',
    },
    cancelled: {
      color: 'text-neutral-400',
      bgColor: 'bg-neutral-100',
      borderColor: 'border-neutral-300',
      label: 'Cancelado',
    },
  };

  const categoryIcons: Record<string, string> = {
    produto: '📦',
    financeiro: '💰',
    equipe: '👥',
    legal: '⚖️',
    mercado: '📈',
    tecnologia: '⚙️',
  };

  if (safeMilestones.length === 0) {
    return (
      <div className={`bg-neutral-50 rounded-lg border border-neutral-200 p-8 text-center ${className}`}>
        <p className="text-neutral-500 text-sm">Nenhum milestone cadastrado</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-neutral-700 mb-6">Milestones</h3>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neutral-200" />

        {/* Milestones */}
        <div className="space-y-6">
          {safeMilestones.map((milestone, index) => {
            const config = statusConfig[milestone.status];
            const categoryIcon = milestone.category
              ? categoryIcons[milestone.category] || '🎯'
              : '🎯';

            return (
              <div
                key={milestone.id}
                className={`relative pl-8 ${
                  onMilestoneClick ? 'cursor-pointer hover:bg-neutral-50 -ml-2 -mr-2 p-2 rounded-lg' : ''
                }`}
                onClick={() => onMilestoneClick?.(milestone)}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 ${config.borderColor} ${
                    milestone.status === 'achieved' ? 'bg-green-500' :
                    milestone.status === 'in_progress' ? 'bg-amber-500' :
                    'bg-white'
                  }`}
                  style={{ left: '-5px' }}
                />

                {/* Content */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title and category */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{categoryIcon}</span>
                      <h4 className="text-sm font-semibold text-neutral-900">
                        {milestone.title}
                      </h4>
                    </div>

                    {/* Description */}
                    {milestone.description && (
                      <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
                        {milestone.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      {/* Target date */}
                      {milestone.target_date && (
                        <span>
                          {new Date(milestone.target_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}

                      {/* Target metric */}
                      {milestone.target_metric && milestone.target_value && (
                        <span>
                          Meta: {milestone.target_value.toLocaleString('pt-BR')}{' '}
                          {milestone.target_unit || milestone.target_metric}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress and status */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Status badge */}
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${config.color} ${config.bgColor}`}
                    >
                      {config.label}
                    </span>

                    {/* Progress */}
                    {milestone.status !== 'cancelled' && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              milestone.status === 'achieved'
                                ? 'bg-green-500'
                                : milestone.status === 'in_progress'
                                ? 'bg-amber-500'
                                : 'bg-neutral-400'
                            }`}
                            style={{ width: `${milestone.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-neutral-600 w-8">
                          {milestone.progress_pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
