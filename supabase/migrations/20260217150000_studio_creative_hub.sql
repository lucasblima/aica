-- ============================================================================
-- STUDIO CREATIVE HUB — Comprehensive Database Migration
-- Date: 2026-02-17
-- Purpose: Create all tables and RPCs for the Studio Creative Hub (5 phases)
--
-- Phase 1: Post-Production (transcriptions, show notes, clips, assets, brand kits)
-- Phase 2: Articles & Newsletter (article drafts, newsletters)
-- Phase 4: Distribution (content calendar)
-- Phase 5: Analytics & Collaboration (analytics, team members, comments)
--
-- All tables include:
--   - RLS enabled with user_id-based policies
--   - IF NOT EXISTS for idempotency
--   - Indexes on foreign keys and common query patterns
-- ============================================================================


-- ============================================================================
-- PHASE 1: POST-PRODUCTION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1.1 studio_transcriptions
-- --------------------------------------------------------------------------
-- Stores AI-generated transcriptions for podcast episodes / video projects

CREATE TABLE IF NOT EXISTS public.studio_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  language TEXT DEFAULT 'pt-BR',
  duration_seconds INTEGER,
  speakers JSONB DEFAULT '[]'::jsonb,
  chapters JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_transcriptions_project_id
  ON public.studio_transcriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_transcriptions_user_id
  ON public.studio_transcriptions(user_id);

ALTER TABLE public.studio_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_transcriptions_select" ON public.studio_transcriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_transcriptions_insert" ON public.studio_transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_transcriptions_update" ON public.studio_transcriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_transcriptions_delete" ON public.studio_transcriptions
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_transcriptions IS
  'AI-generated transcriptions for podcast episodes and video projects';


-- --------------------------------------------------------------------------
-- 1.2 studio_show_notes
-- --------------------------------------------------------------------------
-- AI-generated show notes with highlights, quotes, and SEO metadata

CREATE TABLE IF NOT EXISTS public.studio_show_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  highlights TEXT[] DEFAULT '{}',
  key_quotes TEXT[] DEFAULT '{}',
  seo_description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_show_notes_project_id
  ON public.studio_show_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_show_notes_user_id
  ON public.studio_show_notes(user_id);

ALTER TABLE public.studio_show_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_show_notes_select" ON public.studio_show_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_show_notes_insert" ON public.studio_show_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_show_notes_update" ON public.studio_show_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_show_notes_delete" ON public.studio_show_notes
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_show_notes IS
  'AI-generated show notes with highlights, key quotes, and SEO metadata';


-- --------------------------------------------------------------------------
-- 1.3 studio_clips
-- --------------------------------------------------------------------------
-- Short-form content clips extracted from episodes for social media

CREATE TABLE IF NOT EXISTS public.studio_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  start_time_seconds NUMERIC,
  end_time_seconds NUMERIC,
  transcript_segment TEXT,
  platform TEXT,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'draft', 'approved', 'published')),
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_clips_project_id
  ON public.studio_clips(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_clips_user_id
  ON public.studio_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_clips_status
  ON public.studio_clips(status);

ALTER TABLE public.studio_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_clips_select" ON public.studio_clips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_clips_insert" ON public.studio_clips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_clips_update" ON public.studio_clips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_clips_delete" ON public.studio_clips
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_clips IS
  'Short-form content clips extracted from episodes for social media distribution';


-- --------------------------------------------------------------------------
-- 1.4 studio_assets
-- --------------------------------------------------------------------------
-- Media asset management (audio, video, images, documents, transcripts)

CREATE TABLE IF NOT EXISTS public.studio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('audio', 'video', 'image', 'document', 'transcript')),
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_assets_user_id
  ON public.studio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_assets_project_id
  ON public.studio_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_assets_asset_type
  ON public.studio_assets(asset_type);

ALTER TABLE public.studio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_assets_select" ON public.studio_assets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_assets_insert" ON public.studio_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_assets_update" ON public.studio_assets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_assets_delete" ON public.studio_assets
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_assets IS
  'Media asset management for Studio projects (audio, video, images, documents, transcripts)';


-- --------------------------------------------------------------------------
-- 1.5 studio_brand_kits
-- --------------------------------------------------------------------------
-- Brand identity presets for consistent content creation

CREATE TABLE IF NOT EXISTS public.studio_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  color_primary TEXT DEFAULT '#f59e0b',
  color_secondary TEXT DEFAULT '#d97706',
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  tone_of_voice TEXT,
  intro_audio_url TEXT,
  outro_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_brand_kits_user_id
  ON public.studio_brand_kits(user_id);

ALTER TABLE public.studio_brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_brand_kits_select" ON public.studio_brand_kits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_brand_kits_insert" ON public.studio_brand_kits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_brand_kits_update" ON public.studio_brand_kits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_brand_kits_delete" ON public.studio_brand_kits
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_brand_kits IS
  'Brand identity presets for consistent content creation across platforms';


-- ============================================================================
-- PHASE 2: ARTICLES & NEWSLETTER
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1 studio_article_drafts
-- --------------------------------------------------------------------------
-- Long-form article drafts with SEO scoring and publishing workflow

