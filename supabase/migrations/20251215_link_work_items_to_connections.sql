-- ============================================================================
-- MIGRATION: Link work_items to Connection Spaces and Archetypes
-- Date: 2025-12-15
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Extend work_items table to support linking tasks to Connection archetype
-- entities (Habitat, Ventures, Academia, Tribo). This enables:
-- - Tasks related to specific connection spaces
-- - Tasks linked to archetype-specific entities (properties, entities, journeys, rituals)
-- - Cross-module task integration (e.g., Atlas -> Habitat property maintenance)
--
-- DESIGN NOTES:
-- - connection_space_id: Optional link to connection_spaces for space-scoped tasks
-- - Archetype reference columns are UUID without foreign keys for flexibility
-- - RLS policies use SECURITY DEFINER functions to ensure proper access control
-- - Tasks can exist in user scope (association_id) OR connection space scope
--
-- BACKWARD COMPATIBILITY:
-- - Existing work_items with association_id continue to work unchanged
-- - New work_items can use connection_space_id instead
-- - Both columns are optional, supporting legacy and new patterns
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user can link tasks to a connection space
CREATE OR REPLACE FUNCTION public.can_link_task_to_connection_space(
    _space_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.is_connection_space_member(_space_id);
END;
$$;

COMMENT ON FUNCTION public.can_link_task_to_connection_space(uuid) IS
'Check if current user can link tasks to a connection space (must be member)';

-- Function: Validate task's archetype references match the space archetype
CREATE OR REPLACE FUNCTION public.validate_work_item_archetype_refs(
    _space_id uuid,
    _habitat_property_id uuid,
    _ventures_entity_id uuid,
    _academia_journey_id uuid,
    _tribo_ritual_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _space_archetype public.connection_archetype_type;
    _non_null_refs_count int := 0;
BEGIN
    -- Get the space archetype
    SELECT archetype INTO _space_archetype
    FROM public.connection_spaces
    WHERE id = _space_id;

    IF _space_archetype IS NULL THEN
        RETURN FALSE; -- Space doesn't exist
    END IF;

    -- Count how many archetype refs are provided
    _non_null_refs_count := COALESCE(CASE WHEN _habitat_property_id IS NOT NULL THEN 1 ELSE 0 END, 0) +
                            COALESCE(CASE WHEN _ventures_entity_id IS NOT NULL THEN 1 ELSE 0 END, 0) +
                            COALESCE(CASE WHEN _academia_journey_id IS NOT NULL THEN 1 ELSE 0 END, 0) +
                            COALESCE(CASE WHEN _tribo_ritual_id IS NOT NULL THEN 1 ELSE 0 END, 0);

    -- If multiple archetype refs provided, that's an error
    IF _non_null_refs_count > 1 THEN
        RETURN FALSE;
    END IF;

    -- If no archetype refs, that's OK (general task)
    IF _non_null_refs_count = 0 THEN
        RETURN TRUE;
    END IF;

    -- Validate the single archetype ref matches space archetype
    CASE _space_archetype
        WHEN 'habitat'::public.connection_archetype_type THEN
            RETURN _habitat_property_id IS NOT NULL;
        WHEN 'ventures'::public.connection_archetype_type THEN
            RETURN _ventures_entity_id IS NOT NULL;
        WHEN 'academia'::public.connection_archetype_type THEN
            RETURN _academia_journey_id IS NOT NULL;
        WHEN 'tribo'::public.connection_archetype_type THEN
            RETURN _tribo_ritual_id IS NOT NULL;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$;

COMMENT ON FUNCTION public.validate_work_item_archetype_refs(uuid, uuid, uuid, uuid, uuid) IS
'Validate that task archetype references match the connection space archetype';

-- ============================================================================
-- PART 2: ALTER work_items TABLE - ADD CONNECTION REFERENCES
-- ============================================================================

-- Add connection_space_id column
ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS connection_space_id UUID REFERENCES public.connection_spaces(id) ON DELETE SET NULL;

-- Add archetype-specific reference columns
ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS habitat_property_id UUID;

ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS ventures_entity_id UUID;

ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS academia_journey_id UUID;

ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS tribo_ritual_id UUID;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for connection space lookups
CREATE INDEX IF NOT EXISTS idx_work_items_connection_space_id
    ON public.work_items(connection_space_id)
    WHERE connection_space_id IS NOT NULL;

-- Index for connection_space_id + user_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_work_items_connection_and_user
    ON public.work_items(connection_space_id, user_id)
    WHERE connection_space_id IS NOT NULL;

-- Indexes for archetype-specific lookups
CREATE INDEX IF NOT EXISTS idx_work_items_habitat_property
    ON public.work_items(habitat_property_id)
    WHERE habitat_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_ventures_entity
    ON public.work_items(ventures_entity_id)
    WHERE ventures_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_academia_journey
    ON public.work_items(academia_journey_id)
    WHERE academia_journey_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_tribo_ritual
    ON public.work_items(tribo_ritual_id)
    WHERE tribo_ritual_id IS NOT NULL;

-- Composite index for is_completed + connection_space (common filtering)
CREATE INDEX IF NOT EXISTS idx_work_items_space_active
    ON public.work_items(connection_space_id, is_completed)
    WHERE connection_space_id IS NOT NULL AND is_completed = false;

-- ============================================================================
-- PART 4: UPDATE RLS POLICIES - ADD CONNECTION-BASED ACCESS
-- ============================================================================

-- Drop existing policies (if they exist) and recreate with connection space support
DROP POLICY IF EXISTS "Users can view their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can insert their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can update their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can delete their own work items" ON public.work_items;

-- SELECT: User owns the task OR user is member of connection space
CREATE POLICY "work_items_select"
    ON public.work_items FOR SELECT
    USING (
        auth.uid() = user_id  -- User owns the task
        OR
        (
            connection_space_id IS NOT NULL
            AND public.is_connection_space_member(connection_space_id)
        )
    );

-- INSERT: User must own the task AND if using connection_space, must be member
CREATE POLICY "work_items_insert"
    ON public.work_items FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND
        (
            connection_space_id IS NULL
            OR
            public.can_link_task_to_connection_space(connection_space_id)
        )
        AND
        (
            connection_space_id IS NULL
            OR
            public.validate_work_item_archetype_refs(
                connection_space_id,
                habitat_property_id,
                ventures_entity_id,
                academia_journey_id,
                tribo_ritual_id
            )
        )
    );

-- UPDATE: User owns the task OR is admin of connection space
CREATE POLICY "work_items_update"
    ON public.work_items FOR UPDATE
    USING (
        auth.uid() = user_id
        OR
        (
            connection_space_id IS NOT NULL
            AND public.is_connection_space_admin(connection_space_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        AND
        (
            connection_space_id IS NULL
            OR
            public.can_link_task_to_connection_space(connection_space_id)
        )
        AND
        (
            connection_space_id IS NULL
            OR
            public.validate_work_item_archetype_refs(
                connection_space_id,
                habitat_property_id,
                ventures_entity_id,
                academia_journey_id,
                tribo_ritual_id
            )
        )
    );

-- DELETE: User owns the task OR is admin of connection space
CREATE POLICY "work_items_delete"
    ON public.work_items FOR DELETE
    USING (
        auth.uid() = user_id
        OR
        (
            connection_space_id IS NOT NULL
            AND public.is_connection_space_admin(connection_space_id)
        )
    );

-- ============================================================================
-- PART 5: ADD CONSTRAINTS
-- ============================================================================

-- Constraint: At most one archetype ref can be set (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_max_one_archetype_ref'
    ) THEN
        ALTER TABLE public.work_items
        ADD CONSTRAINT check_max_one_archetype_ref CHECK (
            (CASE WHEN habitat_property_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN ventures_entity_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN academia_journey_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN tribo_ritual_id IS NOT NULL THEN 1 ELSE 0 END)
            <= 1
        );
    END IF;
END $$;

-- ============================================================================
-- PART 6: ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.work_items.connection_space_id IS
'Optional reference to a connection space. If set, task is scoped to that space and members with appropriate access can view/edit.';

COMMENT ON COLUMN public.work_items.habitat_property_id IS
'Optional reference to a Habitat property. Set only when task is related to a specific property in a Habitat space.';

COMMENT ON COLUMN public.work_items.ventures_entity_id IS
'Optional reference to a Ventures entity. Set only when task is related to a specific business entity in a Ventures space.';

COMMENT ON COLUMN public.work_items.academia_journey_id IS
'Optional reference to an Academia learning journey. Set only when task is related to a specific learning journey in an Academia space.';

COMMENT ON COLUMN public.work_items.tribo_ritual_id IS
'Optional reference to a Tribo ritual. Set only when task is related to a specific group ritual in a Tribo space.';

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can still access work_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated;

-- Grant access to helper functions
GRANT EXECUTE ON FUNCTION public.can_link_task_to_connection_space(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_work_item_archetype_refs(uuid, uuid, uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Changes made to work_items table:
-- 1. Added connection_space_id UUID column (references connection_spaces)
-- 2. Added habitat_property_id UUID column (archetype-specific reference)
-- 3. Added ventures_entity_id UUID column (archetype-specific reference)
-- 4. Added academia_journey_id UUID column (archetype-specific reference)
-- 5. Added tribo_ritual_id UUID column (archetype-specific reference)
--
-- New Security Functions:
-- 1. can_link_task_to_connection_space(uuid) - Validates user can link to space
-- 2. validate_work_item_archetype_refs(...) - Validates archetype refs match space type
--
-- Updated RLS Policies:
-- - work_items_select: User owns task OR is member of connection space
-- - work_items_insert: Must be owner, member of space, and archetype refs must match
-- - work_items_update: Owner can update OR space admin can update
-- - work_items_delete: Owner can delete OR space admin can delete
--
-- New Indexes (8 total):
-- - idx_work_items_connection_space_id
-- - idx_work_items_connection_and_user
-- - idx_work_items_habitat_property
-- - idx_work_items_ventures_entity
-- - idx_work_items_academia_journey
-- - idx_work_items_tribo_ritual
-- - idx_work_items_space_active
--
-- Query to verify:
-- SELECT
--   col.column_name,
--   col.data_type,
--   col.is_nullable
-- FROM information_schema.columns col
-- WHERE col.table_name = 'work_items'
--   AND col.column_name LIKE '%connection%'
--    OR col.column_name LIKE '%_id' AND col.table_name = 'work_items'
-- ORDER BY col.ordinal_position;
--
-- Verify RLS policies:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename = 'work_items'
-- ORDER BY policyname;
