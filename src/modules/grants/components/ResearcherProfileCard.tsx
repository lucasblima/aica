/**
 * ResearcherProfileCard — Displays RSS score, tier badge, and 5 component bars
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Follows Ceramic Design System.
 */

import React, { useState } from 'react';
import { GraduationCap, Info } from 'lucide-react';
import type { ResearcherStrengthResult } from '../services/researcherScoring';
import { ScoreExplainer } from '@/components/features/ScoreExplainer';
import type { ScoreExplanation } from '@/services/scoring/types';

// ============================================================================
// TIER CONFIG
// ============================================================================

const TIER_CONFIG: Record<ResearcherStrengthResult['tier'], { label: string; color: string; bgColor: string }> = {
  emerging: {
    label: 'Emergente',
    color: 'var(--color-ceramic-warning, #D97706)',
    bgColor: 'rgba(217, 119, 6, 0.12)',
  },
  established: {
    label: 'Estabelecido',
    color: 'var(--color-ceramic-info, #5B8BA0)',
    bgColor: 'rgba(91, 139, 160, 0.12)',
  },
  senior: {
    label: 'Senior',
    color: 'var(--color-ceramic-success, #6B7B5C)',
    bgColor: 'rgba(107, 123, 92, 0.12)',
  },
  leading: {
    label: 'Líder',
    color: 'var(--color-ceramic-accent, #B8860B)',
    bgColor: 'rgba(184, 134, 11, 0.12)',
  },
};

// ============================================================================
// COMPONENT BAR
// ============================================================================

interface ComponentBarProps {
  label: string;
  value: number; // 0-100
  weight: string;
}

const ComponentBar: React.FC<ComponentBarProps> = ({ label, value, weight }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs text-ceramic-text-secondary">{label}</span>
      <span className="text-xs font-medium text-ceramic-text-primary">
        {value.toFixed(0)} <span className="text-ceramic-text-secondary">({weight})</span>
      </span>
    </div>
    <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, value)}%`,
          backgroundColor: value >= 60 ? 'var(--color-ceramic-success, #6B7B5C)' :
            value >= 40 ? 'var(--color-ceramic-info, #5B8BA0)' :
            'var(--color-ceramic-warning, #D97706)',
        }}
      />
    </div>
  </div>
);

// ============================================================================
// RSS EXPLANATION
// ============================================================================

const RSS_EXPLANATION: ScoreExplanation = {
  title: 'Researcher Strength Score (RSS)',
  summary: 'Score composto que avalia a força acadêmica do pesquisador baseado em métricas bibliométricas reconhecidas internacionalmente.',
  methodology: 'Hirsch, J.E. (2005). An index to quantify an individual\'s scientific research output. PNAS, 102(46), 16569-16572.',
  brazilianValidation: 'Benchmarks calibrados para o contexto acadêmico brasileiro (mediana h-index ~10, top ~50).',
  formulaDescription: 'RSS = 30% h-index + 20% citações + 15% m-quotient + 20% fator de impacto + 15% centralidade colaborativa. Cada componente normalizado para 0-100.',
  scaleDescription: '0-100, onde 80+ = Líder, 60-79 = Senior, 40-59 = Estabelecido, <40 = Emergente.',
  isContested: false,
  improvementTips: [
    'Publique em periódicos com maior fator de impacto',
    'Colabore com pesquisadores de outras instituições',
    'Atualize seu perfil Lattes e ORCID regularmente',
    'Participe de projetos interdisciplinares para aumentar centralidade',
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ResearcherProfileCardProps {
  /** Computed RSS result from computeResearcherStrength() */
  strength: ResearcherStrengthResult;
  /** Additional CSS classes */
  className?: string;
}

export const ResearcherProfileCard: React.FC<ResearcherProfileCardProps> = ({
  strength,
  className = '',
}) => {
  const [showExplainer, setShowExplainer] = useState(false);
  const tierConfig = TIER_CONFIG[strength.tier];

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss ${className}`}
      data-testid="researcher-profile-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-ceramic-text-primary" />
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Perfil Cienciométrico
          </h3>
        </div>
        <button
          onClick={() => setShowExplainer(true)}
          className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
          title="Como isso é calculado?"
          aria-label="Como o RSS e calculado"
        >
          <Info size={16} className="text-ceramic-text-secondary" />
        </button>
      </div>

      {/* RSS Score + Tier */}
      <div className="flex items-end gap-3 mb-4">
        <span
          className="text-3xl font-bold"
          style={{ color: tierConfig.color }}
        >
          {strength.rss.toFixed(0)}
        </span>
        <div className="pb-1 flex items-center gap-2">
          <span className="text-sm text-ceramic-text-secondary">/100</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: tierConfig.bgColor, color: tierConfig.color }}
          >
            {tierConfig.label}
          </span>
        </div>
      </div>

      {/* Component bars */}
      <div className="space-y-3">
        <ComponentBar
          label="h-index"
          value={strength.components.hIndexScore}
          weight="30%"
        />
        <ComponentBar
          label="Citações"
          value={strength.components.citationScore}
          weight="20%"
        />
        <ComponentBar
          label="m-quotient"
          value={strength.components.mQuotientScore}
          weight="15%"
        />
        <ComponentBar
          label="Fator de Impacto"
          value={strength.components.impactFactorScore}
          weight="20%"
        />
        <ComponentBar
          label="Centralidade"
          value={strength.components.centralityScore}
          weight="15%"
        />
      </div>

      {/* Explainer */}
      {showExplainer && (
        <ScoreExplainer
          explanation={RSS_EXPLANATION}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </div>
  );
};
