-- =============================================================================
-- Security Fix: is_admin() must use app_metadata, not user_metadata
--
-- user_metadata (raw_user_meta_data) is writable by any authenticated user
-- via supabase.auth.updateUser({ data: { is_admin: true } }).
-- app_metadata (raw_app_meta_data) can only be set by the service role.
--
-- This migration fixes the privilege escalation vulnerability.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT raw_app_meta_data->>'is_admin' = 'true'
      FROM auth.users
      WHERE id = auth.uid()
    ),
    FALSE
  );
END;
$$;

COMMENT ON FUNCTION is_admin IS 'Checks if the current authenticated user has admin privileges via app_metadata.is_admin (service-role only, not user-writable)';
