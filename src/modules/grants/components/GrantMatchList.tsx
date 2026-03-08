/**
 * GrantMatchList — List of grant opportunities sorted by match probability
 * Sprint 6 — Grants Scientometric Matching (Issue #575)
 *
 * Shows opportunity matches with probability %, factor breakdown mini bars.
 * Follows Ceramic Design System.
 */

import React from 'react';
import { Target, TrendingUp, Clock, Users, DollarSign, BookOpen } from 'lucide-react';
import { CircularScore } from '@/components/features/visualizations';

// ============================================================================
// TYPES
// ============================================================================

export interface GrantMatchItem {
  /** Opportunity ID */
  opportunityId: string;
  /** Opportunity name (display) */
  opportunityName: string;
  /** Success probability 0-1 */
  probability: number;
  /** Semantic similarity 0-1 */
  similarity: number;
  /** Profile fit 0-1 */
  fit: number;
  /** Factor breakdown */
  factors?: {
    topicAlignment: number;
    budgetFit: number;
    trackRecord: number;
    deadlineRisk: number;
    teamStrength: number;
  };
  /** When this match was computed */
  computedAt: string;
}

// ============================================================================
// MINI BAR
// ============================================================================

interface MiniBarProps {
  label: string;
  value: number; // 0-1
  icon: React.ReactNode;
}

const MiniBar: React.FC<MiniBarProps> = ({ label, value, icon }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-ceramic-text-secondary flex-shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-ceramic-text-secondary truncate">{label}</span>
        <span className="text-[10px] font-medium text-ceramic-text-primary">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-1 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, value * 100)}%`,
            backgroundColor: value >= 0.7 ? 'var(--color-ceramic-success, #6B7B5C)' :
              value >= 0.4 ? 'var(--color-ceramic-info, #5B8BA0)' :
              'var(--color-ceramic-warning, #D97706)',
          }}
        />
      </div>
    </div>
  </div>
);

// ============================================================================
// PROBABILITY BADGE
// ============================================================================

function getProbabilityColor(p: number): { text: string; bg: string } {
  if (p >= 0.7) return {
    text: 'var(--color-ceramic-success, #6B7B5C)',
    bg: 'rgba(107, 123, 92, 0.12)',
  };
  if (p >= 0.4) return {
    text: 'var(--color-ceramic-info, #5B8BA0)',
    bg: 'rgba(91, 139, 160, 0.12)',
  };
  return {
    text: 'var(--color-ceramic-warning, #D97706)',
    bg: 'rgba(217, 119, 6, 0.12)',
  };
}

// ============================================================================
// MATCH CARD
// ============================================================================

interface MatchCardProps {
  match: GrantMatchItem;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const probColor = getProbabilityColor(match.probability);

  return (
    <div className="bg-ceramic-base rounded-lg p-4 border border-ceramic-border hover:shadow-sm transition-shadow">
      {/* Header: name + probability */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium text-ceramic-text-primary line-clamp-2 flex-1">
          {match.opportunityName}
        </h4>
        <CircularScore
          score={Math.round(match.probability * 100)}
          size={64}
          label="Match"
          progressColor={match.probability >= 0.7 ? '#10b981' : match.probability >= 0.4 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Factor breakdown mini bars */}
      {match.factors && (
        <div className="space-y-1.5">
          <MiniBar
            label="Alinhamento temático"
            value={match.factors.topicAlignment}
            icon={<BookOpen size={10} />}
          />
          <MiniBar
            label="Orçamento"
            value={match.factors.budgetFit}
            icon={<DollarSign size={10} />}
          />
          <MiniBar
            label="Histórico"
            value={match.factors.trackRecord}
            icon={<TrendingUp size={10} />}
          />
          <MiniBar
            label="Prazo"
            value={match.factors.deadlineRisk}
            icon={<Clock size={10} />}
          />
          <MiniBar
            label="Equipe"
            value={match.factors.teamStrength}
            icon={<Users size={10} />}
          />
        </div>
      )}

      {/* Computed at */}
      <div className="mt-2 text-[10px] text-ceramic-text-secondary text-right">
        Calculado em{' '}
        {new Date(match.computedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GrantMatchListProps {
  /** Matches to display, sorted by probability descending */
  matches: GrantMatchItem[];
  /** Additional CSS classes */
  className?: string;
}

export const GrantMatchList: React.FC<GrantMatchListProps> = ({ matches, className = '' }) => {
  if (matches.length === 0) {
    return (
      <div className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-ceramic-text-primary" />
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Matching de Oportunidades
          </h3>
        </div>
        <p className="text-sm text-ceramic-text-secondary text-center py-6">
          Nenhuma oportunidade avaliada ainda. Configure seu perfil e avalie editais para ver o matching.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss ${className}`}
      data-testid="grant-match-list"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-ceramic-text-primary" />
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Matching de Oportunidades
          </h3>
        </div>
        <span className="text-xs text-ceramic-text-secondary">
          {matches.length} {matches.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {matches.map(match => (
          <MatchCard key={match.opportunityId} match={match} />
        ))}
      </div>
    </div>
  );
};
