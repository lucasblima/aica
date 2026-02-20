import { supabase } from './supabaseClient';

interface WaitlistResult {
  success: boolean;
  message?: string;
  already_exists?: boolean;
  error?: string;
}

export const waitlistService = {
  async joinWaitlist(
    email: string,
    referralCode?: string,
    source: string = 'landing'
  ): Promise<WaitlistResult> {
    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Email inválido' };
      }

      const { data, error } = await supabase.rpc('add_to_waitlist', {
        p_email: email,
        p_referral_code: referralCode || null,
        p_source: source,
      });

      if (error) {
        console.error('[waitlistService] Error joining waitlist:', error);
        return { success: false, error: 'Erro ao entrar na lista. Tente novamente.' };
      }

      return data as WaitlistResult;
    } catch (err) {
      console.error('[waitlistService] Unexpected error:', err);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    }
  },

  async getWaitlistCount(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_waitlist_count');
      if (error) {
        console.error('[waitlistService] Error getting count:', error);
        return 0;
      }
      return (data as number) || 0;
    } catch {
      return 0;
    }
  },
};
