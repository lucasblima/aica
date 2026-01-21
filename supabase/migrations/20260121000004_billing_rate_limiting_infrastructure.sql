-- ============================================================================
-- MIGRATION: AICA Billing & Rate Limiting Infrastructure
-- Issue #132: AICA Billing, Rate Limiting & Unified Chat System
-- Date: 2026-01-21
--
-- PURPOSE:
-- Create billing infrastructure with time-window based rate limiting:
-- 1. pricing_plans - Plan definitions (free, pro, teams)
-- 2. user_subscriptions - User plan subscriptions
-- 3. user_token_usage - Token consumption per 4-hour window
-- 4. user_credits - Credit balance for bypass
-- 5. credit_transactions - Credit history
-- 6. message_queue - Queued messages when limits exceeded
-- 7. chat_messages - Unified chat history
-- ============================================================================

-- ============================================================================
-- PART 1: PRICING PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_brl_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_brl_yearly DECIMAL(10,2),

  -- Token budgets per 4-hour window
  premium_tokens_per_window BIGINT NOT NULL DEFAULT 10000,
  standard_tokens_per_window BIGINT NOT NULL DEFAULT 50000,
  lite_tokens_per_window BIGINT NOT NULL DEFAULT 200000,

  -- Window configuration
  window_duration_hours INTEGER NOT NULL DEFAULT 4,

  -- Limits
  max_concurrent_requests INTEGER DEFAULT 3,
  max_queued_messages INTEGER DEFAULT 10,

  -- Bonus credits included
  bonus_credits_brl DECIMAL(10,2) DEFAULT 0,

  -- Features (JSONB for flexibility)
  features JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default plans
INSERT INTO pricing_plans (id, name, description, price_brl_monthly, premium_tokens_per_window, standard_tokens_per_window, lite_tokens_per_window, bonus_credits_brl, features) VALUES
  ('free', 'Free', 'Plano gratuito com limites básicos', 0, 10000, 50000, 200000, 0, '["Chat básico", "Modelo lite"]'::jsonb),
  ('pro', 'Pro', 'Para uso profissional', 39.90, 100000, 500000, 2000000, 10, '["Todos os modelos", "Prioridade na fila", "Suporte prioritário"]'::jsonb),
  ('teams', 'Teams', 'Para equipes', 149.00, 500000, 2000000, 10000000, 50, '["Tudo do Pro", "Múltiplos usuários", "Dashboard de uso", "API access"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE pricing_plans IS
  'Pricing plans for AICA billing system. Token budgets are per 4-hour window.';

-- ============================================================================
-- PART 2: USER SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES pricing_plans(id) DEFAULT 'free',

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 month',

  -- External references (Stripe, MercadoPago, etc)
  external_subscription_id TEXT,
  external_customer_id TEXT,

  -- Trial
  trial_end TIMESTAMPTZ,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Auto-create free subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Trigger should be created on auth.users but we can't directly
-- Instead, we'll handle this in the application layer or use a different approach

COMMENT ON TABLE user_subscriptions IS
  'User subscription status and billing info';

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_service" ON user_subscriptions
  FOR ALL TO service_role
  USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON user_subscriptions(user_id);

-- ============================================================================
-- PART 3: USER TOKEN USAGE (Per Window)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time window (4-hour blocks)
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Token consumption by tier
  premium_tokens_used BIGINT DEFAULT 0,
  standard_tokens_used BIGINT DEFAULT 0,
  lite_tokens_used BIGINT DEFAULT 0,

  -- Limits from plan at window creation
  premium_tokens_limit BIGINT NOT NULL,
  standard_tokens_limit BIGINT NOT NULL,
  lite_tokens_limit BIGINT NOT NULL,

  -- Plan reference
  plan_id TEXT NOT NULL,

  -- Request counts
  request_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, window_start)
);

COMMENT ON TABLE user_token_usage IS
  'Token usage tracking per 4-hour window. Resets automatically at window boundaries.';

