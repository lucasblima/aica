-- Migration: Add updated_at Columns and Triggers to Studio Tables
-- Created: 2026-03-09
-- Purpose: Several studio_* tables from the creative hub migration (20260217150000)
--   are missing updated_at columns and triggers. This migration adds them for
--   consistency and to support cache invalidation / change tracking.
--
-- Tables that ALREADY have updated_at (skipped):
--   - studio_article_drafts (has column + trigger)
--   - podcast_topic_categories (has column + trigger from schema_alignment migration)
--
-- Tables that NEED updated_at (added here):
--   - studio_transcriptions
--   - studio_show_notes
--   - studio_clips
--   - studio_assets
--   - studio_newsletters
--   - studio_content_calendar
--   - studio_analytics
--   - studio_team_members
--   - studio_comments
--
-- Reuses the existing update_updated_at_column() trigger function from
-- 20251206000002_journey_redesign.sql. Creates it if it doesn't exist for safety.
-- ============================================================================


-- Ensure the generic trigger function exists (created in journey_redesign migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 1. studio_transcriptions
ALTER TABLE public.studio_transcriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_transcriptions_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_transcriptions_updated_at
      BEFORE UPDATE ON public.studio_transcriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 2. studio_show_notes
ALTER TABLE public.studio_show_notes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_show_notes_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_show_notes_updated_at
      BEFORE UPDATE ON public.studio_show_notes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 3. studio_clips
ALTER TABLE public.studio_clips
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_clips_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_clips_updated_at
      BEFORE UPDATE ON public.studio_clips
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 4. studio_assets
ALTER TABLE public.studio_assets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_assets_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_assets_updated_at
      BEFORE UPDATE ON public.studio_assets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 5. studio_newsletters
ALTER TABLE public.studio_newsletters
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_newsletters_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_newsletters_updated_at
      BEFORE UPDATE ON public.studio_newsletters
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 6. studio_content_calendar
ALTER TABLE public.studio_content_calendar
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_content_calendar_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_content_calendar_updated_at
      BEFORE UPDATE ON public.studio_content_calendar
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 7. studio_analytics
ALTER TABLE public.studio_analytics
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_analytics_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_analytics_updated_at
      BEFORE UPDATE ON public.studio_analytics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 8. studio_team_members
ALTER TABLE public.studio_team_members
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_team_members_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_team_members_updated_at
      BEFORE UPDATE ON public.studio_team_members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- 9. studio_comments
ALTER TABLE public.studio_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_studio_comments_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_comments_updated_at
      BEFORE UPDATE ON public.studio_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000003: Added updated_at column + trigger to 9 studio_* tables';
  RAISE NOTICE '  Tables: transcriptions, show_notes, clips, assets, newsletters,';
  RAISE NOTICE '          content_calendar, analytics, team_members, comments';
END $$;
