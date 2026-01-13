-- =============================================================================
-- WhatsApp Sessions Multi-Instance Architecture
-- Epic #122: Multi-Instance WhatsApp Architecture
-- Issue #123: Database Schema for whatsapp_sessions
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE whatsapp_sessions TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Instance identification
  instance_name TEXT NOT NULL UNIQUE,
  instance_display_name TEXT,

  -- Connection status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Instance created but not yet connected
    'connecting',   -- Pairing in progress
    'connected',    -- Successfully connected
    'disconnected', -- Was connected, now disconnected
    'error',        -- Connection error
    'banned'        -- Number banned by WhatsApp
  )),

  -- Phone information (populated after connection)
  phone_number TEXT,
  phone_country_code TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,

  -- Pairing information
  pairing_code TEXT,
  pairing_code_expires_at TIMESTAMPTZ,
  pairing_attempts INTEGER DEFAULT 0,
  last_pairing_attempt_at TIMESTAMPTZ,

  -- Connection timestamps
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,

  -- Sync information
  last_sync_at TIMESTAMPTZ,
  contacts_count INTEGER DEFAULT 0,
  groups_count INTEGER DEFAULT 0,
  messages_synced_count INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  consecutive_errors INTEGER DEFAULT 0,

  -- Rate limiting
  messages_sent_today INTEGER DEFAULT 0,
  messages_sent_reset_at DATE DEFAULT CURRENT_DATE,

  -- Metadata
  evolution_instance_id TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PART 2: INDEXES
-- =============================================================================

-- User lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id
  ON whatsapp_sessions(user_id);

-- Instance name lookup (for webhooks)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance_name
  ON whatsapp_sessions(instance_name);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status
  ON whatsapp_sessions(status);

-- Phone number lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number
  ON whatsapp_sessions(phone_number) WHERE phone_number IS NOT NULL;

-- Active sessions (for monitoring)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_active
  ON whatsapp_sessions(status, last_activity_at DESC)
  WHERE status = 'connected';

-- =============================================================================
-- PART 3: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY whatsapp_sessions_select_own ON whatsapp_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own sessions
CREATE POLICY whatsapp_sessions_insert_own ON whatsapp_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY whatsapp_sessions_update_own ON whatsapp_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY whatsapp_sessions_delete_own ON whatsapp_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- PART 4: HELPER FUNCTIONS
-- =============================================================================

-- Generate unique instance name for a user
CREATE OR REPLACE FUNCTION generate_instance_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_instance_name TEXT;
  v_suffix INTEGER := 0;
BEGIN
  -- Base name: aica_<first 8 chars of user_id>
  v_instance_name := 'aica_' || REPLACE(LEFT(p_user_id::TEXT, 8), '-', '');

  -- Check if exists and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM whatsapp_sessions WHERE instance_name = v_instance_name) LOOP
    v_suffix := v_suffix + 1;
    v_instance_name := 'aica_' || REPLACE(LEFT(p_user_id::TEXT, 8), '-', '') || '_' || v_suffix;
  END LOOP;

  RETURN v_instance_name;
END;
$$;

-- Create or get session for user
CREATE OR REPLACE FUNCTION get_or_create_whatsapp_session(p_user_id UUID)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session whatsapp_sessions;
  v_instance_name TEXT;
BEGIN
  -- Try to get existing session
  SELECT * INTO v_session
  FROM whatsapp_sessions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no session exists, create one
  IF v_session IS NULL THEN
    v_instance_name := generate_instance_name(p_user_id);

    INSERT INTO whatsapp_sessions (user_id, instance_name, status)
    VALUES (p_user_id, v_instance_name, 'pending')
    RETURNING * INTO v_session;
  END IF;

  RETURN v_session;
END;
$$;

