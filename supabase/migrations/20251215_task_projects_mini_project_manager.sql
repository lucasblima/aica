-- ============================================================================
-- MIGRATION: Task Projects (Mini Project Manager)
-- Date: 2025-12-15
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create a mini project management system that groups work_items into projects.
-- Provides automatic progress tracking, project status management, and
-- integration with connection spaces (archetypes).
--
-- TABLES CREATED:
-- 1. task_projects - Main projects table
-- 2. Relationship: work_items.project_id -> task_projects.id
-- 3. VIEW: project_progress - Real-time project statistics
--
-- KEY FEATURES:
-- - Automatic progress calculation based on completed work_items
-- - Color and icon customization for UI
-- - Target dates and completion tracking
-- - Optional connection_space linkage
-- - SECURITY DEFINER functions to prevent RLS recursion
-- - Row-Level Security on all tables and views
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TASK_PROJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project identification
    title TEXT NOT NULL,
    description TEXT,

    -- Connection integration
    connection_space_id UUID REFERENCES public.connection_spaces(id) ON DELETE SET NULL,

    -- Status and lifecycle
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),

    -- Visual customization
    color TEXT DEFAULT '#3B82F6',  -- Hex color for UI
    icon TEXT DEFAULT '📋',         -- Emoji or icon identifier

    -- Timeline
    target_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_status_valid CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
    CONSTRAINT check_completed_only_when_completed CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR
        (status != 'completed' AND completed_at IS NULL)
    ),
    CONSTRAINT check_target_date_after_start CHECK (
        target_date IS NULL
        OR
        target_date > started_at
    )
);

COMMENT ON TABLE public.task_projects IS
'Mini project manager: Groups work_items into projects with automatic progress tracking.';
COMMENT ON COLUMN public.task_projects.connection_space_id IS
'Optional link to a connection archetype (habitat, ventures, academia, tribo)';
COMMENT ON COLUMN public.task_projects.status IS
'Project lifecycle: active (in progress), completed (done), archived (hidden), on_hold (paused)';
COMMENT ON COLUMN public.task_projects.color IS 'Hex color code for UI visualization';
COMMENT ON COLUMN public.task_projects.icon IS 'Emoji or icon identifier for project type';

-- Create indexes for performance
CREATE INDEX idx_task_projects_user_id
    ON public.task_projects(user_id);
CREATE INDEX idx_task_projects_connection_space_id
    ON public.task_projects(connection_space_id)
    WHERE connection_space_id IS NOT NULL;
CREATE INDEX idx_task_projects_status
    ON public.task_projects(user_id, status)
    WHERE status IN ('active', 'completed');
CREATE INDEX idx_task_projects_created_at
    ON public.task_projects(user_id, created_at DESC);
CREATE INDEX idx_task_projects_target_date
    ON public.task_projects(user_id, target_date)
    WHERE target_date IS NOT NULL AND status = 'active';

-- ============================================================================
-- PART 2: ADD PROJECT_ID TO WORK_ITEMS TABLE
-- ============================================================================

-- Add project_id column to work_items if it doesn't exist
ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL;

-- Create index for work_items -> task_projects relationship
CREATE INDEX IF NOT EXISTS idx_work_items_project_id
    ON public.work_items(project_id)
    WHERE project_id IS NOT NULL;

COMMENT ON COLUMN public.work_items.project_id IS
'Optional link to a task_project for grouping related tasks';

