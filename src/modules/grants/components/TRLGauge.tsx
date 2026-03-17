/**
 * TRLGauge — Horizontal 9-level Technology Readiness Level gauge
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Displays TRL 1-9 as a segmented gauge with fill up to current level.
 * Next steps listed below. Follows Ceramic Design System.
 */

import React from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import type { TRLAssessment } from '../services/researcherScoring';

// ============================================================================
// TRL LEVEL LABELS
// ============================================================================

const TRL_LABELS: Record<number, string> = {
  1: 'Pesquisa basica',
  2: 'Conceito formulado',
  3: 'Prova de conceito',
  4: 'Validacao em lab',
  5: 'Validacao real',
  6: 'Demonstracao',
  7: 'Prototipo operacional',
  8: 'Sistema qualificado',
  9: 'Em produção',
};

// ============================================================================
// GAUGE SEGMENT
// ============================================================================

interface GaugeSegmentProps {
  level: number;
  isAchieved: boolean;
  isCurrent: boolean;
}

const GaugeSegment: React.FC<GaugeSegmentProps> = ({ level, isAchieved, isCurrent }) => {
  const bgColor = isAchieved
    ? 'var(--color-ceramic-success, #6B7B5C)'
    : 'var(--color-ceramic-border, #D6D0C4)';

  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div
        className={`w-full h-3 rounded-sm transition-colors duration-300 ${
          isCurrent ? 'ring-2 ring-offset-1 ring-ceramic-accent' : ''
        }`}
        style={{ backgroundColor: bgColor }}
        title={`TRL ${level}: ${TRL_LABELS[level]}`}
        aria-label={`TRL ${level}: ${TRL_LABELS[level]} ${isAchieved ? '(atingido)' : '(pendente)'}`}
      />
      <span
        className={`text-[10px] leading-none ${
          isAchieved ? 'text-ceramic-text-primary font-medium' : 'text-ceramic-text-secondary'
        }`}
      >
        {level}
      </span>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TRLGaugeProps {
  /** TRL assessment result from assessTRL() */
  assessment: TRLAssessment;
  /** Additional CSS classes */
  className?: string;
}

export const TRLGauge: React.FC<TRLGaugeProps> = ({ assessment, className = '' }) => {
  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss ${className}`}
      data-testid="trl-gauge"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={20} className="text-ceramic-text-primary" />
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Nivel de Maturidade Tecnologica (TRL)
          </h3>
        </div>
        <span className="text-sm font-medium text-ceramic-text-secondary">
          {assessment.readinessScore.toFixed(0)}%
        </span>
      </div>

      {/* Current level label */}
      <div className="mb-3">
        <span className="text-sm text-ceramic-text-secondary">
          Nivel atual:{' '}
        </span>
        <span className="text-sm font-semibold text-ceramic-text-primary">
          TRL {assessment.currentLevel}
          {assessment.currentLevel > 0 && ` — ${TRL_LABELS[assessment.currentLevel]}`}
        </span>
      </div>

      {/* Gauge */}
      <div className="flex gap-1 mb-4" role="progressbar" aria-valuenow={assessment.currentLevel} aria-valuemin={0} aria-valuemax={9}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map(level => (
          <GaugeSegment
            key={level}
            level={level}
            isAchieved={level <= assessment.currentLevel}
            isCurrent={level === assessment.currentLevel}
          />
        ))}
      </div>

      {/* Next steps */}
      {assessment.nextSteps.length > 0 && (
        <div>
          <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
            Proximos passos
          </span>
          <ul className="mt-2 space-y-1.5">
            {assessment.nextSteps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-sm text-ceramic-text-primary"
              >
                <ChevronRight
                  size={14}
                  className="text-ceramic-warning mt-0.5 flex-shrink-0"
                />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
