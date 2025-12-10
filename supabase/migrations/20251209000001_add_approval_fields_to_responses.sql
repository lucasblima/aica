-- Migration: Add Approval Fields to grant_responses
-- Created: 2025-12-09
-- Description: Separates generation status from approval status for better UX tracking
-- Priority: CRITICAL - Enables granular approval state tracking

-- ============================================================================
-- 1. ADD APPROVAL FIELDS
-- ============================================================================

ALTER TABLE grant_responses
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- Add constraint for approval_status
ALTER TABLE grant_responses
ADD CONSTRAINT grant_responses_approval_status_check
CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_revision'));

-- ============================================================================
-- 2. CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Index for queries filtering by approval status
CREATE INDEX IF NOT EXISTS idx_grant_responses_project_approval_status
ON grant_responses(project_id, approval_status);

-- Index for finding approved responses (used in auto-submit trigger)
CREATE INDEX IF NOT EXISTS idx_grant_responses_approved
ON grant_responses(project_id, approval_status)
WHERE approval_status = 'approved';

-- Index for tracking who approved what
CREATE INDEX IF NOT EXISTS idx_grant_responses_approved_by
ON grant_responses(approved_by)
WHERE approved_by IS NOT NULL;

-- ============================================================================
-- 3. MIGRATE EXISTING DATA
-- ============================================================================

-- Migrate existing 'approved' status to new approval_status field
UPDATE grant_responses
SET approval_status = 'approved',
    approved_at = updated_at
WHERE status = 'approved'
  AND approval_status = 'pending'; -- Only update if not already migrated

-- ============================================================================
-- 4. ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN grant_responses.approval_status IS 'Approval status by user (pending/approved/rejected/needs_revision)';
COMMENT ON COLUMN grant_responses.approved_at IS 'Timestamp when user approved this response';
COMMENT ON COLUMN grant_responses.approved_by IS 'User ID who approved this response';
COMMENT ON COLUMN grant_responses.rejection_reason IS 'Reason for rejection (if approval_status = rejected)';

COMMENT ON INDEX idx_grant_responses_project_approval_status IS 'Optimizes queries filtering responses by approval status';
COMMENT ON INDEX idx_grant_responses_approved IS 'Optimizes auto-submit trigger checking all approved responses';

-- ============================================================================
-- 5. HELPER FUNCTION FOR APPROVAL
-- ============================================================================

-- Function to approve a response (sets approval_status + metadata)
CREATE OR REPLACE FUNCTION approve_grant_response(
  response_id UUID
) RETURNS grant_responses AS $$
DECLARE
  updated_response grant_responses;
BEGIN
  UPDATE grant_responses
  SET
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid(),
    updated_at = NOW()
  WHERE id = response_id
    AND project_id IN (
      SELECT id FROM grant_projects WHERE user_id = auth.uid()
    )
  RETURNING * INTO updated_response;

  IF updated_response IS NULL THEN
    RAISE EXCEPTION 'Response not found or access denied';
  END IF;

  RETURN updated_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION approve_grant_response IS 'Approves a response and sets approval metadata (approved_at, approved_by)';

-- Function to reject a response
CREATE OR REPLACE FUNCTION reject_grant_response(
  response_id UUID,
  reason TEXT
) RETURNS grant_responses AS $$
DECLARE
  updated_response grant_responses;
BEGIN
  UPDATE grant_responses
  SET
    approval_status = 'rejected',
    rejection_reason = reason,
    updated_at = NOW()
  WHERE id = response_id
    AND project_id IN (
      SELECT id FROM grant_projects WHERE user_id = auth.uid()
    )
  RETURNING * INTO updated_response;

  IF updated_response IS NULL THEN
    RAISE EXCEPTION 'Response not found or access denied';
  END IF;

  RETURN updated_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION reject_grant_response IS 'Rejects a response with reason';

-- ============================================================================
-- 6. UPDATE AUTO-SUBMIT TRIGGER TO USE approval_status
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_check_project_completion ON grant_responses;
DROP FUNCTION IF EXISTS check_and_update_project_status();

-- Recreate function to use new approval_status field
CREATE OR REPLACE FUNCTION check_and_update_project_status()
RETURNS TRIGGER AS $$
DECLARE
  total_fields INTEGER;
  approved_count INTEGER;
  project_status TEXT;
  project_opportunity_id UUID;
BEGIN
  -- Only process if approval_status changed to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN

    -- Get project opportunity_id and current status
    SELECT opportunity_id, status INTO project_opportunity_id, project_status
    FROM grant_projects
    WHERE id = NEW.project_id;

    -- Only proceed if project is in 'review' status
    IF project_status = 'review' THEN

      -- Count total form fields from the opportunity
      SELECT
        CASE
          WHEN form_fields IS NULL THEN 0
          ELSE jsonb_array_length(form_fields)
        END INTO total_fields
      FROM grant_opportunities
      WHERE id = project_opportunity_id;

      -- Count approved responses for this project (using new approval_status)
      SELECT COUNT(*) INTO approved_count
      FROM grant_responses
      WHERE project_id = NEW.project_id
        AND approval_status = 'approved';

      -- Log for debugging
      RAISE NOTICE 'Project %, Total fields: %, Approved: %',
        NEW.project_id, total_fields, approved_count;

      -- If all fields are approved, update project status to 'submitted'
      IF approved_count >= total_fields AND total_fields > 0 THEN
        UPDATE grant_projects
        SET
          status = 'submitted',
          submitted_at = NOW(),
          updated_at = NOW(),
          completion_percentage = 100
        WHERE id = NEW.project_id;

        RAISE NOTICE 'Project % auto-submitted: all % fields approved',
          NEW.project_id, total_fields;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_check_project_completion
  AFTER INSERT OR UPDATE ON grant_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_project_status();

COMMENT ON FUNCTION check_and_update_project_status() IS
  'Automatically updates grant project status to submitted when all responses have approval_status = approved';

COMMENT ON TRIGGER trigger_check_project_completion ON grant_responses IS
  'Triggers automatic project submission when all form fields are approved';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Use this query to verify the migration worked:
--
-- SELECT
--   gr.id,
--   gr.field_id,
--   gr.status as generation_status,
--   gr.approval_status,
--   gr.approved_at,
--   gr.approved_by,
--   u.email as approved_by_email
-- FROM grant_responses gr
-- LEFT JOIN auth.users u ON gr.approved_by = u.id
-- WHERE gr.project_id = '<your-project-id>'
-- ORDER BY gr.created_at;
