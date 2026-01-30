-- =============================================================================
-- Migration: Contact Message Metrics
-- Issue: WhatsApp Contacts sorting by volume and recency
-- Architecture: docs/architecture/CONTACT_METRICS_ARCHITECTURE.md
-- =============================================================================

-- =============================================================================
-- PART 1: ENSURE COLUMNS EXIST (Idempotent)
-- =============================================================================

-- Add message count column if not exists
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0;

-- Add last message timestamp column if not exists
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS last_whatsapp_message_at TIMESTAMPTZ;

-- =============================================================================
-- PART 2: CREATE INDEXES FOR SORTING PERFORMANCE
-- =============================================================================

-- Index for sorting by message count (DESC, NULL values last)
CREATE INDEX IF NOT EXISTS idx_contact_network_message_count
ON contact_network(user_id, whatsapp_message_count DESC NULLS LAST)
WHERE sync_source = 'whatsapp';

-- Index for sorting by last message timestamp (DESC, NULL values last)
CREATE INDEX IF NOT EXISTS idx_contact_network_last_message
ON contact_network(user_id, last_whatsapp_message_at DESC NULLS LAST)
WHERE sync_source = 'whatsapp';

-- =============================================================================
-- PART 3: CREATE update_contact_message_metrics FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_contact_message_metrics(
  _contact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _total_count INTEGER;
  _incoming_count INTEGER;
  _outgoing_count INTEGER;
  _last_message_at TIMESTAMPTZ;
  _user_id UUID;
BEGIN
  -- Get user_id from contact
  SELECT user_id INTO _user_id
  FROM contact_network
  WHERE id = _contact_id;

  -- Aggregate metrics from whatsapp_messages
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE message_direction = 'incoming'),
    COUNT(*) FILTER (WHERE message_direction = 'outgoing'),
    MAX(message_timestamp)
  INTO
    _total_count,
    _incoming_count,
    _outgoing_count,
    _last_message_at
  FROM whatsapp_messages
  WHERE contact_id = _contact_id
    AND user_id = _user_id;

  -- Update contact_network cache columns
  UPDATE contact_network
  SET
    whatsapp_message_count = COALESCE(_total_count, 0),
    last_whatsapp_message_at = _last_message_at,
    interaction_count = COALESCE(_total_count, 0),
    last_interaction_at = _last_message_at,
    updated_at = NOW()
  WHERE id = _contact_id;

  -- Return metrics as JSONB
  RETURN jsonb_build_object(
    'total', COALESCE(_total_count, 0),
    'incoming', COALESCE(_incoming_count, 0),
    'outgoing', COALESCE(_outgoing_count, 0),
    'last_message_at', _last_message_at
  );
END;
$$;

COMMENT ON FUNCTION update_contact_message_metrics IS
'Updates cached message metrics for a single contact. Aggregates from whatsapp_messages table.';

-- =============================================================================
-- PART 4: CREATE batch_update_contact_metrics FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION batch_update_contact_metrics(
  _user_id UUID,
  _limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact RECORD;
  _processed INTEGER := 0;
BEGIN
  -- Loop through contacts needing metric updates
  FOR _contact IN
    SELECT id FROM contact_network
    WHERE user_id = _user_id
      AND sync_source = 'whatsapp'
      AND (
        whatsapp_message_count IS NULL
        OR whatsapp_message_count = 0
        OR updated_at < NOW() - INTERVAL '1 day'
      )
    ORDER BY updated_at ASC NULLS FIRST
    LIMIT _limit
  LOOP
    -- Update metrics for this contact
    PERFORM update_contact_message_metrics(_contact.id);
    _processed := _processed + 1;
  END LOOP;

  RETURN _processed;
END;
$$;

COMMENT ON FUNCTION batch_update_contact_metrics IS
'Batch updates message metrics for all stale contacts of a user. Used for backfills and periodic refresh.';

-- =============================================================================
-- PART 5: GRANT PERMISSIONS
-- =============================================================================

-- Service role needs to call these from Edge Functions
GRANT EXECUTE ON FUNCTION update_contact_message_metrics TO service_role;
GRANT EXECUTE ON FUNCTION batch_update_contact_metrics TO service_role;

-- Authenticated users can trigger batch updates for their own contacts
GRANT EXECUTE ON FUNCTION batch_update_contact_metrics TO authenticated;

-- =============================================================================
-- PART 6: ADD DOCUMENTATION COMMENTS
-- =============================================================================

COMMENT ON COLUMN contact_network.whatsapp_message_count IS
'Cached total message count from whatsapp_messages table. Updated via update_contact_message_metrics().';

COMMENT ON COLUMN contact_network.last_whatsapp_message_at IS
'Timestamp of most recent message with this contact. Updated via update_contact_message_metrics().';

COMMENT ON INDEX idx_contact_network_message_count IS
'Optimizes sorting contacts by message volume (most active first).';

COMMENT ON INDEX idx_contact_network_last_message IS
'Optimizes sorting contacts by recent activity (most recent first).';
