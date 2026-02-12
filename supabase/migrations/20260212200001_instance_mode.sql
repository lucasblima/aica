-- =============================================================================
-- Instance Mode: chatbot vs full_monitor
--
-- Distinguishes between:
-- - chatbot: Evolution API connects to the AICA bot number (user talks TO Aica)
-- - full_monitor: Legacy mode where Evolution API monitors user's own number
--
-- New sessions default to 'chatbot'. Existing sessions are marked 'full_monitor'.
-- =============================================================================

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS instance_mode TEXT DEFAULT 'chatbot'
    CHECK (instance_mode IN ('chatbot', 'full_monitor'));

-- Mark existing sessions as legacy full_monitor
UPDATE whatsapp_sessions
SET instance_mode = 'full_monitor'
WHERE instance_mode IS NULL OR instance_mode = 'chatbot';

-- Comment
COMMENT ON COLUMN whatsapp_sessions.instance_mode IS 'chatbot = user talks to Aica bot; full_monitor = legacy mode monitoring user WhatsApp';
