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

import { MessageSquare, Loader2, BarChart3, Activity } from 'lucide-react';
import type { MyAthleteProfile } from '../../types';
import { useAthleteFeedback } from '../../hooks/useAthleteFeedback';
import { useAthleteFatigue } from '../../hooks/useAthleteFatigue';
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

      {/* Aggregated Radar Chart + Stress/Fatigue Gauges (#607) */}
      {aggregatedQuestionnaire ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-border/30 space-y-4">
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
      ) : !isLoading && weekSummaries.length > 0 ? (
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

      {/* AI Fatigue Assessment */}
      {isFatigueLoading ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ceramic-cool/50">
          <Loader2 className="w-4 h-4 animate-spin text-ceramic-text-secondary" />
          <span className="text-xs text-ceramic-text-secondary">Avaliando fadiga...</span>
        </div>
      ) : fatigueAssessment ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-ceramic-text-primary">Avaliacao de Fadiga (AI)</span>
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
              fatigueAssessment.fatigueRisk === 'low' ? 'bg-emerald-100 text-emerald-700' :
              fatigueAssessment.fatigueRisk === 'moderate' ? 'bg-amber-100 text-amber-700' :
              fatigueAssessment.fatigueRisk === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
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
      ) : fatigueError ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-600">Avaliacao de fadiga indisponivel</p>
        </div>
      ) : null}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-ceramic-text-secondary" />
        </div>
      ) : (
        <FeedbackTimeline
          weekSummaries={filteredSummaries}
          currentWeek={currentWeek}
          isSubmitting={isSubmitting}
          modality={profile.modality}
        />
      )}
    </div>
  );
}
