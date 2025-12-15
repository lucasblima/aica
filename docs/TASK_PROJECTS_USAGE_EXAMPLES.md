# Task Projects - Usage Examples & SQL Patterns

**Last Updated:** 2025-12-15

## SQL Query Examples

### 1. Create a New Project

```sql
-- Create a personal project
INSERT INTO task_projects (
    user_id,
    title,
    description,
    color,
    icon,
    target_date
) VALUES (
    auth.uid(),
    'Q1 2026 Goals',
    'Quarterly objectives for first quarter',
    '#8B5CF6',  -- Purple
    '🎯',
    '2026-03-31'::timestamptz
)
RETURNING *;
```

### 2. Create a Team Project (Linked to Connection Space)

```sql
-- Create a project for a Habitat (family) or Ventures (business)
INSERT INTO task_projects (
    user_id,
    title,
    description,
    connection_space_id,
    color,
    icon,
    target_date
) VALUES (
    auth.uid(),
    'Family Vacation Planning',
    'Organizing summer 2026 vacation',
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'::uuid,  -- Connection space ID
    '#06B6D4',  -- Cyan
    '🏖️',
    '2026-07-31'::timestamptz
)
RETURNING id, title, status;
```

### 3. Link a Work Item to a Project

```sql
-- Add existing task to project
UPDATE work_items
SET project_id = '11111111-2222-3333-4444-555555555555'::uuid
WHERE id = '66666666-7777-8888-9999-000000000000'::uuid
RETURNING id, title, project_id;
```

### 4. View Project Progress

```sql
-- Get real-time project statistics
SELECT
    project_id,
    project_title,
    project_status,
    total_tasks,
    completed_tasks,
    remaining_tasks,
    progress_percentage,
    urgent_percentage,
    next_due_date,
    target_date
FROM project_progress
WHERE user_id = auth.uid()
  AND project_status = 'active'
ORDER BY progress_percentage ASC;  -- Show most urgent first

-- Result example:
-- project_id             | project_title          | progress_percentage | remaining_tasks
-- a1b2c3d4-e5f6-g7h8... | Q1 Goals              | 25                  | 12
-- b2c3d4e5-f6g7-h8i9... | Renovation            | 50                  | 5
-- c3d4e5f6-g7h8-i9j0... | Learning Path         | 10                  | 18
```

### 5. Get All Active Projects with Progress

```sql
-- Dashboard query: All projects with metrics
SELECT
    p.id,
    p.title,
    p.description,
    p.color,
    p.icon,
    pp.total_tasks,
    pp.completed_tasks,
    pp.progress_percentage,
    pp.remaining_tasks,
    pp.urgent_percentage,
    CASE
        WHEN pp.target_date < NOW() THEN 'OVERDUE'
        WHEN pp.target_date < NOW() + INTERVAL '7 days' THEN 'DUE_SOON'
        ELSE 'ON_TRACK'
    END as deadline_status,
    pp.target_date,
    EXTRACT(DAY FROM pp.target_date - NOW())::integer as days_remaining
FROM task_projects p
JOIN project_progress pp ON p.id = pp.project_id
WHERE p.user_id = auth.uid()
  AND p.status = 'active'
ORDER BY
    CASE
        WHEN pp.target_date < NOW() THEN 0  -- Overdue first
        WHEN pp.target_date < NOW() + INTERVAL '7 days' THEN 1  -- Due soon
        ELSE 2  -- On track
    END,
    pp.target_date ASC;
```

### 6. Update Project Status

```sql
-- Mark project as completed
UPDATE task_projects
SET
    status = 'completed',
    completed_at = NOW()
WHERE id = 'project-uuid'
  AND user_id = auth.uid()
RETURNING id, title, status, completed_at;

-- Pause project (on_hold)
UPDATE task_projects
SET status = 'on_hold'
WHERE id = 'project-uuid'
  AND user_id = auth.uid()
RETURNING id, title, status;

-- Archive project
UPDATE task_projects
SET status = 'archived'
WHERE id = 'project-uuid'
  AND user_id = auth.uid()
RETURNING id, title, status;
```

### 7. Find Projects with Specific Criteria

