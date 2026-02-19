/**
 * Athlete Profile Service
 *
 * Manages athlete_profiles table (performance thresholds per modality)
 * Each athlete can have multiple profiles (one per modality trained)
 * UNIQUE constraint: (athlete_id, modality)
 */

import { supabase } from '@/services/supabaseClient';
import type { AthleteLevel, TrainingModality, AnamnesisData } from '../types/flux';

export interface AthleteProfile {
  id: string;
  user_id: string;
  athlete_id: string;
  modality: TrainingModality;
  ftp?: number;
  pace_threshold?: string;
  css?: string;
  max_hr?: number;
  level: AthleteLevel;
  anamnesis?: AnamnesisData;
  last_performance_test?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAthleteProfileInput {
  athlete_id: string;
  modality: TrainingModality;
  level: AthleteLevel;
  ftp?: number;
  pace_threshold?: string;
  css?: string;
  max_hr?: number;
  anamnesis?: AnamnesisData;
  last_performance_test?: string;
}

export interface UpdateAthleteProfileInput extends Partial<CreateAthleteProfileInput> {
  id: string;
}

export class AthleteProfileService {
  /**
   * Get all athlete profiles for the current user (coach)
   */
  static async getAllProfiles(): Promise<{ data: AthleteProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .order('athlete_id');

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error fetching all profiles:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all profiles for an athlete (multiple modalities)
   */
  static async getProfilesByAthleteId(
    athleteId: string
  ): Promise<{ data: AthleteProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('modality');

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error fetching profiles:', error);
      return { data: null, error };
    }
  }

  /**
   * Get profile by athlete ID and modality
   */
  static async getProfileByAthleteAndModality(
    athleteId: string,
    modality: TrainingModality
  ): Promise<{ data: AthleteProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('modality', modality)
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
    input: CreateAthleteProfileInput
  ): Promise<{ data: AthleteProfile | null; error: any }> {
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
    input: UpdateAthleteProfileInput
  ): Promise<{ data: AthleteProfile | null; error: any }> {
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
   * Delete all profiles for an athlete (cleanup on athlete deletion)
   */
  static async deleteProfilesByAthleteId(athleteId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('athlete_profiles')
        .delete()
        .eq('athlete_id', athleteId);

      return { error };
    } catch (error) {
      console.error('[AthleteProfileService] Error deleting profiles:', error);
      return { error };
    }
  }

  /**
   * Upsert profile (create if not exists, update if exists)
   * Uses UNIQUE constraint on (athlete_id, modality)
   */
  static async upsertProfile(
    input: CreateAthleteProfileInput
  ): Promise<{ data: AthleteProfile | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('athlete_profiles')
        .upsert(
          {
            ...input,
            user_id: userData.user.id,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'athlete_id,modality',
          }
        )
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteProfileService] Error upserting profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Sync athlete profiles with selected modalities
   * Creates/updates profiles for selected modalities, deletes removed ones
   */
  static async syncProfilesForAthlete(
    athleteId: string,
    modalities: TrainingModality[],
    sharedData: {
      level: AthleteLevel;
      anamnesis?: AnamnesisData;
      ftp?: number;
      pace_threshold?: string;
      css?: string;
    }
  ): Promise<{ data: AthleteProfile[] | null; error: any }> {
    try {
      // Get existing profiles
      const { data: existingProfiles, error: fetchError } =
        await this.getProfilesByAthleteId(athleteId);

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      const existingModalities = existingProfiles?.map((p) => p.modality) || [];

      // Upsert profiles for all selected modalities
      const upsertPromises = modalities.map((modality) =>
        this.upsertProfile({
          athlete_id: athleteId,
          modality,
          level: sharedData.level,
          anamnesis: sharedData.anamnesis,
          ftp: modality === 'cycling' ? sharedData.ftp : undefined,
          pace_threshold: modality === 'running' ? sharedData.pace_threshold : undefined,
          css: modality === 'swimming' ? sharedData.css : undefined,
        })
      );

      await Promise.all(upsertPromises);

      // Delete profiles for modalities that were removed
      const modalitiesToDelete = existingModalities.filter((m) => !modalities.includes(m));

      if (modalitiesToDelete.length > 0) {
        const deletePromises = existingProfiles
          ?.filter((p) => modalitiesToDelete.includes(p.modality))
          .map((p) => this.deleteProfile(p.id));

        if (deletePromises) {
          await Promise.all(deletePromises);
        }
      }

      // Fetch updated profiles
      const { data: updatedProfiles, error: updateError } =
        await this.getProfilesByAthleteId(athleteId);

      return { data: updatedProfiles, error: updateError };
    } catch (error) {
      console.error('[AthleteProfileService] Error syncing profiles:', error);
      return { data: null, error };
    }
  }

}
