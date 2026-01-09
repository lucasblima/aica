# Manual Execution Guide - Phase 1 Audit

**Issue**: #73 Phase 1 - Security & Integrity
**Date**: 2026-01-08
**Environment**: Staging (Supabase: uzywajqzbdbrfammshdg)

---

## Overview

This guide provides step-by-step instructions to:

1. Execute SQL audit queries in Supabase SQL Editor
2. Apply RLS fix migrations to staging database
3. Verify results and test policies

**IMPORTANT**: These steps must be performed MANUALLY via Supabase Dashboard.
The Supabase CLI requires authentication which is not available in the current environment.

---

## Step 1: Access Supabase SQL Editor

1. Open browser and go to: https://supabase.com/dashboard
2. Select project: **uzywajqzbdbrfammshdg** (Aica Life OS - Staging)
3. Navigate to: **SQL Editor** (left sidebar)

---

## Step 2: Run RLS Coverage Audit Queries

### Query 1: Tables Without RLS Enabled

Copy and paste this query in SQL Editor:

```sql
-- Query 1: Tables without RLS enabled
SELECT
  schemaname,
  tablename,
  'CRITICAL - No RLS!' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY tablename;
```

**Expected Result**: Empty (all tables should have RLS)

### Query 2: Tables with Incomplete CRUD Policies

```sql
-- Query 2: Tables with incomplete CRUD policies
SELECT
  t.tablename,
  COUNT(DISTINCT p.cmd) as policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as policies_present,
  CASE
    WHEN 'SELECT' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_select,
  CASE
    WHEN 'INSERT' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_insert,
  CASE
    WHEN 'UPDATE' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_update,
  CASE
    WHEN 'DELETE' = ANY(ARRAY_AGG(DISTINCT p.cmd)) THEN '✓' ELSE '✗'
  END as has_delete
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename
HAVING COUNT(DISTINCT p.cmd) < 4
ORDER BY policy_count ASC, t.tablename;
```

**Expected Result**: List of tables with incomplete policies (should include the 5 critical tables)

### Query 3: Sensitive Tables RLS Status

```sql
-- Query 3: Sensitive tables requiring RLS audit
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as policies,
  CASE
    WHEN t.rowsecurity = false THEN '🔴 CRITICAL - No RLS'
    WHEN COUNT(DISTINCT p.cmd) < 4 THEN '⚠️ Incomplete policies'
    ELSE '✅ OK'
  END as security_status
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'ai_usage_logs',
    'gemini_api_logs',
    'ai_usage_tracking_errors',
    'whatsapp_consent_records',
    'data_deletion_requests',
    'moments',
    'weekly_summaries',
    'daily_questions',
    'question_responses',
    'whatsapp_messages',
    'contact_network',
    'whatsapp_sync_logs'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY
  CASE
    WHEN t.rowsecurity = false THEN 1
    WHEN COUNT(DISTINCT p.cmd) < 4 THEN 2
    ELSE 3
  END,
  t.tablename;
```

**Expected Result**: Status of 12 critical tables. Tables needing fixes should show "⚠️ Incomplete policies"

---

## Step 3: Run Foreign Key Audit Queries

### Query 4: All Foreign Keys with ON DELETE Behavior

```sql
-- Query 4: All Foreign Keys with ON DELETE behavior
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ Cascades - verify intended'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ Nulls - check queries handle NULL'
    WHEN rc.delete_rule = 'RESTRICT' THEN '✅ Blocks deletion'
    WHEN rc.delete_rule = 'NO ACTION' THEN '✅ Blocks deletion'
    ELSE '❓ Unknown behavior'
  END as risk_assessment
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN 1
    WHEN 'SET NULL' THEN 2
    WHEN 'RESTRICT' THEN 3
    ELSE 4
  END,
  tc.table_name,
  kcu.column_name;
```

**Expected Result**: ~150 foreign keys. Most should be CASCADE for user_id.

### Query 5: User Deletion Impact

```sql
-- Query 5: What happens when a user is deleted?
SELECT
  kcu.table_name as table_will_be_affected,
  kcu.column_name as via_column,
  rc.delete_rule as action,
  CASE
    WHEN rc.delete_rule = 'CASCADE' THEN '🔴 All user data in this table will be DELETED'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ Column will be NULL (orphaned records)'
    ELSE '✅ Deletion blocked (safe)'
  END as user_deletion_impact
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN 1
    WHEN 'SET NULL' THEN 2
    ELSE 3
  END,
  kcu.table_name;
```

**Expected Result**: List of tables affected by user deletion. Most should CASCADE (GDPR compliant).

---

## Step 4: Document Query Results

Create a new document with query results:

1. Copy each query result
2. Save to: `docs/audit-reports/SUPABASE_QUERY_RESULTS_<DATE>.md`
3. Include screenshots if needed
4. Note any unexpected findings

---

## Step 5: Apply RLS Fix Migrations (One at a Time)

**CRITICAL**: Apply migrations ONE AT A TIME and verify each one.

### Migration 1: ai_usage_tracking_errors

1. Open file: `supabase/migrations/20260110_fix_rls_ai_usage_tracking_errors.sql`
2. Copy entire contents
3. Paste in Supabase SQL Editor
4. Click "Run"
5. Verify success message: "✅ All 4 CRUD policies verified for ai_usage_tracking_errors"

### Migration 2: data_deletion_requests

1. Open file: `supabase/migrations/20260110_fix_rls_data_deletion_requests.sql`
2. Copy entire contents
3. Paste in SQL Editor
4. Click "Run"
5. Verify success message: "✅ All 4 CRUD policies verified for data_deletion_requests"

### Migration 3: daily_questions

