-- =============================================================================
-- Migration: Normalize podcast_episodes — Extract publication data
-- Sprint 3, Task 3.2: Extract post-production/publication columns into dedicated table
-- Created: 2026-03-09
--
-- Purpose: Extracts publication-related columns (cuts, blog, social, narrative
-- scoring) from podcast_episodes into podcast_episode_publication. This is the
-- second normalization table (the first was podcast_episode_production).
--
-- Strategy: CREATE new table, INSERT existing data, but do NOT drop columns
-- from podcast_episodes yet. Column removal happens in a later migration after
-- the frontend is updated to read from the new table.
-- =============================================================================

-- ============================================================================
-- 1. CREATE podcast_episode_publication TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.podcast_episode_publication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 1:1 relationship with podcast_episodes
  episode_id UUID NOT NULL UNIQUE REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,

  -- Cuts / clips
  cuts_generated BOOLEAN DEFAULT false,
  cuts_metadata JSONB DEFAULT '[]'::jsonb,   -- Array of generated cut objects

  -- Blog post
  blog_post_generated BOOLEAN DEFAULT false,
  blog_post_url TEXT,

  -- Social media distribution
  published_to_social JSONB DEFAULT '{}'::jsonb,  -- {youtube: true, spotify: false, ...}

  -- Narrative scoring (neuroscience-informed)
  narrative_tension_score REAL,               -- 0-1 tension arc score
  peak_end_moments JSONB,                     -- Peak-End Rule moment markers

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.podcast_episode_publication IS
  'Publication and post-production data for podcast episodes — cuts, blog, social, narrative scoring. Extracted from podcast_episodes for normalization (Sprint 3).';

COMMENT ON COLUMN public.podcast_episode_publication.cuts_metadata IS
  'Array of generated video/audio clip metadata objects';

COMMENT ON COLUMN public.podcast_episode_publication.published_to_social IS
  'Map of platform → published status, e.g. {"youtube": true, "spotify": false}';

COMMENT ON COLUMN public.podcast_episode_publication.narrative_tension_score IS
  'Neuroscience-informed narrative tension arc score (0-1)';

COMMENT ON COLUMN public.podcast_episode_publication.peak_end_moments IS
  'Peak-End Rule (Kahneman) moment markers for episode highlight detection';

-- ============================================================================
-- 2. INDEX on episode_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_episode_publication_episode_id
  ON public.podcast_episode_publication(episode_id);

-- ============================================================================
-- 3. updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_episode_publication_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_episode_publication_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_episode_publication_updated_at
      BEFORE UPDATE ON public.podcast_episode_publication
      FOR EACH ROW
      EXECUTE FUNCTION public.update_episode_publication_updated_at();
  END IF;
END $$;

-- ============================================================================
-- 4. RLS POLICIES (through episode ownership)
-- ============================================================================

ALTER TABLE public.podcast_episode_publication ENABLE ROW LEVEL SECURITY;

-- SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_publication_select' AND tablename = 'podcast_episode_publication') THEN
    CREATE POLICY "episode_publication_select"
      ON public.podcast_episode_publication
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_publication.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_publication_insert' AND tablename = 'podcast_episode_publication') THEN
    CREATE POLICY "episode_publication_insert"
      ON public.podcast_episode_publication
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- UPDATE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_publication_update' AND tablename = 'podcast_episode_publication') THEN
    CREATE POLICY "episode_publication_update"
      ON public.podcast_episode_publication
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_publication.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- DELETE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_publication_delete' AND tablename = 'podcast_episode_publication') THEN
    CREATE POLICY "episode_publication_delete"
      ON public.podcast_episode_publication
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_publication.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. MIGRATE EXISTING DATA from podcast_episodes
-- ============================================================================
-- Copy publication-related columns from podcast_episodes into the new table.
-- Only inserts rows where at least one publication column has data.
-- Uses ON CONFLICT to be idempotent (safe to re-run).

INSERT INTO public.podcast_episode_publication (
  episode_id,
  cuts_generated,
  cuts_metadata,
  blog_post_generated,
  blog_post_url,
  published_to_social,
  narrative_tension_score,
  peak_end_moments,
  created_at,
  updated_at
)
SELECT
  pe.id,
  pe.cuts_generated,
  pe.cuts_metadata,
  pe.blog_post_generated,
  pe.blog_post_url,
  pe.published_to_social,
  pe.narrative_tension_score,
  pe.peak_end_moments,
  pe.created_at,
  pe.updated_at
FROM public.podcast_episodes pe
WHERE pe.cuts_generated = true
   OR pe.blog_post_generated = true
   OR pe.blog_post_url IS NOT NULL
   OR pe.published_to_social IS NOT NULL AND pe.published_to_social != '{}'::jsonb
   OR pe.narrative_tension_score IS NOT NULL
   OR pe.peak_end_moments IS NOT NULL
ON CONFLICT (episode_id) DO NOTHING;

-- ============================================================================
-- 6. MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.podcast_episode_publication;
  RAISE NOTICE 'Migration 20260309000006_normalize_episodes_publication completed';
  RAISE NOTICE '  - Created table: podcast_episode_publication';
  RAISE NOTICE '  - Added RLS policies (4) via episode ownership';
  RAISE NOTICE '  - Added updated_at trigger';
  RAISE NOTICE '  - Migrated % rows from podcast_episodes', v_count;
  RAISE NOTICE '  - NOTE: Columns NOT dropped from podcast_episodes (backward compat)';
END $$;
