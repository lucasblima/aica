/**
 * Athlete Service
 *
 * CRUD operations for base athletes table (Flux module)
 * Manages athlete profiles, status, and basic performance thresholds
 */

import { supabase } from '@/services/supabaseClient';
import { findOrCreateContact } from '@/services/platformContactService';
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
  auth_user_id?: string;
  invitation_status?: 'none' | 'pending' | 'connected';
}

export interface UpdateAthleteInput extends Partial<CreateAthleteInput> {
  id: string;
  current_block_id?: string;
  last_performance_test?: string;
  // Athlete profile calculator fields
  weight_kg?: number;
  height_cm?: number;
  birth_date?: string;
  practiced_modalities?: string[];
  practice_duration_months?: number;
  training_zones?: Record<string, unknown>;
  // Financial fields
  financial_status?: 'ok' | 'pending' | 'overdue';
  onboarding_data?: Record<string, unknown>;
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

      // 1. Create/find platform contact (non-blocking on failure)
      let platformContactId: string | null = null;
      try {
        const { data: contact } = await findOrCreateContact(
          input.name,
          input.email || null,
          input.phone || null,
          'flux',
          { modality: input.modality, level: input.level }
        );
        platformContactId = contact?.id || null;
      } catch (err) {
        console.warn('[AthleteService] Platform contact sync failed (non-blocking):', err);
      }

      // 2. Create athlete with platform_contact_id
      const insertData: Record<string, unknown> = {
        ...input,
        user_id: userData.user.id,
        status: input.status || 'active',
        platform_contact_id: platformContactId,
      };

