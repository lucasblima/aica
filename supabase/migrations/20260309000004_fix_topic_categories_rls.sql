-- Migration: Fix RLS on podcast_topic_categories
-- Created: 2026-03-09
-- Purpose: The original migration (20260217130000_studio_schema_alignment.sql) created
--   a single FOR ALL policy on podcast_topic_categories. This is problematic because:
--   1. FOR ALL policies don't support WITH CHECK (needed for INSERT/UPDATE)
--   2. Best practice is separate policies per operation for clarity and security
--   3. Missing UNIQUE constraint on (episode_id, name) allows duplicate categories
--
-- This migration:
--   - Drops the existing FOR ALL policy
--   - Creates separate SELECT, INSERT, UPDATE, DELETE policies
--   - Adds UNIQUE constraint on (episode_id, name)
-- ============================================================================


-- 1. Drop the existing FOR ALL policy
DROP POLICY IF EXISTS "Users see own topic categories" ON public.podcast_topic_categories;


-- 2. Create separate policies per operation
-- All policies check episode ownership via podcast_episodes.user_id

CREATE POLICY "topic_categories_select"
  ON public.podcast_topic_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes pe
      WHERE pe.id = podcast_topic_categories.episode_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "topic_categories_insert"
  ON public.podcast_topic_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes pe
      WHERE pe.id = podcast_topic_categories.episode_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "topic_categories_update"
  ON public.podcast_topic_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes pe
      WHERE pe.id = podcast_topic_categories.episode_id
        AND pe.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes pe
      WHERE pe.id = podcast_topic_categories.episode_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "topic_categories_delete"
  ON public.podcast_topic_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes pe
      WHERE pe.id = podcast_topic_categories.episode_id
        AND pe.user_id = auth.uid()
    )
  );


-- 3. Add UNIQUE constraint on (episode_id, name) to prevent duplicate category names
-- Wrapped in DO block for idempotent execution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uq_topic_categories_episode_name'
      AND table_name = 'podcast_topic_categories'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.podcast_topic_categories
      ADD CONSTRAINT uq_topic_categories_episode_name
      UNIQUE (episode_id, name);
  END IF;
END $$;


DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000004: Fixed RLS on podcast_topic_categories';
  RAISE NOTICE '  - Dropped FOR ALL policy';
  RAISE NOTICE '  - Created 4 separate policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - Added UNIQUE constraint on (episode_id, name)';
END $$;
