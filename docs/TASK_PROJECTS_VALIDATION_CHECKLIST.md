# Task Projects - Migration Validation Checklist

**Status:** Pre-Deployment Verification
**Date:** 2025-12-15

## Part 1: Schema Verification

### Table Creation
```sql
-- Verify task_projects table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'task_projects'
        AND table_schema = 'public'
) as table_exists;
-- Expected: true
```

### Column Verification
```sql
-- Check all required columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'task_projects'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, not null)
-- user_id (uuid, not null)
-- title (text, not null)
-- description (text, nullable)
-- connection_space_id (uuid, nullable)
-- status (text, not null, default 'active')
-- color (text, not null, default '#3B82F6')
-- icon (text, not null, default '📋')
-- target_date (timestamp with timezone, nullable)
-- started_at (timestamp with timezone, not null)
-- completed_at (timestamp with timezone, nullable)
-- created_at (timestamp with timezone, not null)
-- updated_at (timestamp with timezone, not null)
```

### work_items Modification
```sql
-- Verify project_id column added to work_items
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items'
        AND column_name = 'project_id'
        AND table_schema = 'public'
) as project_id_exists;
-- Expected: true

-- Verify column type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_items'
    AND column_name = 'project_id'
    AND table_schema = 'public';
-- Expected: project_id, uuid, YES
```

## Part 2: Constraint Verification

### NOT NULL Constraints
```sql
-- Verify NOT NULL constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'task_projects'
    AND table_schema = 'public'
ORDER BY constraint_type;

-- Expected: CHECK, FOREIGN KEY, PRIMARY KEY, UNIQUE constraints
```

### CHECK Constraints
```sql
-- Verify CHECK constraints exist
SELECT constraint_name
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
    AND constraint_name LIKE '%task_projects%'
ORDER BY constraint_name;

-- Expected constraints:
-- check_title_not_empty
-- check_status_valid
-- check_completed_only_when_completed
-- check_target_date_after_start
```

### Test CHECK Constraints
```sql
-- Test 1: Empty title should fail
BEGIN;
INSERT INTO task_projects (user_id, title, description)
VALUES ('uuid', '', 'desc');
-- Expected: ERROR - violates check constraint "check_title_not_empty"
ROLLBACK;

-- Test 2: Invalid status should fail
BEGIN;
INSERT INTO task_projects (user_id, title, status)
VALUES ('uuid', 'Test', 'invalid_status');
-- Expected: ERROR - violates check constraint "check_status_valid"
ROLLBACK;

-- Test 3: completed_at without completed status should fail
BEGIN;
INSERT INTO task_projects (user_id, title, status, completed_at)
VALUES ('uuid', 'Test', 'active', NOW());
-- Expected: ERROR - violates check constraint
ROLLBACK;

-- Test 4: target_date before started_at should fail
BEGIN;
INSERT INTO task_projects (user_id, title, started_at, target_date)
VALUES ('uuid', 'Test', NOW(), NOW() - INTERVAL '1 day');
-- Expected: ERROR - violates check constraint
ROLLBACK;
```

### Foreign Key Constraints
```sql
-- Verify foreign keys exist
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'task_projects'
    AND table_schema = 'public'
ORDER BY constraint_name;

-- Expected:
-- user_id references auth.users(id) ON DELETE CASCADE
-- connection_space_id references connection_spaces(id) ON DELETE SET NULL
```

## Part 3: Index Verification

### Index Existence
```sql
-- List all indexes on task_projects
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'task_projects'
    AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- idx_task_projects_user_id
-- idx_task_projects_connection_space_id
-- idx_task_projects_status
-- idx_task_projects_created_at
-- idx_task_projects_target_date
-- idx_work_items_project_id (on work_items table)
```

### Index Performance Test
```sql
-- Create test data
DO $$
DECLARE
    test_user_id UUID := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid;
    i INT;
BEGIN
    FOR i IN 1..100 LOOP
        INSERT INTO task_projects (user_id, title)
        VALUES (test_user_id, 'Test Project ' || i);
    END LOOP;
END $$;

-- Test index performance (should use index)
EXPLAIN (FORMAT JSON)
SELECT * FROM task_projects
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
    AND status = 'active'
ORDER BY created_at DESC;

-- Expected: Index Scan on idx_task_projects_status
```

## Part 4: RLS Verification

### RLS Enable Status
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'task_projects'
    AND schemaname = 'public';

-- Expected: rowsecurity = true
```

### RLS Policies Existence
```sql
-- List all RLS policies
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'task_projects'
    AND schemaname = 'public'
ORDER BY policyname;

-- Expected policies:
-- task_projects_delete
-- task_projects_insert
-- task_projects_select
-- task_projects_update
```

### Policy Verification
```sql
-- Verify each policy
SELECT
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'task_projects'
    AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Expected results:
