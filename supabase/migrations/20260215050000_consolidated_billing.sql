-- ============================================================================
-- CONSOLIDATED BILLING MIGRATION
-- Date: 2026-02-15
-- Issue: #203 — Consolidate 3 conflicting billing migrations into 1 clean schema
--
-- SUPERSEDES:
--   20260114000001_billing_chat_system.sql       (billing_plans, token_usage, action_queue, etc.)
--   20260120000002_user_credits_system.sql       (user_credits INTEGER, credit_transaction_type ENUM)
--   20260121000004_billing_rate_limiting_infrastructure.sql (pricing_plans TEXT PK, user_token_usage, etc.)
--   20260129000003_billing_subscriptions.sql      (billing_subscriptions — redundant with user_subscriptions)
--   20260212200000_fix_create_user_credits_trigger.sql (trigger fix — absorbed here)
--
-- DESIGN DECISIONS:
--   - Hybrid model: base plan with monthly quota + buy extra credits
--   - Interaction-based (not token-based or BRL-based) — simpler for users
--   - Tiers: Free (R$0, 50/day), Pro (R$39.90, 500/day + extras), Teams (R$149, unlimited)
--   - Credits are INTEGER interaction credits, not BRL decimals
--
-- TABLES NOT TOUCHED (kept as-is):
--   - contact_analysis (Connections module, not billing)
--   - chat_messages (Chat module, not billing)
-- ============================================================================

-- ============================================================================
-- PHASE 0: HELPER FUNCTION (idempotent)
-- ============================================================================

-- Ensure update_updated_at_column() exists (may already exist from other migrations)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PHASE 1: DROP SUPERSEDED TABLES & OLD OBJECTS
-- ============================================================================

