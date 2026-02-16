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
  invite_code?: string;
  referral_id?: string;
  error?: string;
}

export interface ActivationStatus {
  is_activated: boolean;
  activated_at: string | null;
}

export interface ActivateWithCodeResult {
  success: boolean;
  inviter_name?: string;
  xp_awarded?: number;
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
  invite_code: string | null;
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

// ============================================================================
// INVITE CODE FUNCTIONS
// ============================================================================

/**
 * Validate an invite code (can be called without auth)
 */
export async function validateInviteCode(code: string): Promise<InviteValidation> {
  const { data, error } = await supabase.rpc('validate_invite_code', {
    p_code: code.toUpperCase().trim()
  });

  if (error) {
    console.error('[InviteSystem] Error validating code:', error);
    return { valid: false, error: error.message };
  }

  return data as InviteValidation;
}

/**
 * Activate user account with an invite code (requires auth)
 */
export async function activateWithCode(code: string): Promise<ActivateWithCodeResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Faça login para ativar com código' };
  }

  const { data, error } = await supabase.rpc('activate_with_code', {
    p_user_id: user.id,
    p_code: code.toUpperCase().trim()
  });

  if (error) {
    console.error('[InviteSystem] Error activating with code:', error);
    return { success: false, error: error.message };
  }

  return data as ActivateWithCodeResult;
}

/**
 * Check if current user is activated
 */
export async function checkActivationStatus(): Promise<ActivationStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('check_user_activated', {
    p_user_id: user.id
  });

  if (error) {
    console.error('[InviteSystem] Error checking activation:', error);
    // If RPC doesn't exist yet (migration not applied), assume activated
    return { is_activated: true, activated_at: null };
  }

  return data as ActivationStatus;
}

// ============================================================================
// LOCAL STORAGE — TOKEN & CODE
// ============================================================================

/**
 * Store invite token in localStorage for post-login acceptance
 */
export function storeInviteToken(token: string): void {
  localStorage.setItem('aica_invite_token', token);
}

export function getStoredInviteToken(): string | null {
  return localStorage.getItem('aica_invite_token');
}

export function clearStoredInviteToken(): void {
  localStorage.removeItem('aica_invite_token');
}

/**
 * Store invite code in localStorage for post-login activation
 */
export function storeInviteCode(code: string): void {
  localStorage.setItem('aica_invite_code', code.toUpperCase().trim());
}

export function getStoredInviteCode(): string | null {
  return localStorage.getItem('aica_invite_code');
}

export function clearStoredInviteCode(): void {
  localStorage.removeItem('aica_invite_code');
}

/**
 * Process pending invite after login — checks both token and code
 */
export async function processPendingInvite(): Promise<AcceptInviteResult | null> {
  // Try token first (from /invite/:token flow)
  const token = getStoredInviteToken();
  if (token) {
    const result = await acceptInvite(token);
    if (result.success) {
      clearStoredInviteToken();
      clearStoredInviteCode(); // Clean both
      return result;
    }
  }

  // Try code (from landing page code input)
  const code = getStoredInviteCode();
  if (code) {
    const result = await activateWithCode(code);
    if (result.success) {
      clearStoredInviteCode();
      clearStoredInviteToken(); // Clean both
      return result;
    }
  }

  return null;
}

// ============================================================================
// INVITE CRUD OPERATIONS
// ============================================================================

export interface RevokeInviteResult {
  success: boolean;
  quota_returned: boolean;
  error?: string;
}

/**
 * Get all pending invites (not yet accepted/expired)
 */
export async function getPendingInvites(): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_referrals')
    .select('*')
    .eq('inviter_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[InviteSystem] Error getting pending invites:', error);
    return [];
  }

  return data as Referral[];
}

/**
 * Revoke a pending invite and return the quota
 */
export async function revokeInvite(referralId: string): Promise<RevokeInviteResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, quota_returned: false, error: 'Usuário não autenticado' };
  }

  const { data, error } = await supabase.rpc('revoke_invite', {
    p_referral_id: referralId,
    p_user_id: user.id
  });

  if (error) {
    console.error('[InviteSystem] Error revoking invite:', error);
    return { success: false, quota_returned: false, error: error.message };
  }

  return data as RevokeInviteResult;
}
