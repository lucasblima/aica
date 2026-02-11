-- =============================================================================
-- Add missing columns to whatsapp_messages
--
-- Root cause: CREATE_TABLES_FOR_RLS (20260110) created a minimal table before
-- the full schema migration (20251230) could run. The original CREATE TABLE
-- IF NOT EXISTS was a no-op, leaving many columns missing.
--
-- This migration adds the columns the webhook and RPCs depend on.
-- =============================================================================

-- Columns used by webhook-evolution for message storage
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT,
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS remote_jid TEXT,
  ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- Columns used by original schema for content/media
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS content_transcription TEXT,
  ADD COLUMN IF NOT EXISTS content_ocr TEXT,
  ADD COLUMN IF NOT EXISTS media_mimetype TEXT,
  ADD COLUMN IF NOT EXISTS media_filename TEXT,
  ADD COLUMN IF NOT EXISTS media_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS media_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS sentiment_label TEXT,
  ADD COLUMN IF NOT EXISTS detected_intent TEXT,
  ADD COLUMN IF NOT EXISTS detected_topics TEXT[],
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Backfill contact_phone from contact_network for existing rows
UPDATE whatsapp_messages wm
SET contact_phone = COALESCE(cn.whatsapp_phone, cn.phone_number)
FROM contact_network cn
WHERE wm.contact_id = cn.id
  AND wm.contact_phone IS NULL;

-- Index for intent timeline queries by contact_phone
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_phone
  ON whatsapp_messages(contact_phone, message_timestamp DESC)
  WHERE intent_summary IS NOT NULL AND intent_summary != '';

-- =============================================================================
-- Re-create RPCs with correct column references
-- =============================================================================

-- Fix get_contact_intent_summaries (uses contact_phone via JOIN)
CREATE OR REPLACE FUNCTION public.get_contact_intent_summaries(
  p_user_id UUID,
  p_contact_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  message_id UUID,
  direction TEXT,
  intent_summary TEXT,
  intent_category TEXT,
  intent_sentiment TEXT,
  intent_urgency INTEGER,
  intent_topic TEXT,
  intent_action_required BOOLEAN,
  message_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wm.id AS message_id,
    wm.message_direction AS direction,
    wm.intent_summary,
    wm.intent_category::TEXT,
    wm.intent_sentiment::TEXT,
    wm.intent_urgency::INTEGER,
    wm.intent_topic::TEXT,
    wm.intent_action_required,
    wm.message_timestamp
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.contact_id = p_contact_id
    AND wm.intent_summary IS NOT NULL
    AND wm.intent_summary != ''
    AND wm.deleted_at IS NULL
    AND (p_since IS NULL OR wm.message_timestamp > p_since)
  ORDER BY wm.message_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Fix get_unthreaded_messages
CREATE OR REPLACE FUNCTION public.get_unthreaded_messages(
  p_user_id UUID,
  p_contact_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  message_id UUID,
  contact_id UUID,
  direction TEXT,
  intent_summary TEXT,
  intent_category TEXT,
  intent_sentiment TEXT,
  intent_urgency INTEGER,
  intent_topic TEXT,
  intent_action_required BOOLEAN,
  participant_phone TEXT,
  participant_name TEXT,
  message_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wm.id AS message_id,
    wm.contact_id,
    wm.message_direction AS direction,
    wm.intent_summary,
    wm.intent_category::TEXT,
    wm.intent_sentiment::TEXT,
    wm.intent_urgency::INTEGER,
    wm.intent_topic::TEXT,
    wm.intent_action_required,
    wm.participant_phone,
    wm.participant_name,
    wm.message_timestamp
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.thread_id IS NULL
    AND wm.intent_summary IS NOT NULL
    AND wm.intent_summary != ''
    AND wm.deleted_at IS NULL
    AND (p_contact_id IS NULL OR wm.contact_id = p_contact_id)
  ORDER BY wm.contact_id, wm.message_timestamp ASC
  LIMIT p_limit;
END;
$$;

-- Fix get_contact_dossier to use correct column references
CREATE OR REPLACE FUNCTION public.get_contact_dossier(
  p_user_id UUID,
  p_contact_id UUID
)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  phone TEXT,
  relationship_type TEXT,
  dossier_summary TEXT,
  dossier_topics TEXT[],
  dossier_pending_items TEXT[],
  dossier_context JSONB,
  dossier_updated_at TIMESTAMPTZ,
  dossier_version INTEGER,
  health_score INTEGER,
  sentiment_trend TEXT,
  interaction_count INTEGER,
  last_interaction_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.id AS contact_id,
    cn.name AS contact_name,
    COALESCE(cn.whatsapp_phone, cn.phone_number) AS phone,
    cn.relationship_type::TEXT,
    cn.dossier_summary,
    cn.dossier_topics,
    cn.dossier_pending_items,
    cn.dossier_context,
    cn.dossier_updated_at,
    COALESCE(cn.dossier_version, 0)::INTEGER AS dossier_version,
    COALESCE(cn.health_score, 0)::INTEGER AS health_score,
    COALESCE(cn.sentiment_trend, 'unknown')::TEXT AS sentiment_trend,
    COALESCE(cn.interaction_count, 0)::INTEGER AS interaction_count,
    cn.last_interaction_at
  FROM public.contact_network cn
  WHERE cn.id = p_contact_id
    AND cn.user_id = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unthreaded_messages(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_dossier(UUID, UUID) TO authenticated;
