-- Migration: Cleanup Orphaned Studio Indexes
-- Created: 2026-03-09
-- Purpose: Remove indexes that reference tables that were never created.
--
-- The migration 20251210000001_fix_podcast_pautas_schema.sql (lines 197-199)
-- created indexes on podcast_briefings, podcast_news_articles, and podcast_research.
-- These tables have no CREATE TABLE statement in any migration — the indexes are
-- orphaned references to tables that were planned but never implemented.
--
-- Using DROP INDEX IF EXISTS for safe idempotent execution.
-- ============================================================================

-- These indexes reference non-existent tables:
--   idx_podcast_briefings_episode_id    -> podcast_briefings (never created)
--   idx_podcast_news_articles_episode_id -> podcast_news_articles (never created)
--   idx_podcast_research_episode_id     -> podcast_research (never created)

DROP INDEX IF EXISTS idx_podcast_briefings_episode_id;
DROP INDEX IF EXISTS idx_podcast_news_articles_episode_id;
DROP INDEX IF EXISTS idx_podcast_research_episode_id;

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000001: Cleaned up 3 orphaned indexes referencing non-existent tables';
END $$;
