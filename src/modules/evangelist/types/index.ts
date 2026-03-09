/**
 * Evangelist System Types
 * Sistema de Evangelistas AICA — Phase 1
 */

export interface Evangelist {
  id: string;
  user_id: string;
  referral_code: string;
  tier: EvangelistTier;
  status: 'active' | 'suspended' | 'inactive';
  invited_by?: string;
  pro_granted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EvangelistTier = 1 | 2 | 3 | 4;

export interface TierConfig {
  name: string;
  icon: string;
  min_referrals: number;
  commission_rate: number;
  color: string;
}

export const TIER_CONFIG: Record<EvangelistTier, TierConfig> = {
  1: { name: 'Semente', icon: '\u{1F331}', min_referrals: 0, commission_rate: 0, color: 'green' },
  2: { name: 'Ativador', icon: '\u{1F525}', min_referrals: 3, commission_rate: 0.20, color: 'orange' },
  3: { name: 'Catalisador', icon: '\u{26A1}', min_referrals: 10, commission_rate: 0.30, color: 'yellow' },
  4: { name: 'Embaixador', icon: '\u{1F680}', min_referrals: 25, commission_rate: 0.30, color: 'purple' },
} as const;

export interface ReferralConversion {
  id: string;
  evangelist_id: string;
  referred_user_id: string;
  referral_code: string;
  plan: 'pro' | 'teams';
  plan_value: number;
  status: 'pending' | 'confirmed' | 'churned';
  converted_at: string;
  confirmed_at?: string;
  churned_at?: string;
  created_at: string;
  // Joined from profiles (optional)
  referred_name?: string;
  referred_email?: string;
}

export interface CommissionEntry {
  id: string;
  evangelist_id: string;
  referral_conversion_id?: string;
  period_month: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'calculated' | 'pending_payment' | 'paid' | 'cancelled';
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export interface TierHistoryEntry {
  id: string;
  evangelist_id: string;
  from_tier?: number;
  to_tier: number;
  reason?: string;
  changed_at: string;
}

export interface EvangelistStats {
  confirmed_count: number;
  pending_count: number;
  churned_count: number;
  total_earned: number;
  pending_payment: number;
  next_tier_remaining: number;
}

/** Plan values in BRL */
export const PLAN_VALUES = {
  pro: 39.90,
  teams: 149.00,
} as const;
