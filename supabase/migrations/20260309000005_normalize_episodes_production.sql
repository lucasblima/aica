-- =============================================================================
-- Migration: Normalize podcast_episodes — Extract production data
-- Sprint 3, Task 3.1: Extract recording/transcript columns into dedicated table
-- Created: 2026-03-09
--
-- Purpose: The podcast_episodes table has 31+ columns. This migration extracts
-- recording-related and transcript columns into podcast_episode_production for
-- better separation of concerns (1:1 relationship via episode_id UNIQUE).
--
-- Strategy: CREATE new table, INSERT existing data, but do NOT drop columns
-- from podcast_episodes yet. Column removal happens in a later migration after
-- the frontend is updated to read from the new table.
-- =============================================================================

-- ============================================================================
-- 1. CREATE podcast_episode_production TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.podcast_episode_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 1:1 relationship with podcast_episodes
  episode_id UUID NOT NULL UNIQUE REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,

  -- Recording state
  recording_status TEXT CHECK (recording_status IN ('idle', 'recording', 'paused', 'finished')) DEFAULT 'idle',
  recording_started_at TIMESTAMPTZ,
  recording_finished_at TIMESTAMPTZ,
  recording_duration INTEGER,           -- Duration in seconds

  -- Recording file
  recording_file_path TEXT,             -- Path in Supabase Storage
  recording_file_size BIGINT,           -- Size in bytes

  -- Transcript
  transcript TEXT,
  transcript_generated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.podcast_episode_production IS
  'Production data for podcast episodes — recording status, file, transcript. Extracted from podcast_episodes for normalization (Sprint 3).';

COMMENT ON COLUMN public.podcast_episode_production.recording_status IS
  'Current recording state: idle (not started), recording (active), paused, finished';

COMMENT ON COLUMN public.podcast_episode_production.recording_duration IS
  'Total recording duration in seconds';

COMMENT ON COLUMN public.podcast_episode_production.recording_file_path IS
  'Path to recording file in Supabase Storage';

COMMENT ON COLUMN public.podcast_episode_production.recording_file_size IS
  'Recording file size in bytes';

-- ============================================================================
-- 2. INDEX on episode_id (already UNIQUE, but explicit for clarity)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_episode_production_episode_id
  ON public.podcast_episode_production(episode_id);

-- ============================================================================
-- 3. updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_episode_production_updated_at()
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
    WHERE tgname = 'trigger_update_episode_production_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_episode_production_updated_at
      BEFORE UPDATE ON public.podcast_episode_production
      FOR EACH ROW
      EXECUTE FUNCTION public.update_episode_production_updated_at();
  END IF;
END $$;

-- ============================================================================
-- 4. RLS POLICIES (through episode ownership)
-- ============================================================================
-- podcast_episode_production has no user_id column — ownership is derived
-- from the parent podcast_episodes row via episode_id.

ALTER TABLE public.podcast_episode_production ENABLE ROW LEVEL SECURITY;

-- SELECT: user owns the parent episode
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_production_select' AND tablename = 'podcast_episode_production') THEN
    CREATE POLICY "episode_production_select"
      ON public.podcast_episode_production
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_production.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERT: user owns the parent episode
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_production_insert' AND tablename = 'podcast_episode_production') THEN
    CREATE POLICY "episode_production_insert"
      ON public.podcast_episode_production
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

-- UPDATE: user owns the parent episode
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_production_update' AND tablename = 'podcast_episode_production') THEN
    CREATE POLICY "episode_production_update"
      ON public.podcast_episode_production
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_production.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- DELETE: user owns the parent episode
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'episode_production_delete' AND tablename = 'podcast_episode_production') THEN
    CREATE POLICY "episode_production_delete"
      ON public.podcast_episode_production
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.podcast_episodes pe
          WHERE pe.id = podcast_episode_production.episode_id
            AND pe.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. MIGRATE EXISTING DATA from podcast_episodes
-- ============================================================================
-- Copy production-related columns from podcast_episodes into the new table.
-- Only inserts rows where at least one production column has data.
-- Uses ON CONFLICT to be idempotent (safe to re-run).

INSERT INTO public.podcast_episode_production (
  episode_id,
  recording_status,
  recording_started_at,
  recording_finished_at,
  recording_duration,
  recording_file_path,
  recording_file_size,
  transcript,
  transcript_generated_at,
  created_at,
  updated_at
)
SELECT
  pe.id,
  pe.recording_status,
  pe.recording_started_at,
  pe.recording_finished_at,
  pe.recording_duration,
  pe.recording_file_path,
  pe.recording_file_size,
  pe.transcript,
  pe.transcript_generated_at,
  pe.created_at,
  pe.updated_at
FROM public.podcast_episodes pe
WHERE pe.recording_status IS NOT NULL
   OR pe.recording_started_at IS NOT NULL
   OR pe.recording_finished_at IS NOT NULL
   OR pe.recording_duration IS NOT NULL
   OR pe.recording_file_path IS NOT NULL
   OR pe.recording_file_size IS NOT NULL
   OR pe.transcript IS NOT NULL
   OR pe.transcript_generated_at IS NOT NULL
ON CONFLICT (episode_id) DO NOTHING;

-- ============================================================================
-- 6. MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.podcast_episode_production;
  RAISE NOTICE 'Migration 20260309000005_normalize_episodes_production completed';
  RAISE NOTICE '  - Created table: podcast_episode_production';
  RAISE NOTICE '  - Added RLS policies (4) via episode ownership';
  RAISE NOTICE '  - Added updated_at trigger';
  RAISE NOTICE '  - Migrated % rows from podcast_episodes', v_count;
  RAISE NOTICE '  - NOTE: Columns NOT dropped from podcast_episodes (backward compat)';
END $$;
