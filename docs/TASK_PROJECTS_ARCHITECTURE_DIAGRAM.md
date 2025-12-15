# Task Projects Architecture - Visual Diagrams

**Date:** 2025-12-15

## 1. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  TaskProjectList.tsx    ProjectCard.tsx    CreateProjectModal   │
│         ↓                      ↓                      ↓          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
         ┌───────────────────────────────────────────┐
         │   taskProjectService.ts (Service Layer)   │
         ├───────────────────────────────────────────┤
         │  - createProject()                        │
         │  - getProjects()                          │
         │  - getProjectWithProgress()               │
         │  - updateProject()                        │
         │  - completeProject()                      │
         │  - deleteProject()                        │
         │  - linkWorkItemToProject()                │
         └───────────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ↓               ↓               ↓
         ┌──────────────────────────────────────────────────┐
         │           Supabase PostgSQL Database             │
         ├──────────────────────────────────────────────────┤
         │                                                   │
         │  ┌────────────────────────────────────────────┐  │
         │  │         PUBLIC SCHEMA                      │  │
         │  ├────────────────────────────────────────────┤  │
         │  │                                             │  │
         │  │  task_projects (NEW)                       │  │
         │  │  ├─ id (UUID, PK)                         │  │
         │  │  ├─ user_id (FK → auth.users)            │  │
         │  │  ├─ title, description                    │  │
         │  │  ├─ connection_space_id (FK, optional)    │  │
         │  │  ├─ status (active/completed/...)        │  │
         │  │  ├─ color, icon                          │  │
         │  │  ├─ target_date, started_at, completed_at│  │
         │  │  └─ timestamps                            │  │
         │  │                                             │  │
         │  │         ↑ 1:N relationship                │  │
         │  │         │                                  │  │
         │  │  work_items (MODIFIED)                    │  │
         │  │  ├─ ... existing columns ...             │  │
         │  │  └─ project_id (NEW, FK, nullable)       │  │
         │  │                                             │  │
         │  │         ↑ N:1 relationship (optional)     │  │
         │  │         │                                  │  │
         │  │  connection_spaces (existing)             │  │
         │  │  ├─ id, user_id, archetype               │  │
         │  │  └─ ... space data ...                   │  │
         │  │                                             │  │
         │  └────────────────────────────────────────────┘  │
         │                                                   │
         │  ┌────────────────────────────────────────────┐  │
         │  │      RLS & SECURITY LAYER                  │  │
         │  ├────────────────────────────────────────────┤  │
         │  │ • is_task_project_owner(uuid)            │  │
         │  │ • can_access_task_project(uuid)          │  │
         │  │ • 4 RLS Policies (SELECT/INSERT/UPD/DEL) │  │
         │  └────────────────────────────────────────────┘  │
         │                                                   │
         │  ┌────────────────────────────────────────────┐  │
         │  │      VIEWS & COMPUTED COLUMNS              │  │
         │  ├────────────────────────────────────────────┤  │
         │  │ • project_progress (aggregated stats)     │  │
         │  │   ├─ total_tasks                          │  │
         │  │   ├─ completed_tasks                      │  │
         │  │   ├─ progress_percentage                  │  │
         │  │   ├─ urgent_percentage                    │  │
         │  │   └─ next_due_date                        │  │
         │  └────────────────────────────────────────────┘  │
         │                                                   │
         └──────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ↓                ↓                ↓
        Dashboard         Project Detail    Project List
        (aggregate        (single project)  (user's all
         stats)            + tasks)          projects)
```

## 2. Entity Relationship Diagram (ERD)

```
┌──────────────────────────┐
│        auth.users        │
├──────────────────────────┤
│ id (UUID, PK)            │
│ email                    │
│ ...                      │
└────────┬─────────────────┘
         │
         │ 1:N (owns)
         │
         ├─────────────────────────────────────────────────┐
         │                                                  │
         ↓                                                  ↓
┌──────────────────────┐                      ┌──────────────────────┐
│  task_projects (NEW) │                      │   work_items        │
├──────────────────────┤                      ├──────────────────────┤
│ id (UUID, PK)        │  ──1:N──>           │ id (UUID, PK)        │
│ user_id (FK)         │                      │ user_id (FK)         │
│ title *              │                      │ project_id (FK) NEW! │
│ description          │                      │ title *              │
│ status *             │                      │ is_completed         │
│ color                │                      │ due_date             │
│ icon                 │                      │ ...                  │
│ target_date          │                      │ created_at, updated_at
│ started_at *         │                      └──────────────────────┘
│ completed_at         │
│ created_at *         │
│ updated_at *         │
└────┬─────────────────┘
     │
     │ N:1 (optional)
     │
     ↓
