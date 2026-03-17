/**
 * FinancialHealthCard Component
 * Sprint 5 — Behavioral Economics Engine
 *
 * Displays the 4-component FinHealth Score with tier badge.
 * Ceramic Design System: bg-ceramic-50, shadow-ceramic-emboss, rounded-xl.
 */

import React from 'react';
import { Heart, TrendingUp, TrendingDown, Minus, ShieldCheck, PiggyBank, CreditCard, Target } from 'lucide-react';
import type { FinancialHealthResult } from '../services/financialHealthScoring';
import {
  TIER_LABELS,
  TIER_COLORS,
  TIER_BG_COLORS,
  COMPONENT_LABELS,
} from '../services/financialHealthScoring';

interface FinancialHealthCardProps {
  result: FinancialHealthResult;
  trend?: 'improving' | 'stable' | 'declining';
}

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  spend: <CreditCard className="w-4 h-4" />,
  save: <PiggyBank className="w-4 h-4" />,
  borrow: <ShieldCheck className="w-4 h-4" />,
  plan: <Target className="w-4 h-4" />,
};

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const getBarColor = (s: number): string => {
    if (s >= 80) return 'bg-ceramic-success';
    if (s >= 60) return 'bg-amber-400';
    if (s >= 40) return 'bg-amber-500';
    return 'bg-ceramic-error';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className="text-ceramic-text-secondary">{icon}</span>
        <span className="text-xs font-medium text-ceramic-text-secondary">{label}</span>
      </div>
      <div className="flex-1 h-2.5 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-xs font-bold text-ceramic-text-primary w-8 text-right">
        {Math.round(score)}
      </span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  const config = {
    improving: { icon: <TrendingUp className="w-3 h-3" />, label: 'Melhorando', color: 'text-ceramic-success' },
    stable: { icon: <Minus className="w-3 h-3" />, label: 'Estavel', color: 'text-ceramic-text-secondary' },
    declining: { icon: <TrendingDown className="w-3 h-3" />, label: 'Em declinio', color: 'text-ceramic-error' },
  };
  const { icon, label, color } = config[trend];

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({ result, trend }) => {
  const { finHealth } = result;
  const components = ['spend', 'save', 'borrow', 'plan'] as const;

  return (
    <div className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 p-1.5 rounded-lg">
            <Heart className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Saúde Financeira
          </h3>
        </div>
        {trend && <TrendBadge trend={trend} />}
      </div>

      {/* Composite Score + Tier */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-ceramic-cool"
            />
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${(finHealth.composite / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              className={TIER_COLORS[finHealth.tier]}
            />
          </svg>
          <span className="absolute text-lg font-black text-ceramic-text-primary">
            {Math.round(finHealth.composite)}
          </span>
        </div>
        <div>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${TIER_BG_COLORS[finHealth.tier]} ${TIER_COLORS[finHealth.tier]}`}>
            {TIER_LABELS[finHealth.tier]}
          </span>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            FinHealth Score (0-100)
          </p>
        </div>
      </div>

      {/* Component Bars */}
      <div className="space-y-3">
        {components.map((key) => (
          <ScoreBar
            key={key}
            label={COMPONENT_LABELS[key]}
            score={finHealth[key]}
            icon={COMPONENT_ICONS[key]}
          />
        ))}
      </div>

      {/* Brazilian Ratios Summary */}
      <div className="mt-4 pt-3 border-t border-ceramic-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wide">Endividamento</p>
            <p className="text-sm font-bold text-ceramic-text-primary">
              {(result.debtToIncomeRatio * 100).toFixed(0)}%
            </p>
            <StatusDot status={result.brazilianRatios.dtiStatus} />
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wide">Reserva</p>
            <p className="text-sm font-bold text-ceramic-text-primary">
              {result.emergencyFundMonths.toFixed(1)} meses
            </p>
            <StatusDot status={result.brazilianRatios.emergencyStatus} />
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wide">Poupanca</p>
            <p className="text-sm font-bold text-ceramic-text-primary">
              {(result.savingsRate * 100).toFixed(0)}%
            </p>
            <StatusDot status={result.brazilianRatios.savingsStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};

function StatusDot({ status }: { status: 'ok' | 'warning' | 'critical' }) {
  const colors = {
    ok: 'bg-ceramic-success',
    warning: 'bg-ceramic-warning',
    critical: 'bg-ceramic-error',
  };
  return (
    <div className="flex justify-center mt-1">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
    </div>
  );
}

export default FinancialHealthCard;
