/**
 * Microcycle Service
 *
 * CRUD operations for 4-week training blocks with load calculation and slot management
 */

import { supabase } from '@/services/supabaseClient';
import type {
  Microcycle,
  CreateMicrocycleInput,
  UpdateMicrocycleInput,
  MicrocycleWithSlots,
  WorkoutSlot,
  WeekSummary,
  CreateWorkoutSlotInput,
  UpdateWorkoutSlotInput,
} from '../types/flow';
import { createMicrocycleTask, completeMicrocycleTask } from './fluxAtlasBridge';

export class MicrocycleService {
  /**
   * Get all microcycles for an athlete
   */
  static async getMicrocyclesByAthlete(
    athleteId: string
  ): Promise<{ data: Microcycle[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('start_date', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error fetching microcycles:', error);
      return { data: null, error };
    }
  }

  /**
   * Get single microcycle with all slots
   */
  static async getMicrocycleWithSlots(
    id: string
  ): Promise<{ data: MicrocycleWithSlots | null; error: any }> {
    try {
      const { data: microcycle, error: microcycleError } = await supabase
        .from('microcycles')
        .select('*')
        .eq('id', id)
        .single();

      if (microcycleError || !microcycle) {
        return { data: null, error: microcycleError };
      }

      const { data: slots, error: slotsError } = await supabase
        .from('workout_slots')
        .select('*')
        .eq('microcycle_id', id)
        .order('week_number')
        .order('day_of_week');

      if (slotsError) {
        return { data: null, error: slotsError };
      }

      // Calculate metrics
      const completedSlots = slots?.filter((s) => s.completed).length || 0;
      const totalSlots = slots?.length || 0;
      const completion_percentage =
        totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

      // Calculate total TSS (using database function)
      const total_tss = await this.calculateTotalTSS(slots || []);

      const result: MicrocycleWithSlots = {
        ...microcycle,
        slots: slots || [],
        completion_percentage,
        total_tss,
      };

      return { data: result, error: null };
    } catch (error) {
      console.error('[MicrocycleService] Error fetching microcycle with slots:', error);
      return { data: null, error };
    }
  }

  /**
   * Get active microcycle for athlete
   */
  static async getActiveMicrocycle(
    athleteId: string
  ): Promise<{ data: Microcycle | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .eq('athlete_id', athleteId)
        .in('status', ['active', 'draft'])
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error fetching active microcycle:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new microcycle
   */
  static async createMicrocycle(
    input: CreateMicrocycleInput
  ): Promise<{ data: Microcycle | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Calculate end_date (3 weeks from start_date)
      const startDate = new Date(input.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 20); // 3 weeks - 1 day

      const { data, error } = await supabase
        .from('microcycles')
        .insert({
          ...input,
          user_id: userData.user.id,
          end_date: endDate.toISOString().split('T')[0],
          status: 'draft',
        })
        .select()
        .single();

      // Bridge: create Atlas work_item (non-blocking)
      if (data && !error) {
        supabase
          .from('athletes')
          .select('id, name, modality')
          .eq('id', input.athlete_id)
          .single()
          .then(({ data: athlete }) => {
            if (athlete) {
              createMicrocycleTask(data as Microcycle, athlete as any).catch((e) =>
                console.warn('[MicrocycleService] Bridge error (non-blocking):', e)
              );
            }
          });
      }

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error creating microcycle:', error);
      return { data: null, error };
    }
  }

  /**
   * Update microcycle
   */
  static async updateMicrocycle(
    input: UpdateMicrocycleInput
  ): Promise<{ data: Microcycle | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('microcycles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error updating microcycle:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete microcycle (and all slots via CASCADE)
   */
  static async deleteMicrocycle(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('microcycles').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[MicrocycleService] Error deleting microcycle:', error);
      return { error };
    }
  }

  /**
   * Create workout slot
   */
  static async createSlot(
    input: CreateWorkoutSlotInput
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('workout_slots')
        .insert({
          ...input,
          user_id: userData.user.id,
          completed: false,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error creating slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Update workout slot
   */
  static async updateSlot(
    input: UpdateWorkoutSlotInput
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('workout_slots')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error updating slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete workout slot
   */
  static async deleteSlot(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('workout_slots').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[MicrocycleService] Error deleting slot:', error);
      return { error };
    }
  }

  /**
   * Mark slot as completed
   */
  static async completeSlot(
    id: string,
    completionData?: WorkoutSlot['completion_data']
  ): Promise<{ data: WorkoutSlot | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workout_slots')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completion_data: completionData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error completing slot:', error);
      return { data: null, error };
    }
  }

  /**
   * Get week summary for a specific week in microcycle
   */
  static async getWeekSummary(
    microcycleId: string,
    weekNumber: number
  ): Promise<{ data: WeekSummary | null; error: any }> {
    try {
      const { data: microcycle, error: microcycleError } = await supabase
        .from('microcycles')
        .select('*')
        .eq('id', microcycleId)
        .single();

      if (microcycleError || !microcycle) {
        return { data: null, error: microcycleError };
      }

      const { data: slots, error: slotsError } = await supabase
        .from('workout_slots')
        .select('*')
        .eq('microcycle_id', microcycleId)
        .eq('week_number', weekNumber)
        .order('day_of_week');

      if (slotsError) {
        return { data: null, error: slotsError };
      }

      const focusKey = `week_${weekNumber}_focus` as keyof Microcycle;
      const focus = microcycle[focusKey] as string;

      const targetLoad = microcycle.target_weekly_load?.[weekNumber - 1] || 0;
      const actualLoad = microcycle.actual_weekly_load?.[weekNumber - 1] || 0;

      const completedCount = slots?.filter((s) => s.completed).length || 0;
      const totalCount = slots?.length || 0;
      const completionRate =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const summary: WeekSummary = {
        week_number: weekNumber,
        focus: focus as any,
        target_load: targetLoad,
        actual_load: actualLoad,
        slots: slots || [],
        completion_rate: completionRate,
      };

      return { data: summary, error: null };
    } catch (error) {
      console.error('[MicrocycleService] Error fetching week summary:', error);
      return { data: null, error };
    }
  }

  /**
   * Calculate total TSS for slots
   */
  private static async calculateTotalTSS(slots: WorkoutSlot[]): Promise<number> {
    // Simple TSS calculation (duration * intensity multiplier)
    const intensityMultipliers = {
      low: 0.5,
      medium: 0.75,
      high: 1.0,
    };

    return slots.reduce((total, slot) => {
      const multiplier = intensityMultipliers[slot.intensity] || 0.6;
      const tss = slot.duration * multiplier * 1.5;
      return total + tss;
    }, 0);
  }

  /**
   * Archive completed microcycle
   */
  static async archiveMicrocycle(id: string): Promise<{ data: Microcycle | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .update({
          status: 'archived',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      // Bridge: mark Atlas work_item as done (non-blocking)
      if (data && !error) {
        completeMicrocycleTask(id).catch((e) =>
          console.warn('[MicrocycleService] Bridge error (non-blocking):', e)
        );
      }

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error archiving microcycle:', error);
      return { data: null, error };
    }
  }

  /**
   * Activate microcycle (set as active for athlete)
   */
  static async activateMicrocycle(id: string): Promise<{ data: Microcycle | null; error: any }> {
    try {
      // Get microcycle to find athlete_id
      const { data: microcycle, error: fetchError } = await supabase
        .from('microcycles')
        .select('athlete_id')
        .eq('id', id)
        .single();

      if (fetchError || !microcycle) {
        return { data: null, error: fetchError };
      }

      // Deactivate any other active microcycles for this athlete
      const { data: deactivated } = await supabase
        .from('microcycles')
        .select('id')
        .eq('athlete_id', microcycle.athlete_id)
        .eq('status', 'active');

      await supabase
        .from('microcycles')
        .update({ status: 'completed' })
        .eq('athlete_id', microcycle.athlete_id)
        .eq('status', 'active');

      // Bridge: mark deactivated microcycles as done in Atlas (non-blocking)
      if (deactivated?.length) {
        for (const m of deactivated) {
          completeMicrocycleTask(m.id).catch((e) =>
            console.warn('[MicrocycleService] Bridge error (non-blocking):', e)
          );
        }
      }

      // Activate this microcycle
      const { data, error } = await supabase
        .from('microcycles')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      // Update athlete profile
      if (data) {
        await supabase
          .from('athlete_profiles')
          .update({ current_microcycle_id: id })
          .eq('athlete_id', microcycle.athlete_id);
      }

      return { data, error };
    } catch (error) {
      console.error('[MicrocycleService] Error activating microcycle:', error);
      return { data: null, error };
    }
  }
}