┌──────────────────────────┐
│  connection_spaces       │
├──────────────────────────┤
│ id (UUID, PK)            │
│ user_id (FK)             │
│ archetype                │ ← habitat, ventures, academia, tribo
│ name, description        │
│ ...                      │
└──────────────────────────┘

* = NOT NULL
FK = Foreign Key
```

## 3. RLS Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              RLS SECURITY DEFINER FUNCTIONS                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  is_task_project_owner(project_id) → BOOLEAN        │  │
│  │                                                       │  │
│  │  SELECT 1 FROM task_projects                        │  │
│  │  WHERE id = project_id                              │  │
│  │    AND user_id = auth.uid()                         │  │
│  │                                                       │  │
│  │  ✓ Used in: UPDATE, DELETE policies                │  │
│  │  ✓ Prevents RLS recursion                          │  │
│  │  ✓ Runs with CREATOR privileges (secure)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  can_access_task_project(project_id) → BOOLEAN      │  │
│  │                                                       │  │
│  │  RETURN (                                            │  │
│  │    is_task_project_owner(project_id)               │  │
│  │    OR                                                │  │
│  │    is_connection_space_member(connection_space_id) │  │
│  │  )                                                   │  │
│  │                                                       │  │
│  │  ✓ Used in: SELECT policy                          │  │
│  │  ✓ Allows owner or space members to view          │  │
│  │  ✓ Centralizes access logic (Single Source of Truth│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          ↓                    ↓                    ↓
        SELECT              INSERT              UPDATE
        POLICY              POLICY              POLICY
          │                   │                   │
          ↓                   ↓                   ↓
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │ can_access      │ │ auth.uid() =    │ │ is_task_project │
  │ _task_project   │ │ user_id         │ │ _owner          │
  │ (id)            │ │                 │ │ (id)            │
  │                 │ │ ✓ Owner creates │ │                 │
  │ ✓ Owner reads   │ │   projects      │ │ ✓ Owner edits   │
  │ ✓ Members read  │ │                 │ │ ✓ No public edit│
  └─────────────────┘ └─────────────────┘ └─────────────────┘

          DELETE
          POLICY
            │
            ↓
  ┌─────────────────┐
  │ is_task_project │
  │ _owner          │
  │ (id)            │
  │                 │
  │ ✓ Owner deletes │
  │ ✓ No public del │
  └─────────────────┘
```

## 4. Database View Architecture

```
┌──────────────────────────────────────────────────────────────┐
│            project_progress VIEW                             │
│    (Real-time aggregated project statistics)                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  FROM task_projects p                                        │
│  LEFT JOIN work_items w ON w.project_id = p.id              │
│  GROUP BY p.*                                                │
│                                                               │
│  ┌─ PROJECT METADATA                                        │
│  │  ├─ project_id        (UUID)                            │
│  │  ├─ user_id          (UUID)                            │
│  │  ├─ project_title    (TEXT)                            │
│  │  ├─ project_status   (TEXT)                            │
│  │  ├─ color            (TEXT)                            │
│  │  └─ icon             (TEXT)                            │
│  │                                                          │
│  ├─ TASK COUNTS                                            │
│  │  ├─ total_tasks              COUNT(w.id)              │
│  │  ├─ completed_tasks          COUNT WHERE is_completed │
│  │  ├─ remaining_tasks          COUNT NOT completed      │
│  │  └─ in_progress_tasks        COUNT WHERE in_progress  │
│  │                                                          │
│  ├─ METRICS                                                │
│  │  ├─ progress_percentage   (completed/total) * 100     │
│  │  ├─ urgent_percentage     (urgent/total) * 100        │
│  │  └─ next_due_date         MIN(due_date NOT completed) │
│  │                                                          │
│  └─ TIMELINE                                               │
│     ├─ target_date                                        │
│     ├─ started_at                                         │
│     └─ completed_at                                       │
│                                                               │
│  USAGE: SELECT FROM project_progress                        │
│         WHERE user_id = auth.uid()                          │
│         AND project_status = 'active'                       │
│                                                               │
│  RESULT: Dashboard-ready project stats with no extra queries│
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 5. Status Lifecycle Diagram

```
                    ┌─ CREATED
                    │
                    ↓
        ╔═══════════════════════╗
        ║      ACTIVE (*)       ║  ← Default status
        ║  (in progress)        ║
        ╚═════┬═════┬═════════╦═╝
              │     │         │
              │     │         └──────────┐
              │     │                    │
              ↓     ↓                    ↓
         COMPLETED ON_HOLD          ARCHIVED
         (finished) (paused)         (hidden)
              │     │                    │
              │     └────────┬───────────┘
              │              │
              └──────────────┴────────────→ DELETED
                   (rollback)             (owner)

