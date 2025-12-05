# Supabase Schema Validation Report

Generated: 2025-12-05T00:21:30.644Z

## Instructions

Execute the SQL queries below using one of these methods:
1. Claude Code Supabase MCP: `mcp__supabase__execute_sql`
2. Supabase Dashboard: SQL Editor
3. Supabase CLI: `supabase db execute`

---

## 1. Validate Table Existence

```sql
-- Query to validate all expected tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN ('users', 'associations', 'association_members', 'modules', 'work_items', 'memories', 'daily_reports', 'activity_log', 'contact_network', 'podcast_shows', 'podcast_episodes', 'podcast_topics', 'podcast_topic_categories', 'team_members', 'user_stats', 'task_metrics', 'workspaces') THEN '✅ Expected'
    ELSE '⚠️  Unexpected'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for missing tables
SELECT
  expected_table
FROM unnest(ARRAY['users', 'associations', 'association_members', 'modules', 'work_items', 'memories', 'daily_reports', 'activity_log', 'contact_network', 'podcast_shows', 'podcast_episodes', 'podcast_topics', 'podcast_topic_categories', 'team_members', 'user_stats', 'task_metrics', 'workspaces']) AS expected_table
WHERE expected_table NOT IN (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
);
```

**Expected Result:** All tables should exist

---

## 2. Validate RLS Policies

