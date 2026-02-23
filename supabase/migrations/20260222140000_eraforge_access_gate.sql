-- ============================================================================
-- EraForge Access Gate — Request-based access control
-- EPIC: feat-eraforge-access-gate
--
-- Table: eraforge_access_requests
--   Tracks access requests for the EraForge module. Users request access,
--   admins approve/reject. Used by EraForgeAccessGuard to gate entry.
--
-- RPCs:
--   1. eraforge_check_access()    — Check if caller has approved access
--   2. eraforge_request_access()  — Idempotent access request
--   3. eraforge_approve_access()  — Admin approves a user's request
--
-- RLS: Users see/insert own rows. Service role bypass.
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

COMMENT ON TABLE public.eraforge_access_requests IS
'Access requests for the EraForge module. One row per user (UNIQUE user_id).';

-- Index on status for admin queries
CREATE INDEX IF NOT EXISTS idx_eraforge_access_requests_status
  ON public.eraforge_access_requests(status);

-- ============================================================================
-- PART 2: RLS POLICIES
-- ============================================================================

ALTER TABLE public.eraforge_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access request"
  ON public.eraforge_access_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access request"
  ON public.eraforge_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to eraforge_access_requests"
  ON public.eraforge_access_requests FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: RPCs
-- ============================================================================

-- 1. eraforge_check_access() — Returns JSON { has_access, status, requested_at }
CREATE OR REPLACE FUNCTION public.eraforge_check_access()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT status, requested_at
  INTO v_row
  FROM public.eraforge_access_requests
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_access', false,
      'status', NULL,
      'requested_at', NULL
    );
  END IF;

  RETURN json_build_object(
    'has_access', (v_row.status = 'approved'),
    'status', v_row.status,
    'requested_at', v_row.requested_at
  );
END;
$$;

COMMENT ON FUNCTION public.eraforge_check_access IS
'Checks if the calling user has approved access to EraForge. Returns JSON with has_access, status, requested_at.';

-- 2. eraforge_request_access() — Idempotent INSERT, returns the row
CREATE OR REPLACE FUNCTION public.eraforge_request_access()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  INSERT INTO public.eraforge_access_requests (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, user_id, status, requested_at, approved_at, notes
  INTO v_row
  FROM public.eraforge_access_requests
  WHERE user_id = auth.uid();

  RETURN row_to_json(v_row);
END;
$$;

COMMENT ON FUNCTION public.eraforge_request_access IS
'Creates an access request for the calling user. Idempotent — does nothing if request already exists. Returns the row as JSON.';

-- 3. eraforge_approve_access(p_target_user_id UUID) — Admin approves
CREATE OR REPLACE FUNCTION public.eraforge_approve_access(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  INSERT INTO public.eraforge_access_requests (user_id, status, approved_at, approved_by)
  VALUES (p_target_user_id, 'approved', NOW(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'approved',
        approved_at = NOW(),
        approved_by = auth.uid();

  SELECT id, user_id, status, requested_at, approved_at, approved_by, notes
  INTO v_row
  FROM public.eraforge_access_requests
  WHERE user_id = p_target_user_id;

  RETURN row_to_json(v_row);
END;
$$;

COMMENT ON FUNCTION public.eraforge_approve_access IS
'Approves access for a target user. Upserts — creates if no request exists. Sets approved_at and approved_by to current user.';

-- ============================================================================
-- PART 4: GRANTS
-- ============================================================================

-- Table grants
GRANT SELECT, INSERT ON public.eraforge_access_requests TO authenticated;
GRANT ALL ON public.eraforge_access_requests TO service_role;

-- Function grants
GRANT EXECUTE ON FUNCTION public.eraforge_check_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eraforge_request_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eraforge_approve_access(UUID) TO authenticated;

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_func_count INTEGER;
BEGIN
  -- Verify table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eraforge_access_requests'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table eraforge_access_requests does not exist';
  END IF;

  -- Verify RLS enabled
  SELECT c.relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'eraforge_access_requests';

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on eraforge_access_requests';
  END IF;

  -- Verify RPCs exist
  SELECT COUNT(*) INTO v_func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('eraforge_check_access', 'eraforge_request_access', 'eraforge_approve_access');

  IF v_func_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 eraforge access functions, found %', v_func_count;
  END IF;

  RAISE NOTICE '=== Migration 20260222140000_eraforge_access_gate completed ===';
  RAISE NOTICE '- Created eraforge_access_requests table';
  RAISE NOTICE '- RLS enabled with user self-access + service_role bypass';
  RAISE NOTICE '- Created 3 RPCs: eraforge_check_access, eraforge_request_access, eraforge_approve_access';
  RAISE NOTICE '- Grants applied for authenticated + service_role';
END $$;
