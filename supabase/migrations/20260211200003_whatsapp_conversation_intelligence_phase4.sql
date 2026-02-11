-- WhatsApp Conversation Intelligence — Phase 4: Group Intelligence
-- Groups as first-class citizens with participant tracking and analytics

-- =============================================================================
-- 1. Create whatsapp_group_participants table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,

  -- Participant identity
  participant_phone TEXT NOT NULL,
  participant_name TEXT,
  participant_jid TEXT,

  -- Activity metrics
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Inferred role
  inferred_role TEXT DEFAULT 'member',  -- admin, moderator, active, member, lurker

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique per user + group + participant
  UNIQUE(user_id, group_contact_id, participant_phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_participants_group
  ON public.whatsapp_group_participants(group_contact_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_user
  ON public.whatsapp_group_participants(user_id);

-- RLS
ALTER TABLE public.whatsapp_group_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own group participants"
  ON public.whatsapp_group_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on group participants"
  ON public.whatsapp_group_participants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 2. Add group-specific columns to contact_network
-- =============================================================================

ALTER TABLE public.contact_network
  ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_participants INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decisions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_purpose TEXT,
  ADD COLUMN IF NOT EXISTS group_activity_score INTEGER DEFAULT 0;

-- =============================================================================
-- 3. RPC: upsert_group_participant
-- Called by webhook on each group message
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_group_participant(
  p_user_id UUID,
  p_group_contact_id UUID,
  p_participant_phone TEXT,
  p_participant_name TEXT DEFAULT NULL,
  p_participant_jid TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.whatsapp_group_participants (
    user_id, group_contact_id, participant_phone, participant_name,
    participant_jid, message_count, last_message_at
  ) VALUES (
    p_user_id, p_group_contact_id, p_participant_phone, p_participant_name,
    p_participant_jid, 1, NOW()
  )
  ON CONFLICT (user_id, group_contact_id, participant_phone)
  DO UPDATE SET
    participant_name = COALESCE(EXCLUDED.participant_name, whatsapp_group_participants.participant_name),
    participant_jid = COALESCE(EXCLUDED.participant_jid, whatsapp_group_participants.participant_jid),
    message_count = whatsapp_group_participants.message_count + 1,
    last_message_at = NOW(),
    updated_at = NOW();

  -- Update group participant counts
  UPDATE public.contact_network
  SET
    participant_count = (
      SELECT COUNT(*) FROM public.whatsapp_group_participants
      WHERE group_contact_id = p_group_contact_id AND user_id = p_user_id
    ),
    active_participants = (
      SELECT COUNT(*) FROM public.whatsapp_group_participants
      WHERE group_contact_id = p_group_contact_id
        AND user_id = p_user_id
        AND last_message_at > NOW() - INTERVAL '7 days'
    ),
    updated_at = NOW()
  WHERE id = p_group_contact_id AND user_id = p_user_id;
END;
$$;

-- =============================================================================
-- 4. RPC: get_group_participants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_group_participants(
  p_user_id UUID,
  p_group_contact_id UUID
)
RETURNS TABLE (
  participant_id UUID,
  participant_phone TEXT,
  participant_name TEXT,
  message_count INTEGER,
  last_message_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ,
  inferred_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id AS participant_id,
    gp.participant_phone,
    gp.participant_name,
    gp.message_count,
    gp.last_message_at,
    gp.first_seen_at,
    gp.inferred_role
  FROM public.whatsapp_group_participants gp
  WHERE gp.user_id = p_user_id
    AND gp.group_contact_id = p_group_contact_id
  ORDER BY gp.message_count DESC;
END;
$$;

-- =============================================================================
-- 5. RPC: get_group_analytics
-- Summary analytics for a group
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_group_analytics(
  p_user_id UUID,
  p_group_contact_id UUID
)
RETURNS TABLE (
  total_participants INTEGER,
  active_7d INTEGER,
  total_messages BIGINT,
  total_threads BIGINT,
  total_decisions BIGINT,
  total_action_items BIGINT,
  top_topics TEXT[],
  avg_sentiment TEXT,
  group_purpose TEXT,
  activity_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.participant_count AS total_participants,
    cn.active_participants AS active_7d,
    COALESCE((
      SELECT COUNT(*) FROM public.whatsapp_messages wm
      WHERE wm.contact_id = p_group_contact_id AND wm.user_id = p_user_id
    ), 0) AS total_messages,
    COALESCE((
      SELECT COUNT(*) FROM public.conversation_threads ct
      WHERE ct.contact_id = p_group_contact_id AND ct.user_id = p_user_id
    ), 0) AS total_threads,
    COALESCE((
      SELECT SUM(array_length(ct.decisions, 1))
      FROM public.conversation_threads ct
      WHERE ct.contact_id = p_group_contact_id AND ct.user_id = p_user_id
        AND ct.decisions IS NOT NULL AND array_length(ct.decisions, 1) > 0
    ), 0) AS total_decisions,
    COALESCE((
      SELECT SUM(array_length(ct.action_items, 1))
      FROM public.conversation_threads ct
      WHERE ct.contact_id = p_group_contact_id AND ct.user_id = p_user_id
        AND ct.action_items IS NOT NULL AND array_length(ct.action_items, 1) > 0
    ), 0) AS total_action_items,
    cn.dossier_topics AS top_topics,
    cn.sentiment_trend AS avg_sentiment,
    cn.group_purpose,
    cn.group_activity_score AS activity_score
  FROM public.contact_network cn
  WHERE cn.id = p_group_contact_id
    AND cn.user_id = p_user_id;
END;
$$;

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.upsert_group_participant(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_group_participants(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_participants(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_group_analytics(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_analytics(UUID, UUID) TO service_role;
