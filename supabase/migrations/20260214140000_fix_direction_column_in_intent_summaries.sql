-- Fix: get_contact_intent_summaries uses wm.direction but column is wm.message_direction
-- This was a regression introduced in 20260214110000 (overwrote the fix from 20260212000002)

DROP FUNCTION IF EXISTS public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER);

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
    wm.intent_summary::TEXT,
    wm.intent_category::TEXT,
    wm.intent_sentiment::TEXT,
    wm.intent_urgency,
    wm.intent_topic::TEXT,
    wm.intent_action_required,
    wm.message_timestamp
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.contact_id = p_contact_id
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
    AND wm.intent_summary != ''
    AND (p_since IS NULL OR wm.message_timestamp > p_since)
  ORDER BY wm.message_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO service_role;
