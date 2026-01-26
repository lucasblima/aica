-- ============================================
-- MANUAL FIX: user_credits RLS Policies
-- Apply this if user_credits table exists but queries return 400
-- ============================================

-- 1. Enable RLS (pode já estar, mas não faz mal)
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (se existirem)
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_service" ON public.user_credits;

-- 3. Create correct RLS policies
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

-- 5. Create index if not exists
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- 6. Ensure current user has credits (seed)
INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_spent)
SELECT id, 50, 50, 0
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_credits WHERE user_credits.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 7. Log initial grant for users who just got credits
INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, metadata)
SELECT uc.user_id, 'initial_grant'::credit_transaction_type, 50, 50, '{"reason": "Welcome bonus"}'::jsonb
FROM public.user_credits uc
WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = uc.user_id AND ct.type = 'initial_grant'::credit_transaction_type
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check policies exist
-- Expected: 3 rows (view own, update own, service role)
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_credits'
ORDER BY policyname;

-- Check current user has credits
-- Replace 'YOUR_USER_ID' with your actual user ID
-- SELECT * FROM user_credits WHERE user_id = 'YOUR_USER_ID';

-- Count total users with credits
SELECT COUNT(*) as total_users_with_credits FROM user_credits;

-- ============================================
-- DONE! Test the app now.
-- ============================================
