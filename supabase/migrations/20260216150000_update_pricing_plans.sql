-- ============================================================================
-- UPDATE PRICING PLANS — New pricing structure
-- ============================================================================
-- Changes:
--   Pro:   R$39.90 → R$34.99, 5000 → 2500 credits/month
--   Teams → Max: R$149.00 → R$89.99, 20000 → 10000 credits/month, id teams→max
--   Free:  No change
--
-- The teams→max rename requires careful FK handling since
-- user_subscriptions.plan_id references pricing_plans.id.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Insert the new 'max' plan row
-- ============================================================================
-- We insert 'max' first so we can migrate FK references before deleting 'teams'.

INSERT INTO public.pricing_plans (id, name, description, price_brl_monthly, daily_interaction_limit, monthly_credits, features)
VALUES (
    'max',
    'Max',
    'Para power users e profissionais',
    89.99,
    NULL,  -- unlimited daily (same as old teams)
    10000,
    '["Tudo do Pro", "10000 creditos/mes", "API access", "Dashboard de uso", "Suporte dedicado"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_brl_monthly = EXCLUDED.price_brl_monthly,
    daily_interaction_limit = EXCLUDED.daily_interaction_limit,
    monthly_credits = EXCLUDED.monthly_credits,
    features = EXCLUDED.features,
    updated_at = NOW();


-- ============================================================================
-- PHASE 2: Migrate FK references from 'teams' to 'max'
-- ============================================================================

UPDATE public.user_subscriptions
SET plan_id = 'max', updated_at = NOW()
WHERE plan_id = 'teams';


-- ============================================================================
-- PHASE 3: Deactivate old 'teams' plan (keep row for audit trail)
-- ============================================================================

UPDATE public.pricing_plans
SET is_active = false, updated_at = NOW()
WHERE id = 'teams';


-- ============================================================================
-- PHASE 4: Update Pro plan — new pricing and credits
-- ============================================================================

UPDATE public.pricing_plans
SET
    price_brl_monthly = 34.99,
    monthly_credits = 2500,
    features = '["Todos os modulos", "2500 creditos/mes", "Suporte prioritario"]'::jsonb,
    updated_at = NOW()
WHERE id = 'pro';


-- ============================================================================
-- PHASE 5: Update Free plan features text to match credit amount
-- ============================================================================

UPDATE public.pricing_plans
SET
    features = '["Chat basico", "Modulos principais", "500 creditos/mes"]'::jsonb,
    updated_at = NOW()
WHERE id = 'free';


-- ============================================================================
-- PHASE 6: Update claim_daily_credits to handle 'max' plan
-- ============================================================================

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
        WHEN 'free' THEN 5
        WHEN 'pro'  THEN 20
        WHEN 'max'  THEN 50
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
    'Award daily free credits based on user plan: Free=5, Pro=20, Max=50. One claim per calendar day.';


-- ============================================================================
-- PHASE 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_pro_price DECIMAL;
    v_pro_credits INTEGER;
    v_max_price DECIMAL;
    v_max_credits INTEGER;
    v_max_exists BOOLEAN;
    v_teams_active BOOLEAN;
    v_teams_subs INTEGER;
BEGIN
    -- Verify Pro plan updated
    SELECT price_brl_monthly, monthly_credits INTO v_pro_price, v_pro_credits
    FROM pricing_plans WHERE id = 'pro';

    IF v_pro_price != 34.99 OR v_pro_credits != 2500 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Pro plan not updated correctly. price=%, credits=%',
            v_pro_price, v_pro_credits;
    END IF;

    -- Verify Max plan exists and is correct
    SELECT price_brl_monthly, monthly_credits, is_active INTO v_max_price, v_max_credits, v_max_exists
    FROM pricing_plans WHERE id = 'max';

    IF v_max_price != 89.99 OR v_max_credits != 10000 OR NOT v_max_exists THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Max plan not set up correctly. price=%, credits=%, active=%',
            v_max_price, v_max_credits, v_max_exists;
    END IF;

    -- Verify teams plan is deactivated
    SELECT is_active INTO v_teams_active
    FROM pricing_plans WHERE id = 'teams';

    IF v_teams_active IS NOT NULL AND v_teams_active = true THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Teams plan still active';
    END IF;

    -- Verify no subscriptions still reference 'teams'
    SELECT COUNT(*) INTO v_teams_subs
    FROM user_subscriptions WHERE plan_id = 'teams';

    IF v_teams_subs > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % subscriptions still reference teams plan', v_teams_subs;
    END IF;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'UPDATE PRICING PLANS — SUCCESS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Pro: R$34.99/month, 2500 credits/month';
    RAISE NOTICE 'Max: R$89.99/month, 10000 credits/month (replaced Teams)';
    RAISE NOTICE 'Free: R$0/month, 500 credits/month (unchanged)';
    RAISE NOTICE 'Teams plan deactivated, all subscriptions migrated to Max';
    RAISE NOTICE 'claim_daily_credits updated for Max plan';
    RAISE NOTICE '============================================================================';
END $$;

COMMIT;
