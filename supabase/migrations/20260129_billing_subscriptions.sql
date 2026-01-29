-- Migration: Billing Subscriptions Table
-- Issue #177: Support for modelRouterService tier management
-- Epic #132: AICA Billing & Unified Chat System
-- Description: Creates billing_subscriptions table for AI model tier management and token limits

-- ============================================================================
-- Create Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan details
  plan_name TEXT NOT NULL DEFAULT 'Free',
  tier TEXT NOT NULL DEFAULT 'lite' CHECK (tier IN ('lite', 'standard', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),

  -- Token limits per tier
  token_limits JSONB NOT NULL DEFAULT '{
    "premium": 50000,
    "standard": 200000,
    "lite": 1000000
  }'::jsonb,

  -- Billing period
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),

  -- Validity period
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  -- Metadata
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  payment_method TEXT,
  last_payment_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_billing_subscriptions_user_id ON billing_subscriptions(user_id);
CREATE INDEX idx_billing_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX idx_billing_subscriptions_tier ON billing_subscriptions(tier);
CREATE INDEX idx_billing_subscriptions_ends_at ON billing_subscriptions(ends_at) WHERE ends_at IS NOT NULL;
CREATE INDEX idx_billing_subscriptions_stripe_subscription_id ON billing_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- Row-Level Security
-- ============================================================================
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscription
CREATE POLICY "Users can view own subscription"
  ON billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot modify subscriptions (admin only)
CREATE POLICY "Only service role can modify subscriptions"
  ON billing_subscriptions FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- Updated Timestamp Trigger
-- ============================================================================
CREATE TRIGGER update_billing_subscriptions_updated_at
  BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Function: Get Active Subscription for User
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id UUID)
RETURNS billing_subscriptions AS $$
BEGIN
  RETURN (
    SELECT *
    FROM billing_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > NOW())
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_active_subscription(UUID) TO authenticated;

-- ============================================================================
-- Helper Function: Check if User Has Premium Access
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM billing_subscriptions
    WHERE user_id = p_user_id
      AND tier IN ('premium', 'standard')
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.has_premium_access(UUID) TO authenticated;

-- ============================================================================
-- Seed Data: Default Free Tier for Existing Users
-- ============================================================================
-- Note: This will create free tier subscriptions for all existing users who don't have one
INSERT INTO billing_subscriptions (user_id, plan_name, tier, status)
SELECT
  id,
  'Free',
  'lite',
  'active'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM billing_subscriptions WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE billing_subscriptions IS 'User billing plans and AI token limits for model router (Epic #132)';
COMMENT ON COLUMN billing_subscriptions.tier IS 'AI model tier: lite (free), standard (paid), or premium (enterprise)';
COMMENT ON COLUMN billing_subscriptions.token_limits IS 'JSON with monthly token limits per tier (premium, standard, lite)';
COMMENT ON COLUMN billing_subscriptions.status IS 'Subscription status: active, cancelled, expired, or paused';
COMMENT ON COLUMN billing_subscriptions.billing_period IS 'Billing cycle: monthly, yearly, or lifetime';
COMMENT ON COLUMN billing_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for payment tracking';
