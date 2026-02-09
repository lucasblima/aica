-- Enable Supabase Realtime for whatsapp_sessions table
-- This allows the frontend to receive live updates when WhatsApp connection status changes
-- (e.g., from 'connecting' to 'connected' after pairing code is accepted)
--
-- Without this, useWhatsAppSessionSubscription cannot detect status changes in real-time,
-- forcing users to manually click "Já conectei meu WhatsApp" instead of auto-detecting.

DO $$
BEGIN
  -- Check if whatsapp_sessions is already in the publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'whatsapp_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sessions;
    RAISE NOTICE 'Added whatsapp_sessions to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'whatsapp_sessions already in supabase_realtime publication';
  END IF;
END $$;
