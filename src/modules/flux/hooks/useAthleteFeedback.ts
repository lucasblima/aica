/**
 * useAthleteFeedback — hook for athlete feedback CRUD
 *
 * Queries the `athlete_feedback_entries` table for structured feedback data.
 * Provides submit methods for exercise (questionnaire) and weekly feedback.
 * Maintains backward compatibility by also writing to workout_slots.completion_data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { MyAthleteProfile } from '../types';

const log = createNamespacedLogger('useAthleteFeedback');

// ─── Types ────────────────────────────────────────────

export interface QuestionnaireData {
  volume_adequate?: number;
  volume_completed?: number;
  intensity_adequate?: number;
  intensity_completed?: number;
  fatigue?: number;
  stress?: number;
  nutrition?: number;
  sleep?: number;
}

export interface FeedbackEntryRow {
  id: string;
  user_id: string;
  athlete_id: string;
  microcycle_id: string;
  feedback_type: 'exercise' | 'weekly';
  week_number: number;
  slot_id: string | null;
  questionnaire: QuestionnaireData | null;
  notes: string | null;
  voice_transcript: string | null;
  voice_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

/** Per-slot summary used for the feedback timeline */
export interface FeedbackSlotSummary {
  slotId: string;
  templateName: string;
  dayOfWeek: number;
  timeOfDay: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  rpe: number | null;
  notes: string | null;
  duration: number;
  feedbackEntry: FeedbackEntryRow | null;
  questionnaireAnswered: number;
}

/** Week-level summary for the timeline */
export interface WeekFeedbackSummary {
  weekNumber: number;
  weeklyFeedback: FeedbackEntryRow | null;
  slots: FeedbackSlotSummary[];
  exerciseFeedbacks: FeedbackEntryRow[];
}

export interface SubmitExerciseFeedbackInput {
  slotId: string;
  questionnaire: QuestionnaireData;
  notes: string;
}

export interface SubmitWeeklyFeedbackInput {
  notes: string;
  voiceTranscript?: string;
  voiceDurationSeconds?: number;
  weekNumber: number;
}

// Keep legacy types for backward compat
export interface FeedbackEntry {
  id: string;
  type: 'weekly' | 'daily';
  weekNumber: number;
  date: string;
  overallRpe: number | null;
  notes: string;
  slotsCount: number;
  completedCount: number;
  slots: FeedbackSlotSummary[];
}

export interface SubmitDailyFeedbackInput {
  slotId: string;
  rpe: number;
  notes: string;
  duration?: number;
}

// ─── Helpers ─────────────────────────────────────────

const QUESTIONNAIRE_KEYS: (keyof QuestionnaireData)[] = [
  'volume_adequate', 'volume_completed', 'intensity_adequate', 'intensity_completed',
  'fatigue', 'stress', 'nutrition', 'sleep',
];

function countAnswered(q: QuestionnaireData | null | undefined): number {
  if (!q) return 0;
  return QUESTIONNAIRE_KEYS.filter((k) => q[k] !== undefined && q[k] !== null).length;
}

// ─── Hook ─────────────────────────────────────────────

