/**
 * AthleteFeedbackView — redesigned feedback tab with linear timeline
 *
 * Replaces the old "Hoje"/"Semanal" toggle with a week-grouped timeline.
 * Each week shows weekly feedback status + per-exercise feedback status.
 * Uses the new `athlete_feedback_entries` table via `useAthleteFeedback`.
 */

import { MessageSquare, Loader2 } from 'lucide-react';
import type { MyAthleteProfile } from '../../types';
import { useAthleteFeedback } from '../../hooks/useAthleteFeedback';
import { FeedbackTimeline } from './FeedbackTimeline';

export interface AthleteFeedbackViewProps {
  profile: MyAthleteProfile;
  onRefetch: () => Promise<void>;
  highlightSlotId?: string | null;
}

export function AthleteFeedbackView({ profile, onRefetch }: AthleteFeedbackViewProps) {
  const {
    weekSummaries,
    currentWeek,
    submitExerciseFeedback,
    isSubmitting,
    isLoading,
    error,
  } = useAthleteFeedback(profile);

  const handleSubmitExercise = async (input: Parameters<typeof submitExerciseFeedback>[0]) => {
    await submitExerciseFeedback(input);
    await onRefetch();
  };

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
          weekSummaries={weekSummaries}
          currentWeek={currentWeek}
          onSubmitExercise={handleSubmitExercise}
          isSubmitting={isSubmitting}
          modality={profile.modality}
        />
      )}
    </div>
  );
}
