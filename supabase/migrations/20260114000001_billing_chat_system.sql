-- ============================================================================
-- AICA Billing, Rate Limiting & Chat System Migration
-- ============================================================================
-- Created: 2026-01-14
-- Purpose: Implement billing plans, token-based rate limiting, credit system,
--          action queuing, and unified chat (WhatsApp + Web + Voice)
-- Related: Issue #132 - AICA Billing & Chat System
-- ============================================================================

-- ============================================================================
-- 1. BILLING PLANS TABLE
-- ============================================================================
-- Pricing tiers with token limits per model tier

CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  name VARCHAR(50) NOT NULL UNIQUE, -- 'Free', 'Pro', 'Teams', 'Enterprise'
  price_brl_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Token limits per 4-hour window
  premium_tokens_per_window INTEGER NOT NULL DEFAULT 0,  -- Gemini 2.0 Flash Thinking Experimental
  standard_tokens_per_window INTEGER NOT NULL DEFAULT 0, -- Gemini 1.5 Flash-8B
  lite_tokens_per_window INTEGER NOT NULL DEFAULT 0,     -- Gemini Nano
  window_duration_hours INTEGER NOT NULL DEFAULT 4,

  -- Rate limiting
  max_concurrent_requests INTEGER NOT NULL DEFAULT 1,

  -- Bonus credits (R$)
  bonus_credits_brl DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Feature flags (JSON: extra features per plan)
  features JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- ============================================================================
-- Track each user's current plan and Stripe subscription

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES billing_plans(id) ON DELETE RESTRICT,

  -- Subscription status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'cancelled', 'past_due', 'trialing')
  ),

  -- Stripe integration
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Cancellation handling
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one active subscription per user
  UNIQUE(user_id)
);

-- ============================================================================
-- 3. TOKEN USAGE TABLE
-- ============================================================================
-- Track token consumption per model tier per window

CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Model tier classification
  model_tier VARCHAR(20) NOT NULL CHECK (
    model_tier IN ('premium', 'standard', 'lite')
  ),

  -- Token tracking
  tokens_used INTEGER NOT NULL DEFAULT 0,

  -- Window tracking (4-hour windows)
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite index for fast window queries
  CONSTRAINT token_usage_window_valid CHECK (window_end > window_start)
);

-- ============================================================================
-- 4. ACTION QUEUE TABLE
-- ============================================================================
-- Queue actions when user hits rate limits

CREATE TABLE IF NOT EXISTS action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action details
  action_type VARCHAR(100) NOT NULL, -- 'generate_dossier', 'transcribe_audio', 'analyze_sentiment'
  action_payload JSONB NOT NULL,     -- Full context to execute action later

  -- Priority & scheduling
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Processing status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  processed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. CREDIT TRANSACTIONS TABLE
-- ============================================================================
-- Track credit purchases and usage (R$ credits for extra tokens)

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction type
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN ('purchase', 'usage', 'bonus', 'refund')
  ),

  -- Amounts
  amount_brl DECIMAL(10,2) NOT NULL, -- R$ amount (negative for usage/refund)
  credits_amount DECIMAL(10,2) NOT NULL, -- Credits added/removed

  -- Stripe integration
  stripe_payment_intent_id VARCHAR(255),

  -- Description & metadata
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. CHAT MESSAGES TABLE
-- ============================================================================
-- Unified chat storage for WhatsApp + Web + Voice channels

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel identification
  channel VARCHAR(20) NOT NULL CHECK (
    channel IN ('whatsapp', 'web', 'voice')
  ),

  -- Message direction
  direction VARCHAR(10) NOT NULL CHECK (
    direction IN ('inbound', 'outbound')
  ),

  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (
    content_type IN ('text', 'audio', 'image', 'video', 'document')
  ),

  -- AI model tracking
  model_used VARCHAR(100), -- e.g., 'gemini-1.5-flash', 'gemini-2.0-flash-thinking'
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,

  -- WhatsApp integration
  whatsapp_message_id VARCHAR(255), -- Evolution API message ID
  whatsapp_phone_number VARCHAR(20), -- E.164 format

  -- Threading support
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Billing Plans
CREATE INDEX IF NOT EXISTS idx_billing_plans_active
  ON billing_plans(is_active) WHERE is_active = true;

-- User Subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON user_subscriptions(stripe_customer_id);

