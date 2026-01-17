-- Add archived_at column to grant_projects and grant_opportunities
-- Migration: 20251208_add_archived_at_to_grants
--
-- This migration adds soft delete capability to grants module

-- Add archived_at column to grant_projects
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_at column to grant_opportunities
ALTER TABLE grant_opportunities
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance when filtering archived items
CREATE INDEX IF NOT EXISTS idx_grant_projects_archived_at
ON grant_projects(archived_at);

CREATE INDEX IF NOT EXISTS idx_grant_opportunities_archived_at
ON grant_opportunities(archived_at);

-- Add comments
COMMENT ON COLUMN grant_projects.archived_at IS 'Timestamp when project was archived (soft delete)';
COMMENT ON COLUMN grant_opportunities.archived_at IS 'Timestamp when opportunity was archived (soft delete)';
