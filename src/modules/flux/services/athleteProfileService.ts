/**
 * Athlete Profile Service
 *
 * CRUD operations for athlete profiles with performance thresholds and training history
 */

import { supabase } from '@/services/supabaseClient';
import type {
  FlowAthleteProfile,
  CreateFlowAthleteProfileInput,
  UpdateFlowAthleteProfileInput,
} from '../types/flow';

export class AthleteProfileService {
  /**
   * Get all athlete profiles for current user
   */
  static async getAllProfiles(): Promise<{
    data: FlowAthleteProfile[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error fetching profiles:', error);
      return { data: null, error };
    }
  }

  /**
   * Get single profile by athlete_id
   */
  static async getProfileByAthleteId(
    athleteId: string
  ): Promise<{ data: FlowAthleteProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('athlete_id', athleteId)
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error fetching profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new athlete profile
   */
  static async createProfile(
    input: CreateFlowAthleteProfileInput
  ): Promise<{ data: FlowAthleteProfile | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('athlete_profiles')
        .insert({
          ...input,
          user_id: userData.user.id,
          status: input.status || 'active',
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error creating profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Update athlete profile
   */
  static async updateProfile(
    input: UpdateFlowAthleteProfileInput
  ): Promise<{ data: FlowAthleteProfile | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('athlete_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error updating profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete athlete profile
   */
  static async deleteProfile(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('athlete_profiles').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[AthleteProfileService] Error deleting profile:', error);
      return { error };
    }
  }

  /**
   * Update performance thresholds
   */
  static async updateThresholds(
    athleteId: string,
    thresholds: {
      ftp?: number;
      pace_threshold?: string;
      swim_css?: string;
      last_test_date?: string;
    }
  ): Promise<{ data: FlowAthleteProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .update({
          ...thresholds,
          last_test_date: thresholds.last_test_date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('athlete_id', athleteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error updating thresholds:', error);
      return { data: null, error };
    }
  }

  /**
   * Update training metrics (consistency, volume)
   */
  static async updateTrainingMetrics(
    athleteId: string,
    metrics: {
      weekly_volume_average?: number;
      consistency_rate?: number;
    }
  ): Promise<{ data: FlowAthleteProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .update({
          ...metrics,
          updated_at: new Date().toISOString(),
        })
        .eq('athlete_id', athleteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error updating training metrics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get profiles by filters
   */
  static async getProfilesByFilters(filters: {
    modality?: string;
    level?: string;
    status?: string;
  }): Promise<{ data: FlowAthleteProfile[] | null; error: any }> {
    try {
      let query = supabase.from('athlete_profiles').select('*');

      if (filters.modality) {
        query = query.eq('modality', filters.modality);
      }

      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error fetching filtered profiles:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk import athlete profiles
   */
  static async bulkImportProfiles(
    profiles: CreateFlowAthleteProfileInput[]
  ): Promise<{ data: FlowAthleteProfile[] | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const profilesWithUser = profiles.map((p) => ({
        ...p,
        user_id: userData.user.id,
        status: p.status || 'active',
      }));

      const { data, error } = await supabase
        .from('athlete_profiles')
        .insert(profilesWithUser)
        .select();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error bulk importing profiles:', error);
      return { data: null, error };
    }
  }
}
