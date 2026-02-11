-- ============================================================================
-- FIX: create_user_credits() trigger — blocks ALL new user signups
--
-- Root cause: The trigger fires on auth.users INSERT and tries to insert into
-- credit_transactions with column names that don't match the actual table schema.
-- This crashes the auth callback transaction → OAuth signup fails with 500 →
-- PKCE token exchange returns 401.
--
-- Fix: Wrap in EXCEPTION block so credit creation NEVER blocks auth signup.
-- Also update column names to match current table schema.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial credits for new user (safe: ON CONFLICT DO NOTHING)
    INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
    VALUES (NEW.id, 50, 50)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log initial grant transaction
    -- Use EXCEPTION to handle any schema mismatch gracefully
    BEGIN
        INSERT INTO public.credit_transactions (
            user_id, transaction_type, amount_brl, description, metadata
        ) VALUES (
            NEW.id, 'bonus', 50.00, 'Welcome bonus - initial credits',
            '{"reason": "Welcome bonus"}'::jsonb
        );
    EXCEPTION
        WHEN undefined_column THEN
            -- Schema mismatch — skip transaction logging, credits still granted
            RAISE WARNING 'create_user_credits: credit_transactions schema mismatch for user %', NEW.id;
        WHEN check_violation THEN
            -- transaction_type value not in CHECK constraint
            RAISE WARNING 'create_user_credits: CHECK violation for user %', NEW.id;
        WHEN not_null_violation THEN
            -- Missing required column
            RAISE WARNING 'create_user_credits: NOT NULL violation for user %', NEW.id;
    END;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- CRITICAL: Never block user creation for credit issues
        RAISE WARNING 'create_user_credits failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_credits();
