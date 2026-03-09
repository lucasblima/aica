import { supabase } from '@/services/supabaseClient';
import type {
  Evangelist,
  ReferralConversion,
  CommissionEntry,
  TierHistoryEntry,
  EvangelistStats,
} from '../types';
import { TIER_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EvangelistService');

// =====================================================
// Evangelist Service — Phase 1
// =====================================================

/**
 * Get the current user's evangelist profile.
 */
export async function getMyEvangelistProfile(
  userId: string
): Promise<Evangelist | null> {
  try {
    const { data, error } = await supabase
      .from('evangelists')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return data as Evangelist | null;
  } catch (error) {
    log.error('Error fetching evangelist profile:', error);
    throw error;
  }
}

/**
 * Get all referral conversions for the evangelist, newest first.
 */
export async function getMyReferralConversions(
  evangelistId: string
): Promise<ReferralConversion[]> {
  try {
    const { data, error } = await supabase
      .from('referral_conversions')
      .select('*')
      .eq('evangelist_id', evangelistId)
      .order('converted_at', { ascending: false });

    if (error) throw error;

    return (data || []) as ReferralConversion[];
  } catch (error) {
    log.error('Error fetching referral conversions:', error);
    throw error;
  }
}

/**
 * Get all commission ledger entries for the evangelist, newest period first.
 */
export async function getMyCommissionLedger(
  evangelistId: string
): Promise<CommissionEntry[]> {
  try {
    const { data, error } = await supabase
      .from('commission_ledger')
      .select('*')
      .eq('evangelist_id', evangelistId)
      .order('period_month', { ascending: false });

    if (error) throw error;

    return (data || []) as CommissionEntry[];
  } catch (error) {
    log.error('Error fetching commission ledger:', error);
    throw error;
  }
}

/**
 * Get tier change history for the evangelist, newest first.
 */
export async function getMyTierHistory(
  evangelistId: string
): Promise<TierHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('tier_history')
      .select('*')
      .eq('evangelist_id', evangelistId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return (data || []) as TierHistoryEntry[];
  } catch (error) {
    log.error('Error fetching tier history:', error);
    throw error;
  }
}

/**
 * Compute dashboard stats from referral conversions and commission ledger.
 */
export async function getReferralStats(
  evangelistId: string,
  currentTier: 1 | 2 | 3 | 4
): Promise<EvangelistStats> {
  try {
    // Fetch referral conversions grouped by status
    const { data: conversions, error: convError } = await supabase
      .from('referral_conversions')
      .select('status')
      .eq('evangelist_id', evangelistId);

    if (convError) throw convError;

    const convList = conversions || [];
    const confirmed_count = convList.filter(
      (c) => c.status === 'confirmed'
    ).length;
    const pending_count = convList.filter(
      (c) => c.status === 'pending'
    ).length;
    const churned_count = convList.filter(
      (c) => c.status === 'churned'
    ).length;

    // Fetch commission ledger for earnings
    const { data: ledger, error: ledgerError } = await supabase
      .from('commission_ledger')
      .select('commission_amount, status')
      .eq('evangelist_id', evangelistId);

    if (ledgerError) throw ledgerError;

    const ledgerList = ledger || [];
    const total_earned = ledgerList
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + Number(e.commission_amount), 0);

    const pending_payment = ledgerList
      .filter(
        (e) => e.status === 'calculated' || e.status === 'pending_payment'
      )
      .reduce((sum, e) => sum + Number(e.commission_amount), 0);

    // Compute next tier remaining
    let next_tier_remaining = 0;
    if (currentTier < 4) {
      const nextTier = (currentTier + 1) as 1 | 2 | 3 | 4;
      const nextMinReferrals = TIER_CONFIG[nextTier].min_referrals;
      next_tier_remaining = Math.max(0, nextMinReferrals - confirmed_count);
    }

    return {
      confirmed_count,
      pending_count,
      churned_count,
      total_earned,
      pending_payment,
      next_tier_remaining,
    };
  } catch (error) {
    log.error('Error computing referral stats:', error);
    throw error;
  }
}
