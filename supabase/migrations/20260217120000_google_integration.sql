-- Google Integration Migration: Gmail + Drive support
-- Extends google_calendar_tokens, adds gmail_cache and drive_cache tables
-- Created: 2026-02-17

-- ============================================================================
-- 1. Extend google_calendar_tokens with scope tracking columns
-- ============================================================================

ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS gmail_scope_granted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drive_scope_granted BOOLEAN DEFAULT FALSE;

-- Backfill from existing scopes array
UPDATE public.google_calendar_tokens
SET gmail_scope_granted = (scopes @> ARRAY['https://www.googleapis.com/auth/gmail.readonly'])
WHERE scopes IS NOT NULL AND gmail_scope_granted = FALSE;

UPDATE public.google_calendar_tokens
SET drive_scope_granted = (scopes @> ARRAY['https://www.googleapis.com/auth/drive.readonly'])
WHERE scopes IS NOT NULL AND drive_scope_granted = FALSE;

-- ============================================================================
-- 2. Gmail cache table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gmail_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message_id TEXT NOT NULL,
    thread_id TEXT,
    subject TEXT,
    snippet TEXT,
    sender TEXT,
    sender_email TEXT,
    received_at TIMESTAMPTZ,
    labels TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_gmail_message UNIQUE(user_id, message_id)
);

COMMENT ON TABLE public.gmail_cache IS 'Caches Gmail message metadata for faster access. Cleaned periodically by pg_cron.';

ALTER TABLE public.gmail_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gmail cache" ON public.gmail_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail cache" ON public.gmail_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail cache" ON public.gmail_cache
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail cache" ON public.gmail_cache
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gmail_cache_user_received ON public.gmail_cache(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_cache_user_sender ON public.gmail_cache(user_id, sender_email);
CREATE INDEX IF NOT EXISTS idx_gmail_cache_cached_at ON public.gmail_cache(cached_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_cache TO authenticated;

-- ============================================================================
-- 3. Drive cache table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.drive_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_id TEXT NOT NULL,
    name TEXT,
    mime_type TEXT,
    icon_link TEXT,
    web_view_link TEXT,
    thumbnail_link TEXT,
    modified_time TIMESTAMPTZ,
    size_bytes BIGINT,
    shared BOOLEAN DEFAULT FALSE,
    starred BOOLEAN DEFAULT FALSE,
    parent_folder_id TEXT,
    parent_folder_name TEXT,
    cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_drive_file UNIQUE(user_id, file_id)
);

COMMENT ON TABLE public.drive_cache IS 'Caches Google Drive file metadata for faster access. Cleaned periodically by pg_cron.';

ALTER TABLE public.drive_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own drive cache" ON public.drive_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive cache" ON public.drive_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive cache" ON public.drive_cache
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drive cache" ON public.drive_cache
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_drive_cache_user_modified ON public.drive_cache(user_id, modified_time DESC);
CREATE INDEX IF NOT EXISTS idx_drive_cache_user_mime ON public.drive_cache(user_id, mime_type);
CREATE INDEX IF NOT EXISTS idx_drive_cache_cached_at ON public.drive_cache(cached_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_cache TO authenticated;

-- ============================================================================
-- 4. Cleanup RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_google_cache(p_days INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gmail_deleted INTEGER;
  drive_deleted INTEGER;
  cutoff TIMESTAMPTZ;
BEGIN
  cutoff := NOW() - (p_days || ' days')::INTERVAL;

  DELETE FROM public.gmail_cache WHERE cached_at < cutoff;
  GET DIAGNOSTICS gmail_deleted = ROW_COUNT;

  DELETE FROM public.drive_cache WHERE cached_at < cutoff;
  GET DIAGNOSTICS drive_deleted = ROW_COUNT;

  RETURN json_build_object(
    'gmail_deleted', gmail_deleted,
    'drive_deleted', drive_deleted,
    'cutoff', cutoff
  );
END;
$$;

-- ============================================================================
-- 5. Schedule pg_cron cleanup (daily at 03:00 BRT = 06:00 UTC)
-- ============================================================================

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-google-cache');
    PERFORM cron.schedule(
      'cleanup-google-cache',
      '0 6 * * *',
      'SELECT public.cleanup_google_cache(7)'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, skipping schedule: %', SQLERRM;
END $outer$;
