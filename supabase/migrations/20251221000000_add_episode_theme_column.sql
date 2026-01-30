-- Migration: Add episode_theme column to podcast_episodes
-- Created: 2025-12-21
-- Purpose: Store the theme/topic of the episode set during Setup stage
-- Issue: Auto-save trying to persist theme but column doesn't exist

-- Add episode_theme column to podcast_episodes
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS episode_theme TEXT;

COMMENT ON COLUMN public.podcast_episodes.episode_theme IS
  'The main theme or topic of the podcast episode (e.g., "Technology", "Business", "Sports")';

-- Create index for theme-based searches
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_theme
  ON public.podcast_episodes(episode_theme)
  WHERE episode_theme IS NOT NULL;
