-- =============================================================================
-- Scope Cron Jobs to AI-Enabled Contacts Only
-- Override get_contacts_needing_dossier_update to filter by ai_processing_enabled
-- =============================================================================

CREATE OR REPLACE FUNCTION get_contacts_needing_dossier_update(
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
    cn.name AS contact_name,
    COALESCE(cn.whatsapp_phone, cn.phone_number) AS phone,
    cn.relationship_type::TEXT,
    COUNT(wm.id) AS new_message_count,
    cn.dossier_updated_at AS last_dossier_at,
    cn.dossier_summary AS current_dossier_summary,
    COALESCE(cn.dossier_version, 0) AS current_dossier_version
  FROM contact_network cn
  LEFT JOIN whatsapp_messages wm ON (
    wm.contact_phone = COALESCE(cn.whatsapp_phone, cn.phone_number)
    AND wm.user_id = p_user_id
    AND wm.intent_summary IS NOT NULL
    AND (cn.dossier_updated_at IS NULL OR wm.message_timestamp > cn.dossier_updated_at)
  )
  WHERE cn.user_id = p_user_id
    AND cn.is_active = TRUE
    AND cn.ai_processing_enabled = TRUE  -- Only opted-in contacts
  GROUP BY cn.id
  HAVING COUNT(wm.id) >= 3  -- At least 3 new messages
  ORDER BY COUNT(wm.id) DESC
  LIMIT p_limit;
END;
$$;

-- Re-grant permissions (CREATE OR REPLACE resets)
GRANT EXECUTE ON FUNCTION get_contacts_needing_dossier_update(UUID, INTEGER) TO authenticated;
