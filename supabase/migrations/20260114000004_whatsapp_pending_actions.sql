-- ============================================================================
-- WhatsApp Pending Actions - Conversation state management
-- Issue #100 - Organization document detection via WhatsApp
-- Date: 2026-01-14
-- ============================================================================

-- Table to track pending actions that require user confirmation
CREATE TABLE IF NOT EXISTS whatsapp_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and conversation context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  instance_name TEXT NOT NULL,

  -- Original message that triggered the action
  source_message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'register_organization',   -- Register organization from document
    'update_organization',     -- Update existing organization
    'create_task',             -- Create task from message
    'schedule_reminder'        -- Schedule reminder
  )),

  -- Action payload (JSON with action-specific data)
  action_payload JSONB NOT NULL DEFAULT '{}',

  -- Confirmation state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting for user confirmation
    'confirmed',    -- User confirmed, ready to process
    'rejected',     -- User rejected
    'expired',      -- Timeout expired
    'processing',   -- Being processed
    'completed',    -- Successfully processed
    'failed'        -- Processing failed
  )),

  -- Confirmation message tracking
  confirmation_message_id TEXT,  -- Evolution message ID of confirmation request
  user_response TEXT,            -- User's response text

  -- Processing result
  result_data JSONB,             -- Result of the action (e.g., created organization ID)
  error_message TEXT,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  confirmed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Find pending actions for a user/conversation
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_user_phone_status
  ON whatsapp_pending_actions(user_id, contact_phone, status)
  WHERE status = 'pending';

-- Find expired actions
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_expires
  ON whatsapp_pending_actions(expires_at)
  WHERE status = 'pending';

-- Find by action type
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_type
  ON whatsapp_pending_actions(user_id, action_type, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_pending_actions ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending actions
CREATE POLICY "Users can view own pending actions"
  ON whatsapp_pending_actions
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert/update (for webhook processing)
CREATE POLICY "Service role can manage pending actions"
  ON whatsapp_pending_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_pending_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_pending_actions_updated_at ON whatsapp_pending_actions;
CREATE TRIGGER trigger_whatsapp_pending_actions_updated_at
  BEFORE UPDATE ON whatsapp_pending_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_pending_actions_updated_at();

-- ============================================================================
-- FUNCTION: Find active pending action for user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_action_for_user(
  p_user_id UUID,
  p_contact_phone TEXT
)
RETURNS whatsapp_pending_actions
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM whatsapp_pending_actions
  WHERE user_id = p_user_id
    AND contact_phone = p_contact_phone
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- ============================================================================
-- FUNCTION: Expire old pending actions
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_pending_actions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE whatsapp_pending_actions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_pending_actions IS 'Tracks pending actions that require user confirmation via WhatsApp';
COMMENT ON COLUMN whatsapp_pending_actions.action_type IS 'Type of action pending confirmation';
COMMENT ON COLUMN whatsapp_pending_actions.action_payload IS 'JSON payload with action-specific data (e.g., extracted fields)';
COMMENT ON COLUMN whatsapp_pending_actions.status IS 'Current state of the pending action';
COMMENT ON COLUMN whatsapp_pending_actions.expires_at IS 'Action expires if not confirmed within 24 hours';
