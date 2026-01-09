# Phase 2.4: Database Diagnostic - What Tables Exist in Staging?

## Critical Discovery

The Phase 2.1 migration file exists **locally** but may not have been applied to the **staging database** in Supabase.

**Files created but possibly not pushed**:
- `20260110_CREATE_TABLES_FOR_RLS.sql`
- `20260110_phase1_apply_all.sql`
- And 7 other RLS migration files

---

## Run This Complete Diagnostic

**Go to Supabase Dashboard** → **SQL Editor** → **New Query**

**Copy and run ALL of this**:

```sql
-- ============================================================================
-- PHASE 2.4 DIAGNOSTIC: Database State Analysis
-- ============================================================================

-- 1. List all tables in public schema
SELECT
  'TABLE INVENTORY' as section,
  count(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- 2. Show specific tables we need for indexes
SELECT
  'REQUIRED TABLES' as check_type,
  tablename as table_name,
  'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'moments',
    'daily_questions',
    'weekly_summaries',
    'whatsapp_messages',
    'contact_network',
    'work_items',
    'podcast_episodes',
    'finance_transactions',
    'ai_usage_logs',
    'consciousness_points_log',
    'whatsapp_conversations',
    'whatsapp_sync_logs',
    'data_deletion_requests',
    'ai_usage_tracking_errors'
  )
ORDER BY tablename;

-- 3. Check RLS status
SELECT
  'RLS POLICIES' as section,
  count(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Check existing indexes
SELECT
  'EXISTING INDEXES' as section,
  count(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE 'pg_%';

-- 5. Check migration history
SELECT
  'MIGRATION HISTORY' as section,
  count(*) as migrations_applied
FROM _supabase_migrations;

-- 6. Show recent migrations
SELECT
  version,
  name,
  executed_at
FROM _supabase_migrations
ORDER BY executed_at DESC
LIMIT 10;
```

---

## What This Tells Us

**If you see tables listed** (moments, daily_questions, etc.):
- ✅ Phase 2.1 migrations WERE applied to staging
- ✅ We can proceed with creating indexes
- ❌ Index creation failed because of some other reason

**If you see NO tables** (or very few):
- ❌ Phase 2.1 migrations were NOT applied to staging
- ❌ We need to apply the Phase 2.1 migrations FIRST
- ❌ Phase 2.4 indexes cannot be created without the base tables

---

## Expected Output (If All Phases Complete)

```
SECTION: TABLE INVENTORY
Total Tables: 50+

SECTION: REQUIRED TABLES (should show all 14 of these)
moments - EXISTS
daily_questions - EXISTS
weekly_summaries - EXISTS
whatsapp_messages - EXISTS
contact_network - EXISTS
work_items - EXISTS
podcast_episodes - EXISTS
finance_transactions - EXISTS
ai_usage_logs - EXISTS
consciousness_points_log - EXISTS
whatsapp_conversations - EXISTS
whatsapp_sync_logs - EXISTS
data_deletion_requests - EXISTS
ai_usage_tracking_errors - EXISTS

SECTION: RLS POLICIES
Total Policies: 20+

SECTION: EXISTING INDEXES
Total Indexes: 3+ (from Phase 2.1)

SECTION: MIGRATION HISTORY
Migrations Applied: 30+

SECTION: RECENT MIGRATIONS
version | name | executed_at
20260110_... | phase1_apply_all | [timestamp]
20260110_... | RLS_VALIDATION | [timestamp]
```

---

## Next Steps Based on Results

### Scenario A: Tables DO exist
→ Phase 2.1 was applied successfully
→ Move to Phase 2.4.B: Create indexes one at a time

### Scenario B: Tables DON'T exist
→ Phase 2.1 was NOT applied to staging
→ Need to apply Phase 2.1 migrations first

---

## Copy This Entire Block and Run It

1. **Go to**: https://supabase.com/dashboard
2. **Select**: uzywajqzbdbrfammshdg (aica-staging)
3. **SQL Editor** → **New Query**
4. **Copy the entire diagnostic script** from above
5. **Paste and Run**
6. **Report the results**

---

**Run this diagnostic NOW so we can determine the correct next steps!**
