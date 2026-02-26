import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('couponService');

// Types

export interface Coupon {
  id: string;
  code: string;
  credits: number;
  max_redemptions: number | null;
  max_per_user: number;
  current_redemptions: number;
  allowed_plans: string[] | null;
  campaign: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RedeemResult {
  success: boolean;
  credits_earned: number;
  new_balance: number;
  message: string;
}

export interface AdminTopUpResult {
  success: boolean;
  new_balance: number;
  message: string;
}

export interface CreateCouponResult {
  success: boolean;
  coupon_id: string | null;
  message: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  credits: number;
  redeemed_at: string;
  coupons?: { code: string };
}

// User-facing

export async function redeemCoupon(code: string): Promise<RedeemResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, credits_earned: 0, new_balance: 0, message: 'Nao autenticado' };

    const { data, error } = await supabase.rpc('redeem_coupon', {
      p_user_id: user.id,
      p_code: code,
    });

    if (error) {
      log.error('redeem_coupon RPC error:', error);
      return { success: false, credits_earned: 0, new_balance: 0, message: 'Erro ao resgatar cupom' };
    }

    const result = data?.[0] ?? data;
    return {
      success: result?.success ?? false,
      credits_earned: result?.credits_earned ?? 0,
      new_balance: result?.new_balance ?? 0,
      message: result?.message ?? 'Erro desconhecido',
    };
  } catch (err) {
    log.error('redeemCoupon error:', err);
    return { success: false, credits_earned: 0, new_balance: 0, message: 'Erro inesperado' };
  }
}

export async function getUserRedemptions(): Promise<CouponRedemption[]> {
  try {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('id, coupon_id, credits, redeemed_at, coupons(code)')
      .order('redeemed_at', { ascending: false });

    if (error) {
      log.error('getUserRedemptions error:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    log.error('getUserRedemptions error:', err);
    return [];
  }
}

// Admin-facing

export async function adminTopUp(
  targetUserId: string,
  amount: number,
  reason: string
): Promise<AdminTopUpResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, new_balance: 0, message: 'Nao autenticado' };

    const { data, error } = await supabase.rpc('admin_top_up', {
      p_admin_id: user.id,
      p_target_user_id: targetUserId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      log.error('admin_top_up RPC error:', error);
      return { success: false, new_balance: 0, message: 'Erro ao adicionar creditos' };
    }

    const result = data?.[0] ?? data;
    return {
      success: result?.success ?? false,
      new_balance: result?.new_balance ?? 0,
      message: result?.message ?? 'Erro desconhecido',
    };
  } catch (err) {
    log.error('adminTopUp error:', err);
    return { success: false, new_balance: 0, message: 'Erro inesperado' };
  }
}

export async function adminCreateCoupon(params: {
  code: string;
  credits: number;
  maxRedemptions?: number | null;
  maxPerUser?: number;
  allowedPlans?: string[] | null;
  campaign?: string | null;
  startsAt?: string;
  expiresAt?: string | null;
}): Promise<CreateCouponResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, coupon_id: null, message: 'Nao autenticado' };

    const { data, error } = await supabase.rpc('admin_create_coupon', {
      p_admin_id: user.id,
      p_code: params.code,
      p_credits: params.credits,
      p_max_redemptions: params.maxRedemptions ?? null,
      p_max_per_user: params.maxPerUser ?? 1,
      p_allowed_plans: params.allowedPlans ?? null,
      p_campaign: params.campaign ?? null,
      p_starts_at: params.startsAt ?? new Date().toISOString(),
      p_expires_at: params.expiresAt ?? null,
    });

    if (error) {
      log.error('admin_create_coupon RPC error:', error);
      return { success: false, coupon_id: null, message: 'Erro ao criar cupom' };
    }

    const result = data?.[0] ?? data;
    return {
      success: result?.success ?? false,
      coupon_id: result?.coupon_id ?? null,
      message: result?.message ?? 'Erro desconhecido',
    };
  } catch (err) {
    log.error('adminCreateCoupon error:', err);
    return { success: false, coupon_id: null, message: 'Erro inesperado' };
  }
}

export async function adminListCoupons(): Promise<Coupon[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('admin_list_coupons', {
      p_admin_id: user.id,
    });

    if (error) {
      log.error('admin_list_coupons RPC error:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    log.error('adminListCoupons error:', err);
    return [];
  }
}

export async function adminToggleCoupon(
  couponId: string,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Nao autenticado' };

    const { data, error } = await supabase.rpc('admin_toggle_coupon', {
      p_admin_id: user.id,
      p_coupon_id: couponId,
      p_active: active,
    });

    if (error) {
      log.error('admin_toggle_coupon RPC error:', error);
      return { success: false, message: 'Erro ao alterar cupom' };
    }

    const result = data?.[0] ?? data;
    return {
      success: result?.success ?? false,
      message: result?.message ?? 'Erro desconhecido',
    };
  } catch (err) {
    log.error('adminToggleCoupon error:', err);
    return { success: false, message: 'Erro inesperado' };
  }
}