-- Token Usage
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id
  ON token_usage(user_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_window
  ON token_usage(user_id, model_tier, window_start DESC);

-- Action Queue
CREATE INDEX IF NOT EXISTS idx_action_queue_user_id
  ON action_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_queue_status
  ON action_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_action_queue_priority
  ON action_queue(priority DESC, scheduled_for);

-- Credit Transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
  ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON credit_transactions(transaction_type, created_at DESC);

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel
  ON chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_id
  ON chat_messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent
  ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Billing Plans: Public read for active plans
CREATE POLICY "Anyone can view active billing plans"
  ON billing_plans FOR SELECT
  USING (is_active = true);

-- User Subscriptions: Users can only view their own
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Token Usage: Users can only view their own
CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
  ON token_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Action Queue: Users can only view their own
CREATE POLICY "Users can view own action queue"
  ON action_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions"
  ON action_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
  ON action_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Credit Transactions: Users can only view their own
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chat Messages: Users can only view their own
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Check if user has enough tokens available
CREATE OR REPLACE FUNCTION public.check_token_availability(
  p_user_id UUID,
  p_model_tier VARCHAR(20),
  p_tokens_needed INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_plan_limit INTEGER;
  v_tokens_used INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Calculate current window (4-hour blocks)
  v_window_start := date_trunc('hour', NOW()) -
    (EXTRACT(HOUR FROM NOW())::INTEGER % 4) * INTERVAL '1 hour';
  v_window_end := v_window_start + INTERVAL '4 hours';

  -- Get plan limit for this model tier
  SELECT
    CASE p_model_tier
      WHEN 'premium' THEN bp.premium_tokens_per_window
      WHEN 'standard' THEN bp.standard_tokens_per_window
      WHEN 'lite' THEN bp.lite_tokens_per_window
      ELSE 0
    END INTO v_plan_limit
  FROM billing_plans bp
  JOIN user_subscriptions us ON us.plan_id = bp.id
  WHERE us.user_id = p_user_id AND us.status = 'active';

  -- If no active subscription, return false
  IF v_plan_limit IS NULL THEN
    RETURN false;
  END IF;

  -- Get tokens used in current window
  SELECT COALESCE(SUM(tokens_used), 0) INTO v_tokens_used
  FROM token_usage
  WHERE user_id = p_user_id
    AND model_tier = p_model_tier
    AND window_start = v_window_start;

  -- Check if enough tokens available
  RETURN (v_tokens_used + p_tokens_needed) <= v_plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Record token usage
CREATE OR REPLACE FUNCTION public.record_token_usage(
  p_user_id UUID,
  p_model_tier VARCHAR(20),
  p_tokens_used INTEGER
) RETURNS VOID AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Calculate current window
  v_window_start := date_trunc('hour', NOW()) -
    (EXTRACT(HOUR FROM NOW())::INTEGER % 4) * INTERVAL '1 hour';
  v_window_end := v_window_start + INTERVAL '4 hours';

  -- Insert or update token usage
  INSERT INTO token_usage (user_id, model_tier, tokens_used, window_start, window_end)
  VALUES (p_user_id, p_model_tier, p_tokens_used, v_window_start, v_window_end)
  ON CONFLICT ON CONSTRAINT token_usage_unique_window
  DO UPDATE SET tokens_used = token_usage.tokens_used + EXCLUDED.tokens_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Get user's current credit balance
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(
  p_user_id UUID
) RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(credits_amount) FROM credit_transactions WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Get user's current plan details
CREATE OR REPLACE FUNCTION public.get_user_plan_details(
  p_user_id UUID
) RETURNS TABLE (
  plan_name VARCHAR(50),
  premium_tokens INTEGER,
  standard_tokens INTEGER,
  lite_tokens INTEGER,
  max_concurrent INTEGER,
  bonus_credits DECIMAL(10,2),
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.name,
    bp.premium_tokens_per_window,
    bp.standard_tokens_per_window,
    bp.lite_tokens_per_window,
    bp.max_concurrent_requests,
    bp.bonus_credits_brl,
    us.status
  FROM billing_plans bp
  JOIN user_subscriptions us ON us.plan_id = bp.id
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 11. ADD UNIQUE CONSTRAINT FOR TOKEN USAGE
-- ============================================================================
-- Prevent duplicate window entries (required for ON CONFLICT in record_token_usage)

ALTER TABLE token_usage ADD CONSTRAINT token_usage_unique_window
  UNIQUE (user_id, model_tier, window_start);

-- ============================================================================
-- 12. SEED DATA: DEFAULT BILLING PLANS
-- ============================================================================

INSERT INTO billing_plans (name, price_brl_monthly, premium_tokens_per_window, standard_tokens_per_window, lite_tokens_per_window, max_concurrent_requests, bonus_credits_brl, features)
VALUES
  -- Free Plan
  (
    'Free',
    0,
    0,      -- No premium tokens
    1000,   -- 1k standard tokens per 4h
    5000,   -- 5k lite tokens per 4h
    1,      -- 1 concurrent request
    0,
    '{
      "web_chat": true,
      "whatsapp_basic": false,
      "voice_assistant": false,
      "priority_support": false,
      "custom_integrations": false
    }'::jsonb
  ),

  -- Pro Plan
  (
    'Pro',
    49.90,
    5000,   -- 5k premium tokens per 4h
    20000,  -- 20k standard tokens per 4h
    50000,  -- 50k lite tokens per 4h
    3,      -- 3 concurrent requests
    25,     -- R$25 bonus credits
    '{
      "web_chat": true,
      "whatsapp_basic": true,
      "voice_assistant": true,
      "priority_support": true,
      "custom_integrations": false,
      "api_access": false
    }'::jsonb
  ),

  -- Teams Plan
  (
    'Teams',
    149.90,
    20000,  -- 20k premium tokens per 4h
    100000, -- 100k standard tokens per 4h
    200000, -- 200k lite tokens per 4h
    10,     -- 10 concurrent requests
    100,    -- R$100 bonus credits
    '{
      "web_chat": true,
      "whatsapp_basic": true,
      "whatsapp_advanced": true,
      "voice_assistant": true,
      "priority_support": true,
      "custom_integrations": true,
      "api_access": true,
      "team_collaboration": true,
      "advanced_analytics": true
    }'::jsonb
  ),

  -- Enterprise Plan
  (
    'Enterprise',
    499.90,
    100000, -- 100k premium tokens per 4h
    500000, -- 500k standard tokens per 4h
    1000000, -- 1M lite tokens per 4h
    50,     -- 50 concurrent requests
    500,    -- R$500 bonus credits
    '{
      "web_chat": true,
      "whatsapp_basic": true,
      "whatsapp_advanced": true,
      "voice_assistant": true,
      "priority_support": true,
      "dedicated_support": true,
      "custom_integrations": true,
      "api_access": true,
      "team_collaboration": true,
      "advanced_analytics": true,
      "white_label": true,
      "sla_guarantee": true,
      "custom_models": true
    }'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 13. TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE billing_plans IS
  'Pricing tiers with token limits and features for AICA Life OS billing';