CREATE TABLE IF NOT EXISTS public.studio_article_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  outline JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER DEFAULT 0,
  seo_score INTEGER,
  seo_suggestions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  published_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_article_drafts_project_id
  ON public.studio_article_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_article_drafts_user_id
  ON public.studio_article_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_article_drafts_status
  ON public.studio_article_drafts(status);

ALTER TABLE public.studio_article_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_article_drafts_select" ON public.studio_article_drafts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_article_drafts_insert" ON public.studio_article_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_article_drafts_update" ON public.studio_article_drafts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_article_drafts_delete" ON public.studio_article_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_studio_article_drafts_updated_at()
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
    WHERE tgname = 'trigger_studio_article_drafts_updated_at'
  ) THEN
    CREATE TRIGGER trigger_studio_article_drafts_updated_at
      BEFORE UPDATE ON public.studio_article_drafts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_studio_article_drafts_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.studio_article_drafts IS
  'Long-form article drafts with SEO scoring, outlines, and publishing workflow';


-- --------------------------------------------------------------------------
-- 2.2 studio_newsletters
-- --------------------------------------------------------------------------
-- Newsletter management with scheduling, templates, and delivery tracking

CREATE TABLE IF NOT EXISTS public.studio_newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT DEFAULT '',
  template TEXT DEFAULT 'default',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipients_count INTEGER DEFAULT 0,
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_newsletters_user_id
  ON public.studio_newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_newsletters_status
  ON public.studio_newsletters(status);
CREATE INDEX IF NOT EXISTS idx_studio_newsletters_scheduled_at
  ON public.studio_newsletters(scheduled_at);

ALTER TABLE public.studio_newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_newsletters_select" ON public.studio_newsletters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_newsletters_insert" ON public.studio_newsletters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_newsletters_update" ON public.studio_newsletters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_newsletters_delete" ON public.studio_newsletters
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_newsletters IS
  'Newsletter management with scheduling, templates, and delivery tracking';


-- ============================================================================
-- PHASE 4: DISTRIBUTION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 studio_content_calendar
-- --------------------------------------------------------------------------
-- Cross-platform content scheduling and publishing calendar

