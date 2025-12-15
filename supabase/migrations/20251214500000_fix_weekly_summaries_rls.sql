-- ============================================================================
-- MIGRATION: Fix weekly_summaries RLS Policies
-- Date: 2025-12-14
-- Author: Master Architect Agent
--
-- PURPOSE:
-- Add missing INSERT policy to weekly_summaries table.
-- The original migration (20251206_journey_redesign.sql) only created
-- SELECT and UPDATE policies, causing "new row violates row-level security
-- policy" errors when trying to insert new weekly summaries.
--
-- ERROR BEING FIXED:
-- "new row violates row-level security policy for table 'weekly_summaries'"
-- ============================================================================

-- ============================================================================
-- PART 1: ADD INSERT POLICY
-- ============================================================================

-- Drop if exists (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own weekly summaries" ON public.weekly_summaries;

-- Create INSERT policy
CREATE POLICY "Users can insert their own weekly summaries"
  ON public.weekly_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert their own weekly summaries" ON public.weekly_summaries IS
  'Allows authenticated users to insert weekly summaries for themselves only';

-- ============================================================================
-- PART 2: ENSURE UPDATE POLICY HAS WITH CHECK (defensive)
-- ============================================================================

-- The original UPDATE policy only has USING but no WITH CHECK.
-- While Postgres defaults to using USING for WITH CHECK, let's be explicit.
-- We drop and recreate to ensure it's properly configured.

DROP POLICY IF EXISTS "Users can update own summaries" ON public.weekly_summaries;

CREATE POLICY "Users can update own summaries"
  ON public.weekly_summaries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own summaries" ON public.weekly_summaries IS
  'Allows authenticated users to update their own weekly summaries only';

-- ============================================================================
-- PART 3: ADD DELETE POLICY (for completeness)
-- ============================================================================

-- Also adding DELETE policy for complete CRUD support
DROP POLICY IF EXISTS "Users can delete their own weekly summaries" ON public.weekly_summaries;

CREATE POLICY "Users can delete their own weekly summaries"
  ON public.weekly_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete their own weekly summaries" ON public.weekly_summaries IS
  'Allows authenticated users to delete their own weekly summaries only';

-- ============================================================================
-- PART 4: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Ensure authenticated users have table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_summaries TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify policies are correctly applied:
--
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'weekly_summaries'
-- ORDER BY policyname;
--
-- Expected output should show 4 policies:
-- 1. "Users can delete their own weekly summaries" (DELETE)
-- 2. "Users can insert their own weekly summaries" (INSERT)
-- 3. "Users can update own summaries" (UPDATE)
-- 4. "Users can view own summaries" (SELECT)
-- ============================================================================
