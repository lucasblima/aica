-- Migration: Add Guest Approval Token Columns
-- Created: 2026-01-02
-- Purpose: Add missing columns for guest approval flow

-- Add approval token columns to podcast_episodes
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS approval_token TEXT;

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS approval_token_created_at TIMESTAMPTZ;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_approval_token
  ON public.podcast_episodes(approval_token)
  WHERE approval_token IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.podcast_episodes.approval_token IS
  'Secure random token for guest approval link. Expires after 30 days.';

COMMENT ON COLUMN public.podcast_episodes.approval_token_created_at IS
  'Timestamp when approval token was generated. Used to calculate 30-day expiry.';

-- Migration summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260102_add_approval_token_columns completed';
  RAISE NOTICE '   - Added approval_token column to podcast_episodes';
  RAISE NOTICE '   - Added approval_token_created_at column to podcast_episodes';
  RAISE NOTICE '   - Created index idx_podcast_episodes_approval_token';
END $$;
