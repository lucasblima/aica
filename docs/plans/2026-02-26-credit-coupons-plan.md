# Credit Coupons & Admin Top-Up — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a coupon redemption system + admin panel for credits management so users can redeem promo codes and admin can top-up users manually.

**Architecture:** All logic lives in PostgreSQL RPCs (consistent with existing billing system). Two new tables (`coupons`, `coupon_redemptions`) with RLS. Frontend adds coupon input to CreditBalanceWidget, history section to UsageDashboardPage, and a new admin page at `/admin/coupons`. Existing `AdminGuard` component protects the route.

**Tech Stack:** PostgreSQL (RPCs, RLS), React 18, TypeScript, Tailwind/Ceramic Design System, Framer Motion (animations).

**Design Doc:** `docs/plans/2026-02-26-credit-coupons-design.md`

---

## Task 1: Database Migration — Tables + RLS + RPCs

**Files:**
- Create: `supabase/migrations/20260226100000_credit_coupons.sql`

**Step 1: Write the migration file**

Create migration with:

```sql
-- ============================================================
-- Credit Coupons & Admin Top-Up
-- Tables: coupons, coupon_redemptions
-- RPCs: redeem_coupon, admin_top_up, admin_create_coupon, admin_list_coupons, admin_toggle_coupon
-- ============================================================

-- 1. TABLES

CREATE TABLE IF NOT EXISTS coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  credits              INTEGER NOT NULL CHECK (credits > 0),
  max_redemptions      INTEGER,
  max_per_user         INTEGER DEFAULT 1,
  current_redemptions  INTEGER DEFAULT 0 CHECK (current_redemptions >= 0),
  allowed_plans        TEXT[],
  campaign             TEXT,
  starts_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN DEFAULT true,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  credits     INTEGER NOT NULL CHECK (credits > 0),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

CREATE INDEX idx_coupons_code ON coupons (code);
CREATE INDEX idx_coupons_campaign ON coupons (campaign) WHERE campaign IS NOT NULL;
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions (user_id, redeemed_at DESC);

-- 2. RLS

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- coupons: any authenticated user can read active coupons (needed for validation)
CREATE POLICY "Users can read active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

-- coupons: admin (service_role) full access for CRUD
CREATE POLICY "Service role full access to coupons"
  ON coupons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- coupon_redemptions: users read own
CREATE POLICY "Users can read own redemptions"
  ON coupon_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- coupon_redemptions: users insert own (via RPC, but RLS backup)
CREATE POLICY "Users can insert own redemptions"
  ON coupon_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- coupon_redemptions: service_role full access
CREATE POLICY "Service role full access to redemptions"
  ON coupon_redemptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. RPCs

-- 3a. redeem_coupon — user-facing, atomic
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE(success BOOLEAN, credits_earned INTEGER, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_plan TEXT;
  v_redemption_count INTEGER;
  v_new_balance INTEGER;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_code));

  -- Lock the coupon row
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = v_normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom nao encontrado'::TEXT;
    RETURN;
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom desativado'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.starts_at > NOW() THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom ainda nao esta ativo'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= NOW() THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom expirado'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
    RETURN QUERY SELECT false, 0, 0, 'Cupom esgotado'::TEXT;
    RETURN;
  END IF;

  -- Check plan restriction
  IF v_coupon.allowed_plans IS NOT NULL THEN
    SELECT COALESCE(us.plan_id, 'free') INTO v_user_plan
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id AND us.status = 'active'
    LIMIT 1;

    v_user_plan := COALESCE(v_user_plan, 'free');

    IF NOT (v_user_plan = ANY(v_coupon.allowed_plans)) THEN
      RETURN QUERY SELECT false, 0, 0, ('Cupom nao disponivel para o plano ' || v_user_plan)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check per-user limit
  SELECT COUNT(*) INTO v_redemption_count
  FROM coupon_redemptions cr
  WHERE cr.coupon_id = v_coupon.id AND cr.user_id = p_user_id;

  IF v_redemption_count >= v_coupon.max_per_user THEN
    RETURN QUERY SELECT false, 0, 0, 'Voce ja resgatou este cupom'::TEXT;
    RETURN;
  END IF;

  -- All checks passed — redeem!

  -- 1. Insert redemption record
  INSERT INTO coupon_redemptions (coupon_id, user_id, credits)
  VALUES (v_coupon.id, p_user_id, v_coupon.credits);

  -- 2. Increment coupon usage counter
  UPDATE coupons
  SET current_redemptions = current_redemptions + 1,
      updated_at = NOW()
  WHERE id = v_coupon.id;

  -- 3. Add credits to user (upsert in case user_credits row missing)
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (p_user_id, v_coupon.credits, v_coupon.credits)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + v_coupon.credits,
      lifetime_earned = user_credits.lifetime_earned + v_coupon.credits,
      updated_at = NOW();

  -- Get new balance
  SELECT uc.balance INTO v_new_balance
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;

  -- 4. Log transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'admin_adjustment',
    v_coupon.credits,
    v_new_balance,
    'Cupom: ' || v_coupon.code
  );

  RETURN QUERY SELECT true, v_coupon.credits, v_new_balance, 'Cupom resgatado com sucesso!'::TEXT;
END;
$$;

-- 3b. admin_top_up — admin grants credits to any user
CREATE OR REPLACE FUNCTION admin_top_up(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'Admin top-up'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Admin check (hardcoded owner UID)
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, 0, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 'Valor deve ser positivo'::TEXT;
    RETURN;
  END IF;

  -- Upsert credits
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (p_target_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_amount,
      lifetime_earned = user_credits.lifetime_earned + p_amount,
      updated_at = NOW();

  SELECT uc.balance INTO v_new_balance
  FROM user_credits uc
  WHERE uc.user_id = p_target_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, metadata)
  VALUES (
    p_target_user_id,
    'admin_adjustment',
    p_amount,
    v_new_balance,
    p_reason,
    jsonb_build_object('admin_id', p_admin_id, 'type', 'top_up')
  );

  RETURN QUERY SELECT true, v_new_balance, ('Adicionados ' || p_amount || ' creditos')::TEXT;
END;
$$;

-- 3c. admin_create_coupon
CREATE OR REPLACE FUNCTION admin_create_coupon(
  p_admin_id UUID,
  p_code TEXT,
  p_credits INTEGER,
  p_max_redemptions INTEGER DEFAULT NULL,
  p_max_per_user INTEGER DEFAULT 1,
  p_allowed_plans TEXT[] DEFAULT NULL,
  p_campaign TEXT DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NOW(),
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, coupon_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id UUID;
  v_normalized_code TEXT;
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  IF p_credits <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Creditos devem ser positivos'::TEXT;
    RETURN;
  END IF;

  v_normalized_code := UPPER(TRIM(p_code));

  IF LENGTH(v_normalized_code) < 3 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Codigo deve ter pelo menos 3 caracteres'::TEXT;
    RETURN;
  END IF;

  INSERT INTO coupons (code, credits, max_redemptions, max_per_user, allowed_plans, campaign, starts_at, expires_at, created_by)
  VALUES (v_normalized_code, p_credits, p_max_redemptions, p_max_per_user, p_allowed_plans, p_campaign, p_starts_at, p_expires_at, p_admin_id)
  RETURNING id INTO v_coupon_id;

  RETURN QUERY SELECT true, v_coupon_id, ('Cupom ' || v_normalized_code || ' criado')::TEXT;

EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT false, NULL::UUID, 'Codigo ja existe'::TEXT;
END;
$$;

-- 3d. admin_list_coupons
CREATE OR REPLACE FUNCTION admin_list_coupons(p_admin_id UUID)
RETURNS TABLE(
  id UUID,
  code TEXT,
  credits INTEGER,
  max_redemptions INTEGER,
  max_per_user INTEGER,
  current_redemptions INTEGER,
  allowed_plans TEXT[],
  campaign TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.code, c.credits, c.max_redemptions, c.max_per_user,
         c.current_redemptions, c.allowed_plans, c.campaign,
         c.starts_at, c.expires_at, c.is_active, c.created_at
  FROM coupons c
  ORDER BY c.created_at DESC;
END;
$$;

-- 3e. admin_toggle_coupon
CREATE OR REPLACE FUNCTION admin_toggle_coupon(
  p_admin_id UUID,
  p_coupon_id UUID,
  p_active BOOLEAN
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id != '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID THEN
    RETURN QUERY SELECT false, 'Acesso negado'::TEXT;
    RETURN;
  END IF;

  UPDATE coupons
  SET is_active = p_active, updated_at = NOW()
  WHERE id = p_coupon_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom nao encontrado'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, CASE WHEN p_active THEN 'Cupom ativado' ELSE 'Cupom desativado' END::TEXT;
END;
$$;

-- 4. VERIFICATION
DO $$
BEGIN
  -- Verify tables exist
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'coupons')), 'coupons table missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'coupon_redemptions')), 'coupon_redemptions table missing';

  -- Verify RLS enabled
  ASSERT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'coupons'), 'coupons RLS not enabled';
  ASSERT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'coupon_redemptions'), 'coupon_redemptions RLS not enabled';

  -- Verify functions exist
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'redeem_coupon')), 'redeem_coupon function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_top_up')), 'admin_top_up function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_create_coupon')), 'admin_create_coupon function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_list_coupons')), 'admin_list_coupons function missing';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_toggle_coupon')), 'admin_toggle_coupon function missing';

  RAISE NOTICE '✅ Credit coupons migration verified successfully';
END;
$$;
```

