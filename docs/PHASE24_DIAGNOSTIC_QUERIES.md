# Phase 2.4: Diagnostic Queries

Run these queries in Supabase Dashboard to understand the current state of the staging database.

---

## Query 1: List All Tables in Public Schema

**Purpose**: See what tables currently exist in staging

**Copy and run this in Dashboard**:

```sql
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
```

**This will show**:
- All existing tables
- Number of columns in each table

---

## Query 2: Check for RLS Policies

**Purpose**: See which tables have RLS policies (from Phase 2.3)

```sql
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## Query 3: Check for Existing Indexes

**Purpose**: See what indexes already exist

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

## Query 4: Check Migration History

**Purpose**: See which migrations have been applied

```sql
SELECT * FROM _supabase_migrations
ORDER BY executed_at DESC
LIMIT 20;
```

---

## What To Do

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select project**: uzywajqzbdbrfammshdg (aica-staging)
3. **SQL Editor** → **New Query**
4. **Copy Query 1** (List All Tables)
5. **Paste and Run**
6. **Report back with the results**

---

## Expected Results (If Phase 2.1 was applied):

If Phase 2.1 migrations were applied, you should see tables like:
- moments
- daily_questions
- weekly_summaries
- whatsapp_messages
- contact_network
- work_items
- podcast_episodes
- finance_transactions
- ai_usage_logs
- consciousness_points_log
- whatsapp_conversations
- and others...

If these tables are **missing**, then Phase 2.1 migrations weren't applied to staging.

---

**Run Query 1 and let me know what tables exist!**
