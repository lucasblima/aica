-- ============================================================================
-- ASAAS PAYMENT GATEWAY — DUAL-GATEWAY SUPPORT
-- Date: 2026-02-17
--
-- Adds Asaas columns alongside existing Stripe columns.
-- Both gateways can coexist dormant-ready.
-- Also fixes missing 'monthly_reset' in credit_transactions CHECK constraint.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Add payment_gateway discriminator to user_subscriptions
-- ============================================================================

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

COMMENT ON COLUMN public.user_subscriptions.payment_gateway IS 'Active gateway: none | stripe | asaas';
COMMENT ON COLUMN public.user_subscriptions.asaas_subscription_id IS 'Asaas subscription ID (sub_xxx)';
COMMENT ON COLUMN public.user_subscriptions.asaas_customer_id IS 'Asaas customer ID (cus_xxx)';

-- ============================================================================
-- PHASE 2: Add asaas_payment_id to credit_transactions
-- ============================================================================

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

COMMENT ON COLUMN public.credit_transactions.asaas_payment_id IS 'Asaas payment ID for purchase transactions';

-- ============================================================================
-- PHASE 3: Add asaas_plan_id to pricing_plans
-- ============================================================================

ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS asaas_plan_id TEXT;

COMMENT ON COLUMN public.pricing_plans.asaas_plan_id IS 'Asaas plan/subscription value identifier';

-- ============================================================================
-- PHASE 4: Fix credit_transactions CHECK constraint
-- The existing constraint may not include 'monthly_reset' which is used by
-- stripe-webhook. Drop and recreate with all valid types.
-- ============================================================================

-- Drop existing constraint if it exists (name may vary)
DO $$
BEGIN
  -- Try to drop known constraint names
  ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
  ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS valid_transaction_type;
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint doesn't exist, that's fine
END $$;

-- Add updated constraint with all valid types
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT valid_transaction_type CHECK (
    transaction_type IN (
      'purchase',
      'daily_bonus',
      'admin_adjustment',
      'usage',
      'referral_bonus',
      'achievement_bonus',
      'monthly_reset',
      'refund'
    )
  );

-- ============================================================================
-- PHASE 5: Indexes for Asaas lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_asaas_subscription_id
  ON public.user_subscriptions (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_asaas_customer_id
  ON public.user_subscriptions (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_gateway
  ON public.user_subscriptions (payment_gateway);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_asaas_payment_id
  ON public.credit_transactions (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;
