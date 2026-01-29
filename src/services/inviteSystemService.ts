/**
 * Invite System Service
 *
 * Manages viral invite system (Gmail-style):
 * - Generate invite links
 * - Track invite statistics
 * - Accept invites
 * - Validate invite tokens
 */

import { supabase } from './supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export interface InviteStats {
  available: number;
  total_sent: number;
  total_accepted: number;
  pending: number;
  lifetime: number;
}

export interface InviteTokenResult {
  success: boolean;
  token?: string;
  referral_id?: string;
  error?: string;
}

export interface InviteValidation {
  valid: boolean;
  inviter_name?: string;
  inviter_avatar?: string;
  created_at?: string;
  expires_at?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  inviter_name?: string;
  xp_awarded?: number;
  error?: string;
}

export interface Referral {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  invite_token: string;
  status: 'pending' | 'accepted' | 'expired';
  xp_awarded: number;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get invite statistics for current user
 */
export async function getInviteStats(): Promise<InviteStats | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('get_invite_stats', {
    p_user_id: user.id
  });

  if (error) {
    console.error('[InviteSystem] Error getting stats:', error);
    return null;
  }

  return data as InviteStats;
}

/**
 * Generate a new invite token/link
 */
export async function generateInviteToken(): Promise<InviteTokenResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  const { data, error } = await supabase.rpc('generate_invite_token', {
    p_user_id: user.id
  });

  if (error) {
    console.error('[InviteSystem] Error generating token:', error);
    return { success: false, error: error.message };
  }

  return data as InviteTokenResult;
}

/**
 * Get full invite URL from token
 */
export function getInviteUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/invite/${token}`;
}

/**
 * Validate an invite token (can be called without auth)
 */
export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const { data, error } = await supabase.rpc('validate_invite_token', {
    p_token: token
  });

  if (error) {
    console.error('[InviteSystem] Error validating token:', error);
    return { valid: false, error: error.message };
  }

  return data as InviteValidation;
}

/**
 * Accept an invite (requires auth)
 */
export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Faça login para aceitar o convite' };
  }

  const { data, error } = await supabase.rpc('accept_invite', {
    p_token: token,
    p_invitee_id: user.id
  });

  if (error) {
    console.error('[InviteSystem] Error accepting invite:', error);
    return { success: false, error: error.message };
  }

  return data as AcceptInviteResult;
}

/**
 * Get user's referral history
 */
export async function getReferralHistory(): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_referrals')
    .select('*')
    .eq('inviter_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[InviteSystem] Error getting referral history:', error);
    return [];
  }

  return data as Referral[];
}

/**
 * Copy invite link to clipboard
 */
export async function copyInviteLink(token: string): Promise<boolean> {
  const url = getInviteUrl(token);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('[InviteSystem] Error copying to clipboard:', error);

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Share invite via Web Share API (mobile)
 */
export async function shareInvite(token: string): Promise<boolean> {
  const url = getInviteUrl(token);

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Convite para Aica',
        text: 'Você foi convidado para usar o Aica - seu assistente de vida inteligente!',
        url: url
      });
      return true;
    } catch (error) {
      // User cancelled or error
      console.log('[InviteSystem] Share cancelled or failed:', error);
      return false;
    }
  }

  // Fallback to copy
  return copyInviteLink(token);
}

/**
 * Check if user came from an invite link
 * Stores token in localStorage for post-login acceptance
 */
export function storeInviteToken(token: string): void {
  localStorage.setItem('aica_invite_token', token);
}

/**
 * Get stored invite token
 */
export function getStoredInviteToken(): string | null {
  return localStorage.getItem('aica_invite_token');
}

/**
 * Clear stored invite token
 */
export function clearStoredInviteToken(): void {
  localStorage.removeItem('aica_invite_token');
}

/**
 * Process pending invite after login
 */
export async function processPendingInvite(): Promise<AcceptInviteResult | null> {
  const token = getStoredInviteToken();
  if (!token) return null;

  const result = await acceptInvite(token);

  if (result.success) {
    clearStoredInviteToken();
  }

  return result;
}
