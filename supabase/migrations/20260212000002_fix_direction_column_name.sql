-- =============================================================================
-- Repair: Fix RPCs referencing wm.direction → wm.message_direction
-- The whatsapp_messages table uses message_direction (not direction)
-- =============================================================================

-- Fix get_contact_intent_summaries
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
  JOIN public.contact_network cn ON cn.id = p_contact_id
    AND (cn.whatsapp_phone = wm.contact_phone OR cn.phone_number = wm.contact_phone)
  WHERE wm.user_id = p_user_id
    AND wm.processing_status = 'completed'
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
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
    AND wm.intent_summary != ''
    AND wm.deleted_at IS NULL
    AND (p_contact_id IS NULL OR wm.contact_id = p_contact_id)
  ORDER BY wm.contact_id, wm.message_timestamp ASC
  LIMIT p_limit;
END;
$$;

-- Re-grant execute
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unthreaded_messages(UUID, UUID, INTEGER) TO authenticated;
