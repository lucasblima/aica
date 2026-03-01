import { useState } from 'react';
import { atlasDemo } from '../../data/demoData';
import type { AtlasTask } from '../../data/demoData';

const QUADRANTS = [
  { key: 'urgent-important' as const, label: 'Urgente + Importante', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'not-urgent-important' as const, label: 'Nao Urgente + Importante', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'urgent-not-important' as const, label: 'Urgente - Importante', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'not-urgent-not-important' as const, label: 'Nao Urgente - Importante', bg: 'bg-ceramic-cool', border: 'border-ceramic-border' },
] as const;

const QUADRANT_ORDER: AtlasTask['quadrant'][] = [
  'urgent-important',
  'not-urgent-important',
  'urgent-not-important',
  'not-urgent-not-important',
];

export function AtlasDemo() {
  const [tasks, setTasks] = useState<AtlasTask[]>(atlasDemo);

  const cycleQuadrant = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentIdx = QUADRANT_ORDER.indexOf(t.quadrant);
        const nextIdx = (currentIdx + 1) % QUADRANT_ORDER.length;
        return { ...t, quadrant: QUADRANT_ORDER[nextIdx] };
      })
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ceramic-text-secondary">
        Clique em uma tarefa para mover entre quadrantes
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUADRANTS.map((q) => {
          const quadrantTasks = tasks.filter((t) => t.quadrant === q.key);
          return (
            <div
              key={q.key}
              className={`${q.bg} ${q.border} border rounded-xl p-3 min-h-[100px]`}
            >
              <p className="text-[10px] font-semibold text-ceramic-text-secondary uppercase tracking-wide mb-2">
                {q.label}
              </p>
              <div className="space-y-1.5">
                {quadrantTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => cycleQuadrant(task.id)}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-all hover:scale-[1.02] cursor-pointer ${
                      task.completed
                        ? 'bg-white/60 text-ceramic-text-secondary line-through'
                        : 'bg-white/80 text-ceramic-text-primary shadow-sm'
                    }`}
                  >
                    {task.title}
                    {task.dueTime && (
                      <span className="ml-1 text-[10px] text-ceramic-text-secondary">
                        {task.dueTime}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
