-- WhatsApp Conversation Intelligence — Phase 3: Entity Extraction & Module Integration
-- Extract tasks, events, monetary values from conversations; route to Atlas/Agenda/Finance

-- =============================================================================
-- 1. Create whatsapp_extracted_entities table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contact_network(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,

  -- Entity classification
  entity_type TEXT NOT NULL,  -- task, event, monetary, person, project, deadline, reminder
  entity_summary TEXT NOT NULL,  -- Human-readable summary (max 200 chars)
  entity_details JSONB DEFAULT '{}',  -- Structured data specific to entity_type

  -- Module routing
  routed_to_module TEXT,  -- atlas, agenda, finance, null if not routed
  routing_status TEXT DEFAULT 'suggested',  -- suggested, accepted, rejected, auto_routed
  routed_item_id UUID,  -- FK to the created item (work_items.id, calendar_events.id, etc.)

  -- Confidence and source
  confidence NUMERIC(3,2) DEFAULT 0.5,
  source_context TEXT,  -- Brief context of where this was extracted

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ  -- When user accepted/rejected
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extracted_entities_user_status
  ON public.whatsapp_extracted_entities(user_id, routing_status);
CREATE INDEX IF NOT EXISTS idx_extracted_entities_user_module
  ON public.whatsapp_extracted_entities(user_id, routed_to_module);
CREATE INDEX IF NOT EXISTS idx_extracted_entities_thread
  ON public.whatsapp_extracted_entities(thread_id)
  WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_extracted_entities_pending
  ON public.whatsapp_extracted_entities(user_id, created_at DESC)
  WHERE routing_status = 'suggested';

-- RLS
ALTER TABLE public.whatsapp_extracted_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entities"
  ON public.whatsapp_extracted_entities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own entities"
  ON public.whatsapp_extracted_entities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on entities"
  ON public.whatsapp_extracted_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 2. Add source tracking to work_items (Atlas module)
-- =============================================================================

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id UUID REFERENCES public.whatsapp_extracted_entities(id) ON DELETE SET NULL;

-- =============================================================================
-- 3. RPC: get_pending_entities
-- =============================================================================

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
    ee.entity_type,
    ee.entity_summary,
    ee.entity_details,
    ee.routed_to_module,
    ee.routing_status,
    ee.confidence,
    ee.source_context,
    COALESCE(cn.name, cn.whatsapp_name, 'Unknown') AS contact_name,
    ct.topic AS thread_topic,
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

-- =============================================================================
-- 4. RPC: resolve_entity
-- Accept or reject an entity suggestion
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_entity(
  p_user_id UUID,
  p_entity_id UUID,
  p_action TEXT,  -- 'accept' or 'reject'
  p_routed_item_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_extracted_entities
  SET
    routing_status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END,
    routed_item_id = p_routed_item_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_entity_id
    AND user_id = p_user_id
    AND routing_status = 'suggested';

  RETURN FOUND;
END;
$$;

-- =============================================================================
-- 5. RPC: get_entity_stats
-- Summary of entity extraction activity
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_entity_stats(
  p_user_id UUID
)
RETURNS TABLE (
  total_entities BIGINT,
  pending_count BIGINT,
  accepted_count BIGINT,
  rejected_count BIGINT,
  entities_by_type JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_entities,
    COUNT(*) FILTER (WHERE routing_status = 'suggested') AS pending_count,
    COUNT(*) FILTER (WHERE routing_status = 'accepted') AS accepted_count,
    COUNT(*) FILTER (WHERE routing_status = 'rejected') AS rejected_count,
    jsonb_object_agg(
      COALESCE(entity_type, 'unknown'),
      type_count
    ) AS entities_by_type
  FROM (
    SELECT
      entity_type,
      routing_status,
      COUNT(*) AS type_count
    FROM public.whatsapp_extracted_entities
    WHERE user_id = p_user_id
    GROUP BY entity_type, routing_status
  ) sub
  GROUP BY ();
END;
$$;

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_pending_entities(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_entities(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_entity(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_entity(UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_entity_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entity_stats(UUID) TO service_role;