**Step 2: Apply migration locally**

Run: `npx supabase db push`
Expected: Migration applies, verification block prints success notice.

**Step 3: Verify RPCs exist**

Run: `npx supabase db push` (should show "applied" or "already applied")
Verify via Supabase Dashboard: Database → Functions → search for `redeem_coupon`, `admin_top_up`, etc.

**Step 4: Commit**

```bash
git add supabase/migrations/20260226100000_credit_coupons.sql
git commit -m "feat(billing): add coupons + admin top-up migration

Tables: coupons, coupon_redemptions with RLS
RPCs: redeem_coupon, admin_top_up, admin_create_coupon, admin_list_coupons, admin_toggle_coupon

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Coupon Service

**Files:**
- Create: `src/services/couponService.ts`

**Step 1: Create the service**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/services/couponService.ts
git commit -m "feat(billing): add couponService with RPC wrappers

User: redeemCoupon, getUserRedemptions
Admin: adminTopUp, adminCreateCoupon, adminListCoupons, adminToggleCoupon

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: useCouponRedemption Hook

**Files:**
- Create: `src/hooks/useCouponRedemption.ts`

**Step 1: Create the hook**

```typescript
import { useState, useCallback } from 'react';
import { redeemCoupon, type RedeemResult } from '@/services/couponService';

