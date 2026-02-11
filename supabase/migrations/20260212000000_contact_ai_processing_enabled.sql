-- =============================================================================
-- Contact AI Processing — Opt-in Columns + RPCs
-- Enables on-demand intelligence processing per contact.
-- =============================================================================

-- New columns on contact_network
ALTER TABLE contact_network
  ADD COLUMN IF NOT EXISTS ai_processing_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_processing_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processing_depth TEXT DEFAULT 'standard';

-- Partial index for cron jobs (only process opted-in contacts)
CREATE INDEX IF NOT EXISTS idx_contact_network_ai_enabled
  ON contact_network (user_id)
  WHERE ai_processing_enabled = TRUE;

-- =============================================================================
-- RPC: enable_contact_ai_processing
-- =============================================================================
CREATE OR REPLACE FUNCTION enable_contact_ai_processing(
  p_user_id UUID,
  p_contact_id UUID,
  p_depth TEXT DEFAULT 'standard'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contact_network
  SET
    ai_processing_enabled = TRUE,
    ai_processing_activated_at = COALESCE(ai_processing_activated_at, NOW()),
    ai_processing_depth = p_depth,
    updated_at = NOW()
  WHERE id = p_contact_id
    AND user_id = p_user_id;
END;
$$;

-- =============================================================================
-- RPC: disable_contact_ai_processing
-- =============================================================================
CREATE OR REPLACE FUNCTION disable_contact_ai_processing(
  p_user_id UUID,
  p_contact_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contact_network
  SET
    ai_processing_enabled = FALSE,
    updated_at = NOW()
  WHERE id = p_contact_id
    AND user_id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION enable_contact_ai_processing(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_contact_ai_processing(UUID, UUID) TO authenticated;
