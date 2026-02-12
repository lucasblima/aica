/**
 * Workout Slot Service
 *
 * CRUD operations for workout_slots table
 * Handles completion tracking and microcycle progress updates
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { WorkoutSlot } from '../types/flow';

const log = createNamespacedLogger('FlowWorkoutSlotService');

export interface CreateWorkoutSlotInput {
  microcycle_id: string;
  template_id?: string;
  week_number: 1 | 2 | 3;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  notes?: string;
}

export interface UpdateWorkoutSlotInput {
  template_id?: string;
  week_number?: 1 | 2 | 3;
  day_of_week?: number;
  notes?: string;
  is_completed?: boolean;
  completed_at?: string | null;
  athlete_feedback?: string | null;
}

export class WorkoutSlotService {
  /**
   * Get all slots for a microcycle
   */
  static async getSlotsByMicrocycle(
    microcycleId: string
  ): Promise<{ data: WorkoutSlot[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_slots')
        .select('*')
        .eq('microcycle_id', microcycleId)
        .eq('user_id', user.id)
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      log.info('Fetched slots for microcycle', { microcycleId, count: data?.length });
      return { data, error: null };
    } catch (error) {
      log.error('Error fetching slots:', error);
      return { data: null, error };
    }
  }

  /**
   * Get slot by ID
   */
  static async getSlotById(
    slotId: string
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_slots')
        .select('*')
        .eq('id', slotId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      log.error('Error fetching slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new workout slot
   */
  static async createSlot(
    input: CreateWorkoutSlotInput
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('workout_slots')
        .insert({
          ...input,
          user_id: user.id,
          completed: false,
        })
        .select('*')
        .single();

      if (error) throw error;

      log.info('Created workout slot', { slotId: data.id, week: input.week_number });
      return { data, error: null };
    } catch (error) {
      log.error('Error creating slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Update workout slot
   */
  static async updateSlot(
    slotId: string,
    input: UpdateWorkoutSlotInput
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error} = await supabase
        .from('workout_slots')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slotId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      log.info('Updated workout slot', { slotId });
      return { data, error: null };
    } catch (error) {
      log.error('Error updating slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete workout slot
   */
  static async deleteSlot(slotId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('workout_slots')
        .delete()
        .eq('id', slotId)
        .eq('user_id', user.id);

      if (error) throw error;

      log.info('Deleted workout slot', { slotId });
      return { error: null };
    } catch (error) {
      log.error('Error deleting slot:', error);
      return { error };
    }
  }

  /**
   * Toggle slot completion status
   * CRITICAL: Updates slot + recalculates microcycle completion + updates athlete adherence
   */
  static async toggleSlotCompletion(
    slotId: string,
    isCompleted: boolean,
    athleteFeedback?: string
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Update the slot
      const updatePayload: Partial<WorkoutSlot> = {
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        athlete_feedback: athleteFeedback || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedSlot, error: updateError } = await supabase
        .from('workout_slots')
        .update(updatePayload)
        .eq('id', slotId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // 2. Recalculate microcycle completion percentage
      if (updatedSlot) {
        const { data: completionData, error: completionError } = await supabase.rpc(
          'calculate_microcycle_completion',
          { p_microcycle_id: updatedSlot.microcycle_id }
        );

        if (completionError) {
          log.warn('Failed to recalculate microcycle completion:', completionError);
        } else {
          // Update microcycle with new completion percentage
          await supabase
            .from('microcycles')
            .update({ completion_percentage: completionData || 0 })
            .eq('id', updatedSlot.microcycle_id);
        }

        // 3. Update athlete adherence rate (if completion is within last 30 days)
        const completedAt = new Date(updatedSlot.completed_at || '');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (completedAt >= thirtyDaysAgo) {
          // Fetch microcycle to get athlete_id
          const { data: microcycle } = await supabase
            .from('microcycles')
            .select('athlete_id')
            .eq('id', updatedSlot.microcycle_id)
            .single();

          if (microcycle) {
            // Recalculate athlete adherence
            const { data: adherenceData } = await supabase.rpc(
              'calculate_athlete_adherence',
              { p_athlete_id: microcycle.athlete_id }
            );

            if (adherenceData !== null) {
              await supabase
                .from('athlete_profiles')
                .update({ consistency_rate: adherenceData })
                .eq('athlete_id', microcycle.athlete_id);
            }
          }
        }
      }

      log.info('Toggled slot completion', {
        slotId,
        isCompleted,
        hasFeedback: !!athleteFeedback
      });

      return { data: updatedSlot, error: null };
    } catch (error) {
      log.error('Error toggling slot completion:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk update slots (e.g., for drag-and-drop reordering)
   */
  static async bulkUpdateSlots(
    updates: Array<{ id: string; updates: UpdateWorkoutSlotInput }>
  ): Promise<{ success: boolean; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Execute all updates in parallel
      const updatePromises = updates.map(({ id, updates: slotUpdates }) =>
        supabase
          .from('workout_slots')
          .update({
            ...slotUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updatePromises);

      // Check if any updates failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      log.info('Bulk updated slots', { count: updates.length });
      return { success: true, error: null };
    } catch (error) {
      log.error('Error bulk updating slots:', error);
      return { success: false, error };
    }
  }

  /**
   * Get completion stats for microcycle
   */
  static async getCompletionStats(
    microcycleId: string
  ): Promise<{
    total: number;
    completed: number;
    percentage: number;
    weekStats: Array<{ week: number; total: number; completed: number }>;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: slots } = await supabase
        .from('workout_slots')
        .select('week_number, completed')
        .eq('microcycle_id', microcycleId)
        .eq('user_id', user.id);

      if (!slots) {
        return { total: 0, completed: 0, percentage: 0, weekStats: [] };
      }

      const total = slots.length;
      const completed = slots.filter(s => s.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate per-week stats
      const weekStats = [1, 2, 3].map(weekNum => {
        const weekSlots = slots.filter(s => s.week_number === weekNum);
        const weekTotal = weekSlots.length;
        const weekCompleted = weekSlots.filter(s => s.completed).length;

        return {
          week: weekNum,
          total: weekTotal,
          completed: weekCompleted,
        };
      });

      return { total, completed, percentage, weekStats };
    } catch (error) {
      log.error('Error calculating completion stats:', error);
      return { total: 0, completed: 0, percentage: 0, weekStats: [] };
    }
  }
}
