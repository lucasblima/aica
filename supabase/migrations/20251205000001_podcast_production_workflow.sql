-- Migration: Podcast Production Workflow Support
-- Created: 2025-12-05
-- Purpose: Add database support for frontend-first podcast production workflow
--
-- This migration adds:
-- 1. New table: podcast_guest_research (guest profile, bio, controversies)
-- 2. New columns to podcast_episodes (guest_reference, theme_mode, recording_duration, etc.)
-- 3. New column to podcast_topics (sponsor_script for teleprompter)
-- 4. RLS policies for all new tables/columns

-- ============================================================================
-- 1. CREATE podcast_guest_research TABLE
-- ============================================================================
-- Stores research data about podcast guests (biography, technical sheet, controversies)
-- Replaces the embedded JSONB fields in podcast_episodes for better querying

CREATE TABLE IF NOT EXISTS public.podcast_guest_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,

  -- Guest identification
  guest_name TEXT NOT NULL,
  guest_reference TEXT, -- URL, Wikipedia link, or text reference provided by user

  -- Profile search metadata
  profile_search_completed BOOLEAN DEFAULT FALSE,
  profile_search_at TIMESTAMPTZ,
  profile_confidence_score INTEGER CHECK (profile_confidence_score >= 0 AND profile_confidence_score <= 100),

  -- Biography data
  biography TEXT, -- Full biography text
  bio_summary TEXT, -- AI-generated summary (shorter version)
  bio_sources JSONB DEFAULT '[]'::jsonb, -- Array of sources [{url, title, date}]

  -- Technical sheet (ficha técnica)
  full_name TEXT,
  birth_date DATE,
  birth_place TEXT,
  nationality TEXT,
  occupation TEXT,
  known_for TEXT,
  education TEXT,
  awards JSONB DEFAULT '[]'::jsonb, -- Array of awards
  social_media JSONB DEFAULT '{}'::jsonb, -- {twitter, instagram, linkedin, etc.}

  -- Controversies and news
  controversies JSONB DEFAULT '[]'::jsonb, -- Array of {title, summary, source, sentiment, date}
  recent_news JSONB DEFAULT '[]'::jsonb, -- Array of recent news articles

  -- Custom sources (uploaded by user)
  custom_sources JSONB DEFAULT '[]'::jsonb, -- Array of {type: 'pdf'|'link'|'text', content, name}

  -- AI chat history (research assistant)
  chat_history JSONB DEFAULT '[]'::jsonb, -- Array of {role: 'user'|'assistant', content, timestamp}

  -- Metadata
  low_context_warning BOOLEAN DEFAULT FALSE, -- TRUE if public info is scarce
  research_quality_score INTEGER CHECK (research_quality_score >= 0 AND research_quality_score <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast episode lookups
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_episode_id
  ON public.podcast_guest_research(episode_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_podcast_guest_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_podcast_guest_research_updated_at
  BEFORE UPDATE ON public.podcast_guest_research
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_guest_research_updated_at();

COMMENT ON TABLE public.podcast_guest_research IS
  'Guest research data for podcast episodes. Supports PreProductionHub research workflow with AI-assisted profile search, biography, controversies, and custom sources.';

-- ============================================================================
-- 2. ADD COLUMNS TO podcast_episodes TABLE
-- ============================================================================
-- Add columns needed by GuestIdentificationWizard and ProductionMode

-- Guest identification (Step 1-2 of wizard)
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_reference TEXT;

-- Theme and scheduling (Step 3 of wizard)
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS theme_mode TEXT CHECK (theme_mode IN ('auto', 'manual')) DEFAULT 'auto';

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Production mode data
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_duration INTEGER; -- Duration in seconds

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_finished_at TIMESTAMPTZ;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_status TEXT
    CHECK (recording_status IN ('idle', 'recording', 'paused', 'finished'))
    DEFAULT 'idle';

-- Storage paths for recordings
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_file_path TEXT; -- Path in Supabase Storage

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS recording_file_size BIGINT; -- Size in bytes

-- Post-production metadata
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS transcript TEXT; -- Auto-generated transcript

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS transcript_generated_at TIMESTAMPTZ;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS cuts_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS cuts_metadata JSONB DEFAULT '[]'::jsonb; -- Array of generated cuts

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS blog_post_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS blog_post_url TEXT;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS published_to_social JSONB DEFAULT '{}'::jsonb; -- {youtube: true, spotify: false, ...}

COMMENT ON COLUMN public.podcast_episodes.guest_reference IS
  'URL or reference provided by user during guest identification (Wikipedia, LinkedIn, etc.)';

COMMENT ON COLUMN public.podcast_episodes.theme_mode IS
  'auto = AI suggests theme based on guest profile | manual = user defines custom theme';

COMMENT ON COLUMN public.podcast_episodes.recording_duration IS
  'Total recording duration in seconds (calculated from start to finish)';

COMMENT ON COLUMN public.podcast_episodes.recording_status IS
  'Current recording state: idle (not started), recording (active), paused, finished';

-- ============================================================================
-- 3. ADD sponsor_script TO podcast_topics TABLE (if table exists)
-- ============================================================================
-- Supports teleprompter auto-scroll for sponsor reads

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'podcast_topics' AND table_schema = 'public') THEN
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS sponsor_script TEXT;
    ALTER TABLE public.podcast_topics ADD COLUMN IF NOT EXISTS is_sponsor_topic BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN public.podcast_topics.sponsor_script IS 'Full script text for sponsor reads. Displayed in teleprompter with auto-scroll.';
    COMMENT ON COLUMN public.podcast_topics.is_sponsor_topic IS 'TRUE if this topic is a sponsor read (triggers auto-scroll in teleprompter)';
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================
-- Ensure all podcast data is user-scoped

-- Enable RLS on podcast_guest_research
ALTER TABLE public.podcast_guest_research ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access research for their own episodes
CREATE POLICY "podcast_guest_research_select"
  ON public.podcast_guest_research
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes
      WHERE podcast_episodes.id = podcast_guest_research.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

CREATE POLICY "podcast_guest_research_insert"
  ON public.podcast_guest_research
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes
      WHERE podcast_episodes.id = podcast_guest_research.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

CREATE POLICY "podcast_guest_research_update"
  ON public.podcast_guest_research
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes
      WHERE podcast_episodes.id = podcast_guest_research.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

CREATE POLICY "podcast_guest_research_delete"
  ON public.podcast_guest_research
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes
      WHERE podcast_episodes.id = podcast_guest_research.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate recording duration from timestamps
CREATE OR REPLACE FUNCTION calculate_recording_duration(
  p_episode_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  SELECT
    EXTRACT(EPOCH FROM (recording_finished_at - recording_started_at))::INTEGER
  INTO v_duration
  FROM public.podcast_episodes
  WHERE id = p_episode_id
    AND recording_started_at IS NOT NULL
    AND recording_finished_at IS NOT NULL;

  RETURN COALESCE(v_duration, 0);
END;
$$;

COMMENT ON FUNCTION calculate_recording_duration IS
  'Calculates recording duration in seconds from start/finish timestamps';

-- Function to get guest research for an episode
CREATE OR REPLACE FUNCTION get_guest_research(
  p_episode_id UUID
)
RETURNS SETOF public.podcast_guest_research
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT gr.*
  FROM public.podcast_guest_research gr
  INNER JOIN public.podcast_episodes ep ON gr.episode_id = ep.id
  WHERE ep.id = p_episode_id
    AND ep.user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION get_guest_research IS
  'Returns guest research for episode owned by current user';

-- ============================================================================
-- 6. MIGRATION SUMMARY
-- ============================================================================

-- Log migration execution
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251205_podcast_production_workflow completed successfully';
  RAISE NOTICE '   - Created table: podcast_guest_research';
  RAISE NOTICE '   - Added 15 columns to podcast_episodes';
  RAISE NOTICE '   - Added 2 columns to podcast_topics';
  RAISE NOTICE '   - Created 4 RLS policies for podcast_guest_research';
  RAISE NOTICE '   - Created 2 helper functions';
  RAISE NOTICE '';
  RAISE NOTICE '🎙️  Frontend components supported:';
  RAISE NOTICE '   - GuestIdentificationWizard (guest_reference, theme_mode)';
  RAISE NOTICE '   - PreProductionHub (podcast_guest_research table)';
  RAISE NOTICE '   - ProductionMode (recording_status, recording_duration)';
  RAISE NOTICE '   - TeleprompterWindow (sponsor_script in podcast_topics)';
  RAISE NOTICE '   - PostProductionHub (transcript, cuts_metadata, blog_post)';
END $$;
