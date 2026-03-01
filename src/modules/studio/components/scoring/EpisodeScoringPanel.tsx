/**
 * EpisodeScoringPanel Component
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * Combines GuestScoreCard + NarrativeTensionChart into a unified
 * episode readiness panel with duration optimality.
 * Ceramic Design System compliant.
 */

import React from 'react';
import { BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { GuestScoreCard } from './GuestScoreCard';
import { NarrativeTensionChart } from './NarrativeTensionChart';
import type { GuestScoreResult, NarrativeAnalysis } from '../../services/guestScoring';

interface GuestEntry {
  guestName: string;
  result: GuestScoreResult;
}

interface EpisodeScoringPanelProps {
  /** Guest scores to display */
  guests: GuestEntry[];
  /** Narrative analysis (null if not yet analyzed) */
  narrativeAnalysis: NarrativeAnalysis | null;
  /** Episode duration in minutes */
  durationMinutes: number;
  /** Optional episode title */
  episodeTitle?: string;
  className?: string;
}

function getReadinessScore(
  guests: GuestEntry[],
  narrativeAnalysis: NarrativeAnalysis | null,
  durationOptimality: number
): { score: number; label: string; color: string } {
  const guestAvg = guests.length > 0
    ? guests.reduce((s, g) => s + g.result.composite, 0) / guests.length
    : 0;
  const narrativeScore = narrativeAnalysis?.tensionScore ?? 0;

  // Weighted: 40% guests + 35% narrative + 25% duration
  const score = 0.40 * guestAvg + 0.35 * narrativeScore + 0.25 * durationOptimality;
  const pct = Math.round(score * 100);

  if (pct >= 80) return { score: pct, label: 'Pronto para gravar', color: 'text-ceramic-success' };
  if (pct >= 60) return { score: pct, label: 'Quase pronto', color: 'text-ceramic-info' };
  if (pct >= 40) return { score: pct, label: 'Precisa de ajustes', color: 'text-ceramic-warning' };
  return { score: pct, label: 'Requer atencao', color: 'text-ceramic-error' };
}

function getDurationLabel(durationMinutes: number): string {
  if (durationMinutes <= 0) return 'Nao definido';
  if (durationMinutes < 15) return 'Curto';
  if (durationMinutes <= 30) return 'Otimo';
  if (durationMinutes <= 45) return 'Medio';
  return 'Longo';
}

export const EpisodeScoringPanel: React.FC<EpisodeScoringPanelProps> = ({
  guests,
  narrativeAnalysis,
  durationMinutes,
  episodeTitle,
  className = '',
}) => {
  const durationOptimality = narrativeAnalysis?.durationOptimality ?? 0;
  const readiness = getReadinessScore(guests, narrativeAnalysis, durationOptimality);
  const durationLabel = getDurationLabel(durationMinutes);
  const durationPct = Math.round(durationOptimality * 100);

  return (
    <div
      className={`bg-ceramic-base rounded-xl p-5 shadow-ceramic-emboss space-y-4 ${className}`}
      data-testid="episode-scoring-panel"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-ceramic-info" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-ceramic-text-primary">
              Score do Episodio
            </h2>
            {episodeTitle && (
              <p className="text-xs text-ceramic-text-secondary">{episodeTitle}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${readiness.color}`}>
            {readiness.score}
          </div>
          <div className={`text-xs font-medium ${readiness.color}`}>
            {readiness.label}
          </div>
        </div>
      </div>

      {/* Readiness Progress */}
      <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            readiness.score >= 80 ? 'bg-ceramic-success' :
            readiness.score >= 60 ? 'bg-ceramic-info' :
            readiness.score >= 40 ? 'bg-ceramic-warning' : 'bg-ceramic-error'
          }`}
          style={{ width: `${readiness.score}%` }}
          role="progressbar"
          aria-valuenow={readiness.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Prontidao do episodio: ${readiness.score}%`}
        />
      </div>

      {/* Duration Optimality */}
      <div className="flex items-center gap-3 p-3 bg-ceramic-cool rounded-lg">
        <Clock className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ceramic-text-secondary">
              Duracao: {durationMinutes > 0 ? `${durationMinutes} min` : 'N/A'} ({durationLabel})
            </span>
            <span className="text-xs text-ceramic-text-secondary">{durationPct}% otimo</span>
          </div>
          <div className="h-1.5 bg-ceramic-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-ceramic-info transition-all"
              style={{ width: `${durationPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Guest Scores */}
      {guests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
            Convidados
          </h3>
          {guests.map((g, i) => (
            <GuestScoreCard
              key={i}
              guestName={g.guestName}
              result={g.result}
            />
          ))}
        </div>
      )}

      {/* Narrative Tension */}
      {narrativeAnalysis && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
            Analise Narrativa
          </h3>
          <NarrativeTensionChart
            analysis={narrativeAnalysis}
            durationMinutes={durationMinutes}
          />
        </div>
      )}

      {/* Empty State */}
      {guests.length === 0 && !narrativeAnalysis && (
        <div className="flex flex-col items-center justify-center py-6 text-ceramic-text-secondary">
          <CheckCircle2 className="w-8 h-8 mb-2 opacity-40" aria-hidden="true" />
          <p className="text-sm">Adicione convidados e momentos-chave para ver o score.</p>
        </div>
      )}
    </div>
  );
};

export default EpisodeScoringPanel;
