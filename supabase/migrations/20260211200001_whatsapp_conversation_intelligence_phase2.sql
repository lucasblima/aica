-- WhatsApp Conversation Intelligence — Phase 2: Conversation Threading
-- Groups messages into temporal sessions with summaries, decisions, action items

-- =============================================================================
-- 1. Create conversation_threads table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,

  -- Thread boundaries
  thread_start TIMESTAMPTZ NOT NULL,
  thread_end TIMESTAMPTZ NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,

  -- AI-generated content (from intent summaries only, privacy-first)
  summary TEXT,
  topic TEXT,
  decisions TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',

  -- Participants (for groups)
  participants TEXT[] DEFAULT '{}',

  -- Classification
  thread_type TEXT DEFAULT 'general',  -- general, planning, decision, social, support, negotiation
  sentiment_arc TEXT DEFAULT 'neutral', -- improving, declining, neutral, mixed, positive, negative

  -- Metadata
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_contact
  ON public.conversation_threads(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_time
  ON public.conversation_threads(user_id, thread_start DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_contact_time
  ON public.conversation_threads(contact_id, thread_start DESC);

-- RLS
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own threads"
  ON public.conversation_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on threads"
  ON public.conversation_threads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 2. Add thread_id and participant columns to whatsapp_messages
-- =============================================================================

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_phone TEXT,
  ADD COLUMN IF NOT EXISTS participant_name TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_thread
  ON public.whatsapp_messages(thread_id)
  WHERE thread_id IS NOT NULL;

-- =============================================================================
-- 3. RPC: get_unthreaded_messages
-- Returns messages not yet assigned to a thread, grouped by contact
-- =============================================================================

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
    wm.direction,
    wm.intent_summary,
    wm.intent_category::TEXT,
    wm.intent_sentiment::TEXT,
    wm.intent_urgency,
    wm.intent_topic,
    wm.intent_action_required,
    wm.participant_phone,
    wm.participant_name,
    wm.message_timestamp
  FROM public.whatsapp_messages wm
  WHERE wm.user_id = p_user_id
    AND wm.thread_id IS NULL
    AND wm.processing_status = 'completed'
    AND wm.intent_summary IS NOT NULL
    AND wm.deleted_at IS NULL
    AND (p_contact_id IS NULL OR wm.contact_id = p_contact_id)
  ORDER BY wm.contact_id, wm.message_timestamp ASC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 4. RPC: assign_messages_to_thread
-- Bulk assign messages to a thread
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_messages_to_thread(
  p_user_id UUID,
  p_thread_id UUID,
  p_message_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.whatsapp_messages
  SET thread_id = p_thread_id, updated_at = NOW()
  WHERE id = ANY(p_message_ids)
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- =============================================================================
-- 5. RPC: get_contact_threads
-- Get threads for a specific contact
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_contact_threads(
  p_user_id UUID,
  p_contact_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  thread_id UUID,
  thread_start TIMESTAMPTZ,
  thread_end TIMESTAMPTZ,
  message_count INTEGER,
  summary TEXT,
  topic TEXT,
  decisions TEXT[],
  action_items TEXT[],
  participants TEXT[],
  thread_type TEXT,
  sentiment_arc TEXT,
  is_group BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id AS thread_id,
    ct.thread_start,
    ct.thread_end,
    ct.message_count,
    ct.summary,
    ct.topic,
    ct.decisions,
    ct.action_items,
    ct.participants,
    ct.thread_type,
    ct.sentiment_arc,
    ct.is_group,
    ct.created_at
  FROM public.conversation_threads ct
  WHERE ct.user_id = p_user_id
    AND ct.contact_id = p_contact_id
  ORDER BY ct.thread_start DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================================================
-- 6. RPC: get_recent_threads
-- Get recent threads across all contacts (for overview)
-- =============================================================================

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
    COALESCE(cn.name, cn.whatsapp_name, 'Unknown') AS contact_name,
    ct.thread_start,
    ct.thread_end,
    ct.message_count,
    ct.summary,
    ct.topic,
    ct.decisions,
    ct.action_items,
    ct.thread_type,
    ct.sentiment_arc,
    ct.is_group
  FROM public.conversation_threads ct
  INNER JOIN public.contact_network cn ON cn.id = ct.contact_id
  WHERE ct.user_id = p_user_id
  ORDER BY ct.thread_start DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 7. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_unthreaded_messages(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_messages_to_thread(UUID, UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contact_threads(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_threads(UUID, UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_threads(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_threads(UUID, INTEGER) TO service_role;
