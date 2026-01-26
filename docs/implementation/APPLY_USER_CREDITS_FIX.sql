-- ============================================
-- FIXED: user_credits RLS Policies
-- Handles existing policies without errors
-- ============================================

-- 1. Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (including the one causing error)
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_service" ON public.user_credits;
DROP POLICY IF EXISTS "Service role full access" ON public.user_credits; -- THIS ONE WAS MISSING

-- 3. Create fresh policies
CREATE POLICY "Users can view own credits"
    ON public.user_credits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
    ON public.user_credits FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
    ON public.user_credits FOR ALL
    TO service_role
    USING (true);

-- 4. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.user_credits TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;

-- 5. Create index
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- 6. Seed credits for users
INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_spent)
SELECT id, 50, 50, 0
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_credits WHERE user_credits.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- VERIFICATION (run separately after above)
-- ============================================

-- Check policies (should show 3)
SELECT policyname FROM pg_policies WHERE tablename = 'user_credits';

-- Check you have credits
SELECT * FROM user_credits WHERE user_id = auth.uid();
