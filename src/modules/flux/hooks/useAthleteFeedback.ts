/**
 * useAthleteFeedback — hook for athlete feedback CRUD
 *
 * Reads workout_slots data from the athlete profile and derives
 * feedback entries (weekly and daily) without a new table.
 * Uses existing fields: athlete_feedback, completion_data, rpe, completed.
 */

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { MyAthleteProfile } from '../types';

const log = createNamespacedLogger('useAthleteFeedback');

// ─── Types ────────────────────────────────────────────

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
}

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

export interface SubmitWeeklyFeedbackInput {
  weekNumber: number;
  overallRpe: number;
  notes: string;
  slotFeedbacks: Array<{
    slotId: string;
    completed: boolean;
    rpe?: number;
    miniNote?: string;
  }>;
}

// ─── Hook ─────────────────────────────────────────────

export function useAthleteFeedback(profile: MyAthleteProfile | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const micro = profile?.active_microcycle;
  const slots = micro?.slots || [];

  // Derive feedback entries from existing slot data
  const feedbackEntries = useMemo<FeedbackEntry[]>(() => {
    if (!micro || !slots.length) return [];

    const entries: FeedbackEntry[] = [];
    const slotsByWeek = new Map<number, typeof slots>();
    for (const slot of slots) {
      const existing = slotsByWeek.get(slot.week_number) || [];
      existing.push(slot);
      slotsByWeek.set(slot.week_number, existing);
    }

    for (const [weekNumber, weekSlots] of slotsByWeek.entries()) {
      const slotsWithFeedback = weekSlots.filter(
        (s) => s.athlete_feedback || s.is_completed
      );
      if (!slotsWithFeedback.length) continue;

      const summaries: FeedbackSlotSummary[] = weekSlots.map((s) => ({
        slotId: s.id,
        templateName: s.template.name,
        dayOfWeek: s.day_of_week,
        timeOfDay: s.time_of_day,
        isCompleted: s.is_completed,
        completedAt: s.completed_at,
        rpe: (s as Record<string, unknown>).rpe as number | null ?? null,
        notes: s.athlete_feedback || null,
        duration: s.custom_duration || s.template.duration,
      }));

      const rpeValues = summaries
        .map((s) => s.rpe)
        .filter((r): r is number => r != null);
      const avgRpe = rpeValues.length
        ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
        : null;

      const allNotes = summaries
        .map((s) => s.notes)
        .filter(Boolean)
        .join(' | ');

      let weekDate = '';
      if (micro.start_date) {
        const start = new Date(micro.start_date);
        start.setDate(start.getDate() + (weekNumber - 1) * 7);
        weekDate = start.toISOString();
      }

      entries.push({
        id: `weekly-${micro.id}-${weekNumber}`,
        type: 'weekly',
        weekNumber,
        date: weekDate,
        overallRpe: avgRpe,
        notes: allNotes,
        slotsCount: weekSlots.length,
        completedCount: weekSlots.filter((s) => s.is_completed).length,
        slots: summaries,
      });
    }

    entries.sort((a, b) => b.weekNumber - a.weekNumber);
    return entries;
  }, [micro, slots]);

  const getSlotsForWeek = useCallback(
    (weekNumber: number): FeedbackSlotSummary[] => {
      return slots
        .filter((s) => s.week_number === weekNumber)
        .map((s) => ({
          slotId: s.id,
          templateName: s.template.name,
          dayOfWeek: s.day_of_week,
          timeOfDay: s.time_of_day,
          isCompleted: s.is_completed,
          completedAt: s.completed_at,
          rpe: (s as Record<string, unknown>).rpe as number | null ?? null,
          notes: s.athlete_feedback || null,
          duration: s.custom_duration || s.template.duration,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    },
    [slots]
  );

  const todaySlots = useMemo<FeedbackSlotSummary[]>(() => {
    if (!micro) return [];
    const today = new Date();
    const jsDay = today.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;

    return slots
      .filter((s) => s.week_number === (micro.current_week || 1) && s.day_of_week === isoDay)
      .map((s) => ({
        slotId: s.id,
        templateName: s.template.name,
        dayOfWeek: s.day_of_week,
        timeOfDay: s.time_of_day,
        isCompleted: s.is_completed,
        completedAt: s.completed_at,
        rpe: (s as Record<string, unknown>).rpe as number | null ?? null,
        notes: s.athlete_feedback || null,
        duration: s.custom_duration || s.template.duration,
      }));
  }, [micro, slots]);

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

  const submitWeeklyFeedback = useCallback(
    async (input: SubmitWeeklyFeedbackInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const updates = input.slotFeedbacks.map((sf) =>
          supabase
            .from('workout_slots')
            .update({
              completed: sf.completed,
              completed_at: sf.completed ? new Date().toISOString() : null,
              rpe: sf.rpe ?? null,
              athlete_feedback: sf.miniNote || input.notes || null,
              completion_data: {
                rpe_actual: sf.rpe ?? input.overallRpe,
                notes: sf.miniNote || input.notes || null,
                weekly_rpe: input.overallRpe,
                weekly_notes: input.notes,
              },
            })
            .eq('id', sf.slotId)
        );

        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar feedback semanal';
        setError(msg);
        log.error('submitWeeklyFeedback error:', err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    feedbackEntries,
    todaySlots,
    currentWeek: micro?.current_week || 1,
    totalWeeks: 4,
    getSlotsForWeek,
    submitDailyFeedback,
    submitWeeklyFeedback,
    isSubmitting,
    error,
  };
}