```sql
-- Projects due this month
SELECT p.*, pp.progress_percentage
FROM task_projects p
JOIN project_progress pp ON p.id = pp.project_id
WHERE p.user_id = auth.uid()
  AND p.status = 'active'
  AND p.target_date >= DATE_TRUNC('month', NOW())
  AND p.target_date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
ORDER BY p.target_date ASC;

-- Overdue projects
SELECT p.*, pp.completed_tasks, pp.total_tasks
FROM task_projects p
JOIN project_progress pp ON p.id = pp.project_id
WHERE p.user_id = auth.uid()
  AND p.status = 'active'
  AND p.target_date < NOW()
ORDER BY p.target_date ASC;

-- Stalled projects (no task updates in 2 weeks)
SELECT p.*, pp.progress_percentage
FROM task_projects p
LEFT JOIN project_progress pp ON p.id = pp.project_id
WHERE p.user_id = auth.uid()
  AND p.status = 'active'
  AND p.updated_at < NOW() - INTERVAL '14 days'
ORDER BY p.updated_at ASC;
```

### 8. Remove Work Item from Project

```sql
-- Unlink task from project (keep task, just remove project link)
UPDATE work_items
SET project_id = NULL
WHERE id = 'task-uuid'
  AND user_id = auth.uid()
RETURNING id, title, project_id;
```

### 9. Delete a Project (and its associations)

```sql
-- Unlink all tasks in project (they remain, just lose project_id)
UPDATE work_items
SET project_id = NULL
WHERE project_id = 'project-uuid'
  AND user_id = auth.uid();

-- Delete the project
DELETE FROM task_projects
WHERE id = 'project-uuid'
  AND user_id = auth.uid()
RETURNING id, title;
```

### 10. Bulk Operations

```sql
-- Batch-update project color/icon from list
UPDATE task_projects
SET
    color = '#FF6B6B',
    icon = '🔴',
    updated_at = NOW()
WHERE user_id = auth.uid()
  AND id = ANY(ARRAY['id1', 'id2', 'id3']::uuid[])
RETURNING id, title, color, icon;

-- Complete multiple projects at once
UPDATE task_projects
SET
    status = 'completed',
    completed_at = NOW()
WHERE user_id = auth.uid()
  AND status = 'active'
  AND id = ANY(ARRAY['id1', 'id2']::uuid[])
RETURNING id, title, status;
```

## TypeScript Service Implementation

### taskProjectService.ts

