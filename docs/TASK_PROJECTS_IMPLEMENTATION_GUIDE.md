# Task Projects (Mini Project Manager) - Implementation Guide

**Status:** Migration Ready
**Date:** 2025-12-15
**Related Migration:** `20251215_task_projects_mini_project_manager.sql`

## Overview

The Task Projects system implements a mini project manager that groups `work_items` (tasks) into projects with automatic progress tracking, status management, and optional integration with connection spaces (archetypes).

## Architecture

### Data Model

```
┌─────────────────────────────────────┐
│         task_projects               │
├─────────────────────────────────────┤
│ id (UUID, PK)                       │
│ user_id (FK: auth.users)            │
│ title (TEXT, NOT NULL)              │
│ description (TEXT)                  │
│ connection_space_id (FK, optional)  │
│ status (active|completed|...)       │
│ color (hex code for UI)             │
│ icon (emoji)                        │
│ target_date (TIMESTAMPTZ)           │
│ started_at (TIMESTAMPTZ)            │
│ completed_at (TIMESTAMPTZ)          │
│ created_at, updated_at              │
└─────────────────────────────────────┘
           ↑
           │ 1:N relationship
           │
┌─────────────────────────────────────┐
│         work_items (modified)       │
├─────────────────────────────────────┤
│ ...                                 │
│ project_id (FK, new column)         │
│ ...                                 │
└─────────────────────────────────────┘
```

### Key Relationships

1. **User → Projects (1:N)**
   - Users own multiple projects
   - User can only access own projects or projects shared via connection space

2. **Projects → Work Items (1:N)**
   - Projects group related work items
   - `work_items.project_id` is nullable (tasks can exist without project)

3. **Projects → Connection Spaces (N:1, optional)**
   - Projects can optionally be linked to a connection space
   - If linked, all members of that space can view the project
   - Enables team-based projects

## Security Implementation

### Row-Level Security (RLS)

All tables use **SECURITY DEFINER** functions to prevent RLS recursion:

#### task_projects RLS Policies

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | task_projects_select | `can_access_task_project(id)` |
| INSERT | task_projects_insert | `auth.uid() = user_id` |
| UPDATE | task_projects_update | `is_task_project_owner(id)` |
| DELETE | task_projects_delete | `is_task_project_owner(id)` |

### SECURITY DEFINER Functions

```sql
-- Check if user owns the project
is_task_project_owner(uuid) RETURNS boolean

-- Check if user can access (owner or connection member)
can_access_task_project(uuid) RETURNS boolean
```

**Why SECURITY DEFINER?**
- Prevents infinite recursion in RLS policies
- Centralizes authorization logic (Single Source of Truth)
- Functions run with creator's privileges (safe with auth.uid())

## Database Views

### project_progress

Real-time project statistics view combining project data with calculated metrics:

```sql
SELECT * FROM project_progress WHERE project_id = 'xxx'
```

**Returned Columns:**

| Column | Type | Description |
|--------|------|-------------|
| project_id | UUID | Project identifier |
| user_id | UUID | Project owner |
| project_title | TEXT | Project name |
| project_status | TEXT | Current status |
| total_tasks | INTEGER | Total work items |
| completed_tasks | INTEGER | Completed count |
| remaining_tasks | INTEGER | Active + In Progress |
| in_progress_tasks | INTEGER | Currently being worked on |
| progress_percentage | INTEGER | % completion (0-100) |
| urgent_percentage | INTEGER | % of urgent tasks |
| next_due_date | DATE | Nearest deadline |
| target_date | TIMESTAMPTZ | Project target |
| started_at | TIMESTAMPTZ | Start date |
| completed_at | TIMESTAMPTZ | Completion date |

## Frontend Integration

### Service Layer (supabaseService.ts)

