-- Migration: Add guest contact fields to podcast_episodes
-- Created: 2025-12-10
-- Purpose: Add phone and email fields for guest contact information

-- Add guest_phone column
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Add guest_email column
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Add email validation constraint
ALTER TABLE public.podcast_episodes
  ADD CONSTRAINT check_guest_email_format
  CHECK (guest_email IS NULL OR guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Add comments for documentation
COMMENT ON COLUMN public.podcast_episodes.guest_phone IS
  'Telefone de contato do convidado (para confirmação e lembretes)';

COMMENT ON COLUMN public.podcast_episodes.guest_email IS
  'Email de contato do convidado (para envio de pauta e convites)';

-- Create index for email lookups (useful for guest management)
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_guest_email
  ON public.podcast_episodes(guest_email)
  WHERE guest_email IS NOT NULL;
