-- Migration: Add archive fields to grants module
-- Created: 2025-12-08
-- Description: Adds archived_at timestamp to grant_opportunities and grant_projects

-- Add archived_at to grant_opportunities
ALTER TABLE grant_opportunities
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN grant_opportunities.archived_at IS 'Timestamp when the opportunity was archived (NULL = active)';

-- Add archived_at to grant_projects
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN grant_projects.archived_at IS 'Timestamp when the project was archived (NULL = active)';

-- Create index for filtering archived items
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_archived
ON grant_opportunities(archived_at)
WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grant_projects_archived
ON grant_projects(archived_at)
WHERE archived_at IS NOT NULL;

-- Add helper function to check if archived
CREATE OR REPLACE FUNCTION is_grant_archived(archived_timestamp TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN archived_timestamp IS NOT NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_grant_archived IS 'Helper function to check if a grant is archived';