```typescript
// Create a new project
async createProject(title: string, description?: string, connectionSpaceId?: UUID)
  → { id: UUID, title: string, ... }

// Get user's projects
async getUserProjects(status?: 'active' | 'completed' | 'archived' | 'on_hold')
  → Project[]

// Get project details with progress
async getProjectWithProgress(projectId: UUID)
  → { project: Project, progress: ProjectProgress }

// Update project
async updateProject(projectId: UUID, updates: Partial<Project>)
  → Project

// Complete project
async completeProject(projectId: UUID)
  → Project (status='completed', completed_at=now())

// Delete project
async deleteProject(projectId: UUID)
  → void (if owner) or error

// Link work item to project
async linkWorkItemToProject(workItemId: UUID, projectId: UUID)
  → WorkItem

// Remove work item from project
async removeWorkItemFromProject(workItemId: UUID)
  → WorkItem (project_id=null)
```

### Component Usage Example

```typescript
// TaskProjectsView.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabaseService } from '../services/supabaseService';

export function TaskProjectsView() {
  // Get all projects
  const { data: projects } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => supabaseService.getUserProjects('active')
  });

  // Get project details with progress
  const { data: projectDetail } = useQuery({
    queryKey: ['projects', projectId, 'progress'],
    queryFn: () => supabaseService.getProjectWithProgress(projectId)
  });

  // Render progress bar
  return (
    <div className="project-card">
      <h3>{projectDetail?.project.title}</h3>
      <ProgressBar
        current={projectDetail?.progress.completed_tasks}
        total={projectDetail?.progress.total_tasks}
        percentage={projectDetail?.progress.progress_percentage}
      />
      <p>Tasks: {projectDetail?.progress.remaining_tasks} remaining</p>
      {projectDetail?.progress.next_due_date && (
        <p>Next: {projectDetail.progress.next_due_date}</p>
      )}
    </div>
  );
}
```

## Status Transitions

Project lifecycle states and valid transitions:

```
┌─────────┐
│ active  │  ← Initial state (user creates project)
└────┬────┘
     │
     ├─→ completed (all tasks done or user marks complete)
     │
     ├─→ on_hold (user pauses project)
     │   └─→ active (resume)
     │
     └─→ archived (user hides from main view)
         └─→ active (restore)
```

**Constraints:**
- Status must be one of: `active`, `completed`, `archived`, `on_hold`
- Only status `completed` sets `completed_at` timestamp
- Completing a project doesn't auto-complete tasks

## Performance Indexes

All indexes are designed for common query patterns:

| Index | Purpose | Query Pattern |
|-------|---------|---------------|
| idx_task_projects_user_id | Filter by owner | "My projects" |
| idx_task_projects_status | Filter by status | "Active projects only" |
| idx_task_projects_created_at | Sort by date | "Recent projects" |
| idx_task_projects_target_date | Upcoming deadlines | "Projects due this week" |
| idx_work_items_project_id | Find tasks in project | "Tasks in project X" |

## Constraints & Validation

### Data Integrity Checks

```sql
-- Title cannot be empty
CHECK (title <> '')

-- Status must be valid
CHECK (status IN ('active', 'completed', 'archived', 'on_hold'))

-- completed_at only set when status='completed'
CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR
    (status != 'completed' AND completed_at IS NULL)
)

-- Target date must be after start date
CHECK (
    target_date IS NULL
    OR
    target_date > started_at
)
```

## Migration Steps

### Step 1: Apply Migration

```bash
cd supabase
supabase db push  # Applies pending migrations
```

**What this does:**
1. Creates `task_projects` table
2. Adds `project_id` column to `work_items`
3. Creates SECURITY DEFINER functions
4. Enables RLS with 4 policies
5. Creates `project_progress` view
6. Creates performance indexes

### Step 2: Verify Schema

