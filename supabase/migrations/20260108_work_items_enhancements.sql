-- =============================================================================
-- AICA: Work Items Enhancements - Subtasks, Recurrence, Tags, Description
-- =============================================================================
-- This migration adds support for:
-- 1. Task descriptions (up to 5000 characters)
-- 2. Tags/labels (array of strings for categorization)
-- 3. Recurrence rules (iCalendar RRULE format for recurring tasks)
-- 4. Parent task ID (self-reference for subtask hierarchy)
-- =============================================================================

-- Add new columns to work_items table
ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS description TEXT
    CHECK (description IS NULL OR length(description) <= 5000),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID
    REFERENCES work_items(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_items_parent_task
  ON work_items(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_recurrence
  ON work_items(recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_tags
  ON work_items USING GIN(tags);

-- Add RLS policies for new columns
-- Users can only see/edit their own tasks and their subtasks
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks (including subtasks)
CREATE POLICY IF NOT EXISTS work_items_select_own
  ON work_items
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR parent_task_id IN (
      SELECT id FROM work_items WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert tasks/subtasks under their own tasks
CREATE POLICY IF NOT EXISTS work_items_insert_own
  ON work_items
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR parent_task_id IN (
      SELECT id FROM work_items WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own tasks and subtasks
CREATE POLICY IF NOT EXISTS work_items_update_own
  ON work_items
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR parent_task_id IN (
      SELECT id FROM work_items WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR parent_task_id IN (
      SELECT id FROM work_items WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own tasks and subtasks
CREATE POLICY IF NOT EXISTS work_items_delete_own
  ON work_items
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR parent_task_id IN (
      SELECT id FROM work_items WHERE user_id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON COLUMN work_items.description IS 'Task description/notes (max 5000 chars)';
COMMENT ON COLUMN work_items.tags IS 'Array of tags/labels for categorization (e.g., {urgent, work, project-x})';
COMMENT ON COLUMN work_items.recurrence_rule IS 'iCalendar RRULE format (RFC 5545) for recurring tasks (e.g., FREQ=DAILY;INTERVAL=1)';
COMMENT ON COLUMN work_items.parent_task_id IS 'UUID of parent task if this is a subtask; NULL if this is a parent task';
