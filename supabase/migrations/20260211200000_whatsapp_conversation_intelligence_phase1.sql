-- WhatsApp Conversation Intelligence — Phase 1: Contact Dossier
-- Adds living dossier columns to contact_network and RPC for batch processing

-- =============================================================================
-- 1. Add dossier columns to contact_network
-- =============================================================================

ALTER TABLE public.contact_network
  ADD COLUMN IF NOT EXISTS dossier_summary TEXT,
  ADD COLUMN IF NOT EXISTS dossier_topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dossier_pending_items TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dossier_context JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dossier_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dossier_version INTEGER DEFAULT 0;

COMMENT ON COLUMN public.contact_network.dossier_summary IS 'AI-generated living summary of the contact (max 500 chars)';
COMMENT ON COLUMN public.contact_network.dossier_topics IS 'Top topics discussed with this contact';
COMMENT ON COLUMN public.contact_network.dossier_pending_items IS 'Pending items / action items for this contact';
COMMENT ON COLUMN public.contact_network.dossier_context IS 'Structured context: relationship_nature, communication_style, key_dates, etc.';
COMMENT ON COLUMN public.contact_network.dossier_updated_at IS 'Last time the dossier was rebuilt';
COMMENT ON COLUMN public.contact_network.dossier_version IS 'Incremental version for dossier continuity';

-- =============================================================================
-- 2. RPC: get_contacts_needing_dossier_update
-- Returns contacts with 3+ new messages since last dossier update
-- =============================================================================

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
    COALESCE(cn.name, cn.whatsapp_name, 'Unknown') AS contact_name,
    cn.whatsapp_phone AS phone,
    cn.relationship_type,
    COUNT(wm.id) AS new_message_count,
    cn.dossier_updated_at AS last_dossier_at,
    cn.dossier_summary AS current_dossier_summary,
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

-- =============================================================================
-- 3. RPC: get_contact_intent_summaries
-- Fetches intent summaries for a contact (privacy-first: no raw text)
-- =============================================================================

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
    wm.direction,
    wm.intent_summary,
    wm.intent_category::TEXT,
    wm.intent_sentiment::TEXT,
    wm.intent_urgency,
    wm.intent_topic,
    wm.intent_action_required,
    wm.message_timestamp
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.contact_id = p_contact_id
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
    AND wm.deleted_at IS NULL
    AND (p_since IS NULL OR wm.message_timestamp > p_since)
  ORDER BY wm.message_timestamp ASC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 4. RPC: update_contact_dossier
-- Updates dossier fields atomically with version bump
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_contact_dossier(
  p_user_id UUID,
  p_contact_id UUID,
  p_summary TEXT,
  p_topics TEXT[],
  p_pending_items TEXT[],
  p_context JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contact_network
  SET
    dossier_summary = p_summary,
    dossier_topics = p_topics,
    dossier_pending_items = p_pending_items,
    dossier_context = p_context,
    dossier_updated_at = NOW(),
    dossier_version = COALESCE(dossier_version, 0) + 1,
    updated_at = NOW()
  WHERE id = p_contact_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- =============================================================================
-- 5. RPC: get_contact_dossier
-- Fetches dossier for a single contact
-- =============================================================================

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
    COALESCE(cn.name, cn.whatsapp_name, 'Unknown') AS contact_name,
    cn.whatsapp_phone AS phone,
    cn.relationship_type,
    cn.dossier_summary,
    cn.dossier_topics,
    cn.dossier_pending_items,
    cn.dossier_context,
    cn.dossier_updated_at,
    cn.dossier_version,
    cn.health_score,
    cn.sentiment_trend,
    cn.interaction_count,
    cn.last_interaction_at
  FROM public.contact_network cn
  WHERE cn.id = p_contact_id
    AND cn.user_id = p_user_id;
END;
$$;

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_contacts_needing_dossier_update(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contacts_needing_dossier_update(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_contact_dossier(UUID, UUID, TEXT, TEXT[], TEXT[], JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contact_dossier(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_dossier(UUID, UUID) TO service_role;
