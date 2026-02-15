/**
 * Athlete Service
 *
 * CRUD operations for base athletes table (Flux module)
 * Manages athlete profiles, status, and basic performance thresholds
 */

import { supabase } from '@/services/supabaseClient';
import type { Athlete, AthleteStatus, AthleteLevel, TrainingModality, MyAthleteProfile } from '../types/flux';

export interface CreateAthleteInput {
  name: string;
  email?: string;
  phone: string;
  level: AthleteLevel;
  status?: AthleteStatus;
  modality: TrainingModality;
  trial_expires_at?: string;
  onboarding_data?: Record<string, unknown>;
  anamnesis?: Athlete['anamnesis'];
  ftp?: number;
  pace_threshold?: string;
  swim_css?: string;
}

export interface UpdateAthleteInput extends Partial<CreateAthleteInput> {
  id: string;
  current_block_id?: string;
  last_performance_test?: string;
}

export class AthleteService {
  /**
   * Get all athletes for current user (coach)
   */
  static async getAthletes(): Promise<{
    data: Athlete[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching athletes:', error);
      return { data: null, error };
    }
  }

  /**
   * Get athletes by status
   */
  static async getAthletesByStatus(
    status: AthleteStatus
  ): Promise<{ data: Athlete[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('status', status)
        .order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching athletes by status:', error);
      return { data: null, error };
    }
  }

  /**
   * Get athletes by modality
   */
  static async getAthletesByModality(
    modality: TrainingModality
  ): Promise<{ data: Athlete[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('modality', modality)
        .order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching athletes by modality:', error);
      return { data: null, error };
    }
  }

  /**
   * Get single athlete by ID
   */
  static async getAthleteById(
    id: string
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching athlete:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new athlete
   */
  static async createAthlete(
    input: CreateAthleteInput
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('athletes')
        .insert({
          ...input,
          user_id: userData.user.id,
          status: input.status || 'active',
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error creating athlete:', error);
      return { data: null, error };
    }
  }

  /**
   * Update athlete
   */
  static async updateAthlete(
    input: UpdateAthleteInput
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('athletes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error updating athlete:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete athlete
   */
  static async deleteAthlete(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('athletes').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[AthleteService] Error deleting athlete:', error);
      return { error };
    }
  }

  /**
   * Update athlete status
   */
  static async updateStatus(
    id: string,
    status: AthleteStatus
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error updating status:', error);
      return { data: null, error };
    }
  }

  /**
   * Update performance thresholds
   */
  static async updateThresholds(
    id: string,
    thresholds: {
      ftp?: number;
      pace_threshold?: string;
      swim_css?: string;
      last_performance_test?: string;
    }
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .update({
          ...thresholds,
          last_performance_test:
            thresholds.last_performance_test || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error updating thresholds:', error);
      return { data: null, error };
    }
  }

  /**
   * Set current block for athlete
   */
  static async setCurrentBlock(
    athleteId: string,
    blockId: string | null
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .update({
          current_block_id: blockId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', athleteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error setting current block:', error);
      return { data: null, error };
    }
  }

  /**
   * Get athletes with filters
   */
  static async getAthletesFiltered(filters: {
    status?: AthleteStatus;
    modality?: TrainingModality;
    level?: AthleteLevel;
    search?: string;
  }): Promise<{ data: Athlete[] | null; error: any }> {
    try {
      let query = supabase.from('athletes').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.modality) {
        query = query.eq('modality', filters.modality);
      }

      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.order('name');

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching filtered athletes:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk create athletes (for import/seed)
   */
  static async bulkCreateAthletes(
    athletes: CreateAthleteInput[]
  ): Promise<{ data: Athlete[] | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const athletesWithUser = athletes.map((a) => ({
        ...a,
        user_id: userData.user.id,
        status: a.status || 'active',
      }));

      const { data, error } = await supabase
        .from('athletes')
        .insert(athletesWithUser)
        .select();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error bulk creating athletes:', error);
      return { data: null, error };
    }
  }

  /**
   * Get active athletes count
   */
  static async getActiveCount(): Promise<{ data: number | null; error: any }> {
    try {
      const { count, error } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      return { data: count, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching active count:', error);
      return { data: null, error };
    }
  }

  /**
   * Get the current user's athlete profile (athlete portal).
   * Calls RPC get_my_athlete_profile() which returns data based on auth_user_id.
   */
  static async getMyAthleteProfile(): Promise<{
    data: MyAthleteProfile | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_my_athlete_profile');

      if (error) {
        console.error('[AthleteService] Error fetching my athlete profile:', error);
        return { data: null, error };
      }

      return { data: data as MyAthleteProfile | null, error: null };
    } catch (error) {
      console.error('[AthleteService] Error fetching my athlete profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all athletes with adherence rates via RPC
   */
  static async getAthletesWithAdherence(): Promise<{
    data: (Athlete & { adherence_rate: number })[] | null;
    error: any;
  }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase.rpc('get_athletes_with_adherence', {
        p_user_id: userData.user.id,
      });

      if (error) {
        console.error('[AthleteService] RPC get_athletes_with_adherence failed, falling back:', error);
        // Fallback: return athletes with 0 adherence
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('athletes')
          .select('*')
          .order('name');

        if (fallbackError) return { data: null, error: fallbackError };
        return {
          data: (fallbackData || []).map((a) => ({ ...a, adherence_rate: 0 })),
          error: null,
        };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('[AthleteService] Error fetching athletes with adherence:', error);
      return { data: null, error };
    }
  }

  /**
   * Send invite email to athlete via Edge Function
   */
  static async sendInvite(params: {
    athleteId: string;
    athleteName: string;
    athleteEmail: string;
    coachName: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-athlete-invite', {
        body: params,
      });

      if (error) {
        console.error('[AthleteService] Error sending invite:', error);
        return { success: false, error: error.message };
      }

      return { success: data?.success ?? true };
    } catch (error) {
      console.error('[AthleteService] Error sending invite:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Get trial expiring athletes (within next 7 days)
   */
  static async getTrialExpiring(): Promise<{ data: Athlete[] | null; error: any }> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('status', 'trial')
        .gte('trial_expires_at', today.toISOString())
        .lte('trial_expires_at', sevenDaysFromNow.toISOString())
        .order('trial_expires_at');

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error fetching trial expiring:', error);
      return { data: null, error };
    }
  }
}
