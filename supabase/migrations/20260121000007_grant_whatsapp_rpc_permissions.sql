-- ============================================================================
-- Fix: Grant permissions to WhatsApp RPC functions
-- Issue: #2 - generate-pairing-code returning 400 Bad Request
-- Problem: RPC functions may lack proper GRANT EXECUTE permissions
-- Date: 2026-01-21
-- ============================================================================

-- Grant EXECUTE permissions on all WhatsApp RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_instance_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_instance_name(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_or_create_whatsapp_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_whatsapp_session(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_whatsapp_session_status(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_whatsapp_session_status(UUID, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.record_pairing_attempt(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_pairing_attempt(UUID, TEXT, TIMESTAMPTZ) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_session_phone_info(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_phone_info(UUID, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_session_sync_stats(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_sync_stats(UUID, INTEGER, INTEGER, INTEGER) TO service_role;

-- Verify permissions
DO $$
BEGIN
  RAISE NOTICE 'Granted EXECUTE permissions on WhatsApp RPC functions to authenticated and service_role';
END $$;