-- SELECT: uses can_access_task_project()
-- INSERT: checks auth.uid() = user_id
-- UPDATE: uses is_task_project_owner()
-- DELETE: uses is_task_project_owner()
```

## Part 5: Function Verification

### Function Existence
```sql
-- Verify SECURITY DEFINER functions exist
SELECT
    routine_name,
    routine_definition,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE 'is_task_project%'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Expected:
-- is_task_project_owner
-- can_access_task_project
```

### Function Testing
```sql
-- Test is_task_project_owner function
SELECT is_task_project_owner('project-uuid'::uuid);
-- Expected: false (unless user owns that project)

-- Test can_access_task_project function
SELECT can_access_task_project('project-uuid'::uuid);
-- Expected: false (unless user owns or is member of space)
```

## Part 6: View Verification

### View Creation
```sql
-- Verify project_progress view exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'project_progress'
        AND table_schema = 'public'
) as view_exists;
-- Expected: true
```

### View Structure
```sql
-- Verify view columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_progress'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns:
-- project_id (uuid)
-- user_id (uuid)
-- project_title (text)
-- project_status (text)
-- color (text)
-- icon (text)
-- total_tasks (integer)
-- completed_tasks (integer)
-- remaining_tasks (integer)
-- in_progress_tasks (integer)
-- progress_percentage (integer)
-- urgent_percentage (integer)
-- next_due_date (date)
-- ... and timestamp columns
```

### View Query Test
```sql
-- Test view returns expected results
SELECT COUNT(*) FROM project_progress;
-- Expected: returns count without error

-- Test view calculates correctly
SELECT * FROM project_progress LIMIT 1;
-- Expected: all aggregation columns have valid values
```

## Part 7: Trigger Verification

### Trigger Existence
```sql
-- Verify updated_at trigger exists
SELECT trigger_name, event_manipulation, trigger_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table = 'task_projects'
    AND trigger_name LIKE '%updated_at%';

-- Expected: update_task_projects_updated_at BEFORE UPDATE
```

### Trigger Testing
```sql
-- Insert test record
INSERT INTO task_projects (user_id, title)
VALUES ('test-user-id'::uuid, 'Test Project')
RETURNING id, created_at, updated_at;

-- Wait 1 second and update
UPDATE task_projects
SET title = 'Updated Title'
WHERE user_id = 'test-user-id'::uuid;

-- Verify updated_at changed
SELECT id, created_at, updated_at
FROM task_projects
WHERE user_id = 'test-user-id'::uuid;
-- Expected: updated_at > created_at
```

## Part 8: Data Type & Default Testing

### Default Values
```sql
-- Test default values
INSERT INTO task_projects (user_id, title)
VALUES ('test-user'::uuid, 'Test Project')
RETURNING id, status, color, icon, started_at, created_at;

-- Expected:
-- status = 'active'
-- color = '#3B82F6'
-- icon = '📋'
-- started_at = NOW() (approximately)
-- created_at = NOW() (approximately)
```

### Nullable Fields
```sql
-- Test nullable fields
INSERT INTO task_projects (user_id, title)
VALUES ('test-user'::uuid, 'Test Project')
RETURNING id, description, connection_space_id, target_date, completed_at;

-- Expected: all nullable fields are NULL
```

## Part 9: Relationship Testing

### User-Project Relationship
```sql
-- Test FK constraint: invalid user_id should fail
BEGIN;
INSERT INTO task_projects (user_id, title)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Test');
-- Expected: ERROR - violates foreign key constraint
ROLLBACK;
```

### Connection Space Relationship
```sql
-- Test FK constraint: invalid connection_space_id should fail
BEGIN;
INSERT INTO task_projects (user_id, title, connection_space_id)
VALUES ('test-user'::uuid, 'Test', '00000000-0000-0000-0000-000000000000'::uuid);
-- Expected: ERROR - violates foreign key constraint
ROLLBACK;
```

### Work Item Relationship
```sql
-- Test FK on work_items: invalid project_id should fail
BEGIN;
UPDATE work_items
SET project_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE id = 'some-work-item'::uuid;
-- Expected: ERROR - violates foreign key constraint
ROLLBACK;
```

## Part 10: RLS Security Testing

### Test Setup
```sql
-- Create test users
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
BEGIN
    -- In real scenario, create via auth.users
    -- For testing: use existing test users
    user1_id := 'user1-uuid'::uuid;
    user2_id := 'user2-uuid'::uuid;
END $$;
```

### RLS SELECT Testing
```sql
-- As user1: Create project
SET ROLE authenticated;
SET app.user_id = 'user1-uuid';  -- Simulate auth context

INSERT INTO task_projects (user_id, title)
VALUES ('user1-uuid'::uuid, 'User 1 Project')
RETURNING id;

-- As user1: Can read own project
SELECT * FROM task_projects WHERE title = 'User 1 Project';
-- Expected: 1 row

