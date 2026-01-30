-- =============================================================================
-- AICA: Contact Google Sync Fields
-- =============================================================================
-- This migration adds support for Google Contacts synchronization:
-- 1. google_contact_id: Unique identifier from Google People API
-- 2. google_resource_name: Resource name from Google (e.g., people/c1234567890)
-- 3. last_synced_at: Timestamp of last sync with Google
-- 4. sync_source: Origin of contact (manual, google, whatsapp, evolution)
-- =============================================================================

-- Add Google sync columns to contact_network table
ALTER TABLE contact_network
  ADD COLUMN IF NOT EXISTS google_contact_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS google_resource_name TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual'
    CHECK (sync_source IN ('manual', 'google', 'whatsapp', 'evolution'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_google_id
  ON contact_network(google_contact_id)
  WHERE google_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_sync_source
  ON contact_network(sync_source);

CREATE INDEX IF NOT EXISTS idx_contact_last_synced
  ON contact_network(last_synced_at DESC)
  WHERE last_synced_at IS NOT NULL;

-- Add RLS policies if not already present
ALTER TABLE contact_network ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view contacts they created
CREATE POLICY IF NOT EXISTS contact_network_select_own
  ON contact_network
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can only create/update their own contacts
CREATE POLICY IF NOT EXISTS contact_network_insert_own
  ON contact_network
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS contact_network_update_own
  ON contact_network
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can only delete their own contacts
CREATE POLICY IF NOT EXISTS contact_network_delete_own
  ON contact_network
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add helpful comments
COMMENT ON COLUMN contact_network.google_contact_id IS 'Google People API contact ID for deduplication';
COMMENT ON COLUMN contact_network.google_resource_name IS 'Google People API resource name (e.g., people/c1234567890)';
COMMENT ON COLUMN contact_network.last_synced_at IS 'Timestamp of last sync with Google Contacts';
COMMENT ON COLUMN contact_network.sync_source IS 'Origin of contact: manual, google, whatsapp, or evolution';