```sql
-- Check table exists
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'task_projects'
);

-- Check column added to work_items
SELECT column_name FROM information_schema.columns
WHERE table_name = 'work_items' AND column_name = 'project_id';

-- Verify RLS enabled
SELECT * FROM pg_tables
WHERE tablename = 'task_projects' AND rowsecurity = true;

-- List all RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'task_projects';

-- Check view created
SELECT EXISTS(
  SELECT 1 FROM information_schema.views
  WHERE table_name = 'project_progress'
);
```

### Step 3: Test RLS Policies

```sql
-- As user 1, create a project
INSERT INTO task_projects (user_id, title)
VALUES (user1_id, 'My Project')
RETURNING id;

-- Try to read (should succeed)
SELECT * FROM task_projects WHERE id = project_id;

-- Switch to user 2, try to read (should fail)
-- SELECT * FROM task_projects WHERE id = project_id;
-- → Returns 0 rows (RLS blocks access)

-- Try to update (should fail for user 2)
-- UPDATE task_projects SET title = 'Hacked' WHERE id = project_id;
-- → Error: "new row violates row-level security policy"
```

### Step 4: Implement Frontend Services

Create `src/services/taskProjectService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { TaskProject, ProjectProgress } from '../types';

export const taskProjectService = {
  // CRUD operations
  async createProject(title: string, description?: string, connectionSpaceId?: string) {
    const { data, error } = await supabase
      .from('task_projects')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        title,
        description,
        connection_space_id: connectionSpaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaskProject;
  },

  async getProjectWithProgress(projectId: string) {
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) throw error;
    return data as ProjectProgress;
  },

  // ... other methods
};
```

## API Endpoints (Optional - Edge Functions)

If implementing Edge Functions for batch operations:

```
POST   /api/projects                    - Create project
GET    /api/projects                    - List user's projects
GET    /api/projects/:id                - Get project + progress
PATCH  /api/projects/:id                - Update project
DELETE /api/projects/:id                - Delete project
PATCH  /api/projects/:id/complete       - Mark as completed
POST   /api/projects/:id/link-work-item - Add work item to project
DELETE /api/projects/:id/link-work-item - Remove work item from project
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "new row violates row-level security policy" | User trying to access other's project | Check auth.uid() == user_id |
| "violates foreign key constraint" | Invalid connection_space_id | Verify space exists and user is member |
| "violates check constraint" | Invalid status value | Use only: active, completed, archived, on_hold |
| "null value in column \"title\"" | Missing required field | Ensure title is provided |

## Monitoring & Maintenance

### Useful Queries

```sql
-- Projects due this week
SELECT * FROM project_progress
WHERE user_id = auth.uid()
  AND target_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND project_status = 'active'
ORDER BY target_date ASC;

-- Projects with high urgency
SELECT * FROM project_progress
WHERE user_id = auth.uid()
  AND urgent_percentage > 50
  AND project_status = 'active';

-- Stalled projects (no recent activity)
SELECT * FROM project_progress
WHERE user_id = auth.uid()
  AND project_status = 'active'
  AND updated_at < NOW() - INTERVAL '2 weeks';

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('task_projects', 'work_items')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backward Compatibility

This migration is **100% backward compatible**:
- Existing `work_items` data is unaffected
- `project_id` column is nullable
- Tasks without projects continue to work normally
- No data modifications during migration

## Next Steps

1. ✅ Migration created: `20251215_task_projects_mini_project_manager.sql`
2. Apply migration: `supabase db push`
3. Implement `taskProjectService.ts` with full CRUD operations
4. Create React components for UI:
   - `TaskProjectCard.tsx` - Display project with progress
   - `TaskProjectList.tsx` - List all projects
   - `ProjectDetailView.tsx` - Full project details
   - `CreateProjectModal.tsx` - New project form
5. Add project navigation to main menu
6. Implement work item assignment to projects

## Related Documentation

- Database Architecture: `/docs/architecture/backend_architecture.md`
- Connection Archetypes: `/docs/migrations/20251214000000_connection_archetypes_base.sql`
- Work Items Schema: `/docs/migrations/20251208_create_work_items_table.sql`