-- Update session status with automatic timestamp handling
CREATE OR REPLACE FUNCTION update_whatsapp_session_status(
  p_session_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session whatsapp_sessions;
BEGIN
  UPDATE whatsapp_sessions
  SET
    status = p_status,
    error_message = CASE WHEN p_status = 'error' THEN p_error_message ELSE NULL END,
    error_code = CASE WHEN p_status = 'error' THEN p_error_code ELSE NULL END,
    consecutive_errors = CASE
      WHEN p_status = 'error' THEN consecutive_errors + 1
      WHEN p_status = 'connected' THEN 0
      ELSE consecutive_errors
    END,
    connected_at = CASE WHEN p_status = 'connected' AND connected_at IS NULL THEN NOW() ELSE connected_at END,
    disconnected_at = CASE WHEN p_status IN ('disconnected', 'error', 'banned') THEN NOW() ELSE disconnected_at END,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- Record pairing attempt
CREATE OR REPLACE FUNCTION record_pairing_attempt(
  p_session_id UUID,
  p_pairing_code TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session whatsapp_sessions;
BEGIN
  UPDATE whatsapp_sessions
  SET
    pairing_code = p_pairing_code,
    pairing_code_expires_at = p_expires_at,
    pairing_attempts = pairing_attempts + 1,
    last_pairing_attempt_at = NOW(),
    status = 'connecting',
    updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- Update phone info after successful connection
CREATE OR REPLACE FUNCTION update_session_phone_info(
  p_session_id UUID,
  p_phone_number TEXT,
  p_profile_name TEXT DEFAULT NULL,
  p_profile_picture_url TEXT DEFAULT NULL
)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session whatsapp_sessions;
  v_country_code TEXT;
BEGIN
  -- Extract country code (assumes format like +5521999999999)
  IF p_phone_number LIKE '+%' THEN
    v_country_code := SUBSTRING(p_phone_number FROM 2 FOR 2);
  END IF;

  UPDATE whatsapp_sessions
  SET
    phone_number = p_phone_number,
    phone_country_code = v_country_code,
    profile_name = p_profile_name,
    profile_picture_url = p_profile_picture_url,
    status = 'connected',
    connected_at = COALESCE(connected_at, NOW()),
    last_activity_at = NOW(),
    pairing_code = NULL, -- Clear pairing code after success
    pairing_code_expires_at = NULL,
    error_message = NULL,
    error_code = NULL,
    consecutive_errors = 0,
    updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- Update sync stats
CREATE OR REPLACE FUNCTION update_session_sync_stats(
  p_session_id UUID,
  p_contacts_count INTEGER DEFAULT NULL,
  p_groups_count INTEGER DEFAULT NULL,
  p_messages_synced INTEGER DEFAULT NULL
)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session whatsapp_sessions;
BEGIN
  UPDATE whatsapp_sessions
  SET
    contacts_count = COALESCE(p_contacts_count, contacts_count),
    groups_count = COALESCE(p_groups_count, groups_count),
    messages_synced_count = COALESCE(p_messages_synced, messages_synced_count),
    last_sync_at = NOW(),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- =============================================================================
-- PART 5: TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

-- Reset daily message count at midnight
CREATE OR REPLACE FUNCTION reset_daily_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.messages_sent_reset_at < CURRENT_DATE THEN
    NEW.messages_sent_today := 0;
    NEW.messages_sent_reset_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_message_count
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_message_count();

-- =============================================================================
-- PART 6: VIEWS FOR MONITORING
-- =============================================================================

-- Active sessions overview (for admin dashboard)
CREATE OR REPLACE VIEW whatsapp_sessions_overview AS
SELECT
  status,
  COUNT(*) as session_count,
  SUM(contacts_count) as total_contacts,
  SUM(groups_count) as total_groups,
  SUM(messages_synced_count) as total_messages,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_activity_at))/3600)::INTEGER as avg_hours_since_activity
FROM whatsapp_sessions
GROUP BY status;

-- Sessions needing attention (errors, disconnected)
CREATE OR REPLACE VIEW whatsapp_sessions_needing_attention AS
SELECT
  id,
  user_id,
  instance_name,
  status,
  error_message,
  consecutive_errors,
  last_activity_at,
  disconnected_at
FROM whatsapp_sessions
WHERE status IN ('error', 'disconnected', 'banned')
  OR consecutive_errors > 3
ORDER BY consecutive_errors DESC, last_activity_at ASC;

-- =============================================================================
-- PART 7: COMMENTS
-- =============================================================================

COMMENT ON TABLE whatsapp_sessions IS 'Manages WhatsApp Evolution API instances per user for multi-instance architecture';
COMMENT ON COLUMN whatsapp_sessions.instance_name IS 'Unique Evolution API instance identifier, format: aica_<user_id_prefix>';
COMMENT ON COLUMN whatsapp_sessions.status IS 'Current connection status: pending, connecting, connected, disconnected, error, banned';
COMMENT ON COLUMN whatsapp_sessions.pairing_code IS 'Temporary pairing code for WhatsApp connection (cleared after success)';
COMMENT ON COLUMN whatsapp_sessions.consecutive_errors IS 'Count of consecutive errors, reset on successful connection';
COMMENT ON COLUMN whatsapp_sessions.messages_sent_today IS 'Daily message counter for rate limiting';

COMMENT ON FUNCTION generate_instance_name IS 'Generates unique instance name based on user_id with collision handling';
COMMENT ON FUNCTION get_or_create_whatsapp_session IS 'Gets existing session or creates new one for user';
COMMENT ON FUNCTION update_whatsapp_session_status IS 'Updates session status with automatic timestamp management';
COMMENT ON FUNCTION record_pairing_attempt IS 'Records a pairing code generation attempt';
COMMENT ON FUNCTION update_session_phone_info IS 'Updates session with phone info after successful connection';
COMMENT ON FUNCTION update_session_sync_stats IS 'Updates sync statistics for a session';