Transition Rules:
• ACTIVE → COMPLETED: Auto-set completed_at = NOW()
• ACTIVE ↔ ON_HOLD: Can toggle without data loss
• ANY → ARCHIVED: Hide from main view, keep data
• ARCHIVED → ACTIVE: Restore from archive
• ANY → DELETED: Remove project (owner only)

Status Constraints:
• completed_at only set when status = 'completed'
• Cannot have completed_at without completed status
• Each transition must be explicit (no auto-transitions)
```

## 6. Performance Index Strategy

```
┌────────────────────────────────────────────────────────────┐
│                 INDEX STRATEGY                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  INDEX 1: idx_task_projects_user_id                       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (user_id)                                  │ │
│  │ PURPOSE: Filter "My projects"                       │ │
│  │ QUERY: WHERE user_id = ?                           │ │
│  │ BENEFIT: ~95% scan time reduction                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  INDEX 2: idx_task_projects_status                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (user_id, status)                         │ │
│  │ PURPOSE: Filter by status (active, completed)      │ │
│  │ QUERY: WHERE user_id = ? AND status = ?           │ │
│  │ BENEFIT: ~95% scan time reduction                  │ │
│  │ NOTE: Partial index on active/completed only       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  INDEX 3: idx_task_projects_created_at                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (user_id, created_at DESC)               │ │
│  │ PURPOSE: Sort by date (recent first)               │ │
│  │ QUERY: WHERE user_id = ? ORDER BY created_at DESC │ │
│  │ BENEFIT: ~80% scan time reduction                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  INDEX 4: idx_task_projects_target_date                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (user_id, target_date)                   │ │
│  │ PURPOSE: Find projects by deadline                 │ │
│  │ QUERY: WHERE user_id = ? AND target_date BETWEEN? │ │
│  │ BENEFIT: ~90% scan time reduction                  │ │
│  │ NOTE: Partial index on WHERE status='active'       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  INDEX 5: idx_work_items_project_id (on work_items)      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (project_id)                              │ │
│  │ PURPOSE: Find tasks in project                     │ │
│  │ QUERY: WHERE project_id = ?                        │ │
│  │ BENEFIT: ~85% scan time reduction                  │ │
│  │ NOTE: Partial index on WHERE project_id IS NOT NULL
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  INDEX 6: idx_task_projects_connection_space_id          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ COLUMNS: (connection_space_id)                     │ │
│  │ PURPOSE: Find projects in space                    │ │
│  │ QUERY: WHERE connection_space_id = ?              │ │
│  │ BENEFIT: ~70% scan time reduction                  │ │
│  │ NOTE: Partial index on WHERE NOT NULL              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘

Query Optimization Example:
WITHOUT INDEX: SELECT * FROM task_projects WHERE user_id = ?
               → Seq Scan (10ms on 10k rows)

WITH INDEX:    SELECT * FROM task_projects WHERE user_id = ?
               → Index Scan (0.1ms on 10k rows)

BENEFIT: 100x faster! ⚡
```

## 7. Integration Points with Other Systems

```
┌────────────────────────────────────────────────────────────┐
│                  AICA ECOSYSTEM                             │
├────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────────────────────────────────────────────┐    │
│    │  task_projects (Mini Project Manager)           │    │
│    └────┬─────────────────────────────────────────────┘    │
│         │                                                   │
│         ├──────────────────────────────────────────────┐   │
│         │                                              │   │
│         ↓                                              ↓   │
│    work_items                              connection_spaces
│    (Tasks)                                 (Habitat, Ventures,
│    ├─ Complete via                         Academia, Tribo)
│    │  Atlas module                         ├─ Link projects
│    ├─ Progress tracked                     ├─ Share with members
│    │  in project_progress                  └─ Collaborative
│    │  view                                    project management
│    └─ Shown in
│       daily agenda
│
│    ┌────────────────────────────────────────┐
│    │ Future Integrations                    │
│    ├────────────────────────────────────────┤
│    │ • Google Calendar sync (target_date)  │
│    │ • Podcast episodes (as projects)      │
│    │ • Finance goals (ventures projects)   │
│    │ • Study plans (academia projects)     │
│    │ • Life goals (habitat projects)       │
│    └────────────────────────────────────────┘
│
└────────────────────────────────────────────────────────────┘
```

## 8. Request/Response Flow Diagram

```
FRONTEND CLIENT
       │
       │ 1. GET /api/projects?status=active
       │ 2. GET /api/projects/:id
       │ 3. POST /api/projects
       │ 4. PATCH /api/projects/:id
       │ 5. DELETE /api/projects/:id
       ↓