      // Set linked_at when connecting to an existing AICA user
      if (input.auth_user_id && input.invitation_status === 'connected') {
        insertData.linked_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('athletes')
        .insert(insertData)
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

      // Pre-create platform contacts (best-effort, non-blocking on individual failures)
      const contactIds: (string | null)[] = await Promise.all(
        athletes.map(async (a) => {
          try {
            const { data: contact } = await findOrCreateContact(
              a.name,
              a.email || null,
              a.phone || null,
              'flux',
              { modality: a.modality, level: a.level }
            );
            return contact?.id || null;
          } catch {
            return null;
          }
        })
      );

      const athletesWithUser = athletes.map((a, i) => ({
        ...a,
        user_id: userData.user.id,
        status: a.status || 'active',
        platform_contact_id: contactIds[i],
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
   * Unlink the current athlete from their coach's training program.
   * Sets auth_user_id=NULL, invitation_status='none', status='churned'.
   * Returns google_event_ids of deleted calendar sync entries for
   * best-effort Google Calendar cleanup.
   */
  static async unlinkSelf(): Promise<{ googleEventIds: string[]; error: any }> {
    try {
      const { data, error } = await supabase.rpc('athlete_unlink_self');
      const googleEventIds = (data as { google_event_id: string }[] | null)
        ?.map((r) => r.google_event_id)
        .filter(Boolean) ?? [];
      return { googleEventIds, error };
    } catch (error) {
      console.error('[AthleteService] Error unlinking self:', error);
      return { googleEventIds: [], error: error instanceof Error ? error : new Error('Unknown error') };
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

      // Enrich RPC results with avatar_url from athletes table
      // (the RPC may not yet include avatar_url if migration is pending)
      const rpcData = data || [];
      if (rpcData.length > 0 && !('avatar_url' in (rpcData[0] || {}))) {
        try {
          const athleteIds = rpcData.map((a: { id: string }) => a.id);
          const { data: avatarData } = await supabase
            .from('athletes')
            .select('id, avatar_url, practiced_modalities')
            .in('id', athleteIds);

          if (avatarData) {
            const avatarMap = new Map(avatarData.map((a) => [a.id, a]));
            for (const athlete of rpcData) {
              const extra = avatarMap.get((athlete as { id: string }).id);
              if (extra) {
                (athlete as Record<string, unknown>).avatar_url = extra.avatar_url;
                (athlete as Record<string, unknown>).practiced_modalities = extra.practiced_modalities;
              }
            }
          }
        } catch (enrichErr) {
          console.warn('[AthleteService] Avatar enrichment failed (non-blocking):', enrichErr);
        }
      }

      return { data: rpcData, error: null };
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

  /**
   * Update athlete payment metadata (stored in onboarding_data JSONB + financial_status)
   * Issue #463
   */
  static async updatePaymentInfo(
    athleteId: string,
    payment: AthletePaymentData
  ): Promise<{ data: Athlete | null; error: any }> {
    try {
      // First read current onboarding_data to merge (not overwrite)
      const { data: current, error: readError } = await supabase
        .from('athletes')
        .select('onboarding_data')
        .eq('id', athleteId)
        .single();

      if (readError) {
        console.error('[AthleteService] Error reading athlete for payment update:', readError);
        return { data: null, error: readError };
      }

      const existingData = (current?.onboarding_data as Record<string, unknown>) || {};

      // Map payment_status to financial_status column value
      const financialStatus: 'ok' | 'pending' | 'overdue' =
        payment.payment_status === 'paid' ? 'ok' : payment.payment_status;

      const { data, error } = await supabase
        .from('athletes')
        .update({
          financial_status: financialStatus,
          onboarding_data: {
            ...existingData,
            payment_due_day: payment.payment_due_day,
            monthly_fee: payment.monthly_fee,
            payment_status: payment.payment_status,
            last_payment_date: payment.last_payment_date,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', athleteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteService] Error updating payment info:', error);
      return { data: null, error };
    }
  }

  /**
   * Batch update payment status for multiple athletes
   * Issue #463
   */
  static async batchUpdatePaymentStatus(
    athleteIds: string[],
    status: 'paid' | 'pending' | 'overdue'
  ): Promise<{ success: boolean; error: any }> {
    try {
      const financialStatus: 'ok' | 'pending' | 'overdue' =
        status === 'paid' ? 'ok' : status;

      const now = new Date().toISOString();
      const results = await Promise.all(
        athleteIds.map(async (id) => {
          // Read current data
          const { data: current } = await supabase
            .from('athletes')
            .select('onboarding_data')
            .eq('id', id)
            .single();

          const existingData = (current?.onboarding_data as Record<string, unknown>) || {};

          return supabase
            .from('athletes')
            .update({
              financial_status: financialStatus,
              onboarding_data: {
                ...existingData,
                payment_status: status,
                last_payment_date: status === 'paid' ? now.split('T')[0] : existingData.last_payment_date,
              },
              updated_at: now,
            })
            .eq('id', id);
        })
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error('[AthleteService] Batch payment update had errors:', errors);
        return { success: false, error: errors[0].error };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('[AthleteService] Error batch updating payment status:', error);
      return { success: false, error };
    }
  }
}

// ============================================
// Payment Metadata Types (Issue #463)
// ============================================

/** Payment data stored in athlete.onboarding_data JSONB */
export interface AthletePaymentData {
  /** Day of month when payment is due (1-31) */
  payment_due_day?: number;
  /** Monthly fee amount in BRL */
  monthly_fee?: number;
  /** Current month's payment status */
  payment_status: 'paid' | 'pending' | 'overdue';
  /** ISO date of last confirmed payment */
  last_payment_date?: string;
}

/**
 * Extract payment data from athlete's onboarding_data JSONB
 */
export function getPaymentData(athlete: Athlete): AthletePaymentData {
  const data = (athlete.onboarding_data || {}) as Record<string, unknown>;
  return {
    payment_due_day: typeof data.payment_due_day === 'number' ? data.payment_due_day : undefined,
    monthly_fee: typeof data.monthly_fee === 'number' ? data.monthly_fee : undefined,
    payment_status: derivePaymentStatus(athlete, data),
    last_payment_date: typeof data.last_payment_date === 'string' ? data.last_payment_date : undefined,
  };
}

/**
 * Derive the payment status from financial_status column + onboarding_data
 */
function derivePaymentStatus(
  athlete: Athlete,
  data: Record<string, unknown>
): 'paid' | 'pending' | 'overdue' {
  // If onboarding_data has explicit payment_status, use it
  if (data.payment_status === 'paid' || data.payment_status === 'pending' || data.payment_status === 'overdue') {
    return data.payment_status as 'paid' | 'pending' | 'overdue';
  }
  // Fallback to financial_status column
  if (athlete.financial_status === 'ok') return 'paid';
  if (athlete.financial_status === 'overdue') return 'overdue';
  if (athlete.financial_status === 'pending') return 'pending';
  return 'pending';
}
