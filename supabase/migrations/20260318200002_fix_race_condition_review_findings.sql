-- Code review fixes for Journey Sprint 2 race conditions
-- I1: Use NOW() instead of NEW.created_at to prevent timestamp spoofing
-- I3: Add SET search_path = public to SECURITY DEFINER functions
--
-- NOTE: award_consciousness_points is no longer re-created here.
-- Migration 20260318200001 already includes SET search_path = public.

-- ============================================================
-- Fix check_moment_rate_limit: use NOW() + SET search_path
-- ============================================================

CREATE OR REPLACE FUNCTION check_moment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_created TIMESTAMPTZ;
BEGIN
  -- Advisory lock serializes concurrent inserts per user.
  -- FOR UPDATE alone cannot lock rows that don't exist yet.
  PERFORM pg_advisory_xact_lock(hashtext('moment_rate_limit_' || NEW.user_id::text));

  SELECT created_at INTO last_created
  FROM moments
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Use NOW() instead of NEW.created_at to prevent timestamp spoofing
  IF last_created IS NOT NULL AND
     (NOW() - last_created) < INTERVAL '1 second' THEN
    RAISE EXCEPTION 'Rate limit exceeded: minimum 1 second between moments'
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;
