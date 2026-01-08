-- Evolution API Integration: WhatsApp Contact Sync
-- Issue #23: People Unified Network
-- Sprint 1 Task 1.3: Database Schema Extensions

-- ============================================================================
-- CONTACT NETWORK: Add WhatsApp columns
-- ============================================================================

-- Add WhatsApp-specific columns to existing contact_network table
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp_profile_pic_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_sentiment_avg NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS whatsapp_sync_status VARCHAR(20) DEFAULT 'pending'
  CHECK (whatsapp_sync_status IN ('pending', 'syncing', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS whatsapp_synced_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Lookup contacts by WhatsApp phone
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_phone
ON contact_network(whatsapp_phone)
WHERE whatsapp_phone IS NOT NULL;

-- Filter contacts by sync status (for incremental sync)
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_sync
ON contact_network(user_id, whatsapp_sync_status, whatsapp_synced_at);

-- Sort contacts by last WhatsApp interaction
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_last_message
ON contact_network(user_id, whatsapp_last_message_at DESC)
WHERE whatsapp_last_message_at IS NOT NULL;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN contact_network.whatsapp_phone IS
'WhatsApp phone number in E.164 format (e.g., +5521999999999). Used for matching contacts across systems.';

COMMENT ON COLUMN contact_network.whatsapp_name IS
'Contact name from WhatsApp (pushName or saved contact name)';

COMMENT ON COLUMN contact_network.whatsapp_profile_pic_url IS
'URL to WhatsApp profile picture (fetched from Evolution API)';

COMMENT ON COLUMN contact_network.whatsapp_last_message_at IS
'Timestamp of last WhatsApp message (incoming or outgoing) with this contact';

COMMENT ON COLUMN contact_network.whatsapp_message_count IS
'Total number of WhatsApp messages exchanged with this contact';

COMMENT ON COLUMN contact_network.whatsapp_sentiment_avg IS
'Average sentiment score from message analysis (-1 to 1, where -1=very negative, 0=neutral, 1=very positive)';

COMMENT ON COLUMN contact_network.whatsapp_sync_status IS
'Synchronization status: pending (not synced), syncing (in progress), synced (complete), failed (error occurred)';

COMMENT ON COLUMN contact_network.whatsapp_synced_at IS
'Timestamp of last successful sync from Evolution API';

-- ============================================================================
-- SYNC LOGS: Track sync operations
-- ============================================================================

-- Table to track WhatsApp sync operations for debugging and auditing
CREATE TABLE IF NOT EXISTS whatsapp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL
    CHECK (sync_type IN ('full_sync', 'incremental_sync', 'single_contact')),
  contacts_fetched INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  contacts_updated INTEGER DEFAULT 0,
  messages_analyzed INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES for sync logs
-- ============================================================================

ALTER TABLE whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view their own sync logs"
ON whatsapp_sync_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot insert/update/delete sync logs (only Edge Functions can)
-- Edge Functions use service role key which bypasses RLS

-- ============================================================================
-- INDEXES for sync logs
-- ============================================================================

-- Query recent syncs for a user
CREATE INDEX idx_whatsapp_sync_logs_user_date
ON whatsapp_sync_logs(user_id, started_at DESC);

-- Query syncs by status
CREATE INDEX idx_whatsapp_sync_logs_status
ON whatsapp_sync_logs(status, started_at DESC)
WHERE status IN ('running', 'failed');

-- ============================================================================
-- HELPER FUNCTION: Get last successful sync time
-- ============================================================================

CREATE OR REPLACE FUNCTION get_last_whatsapp_sync_time(p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT completed_at
  FROM whatsapp_sync_logs
  WHERE user_id = p_user_id
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_last_whatsapp_sync_time IS
'Returns timestamp of last successful WhatsApp sync for a user';

-- ============================================================================
-- HELPER FUNCTION: Check if sync is stale (> 24 hours)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_whatsapp_sync_stale(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT NOW() - completed_at > INTERVAL '24 hours'
      FROM whatsapp_sync_logs
      WHERE user_id = p_user_id
        AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    ),
    TRUE -- No sync found, consider it stale
  );
$$;

COMMENT ON FUNCTION is_whatsapp_sync_stale IS
'Returns TRUE if last successful sync was more than 24 hours ago, or no sync exists';
