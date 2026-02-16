-- ============================================================================
-- FIX: get_usage_summary return type mismatch
-- SUM(BIGINT) returns NUMERIC in PostgreSQL, need explicit casts to BIGINT
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
            COUNT(*)::BIGINT AS total_int,
            COALESCE(SUM(ul.tokens_input), 0)::BIGINT AS total_tin,
            COALESCE(SUM(ul.tokens_output), 0)::BIGINT AS total_tout,
            COALESCE(SUM(ul.cost_brl), 0)::DECIMAL AS total_cost
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
        SELECT COUNT(*)::BIGINT AS today_int
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