```typescript
import { supabase } from './supabaseClient';

export interface TaskProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  connection_space_id?: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  color: string;
  icon: string;
  target_date?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectProgress {
  project_id: string;
  user_id: string;
  project_title: string;
  project_status: string;
  color: string;
  icon: string;
  total_tasks: number;
  completed_tasks: number;
  remaining_tasks: number;
  in_progress_tasks: number;
  progress_percentage: number;
  urgent_percentage?: number;
  next_due_date?: string;
  target_date?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const taskProjectService = {
  /**
   * Create a new project
   */
  async createProject(
    title: string,
    options?: {
      description?: string;
      connectionSpaceId?: string;
      targetDate?: Date;
      color?: string;
      icon?: string;
    }
  ): Promise<TaskProject> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('task_projects')
      .insert({
        user_id: user.data.user.id,
        title,
        description: options?.description,
        connection_space_id: options?.connectionSpaceId,
        target_date: options?.targetDate?.toISOString(),
        color: options?.color ?? '#3B82F6',
        icon: options?.icon ?? '📋',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return data as TaskProject;
  },

  /**
   * Get all projects for current user
   */
  async getProjects(status?: 'active' | 'completed' | 'archived' | 'on_hold') {
    let query = supabase.from('task_projects').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
    return (data ?? []) as TaskProject[];
  },

  /**
   * Get single project with progress metrics
   */
  async getProjectWithProgress(projectId: string): Promise<{
    project: TaskProject;
    progress: ProjectProgress;
  }> {
    const [projectRes, progressRes] = await Promise.all([
      supabase.from('task_projects').select('*').eq('id', projectId).single(),
      supabase.from('project_progress').select('*').eq('project_id', projectId).single(),
    ]);

    if (projectRes.error) throw new Error(`Failed to fetch project: ${projectRes.error.message}`);
    if (progressRes.error) throw new Error(`Failed to fetch progress: ${progressRes.error.message}`);

    return {
      project: projectRes.data as TaskProject,
      progress: progressRes.data as ProjectProgress,
    };
  },

  /**
   * Update project details
   */
  async updateProject(
    projectId: string,
    updates: Partial<Omit<TaskProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<TaskProject> {
    const { data, error } = await supabase
      .from('task_projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return data as TaskProject;
  },

  /**
   * Mark project as completed
   */
  async completeProject(projectId: string): Promise<TaskProject> {
    return this.updateProject(projectId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  },

  /**
   * Archive project (hide from main view)
   */
  async archiveProject(projectId: string): Promise<TaskProject> {
    return this.updateProject(projectId, {
      status: 'archived',
    });
  },

  /**
   * Delete project (owner only)
   */
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase.from('task_projects').delete().eq('id', projectId);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  },

  /**
   * Link work item to project
   */
  async linkWorkItemToProject(workItemId: string, projectId: string) {
    const { data, error } = await supabase
      .from('work_items')
      .update({ project_id: projectId })
      .eq('id', workItemId)
      .select()
      .single();

    if (error) throw new Error(`Failed to link work item: ${error.message}`);
    return data;
  },

  /**
   * Remove work item from project
   */
  async removeWorkItemFromProject(workItemId: string) {
    const { data, error } = await supabase
      .from('work_items')
      .update({ project_id: null })
      .eq('id', workItemId)
      .select()
      .single();

    if (error) throw new Error(`Failed to remove work item: ${error.message}`);
    return data;
  },

  /**
   * Get all work items for a project
   */
  async getProjectWorkItems(projectId: string) {
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch work items: ${error.message}`);
    return (data ?? []) as any[];
  },

  /**
   * Get projects by archetype (for connection spaces)
   */
  async getProjectsByArchetype(archetype: 'habitat' | 'ventures' | 'academia' | 'tribo') {
    const { data, error } = await supabase
      .from('task_projects')
      .select(
        `
        *,
        connection_spaces!inner (
          archetype
        )
      `
      )
      .eq('connection_spaces.archetype', archetype)
      .eq('status', 'active');

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
    return (data ?? []) as TaskProject[];
  },

  /**
   * Subscribe to project updates in real-time
   */
  subscribeToProjectUpdates(projectId: string, callback: (project: TaskProject) => void) {
    return supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new as TaskProject);
          }
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to work item changes for a project
   */
  subscribeToProjectWorkItems(projectId: string, callback: (items: any[]) => void) {
    return supabase
      .channel(`project-items:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_items',
          filter: `project_id=eq.${projectId}`,
        },
        async () => {
          // Re-fetch all items when any change
          const items = await this.getProjectWorkItems(projectId);
          callback(items);
        }
      )
      .subscribe();
  },
};
```

## React Hook Examples

### useTaskProject Hook

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskProjectService, TaskProject, ProjectProgress } from '../services/taskProjectService';

export function useTaskProject(projectId: string) {
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const response = await taskProjectService.getProjectWithProgress(projectId);
      return response.project;
    },
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['projects', projectId, 'progress'],
    queryFn: async () => {
      const response = await taskProjectService.getProjectWithProgress(projectId);
      return response.progress;
    },
  });

  const { data: workItems } = useQuery({
    queryKey: ['projects', projectId, 'items'],
    queryFn: () => taskProjectService.getProjectWorkItems(projectId),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => taskProjectService.updateProject(projectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => taskProjectService.completeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskProjectService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    project,
    progress,
    workItems,
    projectLoading,
    progressLoading,
    updateProject: updateMutation.mutate,
    completeProject: completeMutation.mutate,
    deleteProject: deleteMutation.mutate,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

## Component Example

### ProjectCard Component

```typescript
import { useTaskProject } from '../hooks/useTaskProject';

export function ProjectCard({ projectId }: { projectId: string }) {
  const { project, progress, isUpdating, completeProject } = useTaskProject(projectId);

  if (!project || !progress) return <div>Loading...</div>;

  const daysRemaining = project.target_date
    ? Math.ceil((new Date(project.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className="project-card" style={{ borderLeft: `4px solid ${project.color}` }}>
      <div className="project-header">
        <h3>
          {project.icon} {project.title}
        </h3>
        <span className={`status ${project.status}`}>{project.status}</span>
      </div>

      {project.description && <p className="description">{project.description}</p>}

      <div className="progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.progress_percentage}%` }} />
        </div>
        <p className="progress-text">
          {progress.completed_tasks} / {progress.total_tasks} tasks
          ({progress.progress_percentage}%)
        </p>
      </div>

      <div className="metrics">
        <span className="metric">
          📍 {progress.remaining_tasks} remaining
        </span>
        {progress.next_due_date && (
          <span className="metric">
            📅 Due {new Date(progress.next_due_date).toLocaleDateString()}
          </span>
        )}
        {daysRemaining !== null && (
          <span className={`metric ${isOverdue ? 'overdue' : ''}`}>
            ⏱️ {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
          </span>
        )}
      </div>

      {project.status === 'active' && (
        <button onClick={() => completeProject()} disabled={isUpdating} className="btn-complete">
          Mark Complete
        </button>
      )}
    </div>
  );
}
```

## Real-Time Subscription Example

```typescript
import { useEffect, useState } from 'react';
import { taskProjectService } from '../services/taskProjectService';

