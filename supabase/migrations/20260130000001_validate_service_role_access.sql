-- Migration: Add service role validation function
-- Purpose: Verify webhook has proper service role access
-- Issue: #F6 - Fix RLS Policy Silent Failures

-- Function to validate service role access
CREATE OR REPLACE FUNCTION public.validate_service_role_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function verifies service role can execute
  -- If called with anon key, it fails due to grants
  RETURN TRUE;
END;
$$;

-- Security: Only service_role can execute
REVOKE ALL ON FUNCTION public.validate_service_role_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_service_role_access() FROM anon;
REVOKE ALL ON FUNCTION public.validate_service_role_access() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_service_role_access() TO service_role;

COMMENT ON FUNCTION public.validate_service_role_access IS
  'Validates that caller has service_role access. Used by webhooks to verify configuration.';