```sql
-- Validate RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'associations', 'association_members', 'modules', 'work_items', 'memories', 'daily_reports', 'activity_log', 'contact_network', 'podcast_shows', 'podcast_episodes', 'podcast_topics', 'podcast_topic_categories', 'team_members', 'user_stats', 'task_metrics', 'workspaces')
ORDER BY tablename;

-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Result:** All tables should have `rowsecurity = true` and at least 2 policies (SELECT, INSERT/UPDATE/DELETE)

---

## 3. Validate Key Columns

### Table: `users`

**Description:** User authentication and profiles

```sql
-- Validate columns for table: users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('id', 'email', 'full_name', 'avatar_url', 'created_at')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'email', 'full_name', 'avatar_url', 'created_at']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
);
```

### Table: `associations`

**Description:** Groups/organizations user belongs to

```sql
-- Validate columns for table: associations
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'associations'
  AND column_name IN ('id', 'name', 'description', 'logo_url', 'owner_user_id', 'archived')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'name', 'description', 'logo_url', 'owner_user_id', 'archived']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'associations'
);
```

### Table: `association_members`

**Description:** Membership junction table

```sql
-- Validate columns for table: association_members
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'association_members'
  AND column_name IN ('id', 'association_id', 'user_id', 'role')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'association_id', 'user_id', 'role']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'association_members'
);
```

### Table: `modules`

**Description:** Life areas (Finanças, Saúde, etc.)

```sql
-- Validate columns for table: modules
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'modules'
  AND column_name IN ('id', 'name', 'description', 'association_id', 'archived')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'name', 'description', 'association_id', 'archived']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'modules'
);
```

### Table: `work_items`

**Description:** Tasks displayed in Meu Dia

```sql
-- Validate columns for table: work_items
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_items'
  AND column_name IN ('id', 'title', 'description', 'due_date', 'priority', 'status', 'association_id')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'title', 'description', 'due_date', 'priority', 'status', 'association_id']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'work_items'
);
```

### Table: `memories`

**Description:** Emotional/contextual event records with embeddings

```sql
-- Validate columns for table: memories
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'memories'
  AND column_name IN ('id', 'content', 'metadata', 'embedding', 'user_id')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'content', 'metadata', 'embedding', 'user_id']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'memories'
);
```

### Table: `daily_reports`

**Description:** Daily progress and well-being reports

```sql
-- Validate columns for table: daily_reports
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_reports'
  AND column_name IN ('id', 'user_id', 'report_date', 'tasks_completed', 'tasks_total', 'productivity_score', 'mood', 'mood_score')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'user_id', 'report_date', 'tasks_completed', 'tasks_total', 'productivity_score', 'mood', 'mood_score']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'daily_reports'
);
```

### Table: `activity_log`

**Description:** User action history (pomodoro, messages, etc.)

```sql
-- Validate columns for table: activity_log
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_log'
  AND column_name IN ('id', 'action', 'details', 'user_id', 'created_at')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'action', 'details', 'user_id', 'created_at']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'activity_log'
);
```

### Table: `contact_network`

**Description:** External contacts registry

```sql
-- Validate columns for table: contact_network
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contact_network'
  AND column_name IN ('id', 'user_id', 'contact_name', 'phone_number', 'last_interaction_date')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'user_id', 'contact_name', 'phone_number', 'last_interaction_date']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contact_network'
);
```

### Table: `podcast_shows`

**Description:** Podcast series/shows management

```sql
-- Validate columns for table: podcast_shows
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'podcast_shows'
  AND column_name IN ('id', 'title', 'description', 'user_id', 'archived')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'title', 'description', 'user_id', 'archived']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'podcast_shows'
);
```

### Table: `podcast_episodes`

**Description:** Individual podcast episodes

```sql
-- Validate columns for table: podcast_episodes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'podcast_episodes'
  AND column_name IN ('id', 'show_id', 'title', 'description', 'status', 'recording_date')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'show_id', 'title', 'description', 'status', 'recording_date']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'podcast_episodes'
);
```

### Table: `podcast_topics`

**Description:** Episode topics and research

```sql
-- Validate columns for table: podcast_topics
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'podcast_topics'
  AND column_name IN ('id', 'episode_id', 'category_id', 'title', 'content')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'episode_id', 'category_id', 'title', 'content']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'podcast_topics'
);
```

### Table: `podcast_topic_categories`

**Description:** Topic categorization

```sql
-- Validate columns for table: podcast_topic_categories
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'podcast_topic_categories'
  AND column_name IN ('id', 'name', 'description')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'name', 'description']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'podcast_topic_categories'
);
```

### Table: `team_members`

**Description:** Podcast team (hosts, guests, producers)

```sql
-- Validate columns for table: team_members
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_members'
  AND column_name IN ('id', 'name', 'role', 'bio', 'whatsapp')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'name', 'role', 'bio', 'whatsapp']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'team_members'
);
```

### Table: `user_stats`

**Description:** Gamification statistics

```sql
-- Validate columns for table: user_stats
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_stats'
  AND column_name IN ('id', 'user_id', 'xp', 'level', 'streak_days')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'user_id', 'xp', 'level', 'streak_days']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_stats'
);
```

### Table: `task_metrics`

**Description:** Task completion metrics

```sql
-- Validate columns for table: task_metrics
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'task_metrics'
  AND column_name IN ('id', 'user_id', 'completed_count', 'efficiency_score')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'user_id', 'completed_count', 'efficiency_score']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'task_metrics'
);
```

### Table: `workspaces`

**Description:** Workspace organization

```sql
-- Validate columns for table: workspaces
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workspaces'
  AND column_name IN ('id', 'name', 'slug', 'description')
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY['id', 'name', 'slug', 'description']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'workspaces'
);
```

---

## 4. Expected Tables Summary

| Table | Key Columns | Relationships |
|-------|-------------|---------------|
| `users` | 5 columns | 1-N → memories, 1-N → daily_reports, 1-N → activity_log |
| `associations` | 6 columns | 1-N → modules, 1-N → work_items, N-1 → workspaces |
| `association_members` | 4 columns | N-1 → associations, N-1 → users |
| `modules` | 5 columns | N-1 → associations |
| `work_items` | 7 columns | N-1 → associations, N-1 → modules |
| `memories` | 5 columns | N-1 → users |
| `daily_reports` | 8 columns | N-1 → users |
| `activity_log` | 5 columns | N-1 → users |
| `contact_network` | 5 columns | N-1 → users |
| `podcast_shows` | 5 columns | 1-N → podcast_episodes, N-1 → users |
| `podcast_episodes` | 6 columns | N-1 → podcast_shows |
| `podcast_topics` | 5 columns | N-1 → podcast_episodes, N-1 → podcast_topic_categories |
| `podcast_topic_categories` | 3 columns | 1-N → podcast_topics |
| `team_members` | 5 columns | N-N → podcast_episodes via junction table |
| `user_stats` | 5 columns | 1-1 → users |
| `task_metrics` | 4 columns | N-1 → users |
| `workspaces` | 4 columns | 1-N → associations |

---

## 5. Validation Checklist

- [ ] All 17 expected tables exist
- [ ] All tables have RLS enabled (`rowsecurity = true`)
- [ ] All tables have appropriate RLS policies
- [ ] All key columns exist with correct data types
- [ ] Foreign key relationships are properly defined
- [ ] Security Definer functions exist (`is_member_of`, `is_association_admin`, etc.)
- [ ] No infinite recursion in RLS policies (42P17 errors)

---

## 6. Quick Health Check

Run this single query for a quick overview:

```sql
-- Quick health check
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'is_%') as security_definer_functions;
```

**Expected Result:**
- `total_tables`: >= 17
- `tables_with_rls`: >= 17
- `total_policies`: >= 34 (2 per table minimum)
- `security_definer_functions`: >= 3