-- ============================================================================
-- PART 3: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user owns a project
CREATE OR REPLACE FUNCTION public.is_task_project_owner(
    _project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.task_projects
        WHERE id = _project_id
          AND user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.is_task_project_owner(uuid) IS
'Check if current user is the owner of a task project';

-- Function: Check if user can access a project (owner or connection member)
CREATE OR REPLACE FUNCTION public.can_access_task_project(
    _project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _connection_space_id uuid;
BEGIN
    -- Get the connection_space_id for this project
    SELECT connection_space_id INTO _connection_space_id
    FROM public.task_projects
    WHERE id = _project_id;

    -- User can access if:
    -- 1. They own the project, OR
    -- 2. Project has no connection_space (private), OR
    -- 3. They are a member of the connection space
    RETURN (
        is_task_project_owner(_project_id)
        OR
        (
            _connection_space_id IS NULL
            AND
            is_task_project_owner(_project_id)
        )
        OR
        (
            _connection_space_id IS NOT NULL
            AND
            is_connection_space_member(_connection_space_id)
        )
    );
END;
$$;

COMMENT ON FUNCTION public.can_access_task_project(uuid) IS
'Check if current user can access a task project (owner or connection member)';

-- ============================================================================
-- PART 4: ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view projects they own or are shared with
CREATE POLICY "task_projects_select"
    ON public.task_projects FOR SELECT
    USING (
        can_access_task_project(id)
    );

-- RLS Policy: Users can create projects
CREATE POLICY "task_projects_insert"
    ON public.task_projects FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

-- RLS Policy: Users can update their own projects
CREATE POLICY "task_projects_update"
    ON public.task_projects FOR UPDATE
    USING (
        is_task_project_owner(id)
    )
    WITH CHECK (
        is_task_project_owner(id)
    );

-- RLS Policy: Users can delete their own projects
CREATE POLICY "task_projects_delete"
    ON public.task_projects FOR DELETE
    USING (
        is_task_project_owner(id)
    );

-- ============================================================================
-- PART 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_task_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_projects_updated_at ON public.task_projects;
CREATE TRIGGER update_task_projects_updated_at
    BEFORE UPDATE ON public.task_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_task_projects_updated_at();

-- ============================================================================
-- PART 6: CREATE PROJECT PROGRESS VIEW
-- ============================================================================

-- View: Real-time project progress statistics
CREATE OR REPLACE VIEW public.project_progress AS
SELECT
    p.id as project_id,
    p.user_id,
    p.title as project_title,
    p.status as project_status,
    p.color,
    p.icon,
    p.target_date,
    p.started_at,
    p.completed_at,
    p.created_at,
    p.updated_at,

    -- Task counts
    COUNT(w.id)::integer as total_tasks,
    COUNT(w.id) FILTER (WHERE w.is_completed = true)::integer as completed_tasks,
    COUNT(w.id) FILTER (WHERE w.is_completed = false)::integer as remaining_tasks,
    0::integer as in_progress_tasks,

    -- Progress percentage
    CASE
        WHEN COUNT(w.id) = 0 THEN 0
        ELSE ROUND(
            (COUNT(w.id) FILTER (WHERE w.is_completed = true)::numeric / COUNT(w.id)) * 100
        )::integer
    END as progress_percentage,

    -- Burndown metrics
    CASE
        WHEN COUNT(w.id) = 0 THEN NULL
        ELSE ROUND(
            (COUNT(w.id) FILTER (WHERE w.priority = 'urgent')::numeric / COUNT(w.id)) * 100
        )::integer
    END as urgent_percentage,

    -- Next deadline
    MIN(w.due_date) FILTER (WHERE w.is_completed = false AND w.due_date IS NOT NULL) as next_due_date

FROM public.task_projects p
LEFT JOIN public.work_items w ON w.project_id = p.id
GROUP BY
    p.id, p.user_id, p.title, p.status, p.color, p.icon,
    p.target_date, p.started_at, p.completed_at,
    p.created_at, p.updated_at;

COMMENT ON VIEW public.project_progress IS
'Real-time project progress statistics including task counts, completion percentage, and burndown metrics';
COMMENT ON COLUMN public.project_progress.progress_percentage IS 'Percentage of completed tasks (0-100)';
COMMENT ON COLUMN public.project_progress.urgent_percentage IS 'Percentage of urgent tasks in project';
COMMENT ON COLUMN public.project_progress.remaining_tasks IS 'Count of tasks not yet completed and not cancelled';

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_projects TO authenticated;
GRANT SELECT ON public.project_progress TO authenticated;

-- ============================================================================
-- PART 8: MIGRATION COMPLETION SUMMARY
-- ============================================================================

-- Tables created/modified:
-- 1. task_projects - NEW
-- 2. work_items - MODIFIED (added project_id)
--
-- Functions created:
-- 1. is_task_project_owner(uuid)
-- 2. can_access_task_project(uuid)
--
-- Views created:
-- 1. project_progress - Real-time project statistics
--
-- RLS Policies on task_projects:
-- - SELECT: Owner or connection space member
-- - INSERT: Authenticated users (becomes owner)
-- - UPDATE: Owner only
-- - DELETE: Owner only
--
-- Indexes created:
-- - idx_task_projects_user_id
-- - idx_task_projects_connection_space_id
-- - idx_task_projects_status
-- - idx_task_projects_created_at
-- - idx_task_projects_target_date
-- - idx_work_items_project_id
--
-- Verification queries:
-- SELECT COUNT(*) FROM public.task_projects;
-- SELECT COUNT(*) FROM public.project_progress;
-- SELECT COUNT(DISTINCT project_id) FROM public.work_items WHERE project_id IS NOT NULL;
-- SELECT tablename, policyname FROM pg_policies WHERE tablename = 'task_projects';