-- Drop old functions that reference tables we're about to drop
-- (CASCADE handles dependent objects like triggers)
DROP FUNCTION IF EXISTS public.get_active_subscription(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_premium_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_current_window(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.increment_token_usage(UUID, TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_user_credits(UUID, DECIMAL, BIGINT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_credit_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_users_with_available_tokens(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_token_price_brl(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.brl_to_tokens(DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.tokens_to_brl(BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_token_availability(UUID, VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.record_token_usage(UUID, VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_plan_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_subscription() CASCADE;

-- Drop old spend/earn functions from 20260120 migration
DROP FUNCTION IF EXISTS public.spend_credits(UUID, INTEGER, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.earn_credits(UUID, credit_transaction_type, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.claim_daily_credits(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_user_credits() CASCADE;

-- Drop trigger on auth.users (from old migrations)
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;

-- Drop superseded tables (CASCADE to remove dependent policies, triggers, indexes)
DROP TABLE IF EXISTS public.billing_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_token_usage CASCADE;
DROP TABLE IF EXISTS public.message_queue CASCADE;

-- Drop old tables from 20260114 migration
DROP TABLE IF EXISTS public.billing_plans CASCADE;
DROP TABLE IF EXISTS public.token_usage CASCADE;
DROP TABLE IF EXISTS public.action_queue CASCADE;

-- Drop old credit tables (will be recreated with new schema)
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.user_credits CASCADE;

-- Drop old subscriptions (will be recreated)
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- Drop old pricing plans (will be recreated with new schema)
DROP TABLE IF EXISTS public.pricing_plans CASCADE;

-- Drop old enum type from 20260120 migration
DROP TYPE IF EXISTS public.credit_transaction_type CASCADE;
DROP TYPE IF EXISTS public.analysis_status CASCADE;


-- ============================================================================
-- PHASE 2: CREATE TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1 pricing_plans — Plan definitions
-- --------------------------------------------------------------------------
CREATE TABLE public.pricing_plans (
    id TEXT PRIMARY KEY,                           -- 'free', 'pro', 'teams'
    name TEXT NOT NULL,
    description TEXT,
    price_brl_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_interaction_limit INTEGER,               -- NULL = unlimited (teams)
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pricing_plans IS
    'Billing plan definitions for AICA hybrid model. Interaction-based limits per day.';
COMMENT ON COLUMN public.pricing_plans.id IS
    'Plan identifier: free, pro, teams';
COMMENT ON COLUMN public.pricing_plans.daily_interaction_limit IS
    'Max AI interactions per day. NULL means unlimited (Teams plan).';
COMMENT ON COLUMN public.pricing_plans.features IS
    'JSON array of feature flags enabled for this plan.';

-- --------------------------------------------------------------------------
-- 2.2 user_subscriptions — One active subscription per user
-- --------------------------------------------------------------------------
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.pricing_plans(id) DEFAULT 'free',

    -- Status
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),

    -- Billing cycle
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),

    -- Stripe integration
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,

    -- Trial & cancellation
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

COMMENT ON TABLE public.user_subscriptions IS
    'Tracks each user''s active billing plan, Stripe subscription, and billing cycle.';
COMMENT ON COLUMN public.user_subscriptions.plan_id IS
    'FK to pricing_plans.id — defaults to free plan.';
COMMENT ON COLUMN public.user_subscriptions.status IS
    'Subscription lifecycle: active, cancelled, past_due, trialing.';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS
    'Stripe subscription ID for paid plans. NULL for free tier.';
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS
    'If true, subscription will not renew after current_period_end.';

-- --------------------------------------------------------------------------
-- 2.3 usage_logs — Per-interaction tracking
-- --------------------------------------------------------------------------
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,                          -- 'chat', 'analyze', 'generate', etc.
    module TEXT,                                   -- 'atlas', 'journey', 'studio', etc.
    model_used TEXT,                               -- 'gemini-2.5-flash', 'gemini-2.5-pro', etc.
    tokens_input BIGINT DEFAULT 0,
    tokens_output BIGINT DEFAULT 0,
    cost_brl DECIMAL(10,4) DEFAULT 0,             -- Estimated cost for analytics
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.usage_logs IS
    'Per-interaction usage log. Tracks every AI interaction for billing, analytics, and auditing.';
COMMENT ON COLUMN public.usage_logs.action IS
    'Type of AI interaction: chat, analyze, generate, summarize, transcribe, etc.';
COMMENT ON COLUMN public.usage_logs.module IS
    'AICA module that originated the interaction: atlas, journey, studio, grants, finance, connections, flux, agenda.';
COMMENT ON COLUMN public.usage_logs.model_used IS
    'AI model used: gemini-2.5-flash, gemini-2.5-pro, etc.';
COMMENT ON COLUMN public.usage_logs.cost_brl IS
    'Estimated cost in BRL for internal analytics (not user-facing).';

-- --------------------------------------------------------------------------
-- 2.4 user_credits — Extra interaction credits balance
-- --------------------------------------------------------------------------
CREATE TABLE public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Balance (interaction credits, not BRL)
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,

    -- Daily claim tracking
    last_daily_claim TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One credit record per user
    CONSTRAINT unique_user_credits UNIQUE (user_id),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

COMMENT ON TABLE public.user_credits IS
    'Extra interaction credits balance per user. Credits are INTEGER counts of interactions, not BRL.';
COMMENT ON COLUMN public.user_credits.balance IS
    'Current available interaction credits. Consumed when user exceeds daily plan limit.';
COMMENT ON COLUMN public.user_credits.lifetime_earned IS
    'Total credits ever earned (purchases + bonuses + daily claims).';
COMMENT ON COLUMN public.user_credits.lifetime_spent IS
    'Total credits ever spent on interactions.';
COMMENT ON COLUMN public.user_credits.last_daily_claim IS
    'Timestamp of last daily credit claim. Used to enforce one claim per calendar day.';

-- --------------------------------------------------------------------------
-- 2.5 credit_transactions — Audit log of all credit movements
-- --------------------------------------------------------------------------
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type TEXT NOT NULL
        CHECK (transaction_type IN (
            'purchase',           -- Bought credits (Stripe)
            'daily_bonus',        -- Daily login reward
            'admin_adjustment',   -- Manual admin adjustment
            'usage',              -- Spent on interaction over limit
            'referral_bonus',     -- Referred a friend
            'achievement_bonus'   -- Unlocked achievement / gamification
        )),
    amount INTEGER NOT NULL,                       -- Positive = earned, negative = spent
    balance_after INTEGER NOT NULL,                -- Balance snapshot after this transaction
    description TEXT,

    -- External references
    stripe_payment_id TEXT,                        -- Stripe payment ID for purchases
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_transactions IS
    'Immutable audit log of all credit movements (purchases, bonuses, usage, adjustments).';
COMMENT ON COLUMN public.credit_transactions.transaction_type IS
    'Type of credit movement: purchase, daily_bonus, admin_adjustment, usage, referral_bonus, achievement_bonus.';
COMMENT ON COLUMN public.credit_transactions.amount IS
    'Credit delta: positive for earned/purchased, negative for spent. Always INTEGER interaction credits.';
COMMENT ON COLUMN public.credit_transactions.balance_after IS
    'Snapshot of user''s credit balance immediately after this transaction. Enables auditing.';
COMMENT ON COLUMN public.credit_transactions.stripe_payment_id IS
    'Stripe payment intent or charge ID. Only set for purchase transactions.';


-- ============================================================================
-- PHASE 3: INDEXES
-- ============================================================================

-- user_subscriptions
CREATE INDEX idx_user_subscriptions_user_id
    ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status
    ON public.user_subscriptions(status)
    WHERE status = 'active';
CREATE INDEX idx_user_subscriptions_stripe_customer
    ON public.user_subscriptions(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- usage_logs
CREATE INDEX idx_usage_logs_user_created
    ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_user_action
    ON public.usage_logs(user_id, action, created_at DESC);
CREATE INDEX idx_usage_logs_module
    ON public.usage_logs(module, created_at DESC)
    WHERE module IS NOT NULL;
CREATE INDEX idx_usage_logs_today
    ON public.usage_logs(user_id, created_at)
    WHERE created_at >= CURRENT_DATE;

-- user_credits
CREATE INDEX idx_user_credits_user_id
    ON public.user_credits(user_id);

-- credit_transactions
CREATE INDEX idx_credit_transactions_user_created
    ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type
    ON public.credit_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_credit_transactions_stripe
    ON public.credit_transactions(stripe_payment_id)
    WHERE stripe_payment_id IS NOT NULL;


-- ============================================================================
-- PHASE 4: ROW LEVEL SECURITY
-- ============================================================================

-- 4.1 pricing_plans — public read for active plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_plans_public_read"
    ON public.pricing_plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "pricing_plans_service_all"
    ON public.pricing_plans FOR ALL
    TO service_role
    USING (true);

-- 4.2 user_subscriptions — users read own, service_role full access
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_select_own"
    ON public.user_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_service_all"
    ON public.user_subscriptions FOR ALL
    TO service_role
    USING (true);

-- 4.3 usage_logs — users read own, service_role full access
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_logs_select_own"
    ON public.usage_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "usage_logs_service_all"
    ON public.usage_logs FOR ALL
    TO service_role
    USING (true);

-- 4.4 user_credits — users read own, service_role full access
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_select_own"
    ON public.user_credits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_credits_update_own"
    ON public.user_credits FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_credits_service_all"
    ON public.user_credits FOR ALL
    TO service_role
    USING (true);

-- 4.5 credit_transactions — users read own, service_role full access
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_select_own"
    ON public.credit_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "credit_transactions_service_all"
    ON public.credit_transactions FOR ALL
    TO service_role
    USING (true);


-- ============================================================================
-- PHASE 5: TRIGGERS
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER update_pricing_plans_updated_at
    BEFORE UPDATE ON public.pricing_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- PHASE 6: RPC FUNCTIONS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 6.1 check_interaction_limit — Can this user perform another interaction?
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_interaction_limit(p_user_id UUID)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    plan TEXT,
    resets_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id TEXT;
    v_daily_limit INTEGER;
    v_today_count INTEGER;
    v_credit_balance INTEGER;
BEGIN
    -- Get user's active plan
    SELECT us.plan_id INTO v_plan_id
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
    LIMIT 1;

    -- Default to free if no subscription
    IF v_plan_id IS NULL THEN
        v_plan_id := 'free';
    END IF;

    -- Get plan's daily interaction limit
    SELECT pp.daily_interaction_limit INTO v_daily_limit
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    -- If unlimited (NULL limit = Teams plan), always allow
    IF v_daily_limit IS NULL THEN
        RETURN QUERY SELECT
            true,
            2147483647,                               -- Max int = "unlimited"
            v_plan_id,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Count today's interactions
    SELECT COUNT(*)::INTEGER INTO v_today_count
    FROM usage_logs ul
    WHERE ul.user_id = p_user_id
      AND ul.created_at >= CURRENT_DATE
      AND ul.created_at < CURRENT_DATE + INTERVAL '1 day';

    -- Check if under limit
    IF v_today_count < v_daily_limit THEN
        RETURN QUERY SELECT
            true,
            (v_daily_limit - v_today_count),
            v_plan_id,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Over daily limit — check extra credits
    SELECT COALESCE(uc.balance, 0) INTO v_credit_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;

    IF COALESCE(v_credit_balance, 0) > 0 THEN
        -- Has extra credits — allow but will deduct credit in log_interaction
        RETURN QUERY SELECT
            true,
            v_credit_balance,                          -- Remaining from credits
            v_plan_id,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSE
        -- No credits left — blocked
        RETURN QUERY SELECT
            false,
            0,
            v_plan_id,
            (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_interaction_limit(UUID) IS
    'Check if user can perform another AI interaction. Returns allowed status, remaining count, plan, and reset time.';

-- --------------------------------------------------------------------------
-- 6.2 log_interaction — Log usage, check limit, deduct credit if over limit
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_interaction(
    p_user_id UUID,
    p_action TEXT,
    p_module TEXT DEFAULT NULL,
    p_model TEXT DEFAULT NULL,
    p_tokens_in BIGINT DEFAULT 0,
    p_tokens_out BIGINT DEFAULT 0
)
RETURNS TABLE (
    success BOOLEAN,
    interaction_id UUID,
    credit_deducted BOOLEAN,
    remaining INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id TEXT;
    v_daily_limit INTEGER;
    v_today_count INTEGER;
    v_new_log_id UUID;
    v_credit_balance INTEGER;
    v_new_credit_balance INTEGER;
    v_cost_brl DECIMAL(10,4) := 0;
BEGIN
    -- Get user's active plan
    SELECT us.plan_id INTO v_plan_id
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
    LIMIT 1;

    IF v_plan_id IS NULL THEN
        v_plan_id := 'free';
    END IF;

    -- Get plan limit
    SELECT pp.daily_interaction_limit INTO v_daily_limit
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    -- Count today's interactions (BEFORE inserting the new one)
    SELECT COUNT(*)::INTEGER INTO v_today_count
    FROM usage_logs ul
    WHERE ul.user_id = p_user_id
      AND ul.created_at >= CURRENT_DATE
      AND ul.created_at < CURRENT_DATE + INTERVAL '1 day';

    -- Estimate cost for analytics (rough: Gemini 2.5 Flash pricing)
    v_cost_brl := ((COALESCE(p_tokens_in, 0) * 0.00000015) + (COALESCE(p_tokens_out, 0) * 0.0000006)) * 5.0;
    -- (USD price * ~5.0 BRL/USD exchange rate)

    -- Insert usage log
    INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl)
    VALUES (p_user_id, p_action, p_module, p_model, p_tokens_in, p_tokens_out, v_cost_brl)
    RETURNING id INTO v_new_log_id;

    -- Unlimited plan — done
    IF v_daily_limit IS NULL THEN
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            2147483647,
            'Logged (unlimited plan)'::TEXT;
        RETURN;
    END IF;

    -- Under daily limit — done
    IF v_today_count < v_daily_limit THEN
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            (v_daily_limit - v_today_count - 1),       -- -1 because we just logged one
            'Logged (within daily limit)'::TEXT;
        RETURN;
    END IF;

    -- Over daily limit — deduct one extra credit
    SELECT uc.balance INTO v_credit_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
    FOR UPDATE;

    IF COALESCE(v_credit_balance, 0) <= 0 THEN
        -- No credits available — still logged but warn caller
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            0,
            'Logged but over daily limit with no credits'::TEXT;
        RETURN;
    END IF;

    -- Deduct 1 credit
    v_new_credit_balance := v_credit_balance - 1;

    UPDATE user_credits
    SET balance = v_new_credit_balance,
        lifetime_spent = lifetime_spent + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record credit transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_after, description, metadata
    ) VALUES (
        p_user_id, 'usage', -1, v_new_credit_balance,
        'Extra interaction credit used (over daily ' || v_plan_id || ' limit)',
        jsonb_build_object('usage_log_id', v_new_log_id, 'action', p_action)
    );

    RETURN QUERY SELECT
        true,
        v_new_log_id,
        true,
        v_new_credit_balance,
        'Logged (credit deducted, over daily limit)'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) IS
    'Log an AI interaction. If user is over daily plan limit, deducts 1 extra credit. Always logs regardless.';

-- --------------------------------------------------------------------------
-- 6.3 claim_daily_credits — Award daily free credits based on plan
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_credits(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    credits_earned INTEGER,
    new_balance INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_plan_id TEXT;
    v_daily_amount INTEGER;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get user's plan
    SELECT us.plan_id INTO v_plan_id
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
    LIMIT 1;

    -- Determine daily bonus by plan
    v_daily_amount := CASE COALESCE(v_plan_id, 'free')
        WHEN 'free'  THEN 5
        WHEN 'pro'   THEN 20
        WHEN 'teams' THEN 50
        ELSE 5
    END;

    -- Ensure user_credits row exists
    INSERT INTO user_credits (user_id, balance, lifetime_earned)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Check last claim
    SELECT uc.last_daily_claim, uc.balance
    INTO v_last_claim, v_current_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
    FOR UPDATE;

    -- Already claimed today?
    IF v_last_claim IS NOT NULL AND v_last_claim::DATE = CURRENT_DATE THEN
        RETURN QUERY SELECT
            false,
            0,
            COALESCE(v_current_balance, 0),
            'Ja resgatou os creditos de hoje'::TEXT;
        RETURN;
    END IF;

    -- Award credits
    UPDATE user_credits
    SET balance = balance + v_daily_amount,
        lifetime_earned = lifetime_earned + v_daily_amount,
        last_daily_claim = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Record transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_after, description, metadata
    ) VALUES (
        p_user_id, 'daily_bonus', v_daily_amount, v_new_balance,
        'Bonus diario (' || v_plan_id || '): +' || v_daily_amount || ' creditos',
        jsonb_build_object('plan', v_plan_id, 'claimed_at', NOW())
    );

    RETURN QUERY SELECT
        true,
        v_daily_amount,
        v_new_balance,
        ('Creditos diarios resgatados: +' || v_daily_amount)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.claim_daily_credits(UUID) IS
    'Award daily free credits based on user plan: Free=5, Pro=20, Teams=50. One claim per calendar day.';

-- --------------------------------------------------------------------------
-- 6.4 get_usage_summary — Usage stats for dashboard
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_interactions BIGINT,
    total_tokens_input BIGINT,
    total_tokens_output BIGINT,
    total_cost_brl DECIMAL,
    top_action TEXT,
    top_module TEXT,
    interactions_today BIGINT,
    daily_limit INTEGER,
    plan_id TEXT,
    credit_balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id TEXT;
    v_daily_limit INTEGER;
    v_credit_balance INTEGER;
BEGIN
    -- Get plan info
    SELECT us.plan_id INTO v_plan_id
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
    LIMIT 1;

    v_plan_id := COALESCE(v_plan_id, 'free');

    SELECT pp.daily_interaction_limit INTO v_daily_limit
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    -- Get credit balance
    SELECT COALESCE(uc.balance, 0) INTO v_credit_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;

    v_credit_balance := COALESCE(v_credit_balance, 0);

    RETURN QUERY
    WITH period_stats AS (
        SELECT
            COUNT(*) AS total_int,
            COALESCE(SUM(ul.tokens_input), 0) AS total_tin,
            COALESCE(SUM(ul.tokens_output), 0) AS total_tout,
            COALESCE(SUM(ul.cost_brl), 0) AS total_cost
        FROM usage_logs ul
        WHERE ul.user_id = p_user_id
          AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    top_act AS (
        SELECT ul.action AS ta
        FROM usage_logs ul
        WHERE ul.user_id = p_user_id
          AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY ul.action
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    top_mod AS (
        SELECT ul.module AS tm
        FROM usage_logs ul
        WHERE ul.user_id = p_user_id
          AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND ul.module IS NOT NULL
        GROUP BY ul.module
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    today_stats AS (
        SELECT COUNT(*) AS today_int
        FROM usage_logs ul
        WHERE ul.user_id = p_user_id
          AND ul.created_at >= CURRENT_DATE
          AND ul.created_at < CURRENT_DATE + INTERVAL '1 day'
    )
    SELECT
        ps.total_int,
        ps.total_tin,
        ps.total_tout,
        ps.total_cost,
        ta.ta,
        tm.tm,
        ts.today_int,
        v_daily_limit,
        v_plan_id,
        v_credit_balance
    FROM period_stats ps
    CROSS JOIN today_stats ts
    LEFT JOIN top_act ta ON true
    LEFT JOIN top_mod tm ON true;
END;
$$;

COMMENT ON FUNCTION public.get_usage_summary(UUID, INTEGER) IS
    'Get usage summary for user dashboard: total interactions, top actions/modules, today''s count, plan info, credit balance.';

-- --------------------------------------------------------------------------
-- 6.5 spend_credits — Legacy compatibility for useUserCredits hook
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock row for update
    SELECT balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT false, 0, 'User credits not found'::TEXT;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT false, v_current_balance, 'Creditos insuficientes'::TEXT;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- Update balance
    UPDATE user_credits
    SET balance = v_new_balance,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_after, description, metadata
    ) VALUES (
        p_user_id, 'usage', -p_amount, v_new_balance,
        COALESCE(p_reference_type, 'manual') || ' spend',
        p_metadata || jsonb_build_object('reference_id', p_reference_id, 'reference_type', p_reference_type)
    );

    RETURN QUERY SELECT true, v_new_balance, 'Creditos gastos com sucesso'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.spend_credits(UUID, INTEGER, UUID, TEXT, JSONB) IS
    'Atomically spend interaction credits. Used by useUserCredits hook and contact analysis.';


-- ============================================================================
-- PHASE 7: AUTO-PROVISIONING TRIGGERS
-- ============================================================================

-- 7.1 Auto-create free subscription + credits for new users
CREATE OR REPLACE FUNCTION public.create_user_billing()
RETURNS TRIGGER AS $$
BEGIN
    -- Create free subscription (safe: ON CONFLICT DO NOTHING)
    BEGIN
        INSERT INTO public.user_subscriptions (user_id, plan_id, status)
        VALUES (NEW.id, 'free', 'active')
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'create_user_billing: subscription creation failed for user %: %', NEW.id, SQLERRM;
    END;

    -- Create initial credits
    BEGIN
        INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
        VALUES (NEW.id, 10, 10)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'create_user_billing: credits creation failed for user %: %', NEW.id, SQLERRM;
    END;

    -- Log welcome bonus transaction
    BEGIN
        INSERT INTO public.credit_transactions (
            user_id, transaction_type, amount, balance_after, description, metadata
        ) VALUES (
            NEW.id, 'achievement_bonus', 10, 10,
            'Bonus de boas-vindas: 10 creditos extras',
            '{"reason": "welcome_bonus"}'::jsonb
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'create_user_billing: welcome transaction failed for user %: %', NEW.id, SQLERRM;
    END;

    -- CRITICAL: Never block user creation for billing issues
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_user_billing() IS
    'Auto-provisions free subscription and welcome credits for new users. Never blocks auth signup.';

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_billing();


-- ============================================================================
-- PHASE 8: GRANTS (Permissions)
-- ============================================================================

-- Tables: authenticated users can read own (RLS handles filtering)
GRANT SELECT ON public.pricing_plans TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.usage_logs TO authenticated;
GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;

-- Tables: service_role has full access (for Edge Functions)
GRANT ALL ON public.pricing_plans TO service_role;
GRANT ALL ON public.user_subscriptions TO service_role;
GRANT ALL ON public.usage_logs TO service_role;
GRANT ALL ON public.user_credits TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;

-- Functions: authenticated users can call check/claim/summary
GRANT EXECUTE ON FUNCTION public.check_interaction_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, UUID, TEXT, JSONB) TO authenticated;

-- Functions: service_role can call everything
GRANT EXECUTE ON FUNCTION public.check_interaction_limit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_credits(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, UUID, TEXT, JSONB) TO service_role;


-- ============================================================================
-- PHASE 9: SEED DATA
-- ============================================================================

-- 9.1 Seed pricing plans
INSERT INTO public.pricing_plans (id, name, description, price_brl_monthly, daily_interaction_limit, features) VALUES
    ('free', 'Free', 'Plano gratuito para experimentar o AICA', 0, 50,
     '["Chat basico", "Modulos principais", "5 creditos diarios"]'::jsonb),
    ('pro', 'Pro', 'Para uso profissional diario', 39.90, 500,
     '["Todos os modulos", "500 interacoes/dia", "20 creditos diarios", "Creditos extras R$0.10/un", "Suporte prioritario"]'::jsonb),
    ('teams', 'Teams', 'Para equipes e power users', 149.00, NULL,
     '["Tudo do Pro", "Interacoes ilimitadas", "50 creditos diarios", "API access", "Dashboard de uso", "Suporte dedicado"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_brl_monthly = EXCLUDED.price_brl_monthly,
    daily_interaction_limit = EXCLUDED.daily_interaction_limit,
    features = EXCLUDED.features,
    updated_at = NOW();

-- 9.2 Create free subscriptions for existing users who don't have one
INSERT INTO public.user_subscriptions (user_id, plan_id, status)
SELECT u.id, 'free', 'active'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 9.3 Create credit records for existing users who don't have one
INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
SELECT u.id, 10, 10
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_credits uc WHERE uc.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================================
-- PHASE 10: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_plan_count INTEGER;
    v_func_count INTEGER;
BEGIN
    -- Verify tables exist
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'pricing_plans', 'user_subscriptions', 'usage_logs',
          'user_credits', 'credit_transactions'
      );

    IF v_table_count < 5 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Only % of 5 billing tables created', v_table_count;
    END IF;

    -- Verify plans seeded
    SELECT COUNT(*) INTO v_plan_count
    FROM public.pricing_plans;

    IF v_plan_count < 3 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Only % of 3 pricing plans seeded', v_plan_count;
    END IF;

    -- Verify RPCs exist
    SELECT COUNT(*) INTO v_func_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
          'check_interaction_limit', 'log_interaction',
          'claim_daily_credits', 'get_usage_summary', 'spend_credits',
          'create_user_billing'
      );

    IF v_func_count < 6 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Only % of 6 billing functions created', v_func_count;
    END IF;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CONSOLIDATED BILLING MIGRATION — SUCCESS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Tables created: % (pricing_plans, user_subscriptions, usage_logs, user_credits, credit_transactions)', v_table_count;
    RAISE NOTICE 'Plans seeded: % (free, pro, teams)', v_plan_count;
    RAISE NOTICE 'Functions created: %', v_func_count;
    RAISE NOTICE 'Triggers: on_auth_user_created_billing (auto-provisions new users)';
    RAISE NOTICE 'Superseded tables dropped: billing_subscriptions, user_token_usage, message_queue, billing_plans, token_usage, action_queue';
    RAISE NOTICE '============================================================================';
END
$$;
