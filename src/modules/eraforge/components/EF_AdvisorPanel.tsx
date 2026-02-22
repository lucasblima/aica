/**
 * EF_AdvisorPanel - Advisor selection panel
 *
 * Displays 3 featured advisors with emoji, name, and specialty.
 * Children tap an advisor to get hints for the current scenario.
 */

import React from 'react';
import { ADVISOR_CONFIG } from '../types/eraforge.types';
import type { AdvisorId } from '../types/eraforge.types';

interface EF_AdvisorPanelProps {
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  selectedAdvisor?: AdvisorId | null;
}

const FEATURED_ADVISORS: { id: AdvisorId; emoji: string }[] = [
  { id: 'historian', emoji: '📜' },
  { id: 'scientist', emoji: '🔬' },
  { id: 'explorer', emoji: '🧭' },
];

export function EF_AdvisorPanel({ onSelectAdvisor, selectedAdvisor }: EF_AdvisorPanelProps) {
  return (
    <div>
      <h3
        className="text-sm font-semibold text-ceramic-text-secondary mb-2"
        style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
      >
        Conselheiros
      </h3>
      <div className="flex gap-3">
        {FEATURED_ADVISORS.map(({ id, emoji }) => {
          const config = ADVISOR_CONFIG[id];
          const isSelected = selectedAdvisor === id;

          return (
            <button
              key={id}
              onClick={() => onSelectAdvisor(id)}
              className={`flex-1 p-3 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-amber-100 ring-2 ring-ceramic-warning shadow-ceramic-emboss'
                  : 'bg-ceramic-card shadow-ceramic-emboss hover:scale-[1.03]'
              }`}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div
                className="text-xs font-bold text-ceramic-text-primary truncate"
                style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
              >
                {config.name}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary mt-0.5 truncate">
                {config.specialty}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
