/**
 * AthleteFeedbackView -- redesigned feedback tab with linear timeline
 *
 * Shows a week-grouped timeline with:
 *   - Weekly feedback (one card per week)
 *   - Daily feedback (one entry per workout day)
 *
 * Per-exercise questionnaire removed (#431).
 * Radar chart added to feedback responses (#432).
 */

import { MessageSquare, BarChart3, Activity } from 'lucide-react';
import type { MyAthleteProfile } from '../../types';
import { useAthleteFeedback } from '../../hooks/useAthleteFeedback';
import { useAthleteFatigue } from '../../hooks/useAthleteFatigue';
import { CeramicLoadingState } from '@/components/ui/CeramicLoadingState';
import { FeedbackTimeline } from './FeedbackTimeline';
import { FeedbackRadarChart } from './FeedbackRadarChart';
import { StressFatigueGauges } from './StressFatigueGauges';

export interface AthleteFeedbackViewProps {
  profile: MyAthleteProfile;
  onRefetch: () => Promise<void>;
  highlightSlotId?: string | null;
  /** When set, only the selected week is shown in the timeline */
  selectedWeek?: number;
}

export function AthleteFeedbackView({ profile, onRefetch: _onRefetch, selectedWeek }: AthleteFeedbackViewProps) {
  const {
    weekSummaries,
    currentWeek,
    isSubmitting,
    isLoading,
    error,
    aggregatedQuestionnaire,
  } = useAthleteFeedback(profile);

  const {
    assessment: fatigueAssessment,
    isLoading: isFatigueLoading,
    error: fatigueError,
  } = useAthleteFatigue({ athleteId: profile.athlete_id });

  // Synchronized loading: show skeleton if ANY hook is still loading
  const anyLoading = isLoading || isFatigueLoading;

  // Filter to selected week when provided
  const filteredSummaries = selectedWeek != null
    ? weekSummaries.filter((ws) => ws.weekNumber === selectedWeek)
    : weekSummaries;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-ceramic-text-secondary" />
        <h3 className="text-sm font-bold text-ceramic-text-primary">Meu Feedback</h3>
      </div>

      {/* Unified loading state — prevents partial data display */}
      {anyLoading && (
        <CeramicLoadingState module="flux" variant="card" lines={4} />
      )}

      {/* Errors — shown per-source after loading completes */}
      {!anyLoading && error && (
        <div className="px-4 py-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/20">
          <p className="text-xs text-ceramic-error">{error}</p>
        </div>
      )}
      {!anyLoading && fatigueError && (
        <div className="px-4 py-3 rounded-xl bg-ceramic-warning/10 border border-ceramic-warning/20">
          <p className="text-xs text-ceramic-warning">Avaliacao de fadiga indisponivel</p>
        </div>
      )}

      {/* Side-by-side: Visao Geral (left) + Visao Semanal (right) — only after loading */}
      {!anyLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left column: Visao Geral (radar chart + gauges + fatigue) */}
          <div className="space-y-4">
            {/* Aggregated Radar Chart + Stress/Fatigue Gauges (#607) */}
            {aggregatedQuestionnaire ? (
              <div className="bg-ceramic-base rounded-xl p-4 shadow-sm border border-ceramic-border/30 space-y-4">
                <FeedbackRadarChart
                  questionnaire={aggregatedQuestionnaire}
                  size={260}
                  title="Visao Geral"
                  subtitle="Media de todos os feedbacks respondidos"
                />
                <StressFatigueGauges
                  stress={aggregatedQuestionnaire.stress}
                  fatigue={aggregatedQuestionnaire.fatigue}
                />
              </div>
            ) : weekSummaries.length > 0 ? (
              <div className="bg-ceramic-cool/50 rounded-xl p-4 text-center">
                <BarChart3 className="w-6 h-6 text-ceramic-text-secondary mx-auto mb-2" />
                <p className="text-xs text-ceramic-text-secondary">
                  Responda os questionarios para ver seu radar de performance
                </p>
                <p className="text-[10px] text-ceramic-text-secondary/60 mt-1">
                  Volume · Intensidade · Alimentacao · Sono · Stress · Cansaco
                </p>
              </div>
            ) : null}

            {/* AI Fatigue Assessment — only shown when data available (errors handled above) */}
            {fatigueAssessment && (
              <div className="bg-ceramic-base rounded-xl p-4 shadow-sm border border-ceramic-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-ceramic-text-primary">Avaliacao de Fadiga (AI)</span>
                  <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    fatigueAssessment.fatigueRisk === 'low' ? 'bg-ceramic-success/15 text-ceramic-success' :
                    fatigueAssessment.fatigueRisk === 'moderate' ? 'bg-ceramic-warning/15 text-ceramic-warning' :
                    fatigueAssessment.fatigueRisk === 'high' ? 'bg-ceramic-warning/25 text-ceramic-warning' :
                    'bg-ceramic-error/15 text-ceramic-error'
                  }`}>
                    {fatigueAssessment.fatigueRisk === 'low' ? 'Risco Baixo' :
                     fatigueAssessment.fatigueRisk === 'moderate' ? 'Risco Moderado' :
                     fatigueAssessment.fatigueRisk === 'high' ? 'Risco Alto' :
                     'Overtraining'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary">Prontidao</p>
                    <p className="text-sm font-bold text-ceramic-text-primary">{fatigueAssessment.readinessScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary">CTL</p>
                    <p className="text-sm font-bold text-ceramic-text-primary">{fatigueAssessment.ctl.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary">ATL</p>
                    <p className="text-sm font-bold text-ceramic-text-primary">{fatigueAssessment.atl.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary">TSB</p>
                    <p className="text-sm font-bold text-ceramic-text-primary">{fatigueAssessment.tsb.toFixed(0)}</p>
                  </div>
                </div>
                {fatigueAssessment.recommendation && (
                  <p className="text-xs text-ceramic-text-secondary italic">
                    {fatigueAssessment.recommendation}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ceramic-text-secondary">Intensidade sugerida:</span>
                  <span className="text-[10px] font-medium text-ceramic-text-primary capitalize">
                    {fatigueAssessment.suggestedIntensity}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right column: Visao Semanal (weekly feedback timeline) */}
          <div>
            <FeedbackTimeline
              weekSummaries={filteredSummaries}
              currentWeek={currentWeek}
              isSubmitting={isSubmitting}
              modality={profile.modality}
            />
          </div>
        </div>
      )}
    </div>
  );
}
