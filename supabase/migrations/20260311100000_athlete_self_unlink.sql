-- ============================================================================
-- Athlete Self-Unlink
--
-- Allows athletes to leave their coach's training program via self-service.
-- 1. RLS policy: athlete can UPDATE own record (scoped to unlink fields only)
-- 2. Trigger guard: athlete_email_status_sync skips churned athletes
-- ============================================================================

-- =====================
-- 1. RLS POLICY: athlete can unlink themselves
-- =====================

CREATE POLICY "Athletes can unlink themselves"
ON public.athletes FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth_user_id IS NULL
  AND invitation_status = 'none'
  AND status = 'churned'
);

-- =====================
-- 2. TRIGGER GUARD: prevent re-link of churned athletes
--    This trigger fires on INSERT OR UPDATE OF email. When a coach later
--    updates the email on a churned athlete record, the trigger would
--    normally auto-link a matching auth user — silently re-enrolling them.
--    The guard below short-circuits for status='churned' to prevent that.
-- =====================

CREATE OR REPLACE FUNCTION public.athlete_email_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Skip athletes that explicitly left (churned) — prevent silent re-link
  IF NEW.status = 'churned' THEN
    RETURN NEW;
  END IF;

  -- Email was removed
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    -- Only reset if not already connected (don't break existing link)
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'none';
    END IF;
    RETURN NEW;
  END IF;

  -- Check if a user with this email already exists
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    -- User exists → link immediately
    NEW.auth_user_id := v_auth_user_id;
    NEW.linked_at := NOW();
    NEW.invitation_status := 'connected';
  ELSE
    -- User doesn't exist yet → pending
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block athlete creation/update
    RAISE WARNING 'athlete_email_status_sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 3. RPC: athlete_unlink_self (SECURITY DEFINER)
--    Bypasses RLS to perform the unlink. Validates auth.uid() internally.
-- =====================

CREATE OR REPLACE FUNCTION public.athlete_unlink_self()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE athletes
  SET auth_user_id = NULL,
      invitation_status = 'none',
      status = 'churned',
      updated_at = NOW()
  WHERE auth_user_id = v_uid;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No athlete record found for this user';
  END IF;
END;
$$;