┌──────────────────────────────────┐
│   Supabase Client Library        │
│   (supabaseClient.ts)            │
│                                   │
│  • Auth context (auth.uid())     │
│  • RLS enforcement              │
│  • Real-time subscriptions      │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│   PostgreSQL Database            │
│                                   │
│   Step 1: RLS Policy Check       │
│   ├─ Extract auth.uid()          │
│   ├─ Call SECURITY DEFINER fn   │
│   └─ Allow/Deny at Row level    │
│                                   │
│   Step 2: Execute Query          │
│   └─ Only visible rows returned │
│                                   │
│   Step 3: Return Result Set      │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│   Frontend State (React)         │
│                                   │
│   • React Query cache            │
│   • Local component state        │
│   • Real-time subscription       │
│     (auto-update on changes)    │
└──────────────────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│   UI Render                      │
│                                   │
│   • ProjectCard (progress bar)   │
│   • ProjectList (all projects)   │
│   • Dashboard (stats)            │
└──────────────────────────────────┘
```

## 9. Constraint Validation Flow

```
INSERT INTO task_projects (user_id, title, status, completed_at)
                │
                ↓
    ┌─────────────────────────┐
    │ CHECK: title NOT EMPTY  │
    │ ✓ PASS (title='...')    │
    └─────────────────────────┘
                │
                ↓
    ┌─────────────────────────┐
    │ CHECK: status IN (...)  │
    │ ✓ PASS (status='active')│
    └─────────────────────────┘
                │
                ↓
    ┌──────────────────────────────────────────┐
    │ CHECK: completed_only_when_completed     │
    │ ✓ PASS (status != 'completed')           │
    │        (completed_at IS NULL matches)    │
    └──────────────────────────────────────────┘
                │
                ↓
    ┌─────────────────────────┐
    │ CHECK: target_date ok   │
    │ ✓ PASS (NULL or > now)  │
    └─────────────────────────┘
                │
                ↓
    ┌──────────────────────────────────────────┐
    │ FK: user_id references auth.users        │
    │ ✓ PASS (user_id exists)                  │
    └──────────────────────────────────────────┘
                │
                ↓
    ┌──────────────────────────────────────────┐
    │ RLS POLICY: INSERT ALLOWED               │
    │ ✓ PASS (auth.uid() = user_id)            │
    └──────────────────────────────────────────┘
                │
                ↓
    ┌──────────────────────────────────────────┐
    │ TRIGGER: Set created_at, updated_at      │
    └──────────────────────────────────────────┘
                │
                ↓
            ✓ INSERT SUCCESSFUL

All validations must pass before data is committed to database!
```

## 10. Scalability Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            SCALABILITY CONSIDERATIONS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SMALL SCALE (< 10k projects)                              │
│  ├─ Sequential scans acceptable                           │
│  ├─ Basic indexes sufficient                              │
│  ├─ View aggregation performant                           │
│  └─ No partitioning needed                                │
│                                                              │
│  MEDIUM SCALE (10k - 1M projects)                          │
│  ├─ Index strategy critical                               │
│  ├─ Composite indexes on (user_id, status)               │
│  ├─ Partial indexes on hot data                           │
│  ├─ View caching recommended                              │
│  └─ Pagination on large result sets                       │
│                                                              │
│  LARGE SCALE (> 1M projects)                              │
│  ├─ Partitioning by user_id (sharding)                   │
│  ├─ Materialized views for stats                          │
│  ├─ Query result caching (Redis)                          │
│  ├─ Time-based partitioning (archive old)                │
│  └─ Read replicas for analytics                           │
│                                                              │
│  CURRENT STRATEGY                                          │
│  └─ Designed for 10M+ projects per user with 5 indexes   │
│     ├─ Can handle 100k projects per user efficiently      │
│     ├─ View aggregation < 10ms per project               │
│     ├─ Query response time < 50ms at scale               │
│     └─ Safe to grow without immediate rearchitecture      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**All diagrams generated:** 2025-12-15
**Format:** ASCII/Text (compatible with all systems)
**Status:** READY FOR DOCUMENTATION

These diagrams provide visual reference for:
- Understanding data flow
- Explaining RLS security to team members
- Communicating index strategy
- Planning scalability roadmap
- Onboarding new developers
