-- =====================================================
-- FIX: Service Role RLS Policy for file_search_documents
-- Date: 2026-01-28
-- Description: Fix invalid syntax CREATE POLICY IF NOT EXISTS
--              PostgreSQL doesn't support IF NOT EXISTS for policies
-- =====================================================

-- Step 1: Drop the potentially malformed policy (may not exist if migration failed)
DROP POLICY IF EXISTS "Service role can insert documents" ON public.file_search_documents;

-- Step 2: Create the policy with correct syntax
CREATE POLICY "Service role can insert documents"
  ON public.file_search_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Step 3: Also ensure service role can select (for verification queries)
DROP POLICY IF EXISTS "Service role can select documents" ON public.file_search_documents;

CREATE POLICY "Service role can select documents"
  ON public.file_search_documents
  FOR SELECT
  TO service_role
  USING (true);

-- Step 4: Ensure service role can update (for status updates)
DROP POLICY IF EXISTS "Service role can update documents" ON public.file_search_documents;

CREATE POLICY "Service role can update documents"
  ON public.file_search_documents
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'file_search_documents'
    AND policyname LIKE 'Service role%';

  IF policy_count >= 3 THEN
    RAISE NOTICE '=== Migration Successful ===';
    RAISE NOTICE 'Service role policies created: %', policy_count;
  ELSE
    RAISE WARNING 'Expected 3 service role policies, found: %', policy_count;
  END IF;
END $$;