interface UseCouponRedemptionReturn {
  isRedeeming: boolean;
  result: RedeemResult | null;
  error: string | null;
  redeem: (code: string) => Promise<RedeemResult>;
  reset: () => void;
}

export function useCouponRedemption(): UseCouponRedemptionReturn {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = useCallback(async (code: string): Promise<RedeemResult> => {
    const trimmed = code.trim();
    if (!trimmed) {
      const fail = { success: false, credits_earned: 0, new_balance: 0, message: 'Digite um codigo' };
      setError(fail.message);
      return fail;
    }

    setIsRedeeming(true);
    setError(null);
    setResult(null);

    const res = await redeemCoupon(trimmed);

    if (res.success) {
      setResult(res);
      setError(null);
    } else {
      setError(res.message);
      setResult(null);
    }

    setIsRedeeming(false);
    return res;
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isRedeeming, result, error, redeem, reset };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useCouponRedemption.ts
git commit -m "feat(billing): add useCouponRedemption hook

Manages redeem state: loading, result, error, reset

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: useAdminCoupons Hook

**Files:**
- Create: `src/hooks/useAdminCoupons.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  adminListCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminTopUp,
  type Coupon,
  type CreateCouponResult,
  type AdminTopUpResult,
} from '@/services/couponService';

interface UseAdminCouponsReturn {
  coupons: Coupon[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createCoupon: (params: {
    code: string;
    credits: number;
    maxRedemptions?: number | null;
    maxPerUser?: number;
    allowedPlans?: string[] | null;
    campaign?: string | null;
    startsAt?: string;
    expiresAt?: string | null;
  }) => Promise<CreateCouponResult>;
  toggleCoupon: (couponId: string, active: boolean) => Promise<{ success: boolean; message: string }>;
  topUp: (targetUserId: string, amount: number, reason: string) => Promise<AdminTopUpResult>;
}

export function useAdminCoupons(): UseAdminCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const data = await adminListCoupons();
    setCoupons(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCoupon = useCallback(async (params: Parameters<typeof adminCreateCoupon>[0]) => {
    const result = await adminCreateCoupon(params);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const toggleCoupon = useCallback(async (couponId: string, active: boolean) => {
    const result = await adminToggleCoupon(couponId, active);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const topUp = useCallback(async (targetUserId: string, amount: number, reason: string) => {
    return adminTopUp(targetUserId, amount, reason);
  }, []);

  return { coupons, isLoading, refresh, createCoupon, toggleCoupon, topUp };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAdminCoupons.ts
git commit -m "feat(billing): add useAdminCoupons hook

CRUD + top-up, auto-refreshes list on create/toggle

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: CreditBalanceWidget — Add Coupon Input

**Files:**
- Modify: `src/components/features/CreditBalanceWidget.tsx`

**Step 1: Add coupon redemption UI**

After the daily claim button section (~line 155), add a coupon input section:

- Import `useCouponRedemption` from `@/hooks/useCouponRedemption`
- Add state: `showCouponInput` (boolean toggle)
- Add button "Tenho um cupom" that toggles the input
- Input field + "Resgatar" button (inline, animated with AnimatePresence)
- Success: show green "+X creditos!" message for 3 seconds, then collapse
- Error: show red message inline
- On success, the Realtime subscription on `user_credits` auto-updates the balance

Key UI details:
- Button style: text link style (not primary button), `text-amber-600 hover:text-amber-700 text-xs`
- Input: `border border-ceramic-border rounded-lg px-3 py-1.5 text-sm uppercase`
- Resgatar button: `bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm`
- Use `AnimatePresence` + `motion.div` for expand/collapse (consistent with existing claim animation)

**Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/features/CreditBalanceWidget.tsx
git commit -m "feat(billing): add coupon input to CreditBalanceWidget

Inline expand/collapse, success/error states, auto-updates via Realtime

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: UsageDashboardPage — Add Redemption History

**Files:**
- Modify: `src/modules/billing/pages/UsageDashboardPage.tsx`

**Step 1: Add redemption history section**

Between the "Recent Interactions" table and the "Credit Transactions" table (around line 430), add:

- Import `getUserRedemptions`, `CouponRedemption` from `@/services/couponService`
- Add state: `redemptions: CouponRedemption[]`
- Fetch in existing `loadData()` function (add to the parallel fetches)
- Render a Ceramic card with:
  - Title: "Cupons Resgatados"
  - Empty state: "Nenhum cupom resgatado ainda."
  - Table columns: Codigo, Creditos, Data
  - Same styling as existing "Transacoes de Creditos" table

Also add the coupon input here (reuse `useCouponRedemption`):
- Input field + "Resgatar" button above the redemptions table
- Same behavior as widget but in full-width layout

**Step 2: Run build**

Run: `npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/modules/billing/pages/UsageDashboardPage.tsx
git commit -m "feat(billing): add coupon redemption + history to UsageDashboardPage

Coupon input + redemptions table with code, credits, date

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Admin Coupons Page

**Files:**
- Create: `src/modules/billing/pages/AdminCouponsPage.tsx`

**Step 1: Create the admin page**

Three sections (Ceramic design system):

**Section 1 — Top-Up Manual**
- Form: User ID input, Amount input (number), Reason input (text)
- Submit button: "Adicionar Creditos"
- Success/error feedback inline

**Section 2 — Criar Cupom**
- Form fields:
  - Codigo (text, uppercase)
  - Creditos (number)
  - Limite total (number, optional — placeholder "Ilimitado")
  - Por usuario (number, default 1)
  - Planos (checkboxes: Free, Pro, Teams — or "Todos" if none checked)
  - Campanha (text, optional)
  - Expira em (date input, optional)
- Submit: "Criar Cupom"

**Section 3 — Cupons Existentes**
- Table columns: Codigo, Creditos, Usos (current/max or ∞), Campanha, Expira, Ativo (toggle)
- Toggle switch per row to activate/deactivate
- Empty state: "Nenhum cupom criado ainda."

Use `useAdminCoupons` hook for all operations.

Wrap page in `<PageShell title="Admin — Cupons">`.

**Step 2: Export from billing module barrel**

Modify: `src/modules/billing/index.ts` — add `export { AdminCouponsPage } from './pages/AdminCouponsPage';`

**Step 3: Run build**

Run: `npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/modules/billing/pages/AdminCouponsPage.tsx src/modules/billing/index.ts
git commit -m "feat(billing): add AdminCouponsPage with top-up, create, list

Three sections: manual top-up, coupon CRUD, existing coupons table with toggle

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Route Registration

**Files:**
- Modify: `src/router/AppRouter.tsx`

**Step 1: Add route and lazy import**

At the top with other billing lazy imports (~line 93-96), add:
```typescript
const AdminCouponsPage = lazy(() => import('../modules/billing').then(m => ({ default: m.AdminCouponsPage })));
```

In the routes section after the billing routes (~line 861), add:
```tsx
{/* Admin Routes - Protected by AdminGuard */}
<Route
   path="/admin/coupons"
   element={<ProtectedRoute><AdminGuard><AdminCouponsPage /></AdminGuard></ProtectedRoute>}
/>
```

Import `AdminGuard` at top if not already imported:
```typescript
import { AdminGuard } from '@/components/guards/AdminGuard';
```

**Step 2: Run build**

Run: `npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/router/AppRouter.tsx
git commit -m "feat(billing): register /admin/coupons route with AdminGuard

Lazy-loaded, protected by ProtectedRoute + AdminGuard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Push Migration + Create First Coupon

**Step 1: Push migration to remote**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 2: Verify RPCs exist**

Check Supabase Dashboard → Database → Functions: `redeem_coupon`, `admin_top_up`, `admin_create_coupon`, `admin_list_coupons`, `admin_toggle_coupon`.

**Step 3: Create a test coupon via SQL**

Run in Supabase SQL Editor:
```sql
SELECT * FROM admin_create_coupon(
  '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID,
  'AICA100',
  100,
  NULL,  -- unlimited redemptions
  1,     -- 1 per user
  NULL,  -- all plans
  'launch',
  NOW(),
  NULL   -- never expires
);
```

**Step 4: Top-up your own user immediately**

```sql
SELECT * FROM admin_top_up(
  '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID,
  '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'::UUID,
  200,
  'Admin self top-up — sistema de cupons'
);
```

**Step 5: Commit (no code changes, but verify build)**

Run: `npm run build && npm run typecheck`
Expected: Both pass.

---

## Task 10: Final Build + PR

**Step 1: Full build verification**

Run: `npm run build && npm run typecheck`
Expected: Both pass with zero errors.

**Step 2: Create PR**

```bash
git push -u origin feat-credit-coupons
gh pr create --title "feat(billing): credit coupons + admin top-up (#coupon-system)" --body "$(cat <<'EOF'
## Summary
- New tables `coupons` and `coupon_redemptions` with RLS
- 5 RPCs: `redeem_coupon`, `admin_top_up`, `admin_create_coupon`, `admin_list_coupons`, `admin_toggle_coupon`
- Coupon input in CreditBalanceWidget (inline expand)
- Redemption history in UsageDashboardPage
- Admin panel at `/admin/coupons` (top-up, create, list/toggle)
- Protected by AdminGuard (user_metadata.is_admin)

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Migration applies cleanly (`npx supabase db push`)
- [ ] Admin can create coupon at /admin/coupons
- [ ] Admin can top-up user credits
- [ ] User can redeem coupon in CreditBalanceWidget
- [ ] Duplicate redemption blocked
- [ ] Expired coupon blocked
- [ ] Redemption history shows in /usage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Dependency Graph

```
Task 1 (Migration)
  └─ Task 2 (couponService) — needs RPCs to exist conceptually
       ├─ Task 3 (useCouponRedemption) — uses couponService
       │    └─ Task 5 (CreditBalanceWidget) — uses hook
       │    └─ Task 6 (UsageDashboardPage) — uses hook + service
       └─ Task 4 (useAdminCoupons) — uses couponService
            └─ Task 7 (AdminCouponsPage) — uses hook
                 └─ Task 8 (Route registration) — needs page component
Task 9 (Push migration + first coupon) — after all code
Task 10 (Build + PR) — last
```
