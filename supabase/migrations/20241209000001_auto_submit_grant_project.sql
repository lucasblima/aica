-- Migration: Auto-submit grant project when all responses are approved
-- Description: Creates a PostgreSQL trigger that automatically changes project status
--              from 'review' to 'submitted' when all form fields have approved responses
-- Author: Aica Life OS - Grants Module
-- Date: 2024-12-09

-- ============================================================================
-- FUNCTION: check_and_update_project_status
-- ============================================================================
-- This function checks if all responses for a project are approved and
-- automatically updates the project status to 'submitted' if conditions are met
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_update_project_status()
RETURNS TRIGGER AS $$
DECLARE
  total_fields INTEGER;
  approved_count INTEGER;
  project_status TEXT;
  project_opportunity_id UUID;
BEGIN
  -- Only process if the status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

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

      -- Count approved responses for this project
      SELECT COUNT(*) INTO approved_count
      FROM grant_responses
      WHERE project_id = NEW.project_id
        AND status = 'approved';

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

-- ============================================================================
-- TRIGGER: trigger_check_project_completion
-- ============================================================================
-- Fires after INSERT or UPDATE on grant_responses table
-- Calls check_and_update_project_status() for each row
-- ============================================================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_check_project_completion ON grant_responses;

-- Create the trigger
CREATE TRIGGER trigger_check_project_completion
  AFTER INSERT OR UPDATE ON grant_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_project_status();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION check_and_update_project_status() IS
  'Automatically updates grant project status to submitted when all responses are approved';

COMMENT ON TRIGGER trigger_check_project_completion ON grant_responses IS
  'Triggers automatic project submission when all form fields are approved';

-- ============================================================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================================================
-- Use this query to verify the trigger is working:
--
-- SELECT
--   gp.id,
--   gp.project_name,
--   gp.status,
--   gp.completion_percentage,
--   COUNT(gr.id) FILTER (WHERE gr.status = 'approved') as approved_responses,
--   (SELECT jsonb_array_length(form_fields) FROM grant_opportunities WHERE id = gp.opportunity_id) as total_fields
-- FROM grant_projects gp
-- LEFT JOIN grant_responses gr ON gr.project_id = gp.id
-- GROUP BY gp.id
-- ORDER BY gp.created_at DESC;
