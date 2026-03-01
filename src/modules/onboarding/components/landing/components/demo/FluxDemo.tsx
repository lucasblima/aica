import { useState } from 'react';
import { fluxDemo } from '../../data/demoData';

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  '#f59e0b': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '#3b82f6': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '#ef4444': { bg: 'bg-red-100', text: 'text-red-700' },
  '#6b7280': { bg: 'bg-ceramic-cool', text: 'text-ceramic-text-secondary' },
  '#8b5cf6': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '#10b981': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function getColorClasses(color: string) {
  return COLOR_MAP[color] || { bg: 'bg-ceramic-cool', text: 'text-ceramic-text-secondary' };
}

export function FluxDemo() {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {/* Weekly row */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {fluxDemo.map((block, idx) => {
          const { bg, text } = getColorClasses(block.color);
          const isExpanded = expandedDay === idx;
          return (
            <button
              key={block.day}
              type="button"
              onClick={() => setExpandedDay(isExpanded ? null : idx)}
              className={`rounded-xl p-3 min-w-[80px] flex-shrink-0 transition-all cursor-pointer ${bg} ${
                isExpanded ? 'ring-2 ring-amber-400 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase ${text}`}>
                {block.day}
              </p>
              <p className={`text-xs font-medium mt-1 ${text}`}>
                {block.modality}
              </p>
            </button>
          );
        })}
      </div>

      {/* Expanded day detail */}
      {expandedDay !== null && (
        <div className="bg-ceramic-cool/30 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-ceramic-text-primary">
            {fluxDemo[expandedDay].dayLabel} — {fluxDemo[expandedDay].modality}
          </p>
          <div className="space-y-1.5">
            {fluxDemo[expandedDay].exercises.map((ex) => (
              <div
                key={ex.name}
                className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-3 py-1.5"
              >
                <span className="text-ceramic-text-primary">{ex.name}</span>
                <span className="text-ceramic-text-secondary shrink-0 ml-2">
                  {ex.sets}x{ex.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedDay === null && (
        <p className="text-[10px] text-ceramic-text-secondary text-center">
          Clique em um dia para ver os exercicios
        </p>
      )}
    </div>
  );
}
