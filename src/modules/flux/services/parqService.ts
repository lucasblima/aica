/**
 * PAR-Q Service
 *
 * Manages PAR-Q+ questionnaire responses, risk calculation, and clearance status.
 */

import { supabase } from '@/services/supabaseClient';
import { calculateRiskFromFollowUps, riskToClearance } from '../components/parq/ParQQuestionConstants';
import type {
  ParQResponse,
  ParQStatus,
  WorkoutClearanceResult,
  SubmitParQInput,
  ParQRiskLevel,
  FollowUpCategory,
} from '../types/parq';

export class ParQService {
  /**
   * Submit a new PAR-Q response
   */
  static async submitParQResponse(input: SubmitParQInput): Promise<{
    data: ParQResponse | null;
    error: any;
  }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 12 months validity

      const { data, error } = await supabase
        .from('parq_responses')
        .insert({
          athlete_id: input.athlete_id,
          filled_by: userData.user.id,
          filled_by_role: input.filled_by_role,
          q1_cardiac_condition: input.classic_answers[0] ?? false,
          q2_chest_pain_activity: input.classic_answers[1] ?? false,
          q3_chest_pain_rest: input.classic_answers[2] ?? false,
          q4_dizziness_balance: input.classic_answers[3] ?? false,
          q5_bone_joint_problem: input.classic_answers[4] ?? false,
          q6_blood_pressure_meds: input.classic_answers[5] ?? false,
          q7_other_physical_reason: input.classic_answers[6] ?? false,
          followup_answers: input.followup_answers,
          risk_level: input.risk_level,
          clearance_status: input.clearance_status,
          restrictions: input.restrictions,
          signature_text: input.signature_text,
          signed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[ParQService] Error submitting PAR-Q:', error);
      return { data: null, error };
    }
  }

  /**
   * Get PAR-Q status for an athlete (via RPC)
   */
  static async getParQStatus(athleteId: string): Promise<{
    data: ParQStatus | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_parq_status', {
        p_athlete_id: athleteId,
      });

      if (error) {
        console.error('[ParQService] RPC get_parq_status failed:', error);
        // Fallback: query directly
        return ParQService.getParQStatusFallback(athleteId);
      }

      return { data: data as ParQStatus, error: null };
    } catch (error) {
      console.error('[ParQService] Error getting PAR-Q status:', error);
      return { data: null, error };
    }
  }

  /**
   * Fallback when RPC doesn't exist yet
   */
  private static async getParQStatusFallback(athleteId: string): Promise<{
    data: ParQStatus | null;
    error: any;
  }> {
    try {
      const { data: responses, error } = await supabase
        .from('parq_responses')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) return { data: null, error };

      const latest = responses?.[0];
      if (!latest) {
        return {
          data: {
            has_parq: false,
            clearance_status: 'pending',
            risk_level: null,
            expires_at: null,
            is_expired: false,
            has_clearance_document: false,
          },
          error: null,
        };
      }

      const isExpired = new Date(latest.expires_at) < new Date();

      // Check for approved documents
      const { data: docs } = await supabase
        .from('athlete_documents')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('review_status', 'approved')
        .limit(1);

      return {
        data: {
          has_parq: true,
          clearance_status: isExpired ? 'expired' : latest.clearance_status,
          risk_level: latest.risk_level,
          expires_at: latest.expires_at,
          is_expired: isExpired,
          has_clearance_document: (docs?.length ?? 0) > 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Check if athlete is cleared for workouts (via RPC)
   */
  static async checkWorkoutClearance(athleteId: string): Promise<{
    data: WorkoutClearanceResult | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.rpc('check_workout_clearance', {
        p_athlete_id: athleteId,
      });

      if (error) {
        console.error('[ParQService] RPC check_workout_clearance failed:', error);
        // Fallback: derive from PAR-Q status
        const { data: status } = await ParQService.getParQStatus(athleteId);
        if (!status) return { data: null, error };

        const cleared = status.clearance_status === 'cleared' ||
          status.clearance_status === 'cleared_with_restrictions' ||
          status.clearance_status === 'pending'; // pending = no PAR-Q required OR not yet filled

        return {
          data: {
            cleared,
            reason: cleared ? null : 'Liberacao medica pendente',
            parq_status: status.clearance_status,
            missing_documents: status.clearance_status === 'blocked' && !status.has_clearance_document
              ? ['atestado_medico']
              : [],
          },
          error: null,
        };
      }

      return { data: data as WorkoutClearanceResult, error: null };
    } catch (error) {
      console.error('[ParQService] Error checking clearance:', error);
      return { data: null, error };
    }
  }

  /**
   * Get PAR-Q history for current athlete (athlete portal)
   */
  static async getMyParQHistory(): Promise<{
    data: ParQResponse[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_my_parq_history');

      if (error) {
        console.error('[ParQService] RPC get_my_parq_history failed:', error);
        return { data: null, error };
      }

      return { data: (data || []) as ParQResponse[], error: null };
    } catch (error) {
      console.error('[ParQService] Error getting PAR-Q history:', error);
      return { data: null, error };
    }
  }

  /**
   * Get PAR-Q responses for a specific athlete (coach view)
   */
  static async getParQResponsesByAthlete(athleteId: string): Promise<{
    data: ParQResponse[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('parq_responses')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[ParQService] Error getting responses by athlete:', error);
      return { data: null, error };
    }
  }

  /**
   * Calculate risk level from answers (pure function, no DB)
   */
  static calculateRiskLevel(
    classicAnswers: boolean[],
    followUpAnswers: Record<FollowUpCategory, Record<string, boolean>> | null
  ): { risk: ParQRiskLevel; clearance: 'cleared' | 'cleared_with_restrictions' | 'blocked'; restrictions: string[] } {
    // If all classic answers are "no" -> low risk, cleared
    const anyClassicYes = classicAnswers.some(Boolean);
    if (!anyClassicYes) {
      return { risk: 'low', clearance: 'cleared', restrictions: [] };
    }

    // Has some classic "yes" -> check follow-ups
    if (!followUpAnswers) {
      return { risk: 'intermediate', clearance: 'cleared_with_restrictions', restrictions: [] };
    }

    const activeCategories = Object.keys(followUpAnswers).filter(
      cat => Object.values(followUpAnswers[cat as FollowUpCategory] || {}).some(Boolean)
    ) as FollowUpCategory[];

    const { risk, restrictions } = calculateRiskFromFollowUps(activeCategories, followUpAnswers);
    return { risk, clearance: riskToClearance(risk), restrictions };
  }
}
