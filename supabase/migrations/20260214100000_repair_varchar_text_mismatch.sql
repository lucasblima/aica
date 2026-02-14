-- =============================================================================
-- REPAIR: Fix VARCHAR/TEXT mismatch in RPCs
-- Root cause: contact_network.whatsapp_name is VARCHAR(255), but RPCs declare
--   RETURNS TABLE (..., contact_name TEXT, ...).
-- COALESCE(cn.name, cn.whatsapp_name, 'Unknown') returns VARCHAR, not TEXT,
--   causing "structure of query does not match function result type" error.
-- Fix: Add explicit ::TEXT casts in all COALESCE calls.
-- This is idempotent and works regardless of whether the column was already
--   altered to TEXT or is still VARCHAR.
-- =============================================================================

-- Also fix the underlying column type for good measure
DO $$
BEGIN
  -- Drop view if exists before altering column
  DROP VIEW IF EXISTS v_contacts_at_risk;

  -- Alter whatsapp_name to TEXT if it's still VARCHAR
  ALTER TABLE public.contact_network
    ALTER COLUMN whatsapp_name TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore if already TEXT
END;
$$;

-- Recreate view (safe if it didn't exist)
CREATE OR REPLACE VIEW v_contacts_at_risk AS
SELECT
  cn.id AS contact_id,
  cn.user_id,
  COALESCE(cn.name::TEXT, cn.whatsapp_name::TEXT, cn.phone_number::TEXT) AS contact_name,
  cn.phone_number,
  cn.profile_picture_url,
  cn.relationship_type,
  cn.health_score,
  cn.health_score_trend,
  cn.health_score_components,
  cn.health_score_updated_at,
  (cn.health_score_components->>'frequency_score')::NUMERIC AS frequency_score,
  (cn.health_score_components->>'recency_score')::NUMERIC AS recency_score,
  (cn.health_score_components->>'sentiment_score')::NUMERIC AS sentiment_score,
  (cn.health_score_components->>'reciprocity_score')::NUMERIC AS reciprocity_score,
  (cn.health_score_components->>'depth_score')::NUMERIC AS depth_score,
  cn.last_contact_at AS last_interaction_at,
  CASE
    WHEN cn.health_score < 20 THEN 'critical'
    WHEN cn.health_score < 30 THEN 'high'
    ELSE 'moderate'
  END AS risk_level,
  EXTRACT(DAY FROM (now() - COALESCE(cn.last_contact_at, cn.created_at))) AS days_inactive
FROM contact_network cn
WHERE cn.health_score IS NOT NULL
  AND cn.health_score < 40
  AND cn.deleted_at IS NULL
ORDER BY cn.health_score ASC, cn.last_contact_at ASC;

GRANT SELECT ON v_contacts_at_risk TO authenticated;

-- Recreate all affected RPCs with explicit ::TEXT casts

-- 1. get_contacts_needing_dossier_update
CREATE OR REPLACE FUNCTION public.get_contacts_needing_dossier_update(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  phone TEXT,
  relationship_type TEXT,
  new_message_count BIGINT,
  last_dossier_at TIMESTAMPTZ,
  current_dossier_summary TEXT,
  current_dossier_version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.id AS contact_id,
    COALESCE(cn.name::TEXT, cn.whatsapp_name::TEXT, 'Unknown'::TEXT) AS contact_name,
    cn.whatsapp_phone::TEXT AS phone,
    cn.relationship_type::TEXT,
    COUNT(wm.id) AS new_message_count,
    cn.dossier_updated_at AS last_dossier_at,
    cn.dossier_summary::TEXT AS current_dossier_summary,
    cn.dossier_version AS current_dossier_version
  FROM public.contact_network cn
  INNER JOIN public.whatsapp_messages wm
    ON wm.contact_id = cn.id
    AND wm.user_id = p_user_id
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
    AND (
      cn.dossier_updated_at IS NULL
      OR wm.message_timestamp > cn.dossier_updated_at
    )
  WHERE cn.user_id = p_user_id
    AND cn.is_active = true
    AND cn.blocked = false
  GROUP BY cn.id
  HAVING COUNT(wm.id) >= 3
  ORDER BY COUNT(wm.id) DESC
  LIMIT p_limit;
END;
$$;

-- 2. get_contact_dossier
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
    COALESCE(cn.name::TEXT, cn.whatsapp_name::TEXT, 'Unknown'::TEXT) AS contact_name,
    cn.whatsapp_phone::TEXT AS phone,
    cn.relationship_type::TEXT,
    cn.dossier_summary::TEXT,
    cn.dossier_topics,
    cn.dossier_pending_items,
    cn.dossier_context,
    cn.dossier_updated_at,
    cn.dossier_version,
    cn.health_score,
    cn.sentiment_trend::TEXT,
    cn.interaction_count,
    cn.last_interaction_at
  FROM public.contact_network cn
  WHERE cn.id = p_contact_id
    AND cn.user_id = p_user_id;
END;
$$;

-- 3. get_recent_threads
CREATE OR REPLACE FUNCTION public.get_recent_threads(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  thread_id UUID,
  contact_id UUID,
  contact_name TEXT,
  thread_start TIMESTAMPTZ,
  thread_end TIMESTAMPTZ,
  message_count INTEGER,
  summary TEXT,
  topic TEXT,
  decisions TEXT[],
  action_items TEXT[],
  thread_type TEXT,
  sentiment_arc TEXT,
  is_group BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id AS thread_id,
    ct.contact_id,
    COALESCE(cn.name::TEXT, cn.whatsapp_name::TEXT, 'Unknown'::TEXT) AS contact_name,
    ct.thread_start,
    ct.thread_end,
    ct.message_count,
    ct.summary::TEXT,
    ct.topic::TEXT,
    ct.decisions,
    ct.action_items,
    ct.thread_type::TEXT,
    ct.sentiment_arc::TEXT,
    ct.is_group
  FROM public.conversation_threads ct
  INNER JOIN public.contact_network cn ON cn.id = ct.contact_id
  WHERE ct.user_id = p_user_id
  ORDER BY ct.thread_start DESC
  LIMIT p_limit;
END;
$$;

-- 4. get_pending_entities
CREATE OR REPLACE FUNCTION public.get_pending_entities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  entity_summary TEXT,
  entity_details JSONB,
  routed_to_module TEXT,
  routing_status TEXT,
  confidence NUMERIC,
  source_context TEXT,
  contact_name TEXT,
  thread_topic TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ee.id AS entity_id,
    ee.entity_type::TEXT,
    ee.entity_summary::TEXT,
    ee.entity_details,
    ee.routed_to_module::TEXT,
    ee.routing_status::TEXT,
    ee.confidence,
    ee.source_context::TEXT,
    COALESCE(cn.name::TEXT, cn.whatsapp_name::TEXT, 'Unknown'::TEXT) AS contact_name,
    ct.topic::TEXT AS thread_topic,
    ee.created_at
  FROM public.whatsapp_extracted_entities ee
  LEFT JOIN public.contact_network cn ON cn.id = ee.contact_id
  LEFT JOIN public.conversation_threads ct ON ct.id = ee.thread_id
  WHERE ee.user_id = p_user_id
    AND ee.routing_status = 'suggested'
  ORDER BY ee.confidence DESC, ee.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 5. get_contact_intent_summaries (used by build-contact-dossier)
CREATE OR REPLACE FUNCTION public.get_contact_intent_summaries(
  p_user_id UUID,
  p_contact_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  intent_summary TEXT,
  sentiment TEXT,
  message_timestamp TIMESTAMPTZ,
  direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wm.intent_summary::TEXT,
    wm.sentiment::TEXT,
    wm.message_timestamp,
    wm.direction::TEXT
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.contact_id = p_contact_id
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
  ORDER BY wm.message_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_contacts_needing_dossier_update(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contacts_needing_dossier_update(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contact_dossier(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_dossier(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_threads(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_threads(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_entities(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_entities(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, INTEGER) TO service_role;
