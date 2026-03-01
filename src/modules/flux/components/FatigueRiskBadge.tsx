/**
 * FatigueRiskBadge
 * Sprint 6 — Flux Training Science
 *
 * Small badge showing fatigue risk level with color coding.
 * Shows ACWR value when in danger zone (> 1.5).
 */

import React from 'react';
import type { FatigueRisk } from '../services/fatigueModeling';

export interface FatigueRiskBadgeProps {
  fatigueRisk: FatigueRisk;
  acwr?: number;
  className?: string;
}

const BADGE_CONFIG: Record<FatigueRisk, { bg: string; text: string; label: string }> = {
  low: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Baixo',
  },
  moderate: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Moderado',
  },
  high: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Alto',
  },
  overtraining: {
    bg: 'bg-red-200',
    text: 'text-red-900',
    label: 'Overtraining',
  },
};

export const FatigueRiskBadge: React.FC<FatigueRiskBadgeProps> = ({
  fatigueRisk,
  acwr,
  className = '',
}) => {
  const config = BADGE_CONFIG[fatigueRisk];
  const showAcwr = acwr !== undefined && acwr > 1.5;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${config.bg} ${config.text} ${className}
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          fatigueRisk === 'low' ? 'bg-green-500' :
          fatigueRisk === 'moderate' ? 'bg-amber-500' :
          fatigueRisk === 'high' ? 'bg-red-500' :
          'bg-red-800'
        }`}
      />
      {config.label}
      {showAcwr && (
        <span className="text-[10px] opacity-80">
          (ACWR {acwr.toFixed(1)})
        </span>
      )}
    </span>
  );
};
