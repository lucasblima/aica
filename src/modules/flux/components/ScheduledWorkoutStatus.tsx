/**
 * ScheduledWorkoutStatus - Display scheduled workout status with badges
 *
 * Shows pending/sent/failed status for scheduled WhatsApp messages
 */

import React from 'react';
import { Clock, CheckCircle, XCircle, Calendar, Trash2 } from 'lucide-react';
import type { ScheduledWorkout } from '../types/flow';

interface ScheduledWorkoutStatusProps {
  scheduledWorkouts: ScheduledWorkout[];
  weekNumber: 1 | 2 | 3;
  onCancel?: (id: string) => void;
}

export function ScheduledWorkoutStatus({
  scheduledWorkouts,
  weekNumber,
  onCancel,
}: ScheduledWorkoutStatusProps) {
  // Filter for this specific week
  const weekScheduled = scheduledWorkouts.filter(
    (sw) => sw.message_data?.week_number === weekNumber
  );

  if (weekScheduled.length === 0) return null;

  return (
    <div className="space-y-2">
      {weekScheduled.map((scheduled) => (
        <ScheduledWorkoutBadge
          key={scheduled.id}
          scheduled={scheduled}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

interface ScheduledWorkoutBadgeProps {
  scheduled: ScheduledWorkout;
  onCancel?: (id: string) => void;
}

function ScheduledWorkoutBadge({ scheduled, onCancel }: ScheduledWorkoutBadgeProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Agendado',
      color: 'bg-ceramic-info/20 text-ceramic-info border-ceramic-info/30',
    },
    sent: {
      icon: CheckCircle,
      label: 'Enviado',
      color: 'bg-ceramic-success/20 text-ceramic-success border-ceramic-success/30',
    },
    failed: {
      icon: XCircle,
      label: 'Falhou',
      color: 'bg-ceramic-error/20 text-ceramic-error border-ceramic-error/30',
    },
    cancelled: {
      icon: XCircle,
      label: 'Cancelado',
      color: 'bg-ceramic-text-secondary/20 text-ceramic-text-secondary border-ceramic-text-secondary/30',
    },
  };

  const config = statusConfig[scheduled.status];
  const Icon = config.icon;

  const scheduledDate = new Date(scheduled.scheduled_for);
  const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const canCancel = scheduled.status === 'pending' && new Date(scheduled.scheduled_for) > new Date();

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${config.color} transition-all`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider">{config.label}</span>
          <div className="flex items-center gap-1 text-[10px]">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{formattedTime}</span>
          </div>
        </div>
        {scheduled.failed_reason && (
          <p className="text-[10px] mt-1 opacity-80">{scheduled.failed_reason}</p>
        )}
      </div>

      {canCancel && onCancel && (
        <button
          onClick={() => onCancel(scheduled.id)}
          className="p-1.5 hover:bg-white/20 rounded transition-colors"
          title="Cancelar agendamento"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