export function ProjectLiveUpdates({ projectId }: { projectId: string }) {
  const [project, setProject] = useState(null);

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = taskProjectService.subscribeToProjectUpdates(projectId, (updatedProject) => {
      setProject(updatedProject);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [projectId]);

  return (
    <div className="project-live">
      {project && <h2>{project.title} (live updates)</h2>}
    </div>
  );
}
```

## Testing Examples

### Vitest Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { taskProjectService } from './taskProjectService';

describe('Task Project Service', () => {
  let projectId: string;

  describe('Create', () => {
    it('should create a new project', async () => {
      const project = await taskProjectService.createProject('Test Project', {
        color: '#FF0000',
        icon: '🚀',
      });

      expect(project).toHaveProperty('id');
      expect(project.title).toBe('Test Project');
      expect(project.status).toBe('active');
      projectId = project.id;
    });
  });

  describe('Read', () => {
    it('should fetch project with progress', async () => {
      const { project, progress } = await taskProjectService.getProjectWithProgress(projectId);

      expect(project.id).toBe(projectId);
      expect(progress).toHaveProperty('total_tasks');
      expect(progress).toHaveProperty('progress_percentage');
    });
  });

  describe('Update', () => {
    it('should update project title', async () => {
      const updated = await taskProjectService.updateProject(projectId, {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
    });

    it('should complete project', async () => {
      const completed = await taskProjectService.completeProject(projectId);

      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeDefined();
    });
  });

  describe('Delete', () => {
    it('should delete project', async () => {
      await taskProjectService.deleteProject(projectId);

      // Attempt to fetch should fail or return empty
      const projects = await taskProjectService.getProjects();
      expect(projects.find((p) => p.id === projectId)).toBeUndefined();
    });
  });

  describe('Work Item Association', () => {
    it('should link work item to project', async () => {
      const workItemId = 'some-work-item-id';
      const result = await taskProjectService.linkWorkItemToProject(workItemId, projectId);

      expect(result.project_id).toBe(projectId);
    });
  });
});
```

## Performance Optimization Tips

### 1. Use Indexes Efficiently

```typescript
// Good: Uses indexed columns
SELECT * FROM task_projects
WHERE user_id = ? AND status = 'active'
ORDER BY created_at DESC;

// Less efficient: Doesn't use status index
SELECT * FROM task_projects
WHERE user_id = ?
ORDER BY updated_at DESC;
```

### 2. Batch Operations

```typescript
// Efficient: Single query for multiple projects
const projects = await supabase
  .from('task_projects')
  .select('*')
  .in('id', [id1, id2, id3]);

// Less efficient: N+1 queries
for (const id of [id1, id2, id3]) {
  const project = await supabase
    .from('task_projects')
    .select('*')
    .eq('id', id);
}
```

### 3. Use Computed View for Complex Aggregations

```typescript
// Good: Single view query with all calculations
const progress = await supabase
  .from('project_progress')
  .select('*')
  .eq('project_id', projectId);

// Less efficient: Manual calculation in application
const project = await getProject(projectId);
const workItems = await getWorkItems(projectId);
const completed = workItems.filter(w => w.is_completed).length;
const total = workItems.length;
const percentage = (completed / total) * 100;
```

---

**Last Updated:** 2025-12-15
**Next Review:** 2026-01-15
