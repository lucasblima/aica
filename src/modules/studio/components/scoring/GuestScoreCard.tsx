/**
 * GuestScoreCard Component
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * Displays a multi-dimensional guest score with tier badge,
 * component bars, and recommendation text.
 * Ceramic Design System compliant.
 */

import React from 'react';
import { Star, Users, Target, Shuffle } from 'lucide-react';
import type { GuestScoreResult } from '../../services/guestScoring';

interface GuestScoreCardProps {
  guestName: string;
  result: GuestScoreResult;
  className?: string;
}

const TIER_CONFIG: Record<GuestScoreResult['tier'], { label: string; color: string; bg: string }> = {
  ideal: { label: 'Ideal', color: 'text-ceramic-success', bg: 'bg-ceramic-success/10' },
  strong: { label: 'Forte', color: 'text-ceramic-info', bg: 'bg-ceramic-info/10' },
  good: { label: 'Bom', color: 'text-ceramic-warning', bg: 'bg-ceramic-warning/10' },
  consider: { label: 'Avaliar', color: 'text-ceramic-text-secondary', bg: 'bg-ceramic-cool' },
};

const COMPONENT_CONFIG = [
  { key: 'expertise' as const, label: 'Expertise', icon: Star, color: 'bg-amber-500' },
  { key: 'reach' as const, label: 'Alcance', icon: Users, color: 'bg-ceramic-info' },
  { key: 'relevance' as const, label: 'Relevancia', icon: Target, color: 'bg-ceramic-success' },
  { key: 'diversity' as const, label: 'Diversidade', icon: Shuffle, color: 'bg-purple-500' },
];

export const GuestScoreCard: React.FC<GuestScoreCardProps> = ({
  guestName,
  result,
  className = '',
}) => {
  const tier = TIER_CONFIG[result.tier];
  const scorePercent = Math.round(result.composite * 100);

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}
      data-testid="guest-score-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-ceramic-text-primary">{guestName}</h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${tier.color} ${tier.bg}`}>
            {tier.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-ceramic-text-primary">{scorePercent}</div>
          <div className="text-xs text-ceramic-text-secondary">/ 100</div>
        </div>
      </div>

      {/* Component Bars */}
      <div className="space-y-2 mb-3">
        {COMPONENT_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const value = result.components[key];
          const pct = Math.round(value * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-ceramic-text-secondary flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-ceramic-text-secondary w-20 flex-shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-ceramic-cool rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label}: ${pct}%`}
                />
              </div>
              <span className="text-xs text-ceramic-text-secondary w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <p className="text-xs text-ceramic-text-secondary italic border-t border-ceramic-border pt-2">
        {result.recommendation}
      </p>
    </div>
  );
};

export default GuestScoreCard;
