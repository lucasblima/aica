-- =============================================================================
-- WhatsApp Sessions Sync Columns
-- Epic #122: Multi-Instance WhatsApp Architecture
-- Issue: Additional columns for sync tracking
-- =============================================================================

-- Add columns for tracking sync status
ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS contacts_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_history_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS history_messages_synced INTEGER DEFAULT 0;

-- Add column to contact_network for group metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network' AND column_name = 'group_metadata'
  ) THEN
    ALTER TABLE contact_network ADD COLUMN group_metadata JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network' AND column_name = 'synced_at'
  ) THEN
    ALTER TABLE contact_network ADD COLUMN synced_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add unique constraint for contact_network upserts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_network_user_jid_unique'
  ) THEN
    ALTER TABLE contact_network
      ADD CONSTRAINT contact_network_user_jid_unique
      UNIQUE (user_id, whatsapp_jid);
  END IF;
END $$;

-- Add column to whatsapp_messages for history sync tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_messages' AND column_name = 'synced_from_history'
  ) THEN
    ALTER TABLE whatsapp_messages ADD COLUMN synced_from_history BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add unique constraint for message deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_messages_user_message_unique'
  ) THEN
    -- Only add if we have the required columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'whatsapp_messages' AND column_name = 'user_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'whatsapp_messages' AND column_name = 'message_id'
    ) THEN
      ALTER TABLE whatsapp_messages
        ADD CONSTRAINT whatsapp_messages_user_message_unique
        UNIQUE (user_id, message_id);
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN whatsapp_sessions.contacts_synced IS 'Whether contacts have been synced after connection';
COMMENT ON COLUMN whatsapp_sessions.last_history_sync_at IS 'Timestamp of last message history sync';
COMMENT ON COLUMN whatsapp_sessions.history_messages_synced IS 'Count of messages synced from history';