CREATE TABLE IF NOT EXISTS public.studio_content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  clip_id UUID,
  platform TEXT NOT NULL CHECK (platform IN (
    'spotify', 'youtube', 'instagram', 'tiktok',
    'linkedin', 'twitter', 'newsletter', 'blog'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_content_calendar_user_id
  ON public.studio_content_calendar(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_content_calendar_scheduled_at
  ON public.studio_content_calendar(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_studio_content_calendar_platform
  ON public.studio_content_calendar(platform);
CREATE INDEX IF NOT EXISTS idx_studio_content_calendar_status
  ON public.studio_content_calendar(status);

ALTER TABLE public.studio_content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_content_calendar_select" ON public.studio_content_calendar
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_content_calendar_insert" ON public.studio_content_calendar
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_content_calendar_update" ON public.studio_content_calendar
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_content_calendar_delete" ON public.studio_content_calendar
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_content_calendar IS
  'Cross-platform content scheduling and publishing calendar';


-- ============================================================================
-- PHASE 5: ANALYTICS & COLLABORATION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 5.1 studio_analytics
-- --------------------------------------------------------------------------
-- Platform-specific analytics metrics (downloads, views, engagement)

CREATE TABLE IF NOT EXISTS public.studio_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_analytics_user_id
  ON public.studio_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_analytics_project_id
  ON public.studio_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_analytics_platform
  ON public.studio_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_studio_analytics_recorded_at
  ON public.studio_analytics(recorded_at);

ALTER TABLE public.studio_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_analytics_select" ON public.studio_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_analytics_insert" ON public.studio_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_analytics_update" ON public.studio_analytics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_analytics_delete" ON public.studio_analytics
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_analytics IS
  'Platform-specific analytics metrics (downloads, views, engagement, etc.)';


-- --------------------------------------------------------------------------
-- 5.2 studio_team_members
-- --------------------------------------------------------------------------
-- Collaboration team with role-based access

CREATE TABLE IF NOT EXISTS public.studio_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'designer', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_studio_team_members_user_id
  ON public.studio_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_team_members_member_email
  ON public.studio_team_members(member_email);
CREATE INDEX IF NOT EXISTS idx_studio_team_members_status
  ON public.studio_team_members(status);

ALTER TABLE public.studio_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_team_members_select" ON public.studio_team_members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_team_members_insert" ON public.studio_team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_team_members_update" ON public.studio_team_members
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_team_members_delete" ON public.studio_team_members
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_team_members IS
  'Collaboration team members with role-based access (admin, editor, designer, viewer)';


-- --------------------------------------------------------------------------
-- 5.3 studio_comments
-- --------------------------------------------------------------------------
-- Timestamped comments on projects and assets (threaded)

CREATE TABLE IF NOT EXISTS public.studio_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  asset_id UUID,
  content TEXT NOT NULL,
  timestamp_seconds NUMERIC,
  parent_comment_id UUID REFERENCES public.studio_comments(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_comments_user_id
  ON public.studio_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_comments_project_id
  ON public.studio_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_comments_asset_id
  ON public.studio_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_studio_comments_parent_comment_id
  ON public.studio_comments(parent_comment_id);

ALTER TABLE public.studio_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_comments_select" ON public.studio_comments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "studio_comments_insert" ON public.studio_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "studio_comments_update" ON public.studio_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "studio_comments_delete" ON public.studio_comments
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.studio_comments IS
  'Timestamped threaded comments on projects and assets for collaboration';


-- ============================================================================
-- RPCs (SECURITY DEFINER with explicit auth.uid() checks)
-- ============================================================================

-- --------------------------------------------------------------------------
-- RPC 1: get_project_transcription
-- --------------------------------------------------------------------------
-- Returns transcription for a given project, filtered by authenticated user

CREATE OR REPLACE FUNCTION public.get_project_transcription(p_project_id UUID)
RETURNS SETOF public.studio_transcriptions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.studio_transcriptions
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_project_transcription(UUID) IS
  'Returns the most recent transcription for a project, filtered by authenticated user';


-- --------------------------------------------------------------------------
-- RPC 2: get_project_show_notes
-- --------------------------------------------------------------------------
-- Returns show notes for a given project, filtered by authenticated user

CREATE OR REPLACE FUNCTION public.get_project_show_notes(p_project_id UUID)
RETURNS SETOF public.studio_show_notes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.studio_show_notes
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_project_show_notes(UUID) IS
  'Returns the most recent show notes for a project, filtered by authenticated user';


-- --------------------------------------------------------------------------
-- RPC 3: get_project_clips
-- --------------------------------------------------------------------------
-- Returns all clips for a project ordered by start time

CREATE OR REPLACE FUNCTION public.get_project_clips(p_project_id UUID)
RETURNS SETOF public.studio_clips
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.studio_clips
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
  ORDER BY start_time_seconds ASC;
$$;

COMMENT ON FUNCTION public.get_project_clips(UUID) IS
  'Returns all clips for a project ordered by start_time_seconds, filtered by authenticated user';


-- --------------------------------------------------------------------------
-- RPC 4: get_content_calendar
-- --------------------------------------------------------------------------
-- Returns calendar entries in a date range for a specific user

CREATE OR REPLACE FUNCTION public.get_content_calendar(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS SETOF public.studio_content_calendar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the requested user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied: user mismatch';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.studio_content_calendar
    WHERE user_id = p_user_id
      AND scheduled_at >= p_start_date::TIMESTAMPTZ
      AND scheduled_at < (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
    ORDER BY scheduled_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_content_calendar(UUID, DATE, DATE) IS
  'Returns content calendar entries within a date range for the authenticated user';


-- --------------------------------------------------------------------------
-- RPC 5: get_studio_analytics_summary
-- --------------------------------------------------------------------------
-- Returns aggregated analytics grouped by platform for the last N days

CREATE OR REPLACE FUNCTION public.get_studio_analytics_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  platform TEXT,
  total_value NUMERIC,
  metric_count BIGINT,
  avg_value NUMERIC,
  latest_recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the requested user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied: user mismatch';
  END IF;

  RETURN QUERY
    SELECT
      sa.platform,
      SUM(sa.metric_value) AS total_value,
      COUNT(*) AS metric_count,
      AVG(sa.metric_value) AS avg_value,
      MAX(sa.recorded_at) AS latest_recorded_at
    FROM public.studio_analytics sa
    WHERE sa.user_id = p_user_id
      AND sa.recorded_at >= (NOW() - (p_days || ' days')::INTERVAL)
    GROUP BY sa.platform
    ORDER BY total_value DESC;
END;
$$;

COMMENT ON FUNCTION public.get_studio_analytics_summary(UUID, INTEGER) IS
  'Returns aggregated analytics summary grouped by platform for the last N days';


-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 20260217150000_studio_creative_hub completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES CREATED (12):';
  RAISE NOTICE '  Phase 1: studio_transcriptions, studio_show_notes, studio_clips, studio_assets, studio_brand_kits';
  RAISE NOTICE '  Phase 2: studio_article_drafts, studio_newsletters';
  RAISE NOTICE '  Phase 4: studio_content_calendar';
  RAISE NOTICE '  Phase 5: studio_analytics, studio_team_members, studio_comments';
  RAISE NOTICE '';
  RAISE NOTICE 'RPCs CREATED (5):';
  RAISE NOTICE '  get_project_transcription(uuid)';
  RAISE NOTICE '  get_project_show_notes(uuid)';
  RAISE NOTICE '  get_project_clips(uuid)';
  RAISE NOTICE '  get_content_calendar(uuid, date, date)';
  RAISE NOTICE '  get_studio_analytics_summary(uuid, integer)';
  RAISE NOTICE '';
  RAISE NOTICE 'ALL tables have RLS enabled with user_id-based policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '============================================================';
END $$;
