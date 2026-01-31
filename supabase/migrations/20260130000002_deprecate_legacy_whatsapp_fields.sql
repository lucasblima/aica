-- Migration: Create WhatsApp compatibility view
-- Epic #122: Multi-Instance WhatsApp Architecture
-- Issue F3: Eliminate Dual Source of Truth
--
-- Creates a view joining users with whatsapp_sessions for convenient access.

CREATE OR REPLACE VIEW public.users_whatsapp_compat AS
SELECT
  u.id as user_id,
  -- WhatsApp fields from whatsapp_sessions (most recent session)
  COALESCE(ws.status = 'connected', FALSE) as whatsapp_connected,
  ws.connected_at as whatsapp_connected_at,
  ws.disconnected_at as whatsapp_disconnected_at,
  ws.phone_number as whatsapp_phone,
  ws.instance_name,
  ws.id as session_id,
  ws.status as session_status,
  ws.pairing_attempts,
  ws.created_at as session_created_at,
  ws.updated_at as session_updated_at
FROM public.users u
LEFT JOIN LATERAL (
  SELECT *
  FROM public.whatsapp_sessions
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) ws ON TRUE;

COMMENT ON VIEW public.users_whatsapp_compat IS
  'View providing user ID joined with most recent WhatsApp session data.';

-- Grant permissions
GRANT SELECT ON public.users_whatsapp_compat TO authenticated;
GRANT SELECT ON public.users_whatsapp_compat TO service_role;

-- Enable security invoker so RLS applies
ALTER VIEW public.users_whatsapp_compat SET (security_invoker = true);
