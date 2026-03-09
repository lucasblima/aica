/**
 * ReadinessGauge
 * Sprint 6 — Flux Training Science
 *
 * Circular gauge (0-100) showing readiness score.
 * Color varies by fatigue risk level.
 * Shows suggestedIntensity and recommendation below.
 */

import React from 'react';
import type { ReadinessAssessment, FatigueRisk } from '../services/fatigueModeling';

export interface ReadinessGaugeProps {
  readiness: ReadinessAssessment;
  className?: string;
}

const RISK_COLORS: Record<FatigueRisk, { stroke: string; text: string; bg: string }> = {
  low: { stroke: '#6B7B5C', text: 'text-ceramic-success', bg: 'bg-ceramic-success-bg' },
  moderate: { stroke: '#C4883A', text: 'text-ceramic-warning', bg: 'bg-ceramic-warning-bg' },
  high: { stroke: '#9B4D3A', text: 'text-ceramic-error', bg: 'bg-ceramic-error-bg' },
  overtraining: { stroke: '#9B4D3A', text: 'text-ceramic-error', bg: 'bg-ceramic-error-bg' },
};

const RISK_LABELS: Record<FatigueRisk, string> = {
  low: 'Baixo',
  moderate: 'Moderado',
  high: 'Alto',
  overtraining: 'Overtraining',
};

const INTENSITY_LABELS: Record<string, string> = {
  rest: 'Descanso',
  recovery: 'Recuperacao',
  easy: 'Leve',
  moderate: 'Moderado',
  hard: 'Intenso',
  race_pace: 'Ritmo de prova',
};

const GAUGE_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({ readiness, className = '' }) => {
  const { readinessScore, fatigueRisk, suggestedIntensity, recommendation, acuteChronicRatio } = readiness;
  const colors = RISK_COLORS[fatigueRisk];
  const progress = Math.max(0, Math.min(100, readinessScore));
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}>
      <h3 className="text-sm font-medium text-ceramic-text-primary mb-3">Prontidao do Atleta</h3>

      <div className="flex items-start gap-4">
        {/* Circular gauge */}
        <div className="relative flex-shrink-0" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
          <svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE}
            viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
          >
            {/* Background circle */}
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#DDD8CF"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Progress circle */}
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${colors.text}`}>
              {readinessScore}
            </span>
            <span className="text-[10px] text-ceramic-text-secondary">/ 100</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <span className="text-[10px] text-ceramic-text-secondary block">Risco de Fadiga</span>
              <span className={`text-xs font-medium ${colors.text}`}>
                {RISK_LABELS[fatigueRisk]}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-ceramic-text-secondary block">Intensidade Sugerida</span>
              <span className="text-xs font-medium text-ceramic-text-primary">
                {INTENSITY_LABELS[suggestedIntensity] || suggestedIntensity}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-ceramic-text-secondary block">ACWR</span>
              <span className={`text-xs font-medium ${
                acuteChronicRatio > 1.5 ? 'text-ceramic-error' :
                acuteChronicRatio >= 0.8 && acuteChronicRatio <= 1.3 ? 'text-ceramic-success' :
                'text-ceramic-warning'
              }`}>
                {acuteChronicRatio.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-ceramic-text-secondary leading-tight">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
};
