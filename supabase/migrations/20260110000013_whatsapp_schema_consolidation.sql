-- ============================================================================
-- WhatsApp Integration Schema Consolidation
-- Issue #22, #83 - Evolution API Integration
-- Date: 2026-01-10
-- NOTE: Already executed in production via SQL Editor
-- ============================================================================

-- 1. CONTACT_NETWORK: Add WhatsApp columns
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp_profile_pic_url TEXT;

ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_sync_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS whatsapp_synced_at TIMESTAMPTZ;

ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_sentiment_avg NUMERIC(3,2);

ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_id
ON contact_network(whatsapp_id) WHERE whatsapp_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_phone
ON contact_network(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_sync
ON contact_network(user_id, whatsapp_sync_status, whatsapp_synced_at);

-- 3. WHATSAPP_SYNC_LOGS table
CREATE TABLE IF NOT EXISTS whatsapp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL DEFAULT 'contacts',
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  contacts_synced INTEGER DEFAULT 0,
  contacts_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own sync logs" ON whatsapp_sync_logs;
CREATE POLICY "Users can view their own sync logs"
ON whatsapp_sync_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert sync logs" ON whatsapp_sync_logs;
CREATE POLICY "Service role can insert sync logs"
ON whatsapp_sync_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update sync logs" ON whatsapp_sync_logs;
CREATE POLICY "Service role can update sync logs"
ON whatsapp_sync_logs FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_logs_user_date
ON whatsapp_sync_logs(user_id, started_at DESC);

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_last_whatsapp_sync_time(p_user_id UUID)
RETURNS TIMESTAMPTZ LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT completed_at FROM whatsapp_sync_logs
  WHERE user_id = p_user_id AND status = 'completed'
  ORDER BY completed_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_whatsapp_contact_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM contact_network
  WHERE user_id = p_user_id AND whatsapp_id IS NOT NULL;
$$;
