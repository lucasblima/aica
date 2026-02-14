-- =============================================================================
-- REPAIR: Fix get_contact_intent_summaries RPC
--
-- Previous repair migration (20260214100000) created a WRONG overload with
-- 3 params (UUID, UUID, INTEGER) instead of the correct 4-param version
-- (UUID, UUID, TIMESTAMPTZ, INTEGER). The build-contact-dossier Edge Function
-- calls with p_since parameter, which needs the 4-param version.
--
-- This migration:
-- 1. Drops the broken 3-param overload
-- 2. Recreates the correct 4-param version with ::TEXT casts
-- 3. Also ensures enable_contact_ai_processing + update_contact_dossier exist
-- =============================================================================

-- Step 1: Drop the broken 3-param overload created by 20260214100000
-- (Idempotent: IF EXISTS handles case where already dropped)
DROP FUNCTION IF EXISTS public.get_contact_intent_summaries(UUID, UUID, INTEGER);
-- Also drop 4-param version so we can recreate cleanly
DROP FUNCTION IF EXISTS public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER);

-- Step 2: Recreate the correct 4-param version
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
    wm.direction::TEXT,
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
    AND (p_since IS NULL OR wm.message_timestamp > p_since)
  ORDER BY wm.message_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Step 3: Ensure update_contact_dossier exists (used by build-contact-dossier)
-- Original returns BOOLEAN — must match existing signature
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

-- Step 4: Ensure enable_contact_ai_processing exists
CREATE OR REPLACE FUNCTION public.enable_contact_ai_processing(
  p_user_id UUID,
  p_contact_id UUID,
  p_depth TEXT DEFAULT 'standard'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contact_network
  SET
    ai_processing_enabled = TRUE,
    ai_processing_activated_at = COALESCE(ai_processing_activated_at, NOW()),
    ai_processing_depth = p_depth,
    updated_at = NOW()
  WHERE id = p_contact_id
    AND user_id = p_user_id;
END;
$$;

-- Step 5: Ensure columns exist for AI processing
ALTER TABLE public.contact_network
  ADD COLUMN IF NOT EXISTS ai_processing_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_processing_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processing_depth TEXT DEFAULT 'standard';

-- Step 6: Ensure get_contact_threads exists (used by useContactIntelligence)
-- Must DROP first because return type may have changed (added participants column)
DROP FUNCTION IF EXISTS public.get_contact_threads(UUID, UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_contact_threads(
  p_user_id UUID,
  p_contact_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  thread_id UUID,
  contact_id UUID,
  thread_start TIMESTAMPTZ,
  thread_end TIMESTAMPTZ,
  message_count INTEGER,
  summary TEXT,
  topic TEXT,
  decisions TEXT[],
  action_items TEXT[],
  thread_type TEXT,
  sentiment_arc TEXT,
  is_group BOOLEAN,
  participants TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id AS thread_id,
    ct.contact_id,
    ct.thread_start,
    ct.thread_end,
    ct.message_count,
    ct.summary::TEXT,
    ct.topic::TEXT,
    ct.decisions,
    ct.action_items,
    ct.thread_type::TEXT,
    ct.sentiment_arc::TEXT,
    ct.is_group,
    ct.participants
  FROM public.conversation_threads ct
  WHERE ct.user_id = p_user_id
    AND ct.contact_id = p_contact_id
  ORDER BY ct.thread_start DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_intent_summaries(UUID, UUID, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_contact_dossier(UUID, UUID, TEXT, TEXT[], TEXT[], JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.enable_contact_ai_processing(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_threads(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_threads(UUID, UUID, INTEGER, INTEGER) TO service_role;
