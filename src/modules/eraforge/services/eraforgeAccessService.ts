/**
 * EraForge Access Service
 *
 * Manages access requests for the EraForge module.
 * Uses eraforge_check_access and eraforge_request_access RPCs.
 * Follows EraforgeGameService pattern (static class, { data, error } tuples).
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EraforgeAccessService');

export interface EraforgeAccessStatus {
  has_access: boolean;
  status: string | null;
  requested_at: string | null;
}

export class EraforgeAccessService {
  static async checkAccess(): Promise<{ data: EraforgeAccessStatus | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('eraforge_check_access');
      return { data, error };
    } catch (error) {
      log.error('Error checking access:', error);
      return { data: null, error };
    }
  }

  static async requestAccess(): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.rpc('eraforge_request_access');
      return { data, error };
    } catch (error) {
      log.error('Error requesting access:', error);
      return { data: null, error };
    }
  }
}
