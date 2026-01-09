# Phase 2.4: Run Diagnostic Query NOW

## Why We Need This

The index creation failed with: `ERROR: relation "moments" does not exist`

This means either:
1. ❌ Phase 2.1 migrations were NOT applied to staging
2. ⚠️ Tables exist but something else is wrong

**We need to know which it is.**

---

## 60-Second Diagnostic

**Go here right now**:
https://supabase.com/dashboard

**Steps**:
1. Click project: **aica-staging** (uzywajqzbdbrfammshdg)
2. Left menu → **SQL Editor**
3. Click: **New Query**
4. **Copy this ENTIRE diagnostic** ↓

```sql
-- Count tables
SELECT count(*) as total_public_tables FROM information_schema.tables WHERE table_schema = 'public';

-- Check if key tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'moments', 'daily_questions', 'weekly_summaries', 'whatsapp_messages',
  'contact_network', 'work_items', 'podcast_episodes', 'finance_transactions',
  'ai_usage_logs', 'consciousness_points_log', 'whatsapp_conversations',
  'whatsapp_sync_logs', 'data_deletion_requests', 'ai_usage_tracking_errors'
) ORDER BY tablename;

-- Check migrations
SELECT count(*) as total_migrations FROM _supabase_migrations;
SELECT version, name FROM _supabase_migrations ORDER BY executed_at DESC LIMIT 3;

-- Check policies (Phase 2.3 sign)
SELECT count(*) as total_rls_policies FROM pg_policies WHERE schemaname = 'public';
```

5. **Click: Run**
6. **Look at the results**
7. **Report back EXACTLY what you see**

---

## Expected Results

**If Phase 2.1 WAS applied** (GOOD):
```
total_public_tables: 50+
tablename: moments
tablename: daily_questions
tablename: weekly_summaries
[... all 14 tables listed ...]
total_migrations: 30+
total_rls_policies: 20+
```

**If Phase 2.1 was NOT applied** (BAD):
```
total_public_tables: 10-20 (very few)
[... only a few tables, NOT the required ones ...]
total_migrations: 10-15 (less than 20)
total_rls_policies: 0
```

---

## After You Run It

**Report back with**:
- How many tables total? (number)
- Do you see `moments` table? (yes/no)
- Do you see `whatsapp_messages` table? (yes/no)
- How many migrations? (number)

---

## Then We'll Know What To Do Next

- **If tables exist** → Create indexes one-by-one (Phase 2.4 can proceed)
- **If tables don't exist** → Apply Phase 2.1 first, THEN Phase 2.4

---

## Go Now!

https://supabase.com/dashboard → aica-staging → SQL Editor

**Copy the query, run it, report back!**

⏱️ **Takes 30 seconds**
