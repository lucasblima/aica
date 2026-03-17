/**
 * StressFatigueGauges -- Horizontal bar gauges for stress, fatigue, and ACWR.
 *
 * Displays indicators alongside the radar chart:
 *   1. Nivel de stress   (0-5 scale)
 *   2. Nivel de cansaco  (0-5 scale, fatigue)
 *   3. ACWR              (Acute:Chronic Workload Ratio, 0-2 scale, optional)
 *
 * Stress/Fatigue color gradient:
 *   Low (0-33%):    green  (ceramic-success / green-400)
 *   Medium (34-66%): yellow (ceramic-warning / amber-400)
 *   High (67-100%):  red   (ceramic-error / red-400)
 *
 * ACWR zones (#769):
 *   < 0.8:        Undertrained (amber)
 *   0.8 - 1.3:    Sweet spot   (green)
 *   1.3 - 1.5:    Caution      (amber)
 *   > 1.5:        Danger       (red)
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

// ---- ACWR Gauge (injury risk zones) ----

interface ACWRGaugeProps {
  value: number | undefined;
}

function getACWRColor(value: number): string {
  if (value < 0.8) return 'bg-amber-400';
  if (value <= 1.3) return 'bg-green-400';
  if (value <= 1.5) return 'bg-amber-400';
  return 'bg-red-400';
}

function getACWRLabel(value: number): string {
  if (value < 0.8) return 'Subtreino';
  if (value <= 1.3) return 'Ideal';
  if (value <= 1.5) return 'Atenção';
  return 'Risco';
}

function getACWRTextColor(value: number): string {
  if (value < 0.8) return 'text-amber-600';
  if (value <= 1.3) return 'text-green-600';
  if (value <= 1.5) return 'text-amber-600';
  return 'text-red-600';
}

function ACWRGauge({ value }: ACWRGaugeProps) {
  if (value == null) return null;

  const maxACWR = 2;
  const pct = Math.min(Math.max((value / maxACWR) * 100, 0), 100);
  const barColor = getACWRColor(value);
  const label = getACWRLabel(value);
  const textColor = getACWRTextColor(value);

  // Zone markers as percentages of bar width (maxACWR = 2)
  const zone08 = (0.8 / maxACWR) * 100;
  const zone13 = (1.3 / maxACWR) * 100;
  const zone15 = (1.5 / maxACWR) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-ceramic-text-primary">ACWR</span>
        <span className={`text-[10px] font-bold ${textColor}`}>
          {value.toFixed(2)} — {label}
        </span>
      </div>
      <div className="relative h-2 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Zone markers */}
      <div className="relative h-1">
        <div
          className="absolute top-0 w-px h-2 bg-ceramic-text-secondary/40"
          style={{ left: `${zone08}%` }}
        />
        <div
          className="absolute top-0 w-px h-2 bg-ceramic-text-secondary/40"
          style={{ left: `${zone13}%` }}
        />
        <div
          className="absolute top-0 w-px h-2 bg-ceramic-text-secondary/40"
          style={{ left: `${zone15}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-ceramic-text-secondary">0</span>
        <span className="text-[9px] text-amber-500">0.8</span>
        <span className="text-[9px] text-green-500">1.3</span>
        <span className="text-[9px] text-amber-500">1.5</span>
        <span className="text-[9px] text-ceramic-text-secondary">2.0</span>
      </div>
    </div>
  );
}

// ---- Main Component ----

export interface StressFatigueGaugesProps {
  stress: number | undefined;
  fatigue: number | undefined;
  /** Acute:Chronic Workload Ratio from fatigueModeling. Optional. */
  acwr?: number;
}

export const StressFatigueGauges: React.FC<StressFatigueGaugesProps> = ({
  stress,
  fatigue,
  acwr,
}) => {
  if (stress == null && fatigue == null && acwr == null) return null;

  return (
    <div className="space-y-3">
      <Gauge label="Nivel de stress" value={stress} />
      <Gauge label="Nivel de cansaco" value={fatigue} />
      <ACWRGauge value={acwr} />
    </div>
  );
};
