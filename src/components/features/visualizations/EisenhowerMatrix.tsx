import React from 'react';

export interface MatrixTask {
  id: string;
  title: string;
  completed: boolean;
  dueTime?: string;
}

type QuadrantKey = 'urgent-important' | 'important' | 'urgent' | 'low';

interface EisenhowerMatrixProps {
  tasks: Record<QuadrantKey, MatrixTask[]>;
  onTaskComplete?: (taskId: string) => void;
  onTaskMove?: (taskId: string, targetQuadrant: QuadrantKey) => void;
  className?: string;
}

const QUADRANT_CONFIG: Record<QuadrantKey, { label: string; sublabel: string; bg: string; border: string }> = {
  'urgent-important': { label: 'Urgente + Importante', sublabel: 'Fazer agora', bg: 'bg-ceramic-error/10', border: 'border-ceramic-error/30' },
  'important': { label: 'Importante', sublabel: 'Agendar', bg: 'bg-ceramic-info/10', border: 'border-ceramic-info/30' },
  'urgent': { label: 'Urgente', sublabel: 'Delegar', bg: 'bg-amber-50', border: 'border-amber-200' },
  'low': { label: 'Nem Urgente', sublabel: 'Eliminar', bg: 'bg-ceramic-cool', border: 'border-ceramic-border' },
};

const QUADRANT_ORDER: QuadrantKey[] = ['urgent-important', 'important', 'urgent', 'low'];

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
  tasks, onTaskComplete, className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`} role="grid" aria-label="Eisenhower Matrix">
      {QUADRANT_ORDER.map(key => {
        const config = QUADRANT_CONFIG[key];
        const quadrantTasks = tasks[key] || [];
        return (
          <div key={key} className={`${config.bg} ${config.border} border rounded-xl p-3 min-h-[120px]`} role="gridcell" aria-label={config.label}>
            <div className="mb-2">
              <h3 className="text-[10px] font-bold text-ceramic-text-primary uppercase tracking-wide">{config.label}</h3>
              <span className="text-[9px] text-ceramic-text-secondary">{config.sublabel}</span>
            </div>
            <div className="space-y-1">
              {quadrantTasks.map(task => (
                <button key={task.id} className={`w-full text-left text-xs px-2 py-1.5 rounded-lg bg-white/70 hover:bg-white transition-all hover:scale-[1.02] ${task.completed ? 'line-through text-ceramic-text-secondary opacity-60' : 'text-ceramic-text-primary'}`} onClick={() => onTaskComplete?.(task.id)}>
                  {task.title}
                  {task.dueTime && <span className="ml-1 text-[9px] text-ceramic-text-secondary">{task.dueTime}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
