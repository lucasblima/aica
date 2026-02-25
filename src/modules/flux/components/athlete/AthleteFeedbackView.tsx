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

import { MessageSquare, Loader2 } from 'lucide-react';
import type { MyAthleteProfile } from '../../types';
import { useAthleteFeedback } from '../../hooks/useAthleteFeedback';
import { FeedbackTimeline } from './FeedbackTimeline';

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
  } = useAthleteFeedback(profile);

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