COMMENT ON TABLE user_subscriptions IS
  'Tracks each user''s current billing plan and Stripe subscription status';

COMMENT ON TABLE token_usage IS
  'Records token consumption per model tier within 4-hour windows for rate limiting';

COMMENT ON TABLE action_queue IS
  'Queues AI actions when users hit rate limits, executed when tokens available';

COMMENT ON TABLE credit_transactions IS
  'Tracks credit purchases and usage for token overage (R$ credits)';

COMMENT ON TABLE chat_messages IS
  'Unified chat storage for WhatsApp, Web, and Voice channels with AI model tracking';

COMMENT ON COLUMN billing_plans.premium_tokens_per_window IS
  'Token limit for Gemini 2.0 Flash Thinking Experimental (premium tier) per 4h window';

COMMENT ON COLUMN billing_plans.standard_tokens_per_window IS
  'Token limit for Gemini 1.5 Flash-8B (standard tier) per 4h window';

COMMENT ON COLUMN billing_plans.lite_tokens_per_window IS
  'Token limit for Gemini Nano (lite tier) per 4h window';

COMMENT ON COLUMN token_usage.window_start IS
  'Start of 4-hour window (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)';

COMMENT ON COLUMN action_queue.priority IS
  'Priority 1-10 (10=highest). Higher priority actions processed first';

COMMENT ON COLUMN chat_messages.whatsapp_message_id IS
  'Evolution API message ID for WhatsApp messages (null for web/voice)';

COMMENT ON COLUMN chat_messages.parent_message_id IS
  'Reference to parent message for threading support';

-- ============================================================================
-- 14. GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_token_availability(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_token_usage(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_details(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration 20260114_billing_chat_system completed successfully';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - billing_plans (4 seed plans: Free, Pro, Teams, Enterprise)';
  RAISE NOTICE '  - user_subscriptions (Stripe integration)';
  RAISE NOTICE '  - token_usage (4-hour window rate limiting)';
  RAISE NOTICE '  - action_queue (queued actions when rate limited)';
  RAISE NOTICE '  - credit_transactions (R$ credit purchases & usage)';
  RAISE NOTICE '  - chat_messages (WhatsApp + Web + Voice unified)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes: 16 performance indexes';
  RAISE NOTICE 'Created RLS policies: 15 security policies';
  RAISE NOTICE 'Created functions: 4 SECURITY DEFINER helper functions';
  RAISE NOTICE 'Created triggers: 2 updated_at triggers';
  RAISE NOTICE '============================================================================';
END
$$;
