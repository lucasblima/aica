-- Migration: Add guest_bio column to podcast_episodes
-- Created: 2025-12-20
-- Purpose: Fix missing column error in deprecated podcast module auto-save
--
-- Context: The deprecated podcast module (_deprecated/modules/podcast/) was trying
-- to save/load guest_bio field, but this column was never created in the schema.
-- This migration adds the missing column to prevent Supabase errors.

-- Add guest_bio column
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_bio TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.podcast_episodes.guest_bio IS
  'Short biography or description of the podcast guest (deprecated field, kept for legacy compatibility)';

-- Note: This field is used by deprecated podcast module code in _deprecated/modules/podcast/
-- New code should use the podcast_guest_research.biography field instead