-- RLS
ALTER TABLE user_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_token_usage_select_own" ON user_token_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_token_usage_service" ON user_token_usage
  FOR ALL TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_token_usage_current
  ON user_token_usage(user_id, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_user_token_usage_window
  ON user_token_usage(window_start, window_end);

-- ============================================================================
-- PART 4: USER CREDITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Balance in BRL (converted to tokens on use)
  balance_brl DECIMAL(10,2) DEFAULT 0 CHECK (balance_brl >= 0),

  -- Lifetime stats
  total_purchased_brl DECIMAL(10,2) DEFAULT 0,
  total_used_brl DECIMAL(10,2) DEFAULT 0,
  total_bonus_brl DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

COMMENT ON TABLE user_credits IS
  'User credit balance for bypassing rate limits. Credits are in BRL.';

-- RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_select_own" ON user_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_credits_service" ON user_credits
  FOR ALL TO service_role
  USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_credits_user
  ON user_credits(user_id);

-- ============================================================================
-- PART 5: CREDIT TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction type
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('purchase', 'usage', 'bonus', 'refund', 'expiry', 'subscription_bonus')),

  -- Amount (positive for credits, negative for debits)
  amount_brl DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  -- Details
  description TEXT,

  -- Token equivalent (for usage transactions)
  tokens_equivalent BIGINT,
  model_tier TEXT,

  -- External references
  payment_id TEXT,
  payment_provider TEXT, -- 'stripe', 'mercadopago', etc

  -- Related records
  usage_record_id UUID,
  message_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE credit_transactions IS
  'Audit log of all credit transactions (purchases, usage, bonuses, refunds)';

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_select_own" ON credit_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "credit_transactions_service" ON credit_transactions
  FOR ALL TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON credit_transactions(transaction_type, created_at DESC);

-- ============================================================================
-- PART 6: MESSAGE QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'audio', 'image', 'document')),
  source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('web', 'whatsapp', 'voice', 'api')),

  -- Configuration
  preferred_model_tier TEXT DEFAULT 'standard'
    CHECK (preferred_model_tier IN ('premium', 'standard', 'lite')),
  context JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Scheduling
  queued_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ, -- NULL = process when window available
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Result
  response_content TEXT,
  tokens_used BIGINT,
  model_used TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE message_queue IS
  'Queue for messages that exceed rate limits. Processed when tokens become available.';

-- RLS
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_queue_select_own" ON message_queue
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "message_queue_insert_own" ON message_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "message_queue_update_own" ON message_queue
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'queued'); -- Can only cancel queued

