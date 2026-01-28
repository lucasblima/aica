-- =====================================================
-- MANUAL FIX: Service Role RLS Policy for file_search_documents
-- =====================================================
-- Execute este SQL diretamente no Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql
-- =====================================================

-- Step 1: Drop potentially malformed policies
DROP POLICY IF EXISTS "Service role can insert documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Service role can select documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Service role can update documents" ON public.file_search_documents;

-- Step 2: Create policies with correct syntax
CREATE POLICY "Service role can insert documents"
  ON public.file_search_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select documents"
  ON public.file_search_documents
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update documents"
  ON public.file_search_documents
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Verify policies were created
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'file_search_documents'
  AND policyname LIKE 'Service role%';

-- Expected output:
-- | policyname                           | cmd    | roles          |
-- |--------------------------------------|--------|----------------|
-- | Service role can insert documents   | INSERT | {service_role} |
-- | Service role can select documents   | SELECT | {service_role} |
-- | Service role can update documents   | UPDATE | {service_role} |
