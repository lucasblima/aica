-- Evolution API Integration: Fix WhatsApp columns for Sprint 2
-- Issue #23: People Unified Network
-- Sprint 2: Add missing columns for contact sync

-- ============================================================================
-- ADD MISSING WHATSAPP COLUMNS
-- ============================================================================

-- WhatsApp ID (remoteJid) - unique identifier for upsert operations
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(100);

-- WhatsApp status message
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_status_message TEXT;

-- Sync enabled flag
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_sync_enabled BOOLEAN DEFAULT true;

-- WhatsApp metadata (JSONB for extensibility)
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_metadata JSONB DEFAULT '{}'::jsonb;

-- Rename column for consistency (if needed)
-- whatsapp_last_message_at -> last_whatsapp_message_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contact_network'
      AND column_name = 'whatsapp_last_message_at'
  ) THEN
    ALTER TABLE contact_network
    RENAME COLUMN whatsapp_last_message_at TO last_whatsapp_message_at;
  END IF;
END $$;

-- Add last_whatsapp_message_at if it doesn't exist (for new installations)
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS last_whatsapp_message_at TIMESTAMPTZ;

-- ============================================================================
-- CREATE UNIQUE CONSTRAINT FOR UPSERT
-- ============================================================================

-- Drop old unique constraint on whatsapp_phone (too restrictive)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contact_network_whatsapp_phone_key'
  ) THEN
    ALTER TABLE contact_network
    DROP CONSTRAINT contact_network_whatsapp_phone_key;
  END IF;
END $$;

-- Create composite unique constraint (user_id + whatsapp_id)
-- This allows upsert operations during sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_network_user_whatsapp_id
ON contact_network(user_id, whatsapp_id)
WHERE whatsapp_id IS NOT NULL;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index for looking up contacts by whatsapp_id
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_id
ON contact_network(whatsapp_id)
WHERE whatsapp_id IS NOT NULL;

-- Index for sync status queries
CREATE INDEX IF NOT EXISTS idx_contact_network_sync_enabled
ON contact_network(user_id, whatsapp_sync_enabled)
WHERE whatsapp_sync_enabled = true;

-- ============================================================================
-- UPDATE SYNC LOGS TABLE
-- ============================================================================

-- Fix sync log status values to match Edge Function
DO $$
BEGIN
  -- Drop old constraint
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_sync_logs_status_check'
  ) THEN
    ALTER TABLE whatsapp_sync_logs
    DROP CONSTRAINT whatsapp_sync_logs_status_check;
  END IF;

  -- Add new constraint with correct values
  ALTER TABLE whatsapp_sync_logs
  ADD CONSTRAINT whatsapp_sync_logs_status_check
  CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled'));
END $$;

-- Fix sync type values
DO $$
BEGIN
  -- Drop old constraint
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_sync_logs_sync_type_check'
  ) THEN
    ALTER TABLE whatsapp_sync_logs
    DROP CONSTRAINT whatsapp_sync_logs_sync_type_check;
  END IF;

  -- Add new constraint with correct values
  ALTER TABLE whatsapp_sync_logs
  ADD CONSTRAINT whatsapp_sync_logs_sync_type_check
  CHECK (sync_type IN ('contacts', 'messages', 'analysis', 'full'));
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN contact_network.whatsapp_id IS
'WhatsApp unique identifier (remoteJid), e.g., "5521999999999@s.whatsapp.net" or "120363...@g.us" for groups';

COMMENT ON COLUMN contact_network.whatsapp_status_message IS
'WhatsApp status message (bio) of the contact';

COMMENT ON COLUMN contact_network.whatsapp_sync_enabled IS
'Flag indicating if this contact should be synced from WhatsApp. Set to false to exclude from sync.';

COMMENT ON COLUMN contact_network.whatsapp_metadata IS
'JSONB field for extensible WhatsApp data (isGroup, isMyContact, lastSyncedAt, etc.)';

COMMENT ON INDEX idx_contact_network_user_whatsapp_id IS
'Unique constraint for upsert operations during WhatsApp sync. Prevents duplicate contacts per user.';
