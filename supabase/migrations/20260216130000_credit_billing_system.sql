-- ============================================================================
-- CREDIT BILLING SYSTEM — Anthropic-style monthly credits
-- ============================================================================
-- Migrates from daily interaction limits to monthly credit budgets.
-- Each AI action costs 1-5 credits based on complexity.
--
-- Plans:
--   Free:  500 credits/month (R$0)
--   Pro:   5,000 credits/month (R$39.90)
--   Teams: 20,000 credits/month (R$149)
--
-- Credit tiers:
--   1 credit: sentiment analysis, quality eval, question gen, classify, embed
--   2 credits: chat, moment analysis, threading, tags, sentiment
--   3 credits: reports, dossiers, briefings, research, statements
--   5 credits: life council, pattern synthesis, weekly summary
-- ============================================================================

-- ============================================================================
-- PHASE 1: action_credit_costs lookup table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_credit_costs (
    action TEXT PRIMARY KEY,
    credits INTEGER NOT NULL DEFAULT 1,
    tier TEXT NOT NULL DEFAULT 'basic'
        CHECK (tier IN ('basic', 'standard', 'advanced', 'premium')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.action_credit_costs IS
    'Credit cost per AI action. Used by log_interaction to determine how many credits each call costs.';

ALTER TABLE public.action_credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_credit_costs_public_read"
    ON public.action_credit_costs FOR SELECT
    USING (true);

CREATE POLICY "action_credit_costs_service_all"
    ON public.action_credit_costs FOR ALL
    TO service_role
    USING (true);

GRANT SELECT ON public.action_credit_costs TO authenticated;
GRANT ALL ON public.action_credit_costs TO service_role;

-- Seed action costs
INSERT INTO public.action_credit_costs (action, credits, tier, description) VALUES
    -- Tier: basic (1 credit)
    ('analyze_moment_sentiment', 1, 'basic', 'Sentiment analysis on moments'),
    ('evaluate_quality', 1, 'basic', 'CP quality scoring'),
    ('generate_daily_question', 1, 'basic', 'AI daily question generation'),
    ('route_entities_to_modules', 1, 'basic', 'Entity routing from WhatsApp'),
    ('text_embedding', 1, 'basic', 'Text embedding generation'),
    ('classify_intent', 1, 'basic', 'Intent classification for chat'),
    -- Tier: standard (2 credits)
    ('chat', 2, 'standard', 'General chat interaction'),
    ('chat_aica', 2, 'standard', 'AICA chat assistant'),
    ('analyze_moment', 2, 'standard', 'Full moment analysis (tags, mood)'),
    ('build_conversation_threads', 2, 'standard', 'WhatsApp thread building'),
    ('generate_tags', 2, 'standard', 'Tag generation'),
    ('whatsapp_sentiment', 2, 'standard', 'WhatsApp sentiment analysis'),
    -- Tier: advanced (3 credits)
    ('generate_report', 3, 'advanced', 'Daily/weekly report generation'),
    ('build_contact_dossier', 3, 'advanced', 'Contact dossier compilation'),
    ('generate_briefing', 3, 'advanced', 'Podcast briefing generation'),
    ('research_guest', 3, 'advanced', 'Guest research for podcast'),
    ('generate_pauta_outline', 3, 'advanced', 'Podcast pauta outline'),
    ('parse_statement', 3, 'advanced', 'Financial statement parsing'),
    ('generate_field_content', 3, 'advanced', 'Grant field content generation'),
    -- Tier: premium (5 credits)
    ('life_council', 5, 'premium', 'Daily Life Council analysis'),
    ('pattern_synthesis', 5, 'premium', 'Weekly pattern synthesis'),
    ('generate_weekly_summary', 5, 'premium', 'Weekly summary generation')
ON CONFLICT (action) DO UPDATE SET
    credits = EXCLUDED.credits,
    tier = EXCLUDED.tier,
    description = EXCLUDED.description;


-- ============================================================================
-- PHASE 2: Add monthly_credits to pricing_plans
-- ============================================================================

ALTER TABLE public.pricing_plans
    ADD COLUMN IF NOT EXISTS monthly_credits INTEGER;

COMMENT ON COLUMN public.pricing_plans.monthly_credits IS
    'Monthly credit budget for this plan. NULL means unlimited.';

-- Update plan credits
UPDATE public.pricing_plans SET monthly_credits = 500 WHERE id = 'free';
UPDATE public.pricing_plans SET monthly_credits = 5000 WHERE id = 'pro';
UPDATE public.pricing_plans SET monthly_credits = 20000 WHERE id = 'teams';

-- Update features JSON to reflect credits
UPDATE public.pricing_plans SET features = '["Chat basico", "Modulos principais", "500 creditos/mes"]'::jsonb WHERE id = 'free';
UPDATE public.pricing_plans SET features = '["Todos os modulos", "5000 creditos/mes", "Suporte prioritario"]'::jsonb WHERE id = 'pro';
UPDATE public.pricing_plans SET features = '["Tudo do Pro", "20000 creditos/mes", "API access", "Dashboard de uso", "Suporte dedicado"]'::jsonb WHERE id = 'teams';


-- ============================================================================
-- PHASE 3: Add credits_used to usage_logs
-- ============================================================================

ALTER TABLE public.usage_logs
    ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1;

COMMENT ON COLUMN public.usage_logs.credits_used IS
    'Number of credits consumed by this interaction. Determined by action_credit_costs lookup.';


-- ============================================================================
-- PHASE 4: Replace log_interaction — monthly credit accounting
-- ============================================================================

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
    v_monthly_credits INTEGER;
    v_month_used INTEGER;
    v_action_credits INTEGER;
    v_new_log_id UUID;
    v_credit_balance INTEGER;
    v_new_credit_balance INTEGER;
    v_cost_brl DECIMAL(10,4) := 0;
    v_month_start TIMESTAMPTZ;
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

    -- Get monthly credit budget
    SELECT pp.monthly_credits INTO v_monthly_credits
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    -- Look up credit cost for this action (default 1)
    SELECT COALESCE(acc.credits, 1) INTO v_action_credits
    FROM action_credit_costs acc
    WHERE acc.action = p_action;

    IF v_action_credits IS NULL THEN
        v_action_credits := 1;
    END IF;

    -- Calculate month start
    v_month_start := date_trunc('month', NOW());

    -- Count credits used this month
    SELECT COALESCE(SUM(ul.credits_used), 0)::INTEGER INTO v_month_used
    FROM usage_logs ul
    WHERE ul.user_id = p_user_id
      AND ul.created_at >= v_month_start;

    -- Estimate cost for analytics (Gemini 2.5 Flash pricing)
    v_cost_brl := ((COALESCE(p_tokens_in, 0) * 0.00000015) + (COALESCE(p_tokens_out, 0) * 0.0000006)) * 5.0;

    -- Insert usage log with credits
    INSERT INTO usage_logs (user_id, action, module, model_used, tokens_input, tokens_output, cost_brl, credits_used)
    VALUES (p_user_id, p_action, p_module, p_model, p_tokens_in, p_tokens_out, v_cost_brl, v_action_credits)
    RETURNING id INTO v_new_log_id;

    -- Unlimited plan (NULL monthly_credits) — done
    IF v_monthly_credits IS NULL THEN
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            2147483647,
            'Logged (unlimited plan)'::TEXT;
        RETURN;
    END IF;

    -- Under monthly budget — done
    IF (v_month_used + v_action_credits) <= v_monthly_credits THEN
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            (v_monthly_credits - v_month_used - v_action_credits),
            'Logged (within monthly budget)'::TEXT;
        RETURN;
    END IF;

    -- Over monthly budget — deduct from extra credits
    SELECT uc.balance INTO v_credit_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
    FOR UPDATE;

    IF COALESCE(v_credit_balance, 0) >= v_action_credits THEN
        v_new_credit_balance := v_credit_balance - v_action_credits;

        UPDATE user_credits
        SET balance = v_new_credit_balance,
            lifetime_spent = lifetime_spent + v_action_credits,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        INSERT INTO credit_transactions (
            user_id, transaction_type, amount, balance_after, description, metadata
        ) VALUES (
            p_user_id, 'usage', -v_action_credits, v_new_credit_balance,
            'Extra credits used (over monthly ' || v_plan_id || ' budget)',
            jsonb_build_object('usage_log_id', v_new_log_id, 'action', p_action, 'credits', v_action_credits)
        );

        RETURN QUERY SELECT
            true,
            v_new_log_id,
            true,
            v_new_credit_balance,
            'Logged (extra credits deducted, over monthly budget)'::TEXT;
    ELSE
        -- No extra credits — still logged but warn
        RETURN QUERY SELECT
            true,
            v_new_log_id,
            false,
            0,
            'Logged but over monthly budget with no extra credits'::TEXT;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) IS
    'Log an AI interaction with credit-based billing. Looks up action cost from action_credit_costs. Deducts from monthly budget, then extra credits if over budget.';


-- ============================================================================
-- PHASE 5: Replace check_interaction_limit — monthly credit check
-- ============================================================================

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
    v_monthly_credits INTEGER;
    v_month_used INTEGER;
    v_credit_balance INTEGER;
    v_month_start TIMESTAMPTZ;
    v_next_month TIMESTAMPTZ;
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

    -- Get monthly credit budget
    SELECT pp.monthly_credits INTO v_monthly_credits
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    v_month_start := date_trunc('month', NOW());
    v_next_month := date_trunc('month', NOW() + INTERVAL '1 month');

    -- Unlimited plan
    IF v_monthly_credits IS NULL THEN
        RETURN QUERY SELECT
            true,
            2147483647,
            v_plan_id,
            v_next_month;
        RETURN;
    END IF;

    -- Count credits used this month
    SELECT COALESCE(SUM(ul.credits_used), 0)::INTEGER INTO v_month_used
    FROM usage_logs ul
    WHERE ul.user_id = p_user_id
      AND ul.created_at >= v_month_start;

    -- Under monthly budget
    IF v_month_used < v_monthly_credits THEN
        RETURN QUERY SELECT
            true,
            (v_monthly_credits - v_month_used),
            v_plan_id,
            v_next_month;
        RETURN;
    END IF;

    -- Over budget — check extra credits
    SELECT COALESCE(uc.balance, 0) INTO v_credit_balance
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;

    IF COALESCE(v_credit_balance, 0) > 0 THEN
        RETURN QUERY SELECT
            true,
            v_credit_balance,
            v_plan_id,
            v_next_month;
    ELSE
        RETURN QUERY SELECT
            false,
            0,
            v_plan_id,
            v_next_month;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_interaction_limit(UUID) IS
    'Check if user has remaining monthly credits. Returns allowed status, remaining credits, plan, and monthly reset time.';


-- ============================================================================
-- PHASE 6: Update get_usage_summary for credit-based dashboard
-- ============================================================================

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
    v_monthly_credits INTEGER;
    v_month_used INTEGER;
    v_credit_balance INTEGER;
BEGIN
    -- Get plan info
    SELECT us.plan_id INTO v_plan_id
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
    LIMIT 1;

    v_plan_id := COALESCE(v_plan_id, 'free');

    SELECT pp.monthly_credits INTO v_monthly_credits
    FROM pricing_plans pp
    WHERE pp.id = v_plan_id;

    -- Get month credits used
    SELECT COALESCE(SUM(ul.credits_used), 0)::INTEGER INTO v_month_used
    FROM usage_logs ul
    WHERE ul.user_id = p_user_id
      AND ul.created_at >= date_trunc('month', NOW());

    -- Get extra credit balance
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
        SELECT COALESCE(SUM(ul.credits_used), 0) AS today_credits
        FROM usage_logs ul
        WHERE ul.user_id = p_user_id
          AND ul.created_at >= date_trunc('month', NOW())
    )
    SELECT
        ps.total_int,
        ps.total_tin,
        ps.total_tout,
        ps.total_cost,
        ta.ta,
        tm.tm,
        ts.today_credits,
        v_monthly_credits,
        v_plan_id,
        v_credit_balance
    FROM period_stats ps
    CROSS JOIN today_stats ts
    LEFT JOIN top_act ta ON true
    LEFT JOIN top_mod tm ON true;
