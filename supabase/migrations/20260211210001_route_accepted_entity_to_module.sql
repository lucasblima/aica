-- Migration: Route Accepted Entity to Module (Task #9)
-- When user accepts an entity suggestion, create the actual item in the target module:
--   task/deadline → work_items (Atlas)
--   monetary      → finance_transactions (Finance)
--   event/reminder → accepted only (no calendar_events table yet)
--   person/project → accepted only (informational)

-- ============================================================================
-- RPC: route_accepted_entity
-- Atomically accepts entity + creates item in target module
-- ============================================================================

CREATE OR REPLACE FUNCTION public.route_accepted_entity(
  p_user_id UUID,
  p_entity_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity RECORD;
  v_details JSONB;
  v_created_id UUID;
  v_module TEXT;
BEGIN
  -- 1. Fetch and lock the entity
  SELECT
    id, entity_type, entity_summary, entity_details,
    routed_to_module, routing_status
  INTO v_entity
  FROM whatsapp_extracted_entities
  WHERE id = p_entity_id
    AND user_id = p_user_id
    AND routing_status = 'suggested'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entity not found or already resolved'
    );
  END IF;

  v_details := COALESCE(v_entity.entity_details, '{}'::jsonb);
  v_module := v_entity.routed_to_module;

  -- 2. Route to target module
  CASE v_module
    -- =====================================================================
    -- ATLAS: Create work_item for task/deadline entities
    -- =====================================================================
    WHEN 'atlas' THEN
      INSERT INTO work_items (
        user_id,
        title,
        description,
        priority,
        due_date,
        status,
        source,
        source_entity_id
      ) VALUES (
        p_user_id,
        COALESCE(
          v_details->>'title',
          LEFT(v_entity.entity_summary, 500)
        ),
        v_entity.entity_summary,
        CASE
          WHEN v_details->>'priority' IN ('urgent', 'high', 'medium', 'low', 'none')
          THEN v_details->>'priority'
          ELSE 'medium'
        END,
        CASE
          WHEN v_details->>'due_date' IS NOT NULL
            AND v_details->>'due_date' ~ '^\d{4}-\d{2}-\d{2}$'
          THEN (v_details->>'due_date')::date
          WHEN v_details->>'date' IS NOT NULL
            AND v_details->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
          THEN (v_details->>'date')::date
          ELSE NULL
        END,
        'todo',
        'whatsapp',
        p_entity_id
      )
      RETURNING id INTO v_created_id;

    -- =====================================================================
    -- FINANCE: Create finance_transaction for monetary entities
    -- =====================================================================
    WHEN 'finance' THEN
      INSERT INTO finance_transactions (
        user_id,
        description,
        amount,
        type,
        category,
        transaction_date,
        hash_id
      ) VALUES (
        p_user_id,
        COALESCE(
          v_details->>'description',
          v_entity.entity_summary
        ),
        COALESCE(
          (v_details->>'amount')::numeric(12,2),
          0.00
        ),
        CASE
          WHEN v_details->>'type' IN ('income', 'expense')
          THEN v_details->>'type'
          ELSE 'expense'
        END,
        COALESCE(v_details->>'category', 'WhatsApp'),
        CASE
          WHEN v_details->>'date' IS NOT NULL
            AND v_details->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
          THEN (v_details->>'date')::date
          ELSE CURRENT_DATE
        END,
        'whatsapp-entity-' || p_entity_id::text
      )
      RETURNING id INTO v_created_id;

    -- =====================================================================
    -- AGENDA: No calendar_events table yet — accept only
    -- =====================================================================
    WHEN 'agenda' THEN
      -- calendar_events table does not exist yet
      -- Just accept the entity; the UI can show it as an informational card
      v_created_id := NULL;

    -- =====================================================================
    -- Other/NULL: Accept only (informational entities like person, project)
    -- =====================================================================
    ELSE
      v_created_id := NULL;
  END CASE;

  -- 3. Update entity status
  UPDATE whatsapp_extracted_entities
  SET
    routing_status = 'accepted',
    routed_item_id = v_created_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_entity_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'entity_id', p_entity_id,
    'routed_to_module', v_module,
    'created_item_id', v_created_id,
    'entity_type', v_entity.entity_type
  );

EXCEPTION
  WHEN unique_violation THEN
    -- finance_transactions has hash_id UNIQUE — entity may already be routed
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate item already exists',
      'entity_id', p_entity_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'entity_id', p_entity_id
    );
END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.route_accepted_entity(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.route_accepted_entity(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.route_accepted_entity(UUID, UUID) IS
  'Accepts an extracted entity and creates the corresponding item in the target module (Atlas/Finance). Returns created item ID.';
