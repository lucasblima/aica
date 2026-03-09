-- Migration: Add Foreign Key Constraints to Studio Creative Hub Tables
-- Created: 2026-03-09
-- Purpose: The creative hub migration (20260217150000) created 12 studio_* tables
--   where project_id columns are plain UUIDs with no FK constraint. This migration
--   adds proper FK references to podcast_episodes(id) ON DELETE CASCADE for data
--   integrity, plus FKs on studio_comments.asset_id and studio_content_calendar.clip_id.
--
-- All operations wrapped in DO blocks for idempotent execution (skips if constraint exists).
-- ============================================================================


-- Helper: Add a FK constraint only if it doesn't already exist
-- (PostgreSQL doesn't support ADD CONSTRAINT IF NOT EXISTS natively)

-- 1. studio_transcriptions.project_id -> podcast_episodes(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_transcriptions_project_id'
      AND table_name = 'studio_transcriptions'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_transcriptions
      ADD CONSTRAINT fk_studio_transcriptions_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. studio_show_notes.project_id -> podcast_episodes(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_show_notes_project_id'
      AND table_name = 'studio_show_notes'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_show_notes
      ADD CONSTRAINT fk_studio_show_notes_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. studio_clips.project_id -> podcast_episodes(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_clips_project_id'
      AND table_name = 'studio_clips'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_clips
      ADD CONSTRAINT fk_studio_clips_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. studio_assets.project_id -> podcast_episodes(id) ON DELETE CASCADE
-- Note: project_id is nullable on studio_assets, FK still works (NULL values skip check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_assets_project_id'
      AND table_name = 'studio_assets'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_assets
      ADD CONSTRAINT fk_studio_assets_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. studio_article_drafts.project_id -> podcast_episodes(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_article_drafts_project_id'
      AND table_name = 'studio_article_drafts'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_article_drafts
      ADD CONSTRAINT fk_studio_article_drafts_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. studio_newsletters.project_id -> podcast_episodes(id) ON DELETE CASCADE
-- Note: project_id is nullable on studio_newsletters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_newsletters_project_id'
      AND table_name = 'studio_newsletters'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_newsletters
      ADD CONSTRAINT fk_studio_newsletters_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. studio_content_calendar.project_id -> podcast_episodes(id) ON DELETE CASCADE
-- Note: project_id is nullable on studio_content_calendar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_content_calendar_project_id'
      AND table_name = 'studio_content_calendar'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_content_calendar
      ADD CONSTRAINT fk_studio_content_calendar_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. studio_analytics.project_id -> podcast_episodes(id) ON DELETE CASCADE
-- Note: project_id is nullable on studio_analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_analytics_project_id'
      AND table_name = 'studio_analytics'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_analytics
      ADD CONSTRAINT fk_studio_analytics_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 9. studio_comments.project_id -> podcast_episodes(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_comments_project_id'
      AND table_name = 'studio_comments'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_comments
      ADD CONSTRAINT fk_studio_comments_project_id
      FOREIGN KEY (project_id) REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. studio_comments.asset_id -> studio_assets(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_comments_asset_id'
      AND table_name = 'studio_comments'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_comments
      ADD CONSTRAINT fk_studio_comments_asset_id
      FOREIGN KEY (asset_id) REFERENCES public.studio_assets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11. studio_content_calendar.clip_id -> studio_clips(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_studio_content_calendar_clip_id'
      AND table_name = 'studio_content_calendar'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.studio_content_calendar
      ADD CONSTRAINT fk_studio_content_calendar_clip_id
      FOREIGN KEY (clip_id) REFERENCES public.studio_clips(id) ON DELETE SET NULL;
  END IF;
END $$;


DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000002: Added 11 FK constraints to studio_* tables';
  RAISE NOTICE '  - 9 project_id -> podcast_episodes(id) ON DELETE CASCADE';
  RAISE NOTICE '  - 1 asset_id -> studio_assets(id) ON DELETE SET NULL';
  RAISE NOTICE '  - 1 clip_id -> studio_clips(id) ON DELETE SET NULL';
END $$;
