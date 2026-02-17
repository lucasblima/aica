-- Migration: Studio Schema Alignment
-- Created: 2026-02-17
-- Purpose: Align the database schema with what the Studio TypeScript code expects.
--
-- The Studio module was migrated from _deprecated/modules/podcast/ but the original
-- DB had columns that were created manually or via older migrations that are no longer
-- tracked. The frontend code references columns that don't exist in the versioned
-- migrations. This migration adds missing columns, tables, and views to close the gap.
--
-- Changes:
-- 1. podcast_episodes: Add missing columns (location, season, biography, controversies, ice_breakers)
-- 2. podcast_episodes: Update status CHECK constraint to include draft, in_progress, in_production
-- 3. podcast_topic_categories: Create new table with RLS
-- 4. podcast_topics: Add missing columns (text, order, completed, archived, category_id)
-- 5. podcast_shows_with_stats: Create view aliasing name->title, cover_image_url->cover_url

-- ============================================================================
-- 1. podcast_episodes — Add missing columns
-- ============================================================================

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS season TEXT;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS biography TEXT;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS controversies JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS ice_breakers TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.podcast_episodes.location IS
  'Recording location for the episode (e.g., studio name, city)';

COMMENT ON COLUMN public.podcast_episodes.season IS
  'Season identifier for the episode (e.g., "S01", "Season 2")';

COMMENT ON COLUMN public.podcast_episodes.biography IS
  'Guest biography text used in pre-production';

COMMENT ON COLUMN public.podcast_episodes.controversies IS
  'Array of controversy objects [{title, summary, source, sentiment, date}] for guest research';

COMMENT ON COLUMN public.podcast_episodes.ice_breakers IS
  'Array of ice-breaker questions for the episode opening';

-- ============================================================================
-- 2. podcast_episodes — Update status CHECK constraint
-- ============================================================================
-- The frontend uses statuses: draft, planning, in_progress, in_production,
-- scheduled, recorded, editing, published, archived.
-- The existing constraint only allows: planning, scheduled, recorded, editing, published, archived.
-- We need to drop and recreate it to add: draft, in_progress, in_production.

DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'podcast_episodes_status_check'
      AND table_name = 'podcast_episodes'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.podcast_episodes DROP CONSTRAINT podcast_episodes_status_check;
  END IF;
END $$;

ALTER TABLE public.podcast_episodes
  ADD CONSTRAINT podcast_episodes_status_check
  CHECK (status IN (
    'draft',
    'planning',
    'in_progress',
    'in_production',
    'scheduled',
    'recorded',
    'editing',
    'published',
    'archived'
  ));

-- ============================================================================
-- 3. podcast_topic_categories — Create table
-- ============================================================================
-- Categories allow grouping podcast topics (e.g., "Opening", "Deep Dive", "Sponsor")

CREATE TABLE IF NOT EXISTS public.podcast_topic_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for episode lookups
CREATE INDEX IF NOT EXISTS idx_podcast_topic_categories_episode_id
  ON public.podcast_topic_categories(episode_id);

-- RLS
ALTER TABLE public.podcast_topic_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own topic categories"
  ON public.podcast_topic_categories
  FOR ALL
  USING (
    episode_id IN (
      SELECT id FROM public.podcast_episodes WHERE user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_podcast_topic_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_podcast_topic_categories_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_podcast_topic_categories_updated_at
      BEFORE UPDATE ON public.podcast_topic_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_podcast_topic_categories_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.podcast_topic_categories IS
  'Categories for organizing podcast topics within an episode (e.g., Opening, Deep Dive, Sponsor)';

-- ============================================================================
-- 4. podcast_topics — Add missing columns
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'podcast_topics' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS text TEXT;
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS "order" INTEGER;
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.podcast_topic_categories(id) ON DELETE SET NULL;

    COMMENT ON COLUMN public.podcast_topics.text IS
      'Topic content text (complementary to title/name)';
    COMMENT ON COLUMN public.podcast_topics."order" IS
      'Display order of the topic within its episode or category';
    COMMENT ON COLUMN public.podcast_topics.completed IS
      'Whether the topic has been covered/discussed during recording';
    COMMENT ON COLUMN public.podcast_topics.archived IS
      'Whether the topic has been archived (hidden from active view)';
    COMMENT ON COLUMN public.podcast_topics.category_id IS
      'Optional reference to a topic category for grouping';
  END IF;
END $$;

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_podcast_topics_category_id
  ON public.podcast_topics(category_id);

-- ============================================================================
-- 5. podcast_shows_with_stats — Create view
-- ============================================================================
-- This view provides episode counts and aliases name->title, cover_image_url->cover_url
-- for frontend compatibility (the TS types expect `title` and `cover_url`).

CREATE OR REPLACE VIEW public.podcast_shows_with_stats AS
SELECT
  ps.*,
  ps.name AS title,
  ps.cover_image_url AS cover_url,
  COUNT(pe.id) AS episodes_count
FROM public.podcast_shows ps
LEFT JOIN public.podcast_episodes pe ON pe.show_id = ps.id
GROUP BY ps.id;

COMMENT ON VIEW public.podcast_shows_with_stats IS
  'View that enriches podcast_shows with episode counts and aliases name->title, cover_image_url->cover_url for frontend compatibility';

-- ============================================================================
-- 6. MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260217120000_studio_schema_alignment completed successfully';
  RAISE NOTICE '  - Added 5 columns to podcast_episodes (location, season, biography, controversies, ice_breakers)';
  RAISE NOTICE '  - Updated podcast_episodes status CHECK to include draft, in_progress, in_production';
  RAISE NOTICE '  - Created table podcast_topic_categories with RLS';
  RAISE NOTICE '  - Added 5 columns to podcast_topics (text, order, completed, archived, category_id)';
  RAISE NOTICE '  - Created view podcast_shows_with_stats with title/cover_url aliases';
END $$;