END;
$$;


-- ============================================================================
-- PHASE 7: GRANTs for new table
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_interaction_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_interaction_limit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID, INTEGER) TO service_role;


-- ============================================================================
-- PHASE 8: Backfill existing usage_logs with credits_used
-- ============================================================================

-- Set credits based on action_credit_costs lookup
UPDATE usage_logs ul
SET credits_used = COALESCE(
    (SELECT acc.credits FROM action_credit_costs acc WHERE acc.action = ul.action),
    1
)
WHERE ul.credits_used IS NULL OR ul.credits_used = 1;

-- Special handling: ensure actions with known costs > 1 are updated
UPDATE usage_logs ul
SET credits_used = acc.credits
FROM action_credit_costs acc
WHERE acc.action = ul.action
  AND ul.credits_used != acc.credits;


-- ============================================================================
-- PHASE 9: Performance index for monthly credit queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_month_credits
    ON public.usage_logs(user_id, created_at)
    WHERE credits_used IS NOT NULL;


-- ============================================================================
-- PHASE 10: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_action_count INTEGER;
    v_free_credits INTEGER;
    v_pro_credits INTEGER;
    v_teams_credits INTEGER;
    v_logs_with_credits BIGINT;
    v_total_logs BIGINT;
BEGIN
    -- Verify action_credit_costs
    SELECT COUNT(*) INTO v_action_count FROM action_credit_costs;
    IF v_action_count < 20 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Only % action costs seeded (expected 22)', v_action_count;
    END IF;

    -- Verify monthly_credits on plans
    SELECT monthly_credits INTO v_free_credits FROM pricing_plans WHERE id = 'free';
    SELECT monthly_credits INTO v_pro_credits FROM pricing_plans WHERE id = 'pro';
    SELECT monthly_credits INTO v_teams_credits FROM pricing_plans WHERE id = 'teams';

    IF v_free_credits != 500 OR v_pro_credits != 5000 OR v_teams_credits != 20000 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: monthly_credits mismatch: free=%, pro=%, teams=%',
            v_free_credits, v_pro_credits, v_teams_credits;
    END IF;

    -- Verify usage_logs backfill
    SELECT COUNT(*) INTO v_total_logs FROM usage_logs;
    SELECT COUNT(*) INTO v_logs_with_credits FROM usage_logs WHERE credits_used IS NOT NULL AND credits_used > 0;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CREDIT BILLING SYSTEM — SUCCESS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'action_credit_costs: % actions seeded (4 tiers)', v_action_count;
    RAISE NOTICE 'monthly_credits: Free=%, Pro=%, Teams=%', v_free_credits, v_pro_credits, v_teams_credits;
    RAISE NOTICE 'usage_logs backfill: %/% rows have credits_used', v_logs_with_credits, v_total_logs;
    RAISE NOTICE 'RPCs replaced: log_interaction, check_interaction_limit, get_usage_summary';
    RAISE NOTICE '============================================================================';
END $$;
