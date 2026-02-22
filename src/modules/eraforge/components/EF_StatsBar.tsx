/**
 * EF_StatsBar - Child stats progress bars
 *
 * Shows 3 progress bars for knowledge, cooperation, and courage.
 * Uses ceramic tokens for consistent styling.
 */

import React from 'react';

interface EF_StatsBarProps {
  knowledge: number;
  cooperation: number;
  courage: number;
  max?: number;
}

const STATS_CONFIG = [
  { key: 'knowledge',   label: 'Conhecimento', emoji: '📚', color: 'bg-ceramic-info' },
  { key: 'cooperation', label: 'Cooperacao',   emoji: '🤝', color: 'bg-ceramic-success' },
  { key: 'courage',     label: 'Coragem',      emoji: '⚔️', color: 'bg-ceramic-warning' },
] as const;

export function EF_StatsBar({ knowledge, cooperation, courage, max = 100 }: EF_StatsBarProps) {
  const values: Record<string, number> = {
    knowledge: knowledge ?? 0,
    cooperation: cooperation ?? 0,
    courage: courage ?? 0,
  };

  return (
    <div className="flex-1 space-y-1.5">
      {STATS_CONFIG.map(stat => {
        const value = values[stat.key];
        const pct = Math.min(100, Math.max(0, (value / max) * 100));

        return (
          <div key={stat.key} className="flex items-center gap-2">
            <span className="text-xs w-4 text-center">{stat.emoji}</span>
            <div className="flex-1 h-2 bg-ceramic-inset rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${stat.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-ceramic-text-secondary w-6 text-right font-medium">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
