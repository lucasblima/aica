-- Migration: Deprecate legacy WhatsApp fields in users table
-- Epic #122: Multi-Instance WhatsApp Architecture
-- Issue F3: Eliminate Dual Source of Truth
--
-- This migration:
-- 1. Adds deprecation comments to legacy columns in users table
-- 2. Creates a backward-compatible view for any remaining consumers
-- 3. Does NOT remove columns yet (would be breaking change)
-- 4. Future migrations (v2.0) will remove these columns entirely
--
-- Legacy fields being deprecated:
-- - users.whatsapp_connected → whatsapp_sessions.status = 'connected'
-- - users.whatsapp_connected_at → whatsapp_sessions.connected_at
-- - users.whatsapp_disconnected_at → whatsapp_sessions.disconnected_at
-- - users.whatsapp_phone → whatsapp_sessions.phone_number
-- - users.instance_name → whatsapp_sessions.instance_name

-- ============================================================================
-- STEP 1: Mark legacy columns as deprecated via comments
-- ============================================================================

COMMENT ON COLUMN public.users.whatsapp_connected IS
  '@deprecated Use whatsapp_sessions.status = ''connected'' instead. Scheduled for removal in v2.0.';

COMMENT ON COLUMN public.users.whatsapp_connected_at IS
  '@deprecated Use whatsapp_sessions.connected_at instead. Scheduled for removal in v2.0.';

COMMENT ON COLUMN public.users.whatsapp_disconnected_at IS
  '@deprecated Use whatsapp_sessions.disconnected_at instead. Scheduled for removal in v2.0.';

COMMENT ON COLUMN public.users.whatsapp_phone IS
  '@deprecated Use whatsapp_sessions.phone_number instead. Scheduled for removal in v2.0.';

COMMENT ON COLUMN public.users.instance_name IS
  '@deprecated Use whatsapp_sessions.instance_name instead. Scheduled for removal in v2.0.';

-- ============================================================================
-- STEP 2: Create backward-compatible view
-- ============================================================================
-- This view provides legacy field values computed from whatsapp_sessions
-- for any code that still reads from users table
--
-- Usage:
--   SELECT * FROM users_whatsapp_compat WHERE id = auth.uid();
--
-- Returns legacy fields computed from most recent whatsapp_session

CREATE OR REPLACE VIEW public.users_whatsapp_compat AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.updated_at,
  -- Compute legacy fields from whatsapp_sessions (most recent session)
  COALESCE(ws.status = 'connected', u.whatsapp_connected, FALSE) as whatsapp_connected,
  COALESCE(ws.connected_at, u.whatsapp_connected_at) as whatsapp_connected_at,
  COALESCE(ws.disconnected_at, u.whatsapp_disconnected_at) as whatsapp_disconnected_at,
  COALESCE(ws.phone_number, u.whatsapp_phone) as whatsapp_phone,
  COALESCE(ws.instance_name, u.instance_name) as instance_name,
  -- Additional session metadata for debugging
  ws.id as session_id,
  ws.status as session_status,
  ws.qr_code_generated_at,
  ws.pairing_attempts
FROM public.users u
LEFT JOIN LATERAL (
  SELECT *
  FROM public.whatsapp_sessions
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) ws ON TRUE;

COMMENT ON VIEW public.users_whatsapp_compat IS
  'Backward-compatible view providing legacy WhatsApp fields computed from whatsapp_sessions.
   Use whatsapp_sessions table directly for new code.
   Deprecated: Scheduled for removal in v2.0 when legacy fields are dropped.';

-- ============================================================================
-- STEP 3: Grant RLS permissions on view
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON public.users_whatsapp_compat TO authenticated;
GRANT SELECT ON public.users_whatsapp_compat TO service_role;

-- Enable RLS on view (inherits from users table RLS)
-- Users can only see their own record
ALTER VIEW public.users_whatsapp_compat SET (security_invoker = true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually to verify migration success:

-- 1. Check column comments are applied:
-- SELECT col_description('public.users'::regclass, attnum) as comment
-- FROM pg_attribute
-- WHERE attrelid = 'public.users'::regclass
--   AND attname IN ('whatsapp_connected', 'whatsapp_connected_at', 'whatsapp_disconnected_at', 'whatsapp_phone', 'instance_name');

-- 2. Test view returns correct data:
-- SELECT id, whatsapp_connected, session_status, instance_name
-- FROM public.users_whatsapp_compat
-- WHERE id = auth.uid();

-- 3. Compare legacy table vs view (should match):
-- SELECT u.whatsapp_connected as old_connected, v.whatsapp_connected as new_connected
-- FROM public.users u
-- JOIN public.users_whatsapp_compat v ON u.id = v.id
-- WHERE u.id = auth.uid();