CREATE POLICY "message_queue_service" ON message_queue
  FOR ALL TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_queue_pending
  ON message_queue(user_id, status, priority DESC, queued_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_message_queue_processing
  ON message_queue(status, started_at)
  WHERE status = 'processing';

-- ============================================================================
-- PART 7: CHAT MESSAGES (Unified Chat History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation
  conversation_id UUID, -- NULL for main conversation

  -- Message
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Source
  source TEXT NOT NULL DEFAULT 'web'
    CHECK (source IN ('web', 'whatsapp', 'voice', 'api')),

  -- Model info (for assistant messages)
  model_tier TEXT,
  model_name TEXT,
  tokens_used BIGINT,

  -- Status
  status TEXT DEFAULT 'delivered'
    CHECK (status IN ('sending', 'sent', 'delivered', 'queued', 'error')),

  -- WhatsApp sync
  whatsapp_message_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE chat_messages IS
  'Unified chat history across all channels (web, WhatsApp, voice)';

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_service" ON chat_messages
  FOR ALL TO service_role
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conversation
  ON chat_messages(user_id, conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_recent
  ON chat_messages(user_id, created_at DESC);

-- ============================================================================
-- PART 8: RPC FUNCTIONS
-- ============================================================================

-- Get or create current window for user
CREATE OR REPLACE FUNCTION get_or_create_current_window(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  premium_used BIGINT,
  premium_limit BIGINT,
  premium_remaining BIGINT,
  standard_used BIGINT,
  standard_limit BIGINT,
  standard_remaining BIGINT,
  lite_used BIGINT,
  lite_limit BIGINT,
  lite_remaining BIGINT,
  seconds_until_reset INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_window_duration INTEGER := 4; -- hours
  v_window RECORD;
  v_plan RECORD;
BEGIN
  -- Calculate current window boundaries
  v_window_start := date_trunc('hour', v_now) -
    (EXTRACT(HOUR FROM v_now)::INTEGER % v_window_duration) * INTERVAL '1 hour';
  v_window_end := v_window_start + v_window_duration * INTERVAL '1 hour';

  -- Try to get existing window
  SELECT * INTO v_window
  FROM user_token_usage utu
  WHERE utu.user_id = p_user_id
    AND utu.window_start = v_window_start;

  -- If no window exists, create one
  IF v_window.id IS NULL THEN
    -- Get user's plan limits
    SELECT pp.* INTO v_plan
    FROM user_subscriptions us
    JOIN pricing_plans pp ON pp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status = 'active';

    -- Default to free plan if no subscription
    IF v_plan.id IS NULL THEN
      SELECT * INTO v_plan FROM pricing_plans WHERE id = 'free';
    END IF;

    -- Create new window
    INSERT INTO user_token_usage (
      user_id, window_start, window_end,
      premium_tokens_limit, standard_tokens_limit, lite_tokens_limit,
      plan_id
    ) VALUES (
      p_user_id, v_window_start, v_window_end,
      v_plan.premium_tokens_per_window,
      v_plan.standard_tokens_per_window,
      v_plan.lite_tokens_per_window,
      v_plan.id
    )
    RETURNING * INTO v_window;
  END IF;

  -- Return window status
  RETURN QUERY SELECT
    v_window.id,
    v_window.window_start,
    v_window.window_end,
    v_window.premium_tokens_used,
    v_window.premium_tokens_limit,
    GREATEST(0, v_window.premium_tokens_limit - v_window.premium_tokens_used),
    v_window.standard_tokens_used,
    v_window.standard_tokens_limit,
    GREATEST(0, v_window.standard_tokens_limit - v_window.standard_tokens_used),
    v_window.lite_tokens_used,
    v_window.lite_tokens_limit,
    GREATEST(0, v_window.lite_tokens_limit - v_window.lite_tokens_used),
    EXTRACT(EPOCH FROM (v_window.window_end - v_now))::INTEGER;
END;
$$;

COMMENT ON FUNCTION get_or_create_current_window IS
  'Get current rate limit window for user, creating if necessary';

-- Atomic token increment
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id UUID,
  p_tier TEXT,
  p_tokens BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column TEXT;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Validate tier
  IF p_tier NOT IN ('premium', 'standard', 'lite') THEN
    RAISE EXCEPTION 'Invalid tier: %', p_tier;
  END IF;

  v_column := p_tier || '_tokens_used';

  -- Calculate current window start
  v_window_start := date_trunc('hour', now()) -
    (EXTRACT(HOUR FROM now())::INTEGER % 4) * INTERVAL '1 hour';

  -- Ensure window exists
  PERFORM get_or_create_current_window(p_user_id);

  -- Atomic increment
  EXECUTE format(
    'UPDATE user_token_usage SET %I = %I + $1, request_count = request_count + 1, updated_at = now() WHERE user_id = $2 AND window_start = $3',
    v_column, v_column
  ) USING p_tokens, p_user_id, v_window_start;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION increment_token_usage IS
  'Atomically increment token usage for a tier in the current window';

-- Deduct user credits
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id UUID,
  p_amount_brl DECIMAL,
  p_tokens BIGINT,
  p_tier TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  -- Ensure user has credit record
  INSERT INTO user_credits (user_id, balance_brl)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Deduct credits
  UPDATE user_credits
  SET balance_brl = balance_brl - p_amount_brl,
      total_used_brl = total_used_brl + p_amount_brl,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance_brl >= p_amount_brl
  RETURNING balance_brl INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount_brl, balance_after,
    description, tokens_equivalent, model_tier
  ) VALUES (
    p_user_id, 'usage', -p_amount_brl, v_new_balance,
    COALESCE(p_description, 'Token usage with credits'),
    p_tokens, p_tier
  );

  RETURN v_new_balance;
END;
$$;

COMMENT ON FUNCTION deduct_user_credits IS
  'Deduct credits from user balance and record transaction';

-- Add user credits
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_amount_brl DECIMAL,
  p_transaction_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  -- Ensure user has credit record
  INSERT INTO user_credits (user_id, balance_brl)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add credits
  UPDATE user_credits
  SET balance_brl = balance_brl + p_amount_brl,
      total_purchased_brl = CASE WHEN p_transaction_type = 'purchase'
        THEN total_purchased_brl + p_amount_brl
        ELSE total_purchased_brl END,
      total_bonus_brl = CASE WHEN p_transaction_type IN ('bonus', 'subscription_bonus')
        THEN total_bonus_brl + p_amount_brl
        ELSE total_bonus_brl END,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_brl INTO v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount_brl, balance_after,
    description, payment_id, payment_provider
  ) VALUES (
    p_user_id, p_transaction_type, p_amount_brl, v_new_balance,
    p_description, p_payment_id, p_payment_provider
  );

  RETURN v_new_balance;
END;
$$;

COMMENT ON FUNCTION add_user_credits IS
  'Add credits to user balance and record transaction';

-- Get user credit balance
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT balance_brl INTO v_balance
  FROM user_credits
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- Get users with available tokens (for queue processing)
CREATE OR REPLACE FUNCTION get_users_with_available_tokens(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  premium_remaining BIGINT,
  standard_remaining BIGINT,
  lite_remaining BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate current window start
  v_window_start := date_trunc('hour', now()) -
    (EXTRACT(HOUR FROM now())::INTEGER % 4) * INTERVAL '1 hour';

  RETURN QUERY
  SELECT DISTINCT
    mq.user_id,
    GREATEST(0, utu.premium_tokens_limit - utu.premium_tokens_used) AS premium_remaining,
    GREATEST(0, utu.standard_tokens_limit - utu.standard_tokens_used) AS standard_remaining,
    GREATEST(0, utu.lite_tokens_limit - utu.lite_tokens_used) AS lite_remaining
  FROM message_queue mq
  JOIN user_token_usage utu ON utu.user_id = mq.user_id
    AND utu.window_start = v_window_start
  WHERE mq.status = 'queued'
    AND (
      utu.premium_tokens_used < utu.premium_tokens_limit OR
      utu.standard_tokens_used < utu.standard_tokens_limit OR
      utu.lite_tokens_used < utu.lite_tokens_limit
    )
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_users_with_available_tokens IS
  'Get users who have queued messages and available tokens in current window';

-- ============================================================================
-- PART 9: PRICING HELPERS
-- ============================================================================

-- Token pricing in BRL per 1M tokens
CREATE OR REPLACE FUNCTION get_token_price_brl(p_tier TEXT)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'premium' THEN 15.00  -- R$15/1M tokens (Claude Sonnet level)
    WHEN 'standard' THEN 2.50  -- R$2.50/1M tokens (Gemini Flash level)
    WHEN 'lite' THEN 0.50      -- R$0.50/1M tokens (Haiku level)
    ELSE 2.50
  END;
END;
$$;

-- Convert BRL to tokens
CREATE OR REPLACE FUNCTION brl_to_tokens(p_brl DECIMAL, p_tier TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN FLOOR((p_brl / get_token_price_brl(p_tier)) * 1000000);
END;
$$;

-- Convert tokens to BRL
CREATE OR REPLACE FUNCTION tokens_to_brl(p_tokens BIGINT, p_tier TEXT)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (p_tokens::DECIMAL / 1000000) * get_token_price_brl(p_tier);
END;
$$;

-- ============================================================================
-- PART 10: GRANTS
-- ============================================================================

-- Tables
GRANT SELECT ON pricing_plans TO authenticated;
GRANT SELECT ON user_subscriptions TO authenticated;
GRANT SELECT ON user_token_usage TO authenticated;
GRANT SELECT ON user_credits TO authenticated;
GRANT SELECT ON credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON message_queue TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;

GRANT ALL ON pricing_plans TO service_role;
GRANT ALL ON user_subscriptions TO service_role;
GRANT ALL ON user_token_usage TO service_role;
GRANT ALL ON user_credits TO service_role;
GRANT ALL ON credit_transactions TO service_role;
GRANT ALL ON message_queue TO service_role;
GRANT ALL ON chat_messages TO service_role;

-- Functions
GRANT EXECUTE ON FUNCTION get_or_create_current_window TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION brl_to_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION tokens_to_brl TO authenticated;

GRANT EXECUTE ON FUNCTION increment_token_usage TO service_role;
GRANT EXECUTE ON FUNCTION deduct_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION add_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION get_users_with_available_tokens TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('pricing_plans', 'user_subscriptions', 'user_token_usage', 'user_credits', 'credit_transactions', 'message_queue', 'chat_messages');

-- Check plans:
-- SELECT * FROM pricing_plans;

-- Test get window:
-- SELECT * FROM get_or_create_current_window('your-user-uuid');
