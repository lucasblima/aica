-- Migration: Allow multiple active projects per opportunity
-- Description: Removes the unique constraint that limits users to one project per opportunity
--              Users should be able to create multiple projects for the same edital
-- Author: Aica Life OS - Grants Module
-- Date: 2024-12-09

-- ============================================================================
-- DROP UNIQUE CONSTRAINT
-- ============================================================================
-- Remove the unique constraint that prevents multiple projects per opportunity
-- This allows users to have MULTIPLE active projects for the same edital

ALTER TABLE grant_projects
DROP CONSTRAINT IF EXISTS grant_projects_user_id_opportunity_id_key;

-- ============================================================================
-- DROP PARTIAL INDEX (if exists from previous migration)
-- ============================================================================
-- Remove any partial index that might have been created

DROP INDEX IF EXISTS grant_projects_user_opportunity_active_unique;

-- ============================================================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================================================
-- Test that multiple projects can be created:
--
-- SELECT
--   id,
--   project_name,
--   opportunity_id,
--   status,
--   archived_at,
--   created_at
-- FROM grant_projects
-- WHERE user_id = auth.uid()
-- ORDER BY opportunity_id, created_at;
--
-- You should now be able to create multiple projects for the same opportunity_id