1. Open file: `supabase/migrations/20260110_fix_rls_daily_questions.sql`
2. Copy entire contents
3. Paste in SQL Editor
4. Click "Run"
5. Verify success messages:
   - "✅ All 4 CRUD policies verified for daily_questions"
   - "✅ SECURITY DEFINER function verified"

### Migration 4: whatsapp_messages

1. Open file: `supabase/migrations/20260110_fix_rls_whatsapp_messages.sql`
2. Copy entire contents
3. Paste in SQL Editor
4. Click "Run"
5. Verify success messages:
   - "✅ All 4 CRUD policies verified for whatsapp_messages"
   - "✅ SECURITY DEFINER function verified"

### Migration 5: whatsapp_sync_logs

1. Open file: `supabase/migrations/20260110_fix_rls_whatsapp_sync_logs.sql`
2. Copy entire contents
3. Paste in SQL Editor
4. Click "Run"
5. Verify success messages:
   - "✅ All 4 CRUD policies verified for whatsapp_sync_logs"
   - "✅ Required indexes verified"

---

## Step 6: Verify Migrations Applied

Re-run Query 3 (Sensitive Tables RLS Status) from Step 2.

**Expected Result**: All 12 tables should now show "✅ OK" status.

```sql
-- Verify all 5 tables now have complete policies
SELECT
  t.tablename,
  COUNT(p.policyname) as policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.tablename IN (
  'ai_usage_tracking_errors',
  'data_deletion_requests',
  'daily_questions',
  'whatsapp_messages',
  'whatsapp_sync_logs'
)
GROUP BY t.tablename;
```

**Expected Output**:
- Each table should have `policy_count = 4`
- `policies` should be: `{DELETE, INSERT, SELECT, UPDATE}`

---

## Step 7: Test RLS Policies

### Create Test User

```sql
-- Create test user (if needed)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'test-user@example.com',
  crypt('test-password', gen_salt('bf')),
  NOW()
);
```

### Test Cross-User Access (Should Fail)

```sql
-- Try to access another user's data (should return 0 rows)
SET request.jwt.claims = '{"sub": "<test-user-id>"}';

SELECT * FROM ai_usage_logs
WHERE user_id != '<test-user-id>';
-- Expected: 0 rows (blocked by RLS)

SELECT * FROM whatsapp_messages
WHERE user_id != '<test-user-id>';
-- Expected: 0 rows (blocked by RLS)
```

### Test Own Data Access (Should Succeed)

```sql
-- Access own data (should work)
SELECT * FROM ai_usage_logs
WHERE user_id = '<test-user-id>';
-- Expected: User's own logs

SELECT * FROM whatsapp_messages
WHERE user_id = '<test-user-id>';
-- Expected: User's own messages
```

---

## Step 8: Document Results

Update `PHASE1_COMPLETION_REPORT.md` with:

1. Query execution results
2. Migration application status
3. Test results (pass/fail)
4. Any issues encountered
5. Next steps

---

## Troubleshooting

### Error: "RLS not enabled on <table>"

**Solution**: Run this to enable RLS:
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

### Error: "Policy already exists"

**Solution**: The migration is idempotent. It drops existing policies first. If you see this error, the DROP statement didn't run. Manually drop:
```sql
DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;
```

### Error: "Function already exists"

**Solution**: Use `CREATE OR REPLACE FUNCTION` (already in migrations):
```sql
DROP FUNCTION IF EXISTS <function_name>;
```

### Error: "SECURITY DEFINER function abuse"

**Issue**: Function allows bypassing RLS.
**Check**: Verify function has `SET search_path = public` to prevent SQL injection.

---

## Rollback Instructions

If migrations cause issues, rollback by dropping policies:

### Rollback Migration 1 (ai_usage_tracking_errors)

```sql
DROP POLICY IF EXISTS "Users can view their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can insert their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can update their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY IF EXISTS "Users can delete their own tracking errors" ON ai_usage_tracking_errors;
```

### Rollback Migration 2 (data_deletion_requests)

```sql
DROP POLICY IF EXISTS "Users can view their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can update their own deletion requests" ON data_deletion_requests;
DROP POLICY IF EXISTS "Users can delete their own deletion requests" ON data_deletion_requests;
```

### Rollback Migration 3 (daily_questions)

```sql
DROP POLICY IF EXISTS "Users can view daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can insert daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can update daily questions" ON daily_questions;
DROP POLICY IF EXISTS "Users can delete daily questions" ON daily_questions;
DROP FUNCTION IF EXISTS public.can_access_daily_question(UUID, UUID);
```

### Rollback Migration 4 (whatsapp_messages)

```sql
DROP POLICY IF EXISTS "Users can view their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON whatsapp_messages;
DROP FUNCTION IF EXISTS public.user_owns_whatsapp_message(UUID, UUID, UUID);
```

### Rollback Migration 5 (whatsapp_sync_logs)

```sql
DROP POLICY IF EXISTS "Users can view their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can update their own sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Users can delete their own sync logs" ON whatsapp_sync_logs;
```

---

## Success Checklist

After completing all steps, verify:

- [ ] All 5 audit queries executed successfully
- [ ] Query results documented
- [ ] All 5 migrations applied without errors
- [ ] Verification query shows 4 policies per table
- [ ] Test user created
- [ ] Cross-user access blocked (RLS working)
- [ ] Own data access allowed (RLS working)
- [ ] Results documented in Phase 1 report

---

## Next Steps After Manual Execution

1. **Update PHASE1_COMPLETION_REPORT.md** with execution results
2. **Commit migrations to git** (if not already committed)
3. **Create GitHub issue comment** with execution summary
4. **Proceed to Phase 2** (Performance & Indexes)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Maintained By**: Backend Architect Agent
