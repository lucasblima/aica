/**
 * StressFatigueGauges -- Horizontal bar gauges for stress and fatigue levels.
 *
 * Displays two separate indicators alongside the radar chart:
 *   1. Nivel de stress
 *   2. Nivel de cansaco (fatigue)
 *
 * Color gradient:
 *   Low (0-33%):    green  (ceramic-success / green-400)
 *   Medium (34-66%): yellow (ceramic-warning / amber-400)
 *   High (67-100%):  red   (ceramic-error / red-400)
 *
 * Values are on a 0-5 scale (matching the questionnaire).
 */

import React from 'react';

interface GaugeProps {
  label: string;
  value: number | undefined;
  maxValue?: number;
}

const MAX = 5;

function getGaugeColor(value: number, maxValue: number): string {
  const pct = value / maxValue;
  if (pct <= 0.33) return 'bg-green-400';
  if (pct <= 0.66) return 'bg-amber-400';
  return 'bg-red-400';
}

function getGaugeLabel(value: number, maxValue: number): string {
  const pct = value / maxValue;
  if (pct <= 0.33) return 'Baixo';
  if (pct <= 0.66) return 'Moderado';
  return 'Alto';
}

function getTextColor(value: number, maxValue: number): string {
  const pct = value / maxValue;
  if (pct <= 0.33) return 'text-green-600';
  if (pct <= 0.66) return 'text-amber-600';
  return 'text-red-600';
}

function Gauge({ label, value, maxValue = MAX }: GaugeProps) {
  if (value == null) return null;

  const pct = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const barColor = getGaugeColor(value, maxValue);
  const levelLabel = getGaugeLabel(value, maxValue);
  const textColor = getTextColor(value, maxValue);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-ceramic-text-primary">{label}</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{levelLabel}</span>
      </div>
      <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-ceramic-text-secondary">Baixo</span>
        <span className="text-[9px] text-ceramic-text-secondary">Alto</span>
      </div>
    </div>
  );
}

export interface StressFatigueGaugesProps {
  stress: number | undefined;
  fatigue: number | undefined;
}

export const StressFatigueGauges: React.FC<StressFatigueGaugesProps> = ({
  stress,
  fatigue,
}) => {
  if (stress == null && fatigue == null) return null;

  return (
    <div className="space-y-3">
      <Gauge label="Nivel de stress" value={stress} />
      <Gauge label="Nivel de cansaco" value={fatigue} />
    </div>
  );
};
