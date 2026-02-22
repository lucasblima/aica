/**
 * EF_TurnCounter - Circular turn counter
 *
 * Shows remaining turns in a circular badge.
 */

import React from 'react';

interface EF_TurnCounterProps {
  turnsRemaining: number;
  maxTurns?: number;
}

export function EF_TurnCounter({ turnsRemaining, maxTurns = 10 }: EF_TurnCounterProps) {
  const pct = Math.min(100, (turnsRemaining / maxTurns) * 100);
  const isLow = turnsRemaining <= 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-ceramic-emboss ${
          isLow ? 'bg-ceramic-error/10 ring-2 ring-ceramic-error' : 'bg-ceramic-card'
        }`}
      >
        <span
          className={`text-lg font-bold ${isLow ? 'text-ceramic-error' : 'text-ceramic-text-primary'}`}
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          {turnsRemaining}
        </span>
      </div>
      <span className="text-[10px] text-ceramic-text-secondary font-medium">
        turnos
      </span>
    </div>
  );
}
