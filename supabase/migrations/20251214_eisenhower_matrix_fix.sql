-- ============================================================================
-- MIGRATION: Eisenhower Matrix Implementation - Bi-dimensional Priority Model
-- Date: 2025-12-14
-- Purpose: Replace unidimensional priority with urgency + importance axes
-- ============================================================================

-- ============================================================================
-- PART 1: ADD NEW COLUMNS FOR EISENHOWER MATRIX
-- ============================================================================

-- Add is_urgent and is_important columns to work_items table
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- Add index for efficient quadrant queries
CREATE INDEX IF NOT EXISTS idx_work_items_eisenhower ON work_items(is_urgent, is_important);

-- ============================================================================
-- PART 2: MIGRATION LOGIC - MAP OLD PRIORITY TO NEW COLUMNS
-- ============================================================================

-- Map existing priority values to is_urgent + is_important
-- urgent -> is_urgent=true, is_important=false (Quadrant 3: Delegate)
-- high -> is_urgent=false, is_important=true (Quadrant 2: Schedule)
-- medium -> is_urgent=true, is_important=true (Quadrant 1: Do First)
-- low -> is_urgent=false, is_important=false (Quadrant 4: Eliminate)
-- none -> is_urgent=false, is_important=false (Quadrant 4: Eliminate)

UPDATE work_items
SET
  is_urgent = CASE
    WHEN priority = 'urgent' THEN true
    WHEN priority = 'medium' THEN true
    ELSE false
  END,
  is_important = CASE
    WHEN priority = 'high' THEN true
    WHEN priority = 'medium' THEN true
    ELSE false
  END
WHERE priority IS NOT NULL;

-- ============================================================================
-- PART 3: UPDATE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN work_items.is_urgent IS 'Eisenhower Matrix: X-axis. Is this task time-sensitive or deadline-driven?';
COMMENT ON COLUMN work_items.is_important IS 'Eisenhower Matrix: Y-axis. Does this task impact long-term goals or strategic objectives?';

-- ============================================================================
-- PART 4: HELPER FUNCTION TO DETERMINE QUADRANT
-- ============================================================================

-- Create function to map Eisenhower dimensions to quadrant
CREATE OR REPLACE FUNCTION get_eisenhower_quadrant(is_urgent BOOLEAN, is_important BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF is_urgent AND is_important THEN
    RETURN 'urgent-important'; -- Quadrant 1: Do First
  ELSIF NOT is_urgent AND is_important THEN
    RETURN 'important'; -- Quadrant 2: Schedule
  ELSIF is_urgent AND NOT is_important THEN
    RETURN 'urgent'; -- Quadrant 3: Delegate
  ELSE
    RETURN 'low'; -- Quadrant 4: Eliminate
  END IF;
END;
$$;

-- ============================================================================
-- PART 5: SCHEMA ALIGNMENT - ENSURE priority_quadrant EXISTS
-- ============================================================================

-- Add priority_quadrant if it doesn't exist (computed from Eisenhower dimensions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'work_items'
      AND column_name = 'priority_quadrant'
  ) THEN
    ALTER TABLE work_items
    ADD COLUMN priority_quadrant TEXT
    CHECK (priority_quadrant IN ('urgent-important', 'important', 'urgent', 'low'));
  END IF;
END $$;

-- Sync priority_quadrant with new Eisenhower dimensions
UPDATE work_items
SET priority_quadrant = get_eisenhower_quadrant(is_urgent, is_important)
WHERE priority_quadrant IS NULL OR priority_quadrant = '';

-- ============================================================================
-- PART 6: CREATE TRIGGER FOR AUTOMATIC QUADRANT SYNC
-- ============================================================================

-- Function to auto-update priority_quadrant when Eisenhower dimensions change
CREATE OR REPLACE FUNCTION sync_priority_quadrant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update priority_quadrant based on is_urgent and is_important
  NEW.priority_quadrant = get_eisenhower_quadrant(NEW.is_urgent, NEW.is_important);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS sync_priority_quadrant_trigger ON work_items;

-- Create trigger that fires before INSERT or UPDATE
CREATE TRIGGER sync_priority_quadrant_trigger
BEFORE INSERT OR UPDATE ON work_items
FOR EACH ROW
EXECUTE FUNCTION sync_priority_quadrant();

-- ============================================================================
-- PART 7: DOCUMENTATION & QUERY EXAMPLES
-- ============================================================================

-- Query Quadrant 1 (Do First): Urgent + Important
-- SELECT * FROM work_items WHERE is_urgent AND is_important AND archived = false;

-- Query Quadrant 2 (Schedule): Important but Not Urgent
-- SELECT * FROM work_items WHERE NOT is_urgent AND is_important AND archived = false;

-- Query Quadrant 3 (Delegate): Urgent but Not Important
-- SELECT * FROM work_items WHERE is_urgent AND NOT is_important AND archived = false;

-- Query Quadrant 4 (Eliminate): Neither Urgent nor Important
-- SELECT * FROM work_items WHERE NOT is_urgent AND NOT is_important AND archived = false;
