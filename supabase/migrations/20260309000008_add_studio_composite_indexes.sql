-- =============================================================================
-- Migration: Add composite indexes for Studio module performance
-- Sprint 3, Task 3.7: Composite indexes for common query patterns
-- Created: 2026-03-09
--
-- Purpose: Adds composite and partial indexes to optimize common Studio
-- query patterns — topic ordering within episodes, episode listing by user,
-- and filtering episodes with active recordings.
--
-- Note: idx_podcast_topics_episode_order may already exist from migration
-- 20260116000000. CREATE INDEX IF NOT EXISTS handles this safely.
-- =============================================================================

-- ============================================================================
-- 1. Composite index: podcast_topics(episode_id, order_index)
-- ============================================================================
-- Optimizes: getTopics(episodeId) which orders by order_index within an episode.
-- May already exist from 20260116000000_create_missing_rls_test_tables.sql.

CREATE INDEX IF NOT EXISTS idx_podcast_topics_episode_order
  ON public.podcast_topics(episode_id, order_index);

-- ============================================================================
-- 2. Composite index: podcast_episodes(user_id, created_at DESC)
-- ============================================================================
-- Optimizes: listEpisodes() which filters by user_id (via RLS) and orders
-- by created_at DESC. Covers the most common episode listing query.

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_created
  ON public.podcast_episodes(user_id, created_at DESC);

-- ============================================================================
-- 3. Partial index: podcast_episodes(recording_started_at)
--    WHERE recording_started_at IS NOT NULL
-- ============================================================================
-- Optimizes: Finding episodes with active/completed recordings.
-- Partial index keeps the index small (only rows with recording data).

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_recording_started
  ON public.podcast_episodes(recording_started_at)
  WHERE recording_started_at IS NOT NULL;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000008_add_studio_composite_indexes completed';
  RAISE NOTICE '  - idx_podcast_topics_episode_order (episode_id, order_index)';
  RAISE NOTICE '  - idx_podcast_episodes_user_created (user_id, created_at DESC)';
  RAISE NOTICE '  - idx_podcast_episodes_recording_started (partial, WHERE NOT NULL)';
END $$;
