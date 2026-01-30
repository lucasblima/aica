-- Migration: Add description column to podcast_episodes
-- Created: 2025-12-20
-- Purpose: Support episode description field in Studio Wizard
-- Issue: StudioWizard.tsx tries to insert description but column doesn't exist
-- Security Note: RLS policies should automatically cover this column if they use SELECT *

-- Add description column to podcast_episodes
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.podcast_episodes.description IS
  'Optional description or notes about the episode provided during creation';

-- ===========================================================================
-- SECURITY REVIEW: RLS Policy Validation
-- ===========================================================================
-- The podcast_episodes table should have RLS policies that restrict access to:
-- 1. Users who own the episodes (via user_id)
-- 2. Users who are members of the association that owns the podcast workspace
--
-- Since this is a new column, verify that existing RLS policies use:
-- - Wildcard SELECT (*) or
-- - Explicitly list all columns including 'description'
--
-- To verify current RLS policies, run:
-- SELECT * FROM pg_policies WHERE tablename = 'podcast_episodes';
--
-- Expected policies should follow this pattern:
-- CREATE POLICY "podcast_episodes_select" ON podcast_episodes
--   FOR SELECT USING (
--     user_id = auth.uid() OR
--     podcast_id IN (
--       SELECT id FROM podcast_workspaces
--       WHERE association_id IN (
--         SELECT association_id FROM association_members
--         WHERE user_id = auth.uid()
--       )
--     )
--   );
-- ===========================================================================
