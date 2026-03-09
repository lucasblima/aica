import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { Evangelist, CommissionEntry } from '../types';

const log = createNamespacedLogger('evangelistAdminService');

// =====================================================
// Evangelist Admin Service — Admin-specific operations
// Uses service_role via Supabase RLS (admin policies)
// =====================================================

export interface EvangelistWithProfile extends Evangelist {
  full_name?: string;
  email?: string;
}

export interface AdminSummary {
  total_evangelists: number;
  total_pending_payment: number;
  pending_conversions: number;
}

/**
 * Get all evangelists with their profile info (name/email).
 * Ordered by created_at desc.
 */
export async function getAllEvangelists(): Promise<EvangelistWithProfile[]> {
  try {
    const { data: evangelists, error } = await supabase
      .from('evangelists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!evangelists || evangelists.length === 0) {
      return [];
    }

    // Join with profiles to get name/email
    const userIds = evangelists.map((e) => e.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      log.warn('Could not fetch profiles for evangelists:', profilesError);
    }

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
    );

    return evangelists.map((e) => {
      const profile = profileMap.get(e.user_id);
      return {
        ...e,
        full_name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
      } as EvangelistWithProfile;
    });
  } catch (error) {
    log.error('Error fetching all evangelists:', error);
    throw error;
  }
}

/**
 * Create a new evangelist for a given user.
 * Calls RPC generate_referral_code to get the code, then inserts
 * into evangelists with tier=1 and status='active'.
 * Also updates the user's profile to set is_evangelist=true.
 */
export async function createEvangelist(userId: string): Promise<Evangelist> {
  try {
    // Generate referral code via RPC
    const { data: code, error: rpcError } = await supabase.rpc(
      'generate_referral_code',
      { p_user_id: userId }
    );

    if (rpcError) throw rpcError;

    // Insert evangelist record
    const { data: evangelist, error: insertError } = await supabase
      .from('evangelists')
      .insert({
        user_id: userId,
        referral_code: code,
        tier: 1,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Mark user as evangelist in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_evangelist: true })
      .eq('id', userId);

    if (profileError) {
      log.warn('Evangelist created but failed to update profile:', profileError);
    }

    return evangelist as Evangelist;
  } catch (error) {
    log.error('Error creating evangelist:', error);
    throw error;
  }
}

/**
 * Update an evangelist's status (active, suspended, inactive).
 */
export async function updateEvangelistStatus(
  id: string,
  status: 'active' | 'suspended' | 'inactive'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('evangelists')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    log.error('Error updating evangelist status:', error);
    throw error;
  }
}

/**
 * Mark all commissions for a given evangelist and period as paid.
 * Sets status='paid' and paid_at=NOW().
 */
export async function markCommissionsAsPaid(
  evangelistId: string,
  periodMonth: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('commission_ledger')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('evangelist_id', evangelistId)
      .eq('period_month', periodMonth);

    if (error) throw error;
  } catch (error) {
    log.error('Error marking commissions as paid:', error);
    throw error;
  }
}

/**
 * Get admin summary stats:
 * - total_evangelists: count of active evangelists
 * - total_pending_payment: sum of commission_amount where status in ('calculated','pending_payment')
 * - pending_conversions: count of referral_conversions where status='pending'
 */
export async function getAdminSummary(): Promise<AdminSummary> {
  try {
    // Count active evangelists
    const { count: totalEvangelists, error: evError } = await supabase
      .from('evangelists')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (evError) throw evError;

    // Sum pending commissions
    const { data: pendingCommissions, error: commError } = await supabase
      .from('commission_ledger')
      .select('commission_amount')
      .in('status', ['calculated', 'pending_payment']);

    if (commError) throw commError;

    const totalPendingPayment = (pendingCommissions || []).reduce(
      (sum, entry) => sum + Number(entry.commission_amount),
      0
    );

    // Count pending conversions
    const { count: pendingConversions, error: convError } = await supabase
      .from('referral_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (convError) throw convError;

    return {
      total_evangelists: totalEvangelists ?? 0,
      total_pending_payment: totalPendingPayment,
      pending_conversions: pendingConversions ?? 0,
    };
  } catch (error) {
    log.error('Error fetching admin summary:', error);
    throw error;
  }
}