-- As user2: Cannot read user1's project
SET app.user_id = 'user2-uuid';
SELECT * FROM task_projects WHERE title = 'User 1 Project';
-- Expected: 0 rows (RLS blocks)
```

### RLS INSERT Testing
```sql
-- As user2: Try to create as user1 (should fail)
BEGIN;
SET ROLE authenticated;
SET app.user_id = 'user2-uuid';

INSERT INTO task_projects (user_id, title)
VALUES ('user1-uuid'::uuid, 'Hack Attempt');
-- Expected: ERROR - violates row-level security policy
ROLLBACK;
```

### RLS UPDATE Testing
```sql
-- As user2: Try to update user1's project
BEGIN;
SET ROLE authenticated;
SET app.user_id = 'user2-uuid';

UPDATE task_projects
SET title = 'Hacked'
WHERE user_id = 'user1-uuid'::uuid;
-- Expected: ERROR - violates row-level security policy
ROLLBACK;
```

### RLS DELETE Testing
```sql
-- As user2: Try to delete user1's project
BEGIN;
SET ROLE authenticated;
SET app.user_id = 'user2-uuid';

DELETE FROM task_projects
WHERE user_id = 'user1-uuid'::uuid;
-- Expected: ERROR - violates row-level security policy
ROLLBACK;
```

## Part 11: Performance Baseline

### Query Performance
```sql
-- Baseline: List user's active projects
EXPLAIN ANALYZE
SELECT * FROM task_projects
WHERE user_id = 'test-user'::uuid
    AND status = 'active'
ORDER BY created_at DESC;
-- Expected: Index Scan, < 1ms with 1000 records

-- Baseline: Get project progress
EXPLAIN ANALYZE
SELECT * FROM project_progress
WHERE project_id = 'test-project'::uuid;
-- Expected: < 5ms

-- Baseline: Find projects by deadline
EXPLAIN ANALYZE
SELECT * FROM task_projects
WHERE user_id = 'test-user'::uuid
    AND target_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY target_date ASC;
-- Expected: Index Scan, < 2ms
```

## Part 12: Cleanup & Rollback Testing

### Cascading Delete Test
```sql
-- Create test data
INSERT INTO task_projects (user_id, title)
VALUES ('test-user'::uuid, 'Cascade Test')
RETURNING id into @project_id;

-- Create work items for this project
INSERT INTO work_items (user_id, project_id, title)
VALUES ('test-user'::uuid, @project_id, 'Task 1');

-- Delete project
DELETE FROM task_projects WHERE id = @project_id;

-- Verify work items still exist (SET NULL)
SELECT COUNT(*) FROM work_items WHERE project_id IS NULL;
-- Expected: 1 (FK has ON DELETE SET NULL)
```

## Deployment Readiness Checklist

- [ ] All schema verification tests pass
- [ ] All constraint tests pass
- [ ] All index tests pass
- [ ] RLS is enabled
- [ ] All RLS policies exist and work
- [ ] Functions are SECURITY DEFINER
- [ ] View returns expected results
- [ ] Trigger works correctly
- [ ] Default values correct
- [ ] All relationships work
- [ ] RLS security tests pass
- [ ] Performance baselines acceptable
- [ ] No unexpected errors in logs
- [ ] Documentation reviewed
- [ ] Staging environment tested
- [ ] Rollback procedure documented

## Quick Validation Command

Run this to verify everything in 30 seconds:

```sql
-- Check 1: Table exists
SELECT 'TABLE_EXISTS' as check, EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'task_projects'
) as result;

-- Check 2: Columns exist
SELECT 'COLUMNS_COUNT' as check,
    COUNT(*) as result
FROM information_schema.columns
WHERE table_name = 'task_projects'
    AND table_schema = 'public';
-- Expected: 13

-- Check 3: Indexes exist
SELECT 'INDEXES_COUNT' as check,
    COUNT(*) as result
FROM pg_indexes
WHERE tablename = 'task_projects'
    AND schemaname = 'public';
-- Expected: 5

-- Check 4: RLS enabled
SELECT 'RLS_ENABLED' as check,
    rowsecurity as result
FROM pg_tables
WHERE tablename = 'task_projects';
-- Expected: true

-- Check 5: Policies count
SELECT 'RLS_POLICIES' as check,
    COUNT(*) as result
FROM pg_policies
WHERE tablename = 'task_projects';
-- Expected: 4

-- Check 6: View exists
SELECT 'VIEW_EXISTS' as check,
    EXISTS(
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'project_progress'
    ) as result;

-- Check 7: Functions exist
SELECT 'FUNCTIONS_COUNT' as check,
    COUNT(*) as result
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE 'is_task_project%'
    AND routine_type = 'FUNCTION';
-- Expected: 2

-- All checks should show expected values
```

---

**Created:** 2025-12-15
**Updated:** 2025-12-15
**Next Review:** Before deployment to production

**Status:** READY FOR VALIDATION