export function useAthleteFeedback(profile: MyAthleteProfile | null) {
  const [feedbackRows, setFeedbackRows] = useState<FeedbackEntryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const micro = profile?.active_microcycle;
  const slots = micro?.slots || [];

  // Fetch feedback entries from the new table
  useEffect(() => {
    if (!micro?.id) {
      setFeedbackRows([]);
      return;
    }

    let cancelled = false;
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const { data, error: fetchErr } = await supabase
          .from('athlete_feedback_entries')
          .select('*')
          .eq('microcycle_id', micro.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (fetchErr) {
          log.error('Failed to fetch feedback entries:', fetchErr);
          // Fallback: don't block UI, just show empty
          setFeedbackRows([]);
        } else {
          setFeedbackRows((data as FeedbackEntryRow[]) || []);
        }
      } catch (err) {
        if (!cancelled) {
          log.error('Unexpected error fetching feedback:', err);
          setFeedbackRows([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchFeedback();
    return () => { cancelled = true; };
  }, [micro?.id]);

  // Build week summaries for the timeline
  const weekSummaries = useMemo<WeekFeedbackSummary[]>(() => {
    if (!micro || !slots.length) return [];

    const weekNumbers = [...new Set(slots.map((s) => s.week_number))].sort((a, b) => b - a);

    return weekNumbers.map((weekNum) => {
      const weekSlots = slots.filter((s) => s.week_number === weekNum);
      const weekExerciseFeedbacks = feedbackRows.filter(
        (r) => r.feedback_type === 'exercise' && r.week_number === weekNum
      );
      const weeklyFeedback = feedbackRows.find(
        (r) => r.feedback_type === 'weekly' && r.week_number === weekNum
      ) ?? null;

      const slotSummaries: FeedbackSlotSummary[] = weekSlots
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map((s) => {
          const entry = weekExerciseFeedbacks.find((f) => f.slot_id === s.id) ?? null;
          return {
            slotId: s.id,
            templateName: s.template.name,
            dayOfWeek: s.day_of_week,
            timeOfDay: s.time_of_day,
            isCompleted: s.is_completed,
            completedAt: s.completed_at,
            rpe: (s as Record<string, unknown>).rpe as number | null ?? null,
            notes: s.athlete_feedback || null,
            duration: s.custom_duration || s.template.duration,
            feedbackEntry: entry,
            questionnaireAnswered: countAnswered(entry?.questionnaire),
          };
        });

      return {
        weekNumber: weekNum,
        weeklyFeedback,
        slots: slotSummaries,
        exerciseFeedbacks: weekExerciseFeedbacks,
      };
    });
  }, [micro, slots, feedbackRows]);

  // Legacy derived feedbackEntries for backward compat
  const feedbackEntries = useMemo<FeedbackEntry[]>(() => {
    return weekSummaries.map((ws) => ({
      id: `weekly-${micro?.id}-${ws.weekNumber}`,
      type: 'weekly' as const,
      weekNumber: ws.weekNumber,
      date: micro?.start_date
        ? new Date(new Date(micro.start_date).getTime() + (ws.weekNumber - 1) * 7 * 86400000).toISOString()
        : '',
      overallRpe: null,
      notes: ws.weeklyFeedback?.notes || '',
      slotsCount: ws.slots.length,
      completedCount: ws.slots.filter((s) => s.isCompleted).length,
      slots: ws.slots,
    }));
  }, [weekSummaries, micro]);

  const getSlotsForWeek = useCallback(
    (weekNumber: number): FeedbackSlotSummary[] => {
      const ws = weekSummaries.find((w) => w.weekNumber === weekNumber);
      return ws?.slots ?? [];
    },
    [weekSummaries]
  );

  const todaySlots = useMemo<FeedbackSlotSummary[]>(() => {
    if (!micro) return [];
    const today = new Date();
    const jsDay = today.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    const currentWeek = micro.current_week || 1;

    return slots
      .filter((s) => s.week_number === currentWeek && s.day_of_week === isoDay)
      .map((s) => {
        const entry = feedbackRows.find((f) => f.slot_id === s.id) ?? null;
        return {
          slotId: s.id,
          templateName: s.template.name,
          dayOfWeek: s.day_of_week,
          timeOfDay: s.time_of_day,
          isCompleted: s.is_completed,
          completedAt: s.completed_at,
          rpe: (s as Record<string, unknown>).rpe as number | null ?? null,
          notes: s.athlete_feedback || null,
          duration: s.custom_duration || s.template.duration,
          feedbackEntry: entry,
          questionnaireAnswered: countAnswered(entry?.questionnaire),
        };
      });
  }, [micro, slots, feedbackRows]);

  // Submit structured exercise feedback
  const submitExerciseFeedback = useCallback(
    async (input: SubmitExerciseFeedbackInput) => {
      if (!micro || !profile) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) throw new Error('Não autenticado');

        // 1. Insert into athlete_feedback_entries
        const { error: insertErr } = await supabase
          .from('athlete_feedback_entries')
          .insert({
            user_id: userId,
            athlete_id: profile.athlete_id,
            microcycle_id: micro.id,
            feedback_type: 'exercise',
            week_number: slots.find((s) => s.id === input.slotId)?.week_number || 1,
            slot_id: input.slotId,
            questionnaire: input.questionnaire,
            notes: input.notes || null,
          });

        if (insertErr) throw insertErr;

        // 2. Backward compat: update workout_slots.completion_data
        const { error: updateErr } = await supabase
          .from('workout_slots')
          .update({
            completion_data: {
              questionnaire: input.questionnaire,
              notes: input.notes || null,
              answered_count: countAnswered(input.questionnaire),
            },
          })
          .eq('id', input.slotId);

        if (updateErr) {
          log.error('Failed to update workout_slots.completion_data:', updateErr);
          // Non-critical — don't throw
        }

        // Refetch feedback
        const { data: refreshed } = await supabase
          .from('athlete_feedback_entries')
          .select('*')
          .eq('microcycle_id', micro.id)
          .order('created_at', { ascending: false });

        setFeedbackRows((refreshed as FeedbackEntryRow[]) || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar feedback';
        setError(msg);
        log.error('submitExerciseFeedback error:', err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [micro, profile, slots]
  );

  // Submit weekly feedback (notes + optional voice)
  const submitWeeklyFeedback = useCallback(
    async (input: SubmitWeeklyFeedbackInput) => {
      if (!micro || !profile) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) throw new Error('Não autenticado');

        const { error: insertErr } = await supabase
          .from('athlete_feedback_entries')
          .insert({
            user_id: userId,
            athlete_id: profile.athlete_id,
            microcycle_id: micro.id,
            feedback_type: 'weekly',
            week_number: input.weekNumber,
            notes: input.notes || null,
            voice_transcript: input.voiceTranscript || null,
            voice_duration_seconds: input.voiceDurationSeconds || null,
          });

        if (insertErr) throw insertErr;

        // Refetch
        const { data: refreshed } = await supabase
          .from('athlete_feedback_entries')
          .select('*')
          .eq('microcycle_id', micro.id)
          .order('created_at', { ascending: false });

        setFeedbackRows((refreshed as FeedbackEntryRow[]) || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar feedback semanal';
        setError(msg);
        log.error('submitWeeklyFeedback error:', err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [micro, profile]
  );

  // Legacy daily feedback (kept for backward compat)
  const submitDailyFeedback = useCallback(
    async (input: SubmitDailyFeedbackInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('workout_slots')
          .update({
            athlete_feedback: input.notes || null,
            rpe: input.rpe,
            completed: true,
            completed_at: new Date().toISOString(),
            completion_data: {
              rpe_actual: input.rpe,
              duration_actual: input.duration || null,
              notes: input.notes || null,
            },
          })
          .eq('id', input.slotId);

        if (updateError) throw updateError;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar feedback';
        setError(msg);
        log.error('submitDailyFeedback error:', err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // Aggregated questionnaire averages across all completed feedbacks
  const aggregatedQuestionnaire = useMemo<QuestionnaireData | null>(() => {
    const withQ = feedbackRows.filter((r) => {
      if (!r.questionnaire) return false;
      return countAnswered(r.questionnaire) >= 3;
    });
    if (withQ.length === 0) return null;

    const sums: Record<string, { total: number; count: number }> = {};
    for (const row of withQ) {
      for (const key of QUESTIONNAIRE_KEYS) {
        const val = row.questionnaire?.[key];
        if (val != null) {
          if (!sums[key]) sums[key] = { total: 0, count: 0 };
          sums[key].total += val;
          sums[key].count += 1;
        }
      }
    }

    const result: QuestionnaireData = {};
    let populated = 0;
    for (const key of QUESTIONNAIRE_KEYS) {
      if (sums[key] && sums[key].count > 0) {
        (result as Record<string, number>)[key] = Math.round((sums[key].total / sums[key].count) * 10) / 10;
        populated++;
      }
    }

    return populated >= 3 ? result : null;
  }, [feedbackRows]);

  return {
    // New API
    weekSummaries,
    feedbackRows,
    submitExerciseFeedback,
    aggregatedQuestionnaire,
    isLoading,

    // Legacy API (backward compat)
    feedbackEntries,
    todaySlots,
    currentWeek: micro?.current_week || 1,
    totalWeeks: 3,
    getSlotsForWeek,
    submitDailyFeedback,
    submitWeeklyFeedback,
    isSubmitting,
    error,
  };
}
