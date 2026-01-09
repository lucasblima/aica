# Phase 1 Migration Execution Guide

**Issue:** #73 Phase 2 - Performance & Indexes
**Task:** 2.1 - Apply Phase 1 Migrations to Staging
**Project:** uzywajqzbdbrfammshdg (Staging)
**Created:** 2026-01-10

---

## 📋 Pre-Execution Checklist

- [ ] **Backup Status:** Not required (staging environment, all migrations have rollback capability)
- [ ] **Environment:** STAGING ONLY (não tocar em produção)
- [ ] **Time Window:** Off-peak hours recommended (migrations take ~30-60 seconds)
- [ ] **Access Required:** Supabase Dashboard access with SQL Editor permissions

---

## 🚀 Execution Steps

### Option A: Single Consolidated Script (RECOMMENDED)

**File:** `supabase/migrations/20260110_phase1_apply_all.sql`

1. **Open Supabase SQL Editor**
   - Navigate to: https://supabase.com/dashboard
   - Select project: `uzywajqzbdbrfammshdg`
   - Go to: **SQL Editor** → **New query**

2. **Copy & Paste Script**
   - Open: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20260110_phase1_apply_all.sql`
   - Copy entire contents
   - Paste into SQL Editor

3. **Execute**
   - Click: **Run** (or Ctrl+Enter)
   - Estimated time: 30-60 seconds
   - Watch for success messages in console

4. **Verify Output**
   - Look for: `✅ PHASE 1 MIGRATION: 100% SUCCESS`
   - Confirm: 20 policies, 2 functions, 3 indexes created
   - If any warnings appear, check **Troubleshooting** section below

### Option B: Individual Migration Files (Manual)

If Option A fails, apply migrations individually in this exact order:

1. **Migration 1/5:** `20260110_fix_rls_ai_usage_tracking_errors.sql`
2. **Migration 2/5:** `20260110_fix_rls_data_deletion_requests.sql`
3. **Migration 3/5:** `20260110_fix_rls_daily_questions.sql`
4. **Migration 4/5:** `20260110_fix_rls_whatsapp_messages.sql`
5. **Migration 5/5:** `20260110_fix_rls_whatsapp_sync_logs.sql`

**For each migration:**
- Open file from `supabase/migrations/`
- Copy full contents
- Paste in SQL Editor
- Run (wait for completion before next)
- Wait 5-10 seconds between migrations
- Verify success message before proceeding

---

## 🔍 Expected Results

### Success Criteria

✅ **Migration 1/5: ai_usage_tracking_errors**
- 4 RLS policies created (SELECT, INSERT, UPDATE, DELETE)
- RLS enabled on table
- Permissions granted to authenticated role

✅ **Migration 2/5: data_deletion_requests**
- 4 RLS policies created (with status-based restrictions)
- Policy prevents editing completed deletion requests
- Policy allows deleting only pending requests

✅ **Migration 3/5: daily_questions**
- 4 RLS policies created
- 1 SECURITY DEFINER function: `can_access_daily_question`
- Supports global questions (user_id = NULL) and personal questions

✅ **Migration 4/5: whatsapp_messages**
- 4 RLS policies created
- 1 SECURITY DEFINER function: `user_owns_whatsapp_message`
- Ownership checked via `contact_network` table

✅ **Migration 5/5: whatsapp_sync_logs**
- 4 RLS policies created
- 3 performance indexes created:
  - `idx_whatsapp_sync_logs_user_id`
  - `idx_whatsapp_sync_logs_created_at`
  - `idx_whatsapp_sync_logs_user_date`

### Final Audit Results

**Expected totals:**
- ✅ **20 RLS policies** (5 tables × 4 CRUD operations)
- ✅ **2 SECURITY DEFINER functions**
- ✅ **3 performance indexes**

---

## 🧪 Post-Execution Validation

### Quick Audit Query

Run this immediately after execution to verify success:

```sql
-- Verify policy coverage
SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as operations
FROM pg_policies
WHERE tablename IN (
  'ai_usage_tracking_errors',
  'data_deletion_requests',
  'daily_questions',
  'whatsapp_messages',
  'whatsapp_sync_logs'
)
GROUP BY tablename
ORDER BY tablename;
```

**Expected output:**
```
tablename                     | policy_count | operations
------------------------------|--------------|-------------------
ai_usage_tracking_errors      | 4            | DELETE, INSERT, SELECT, UPDATE
data_deletion_requests        | 4            | DELETE, INSERT, SELECT, UPDATE
daily_questions               | 4            | DELETE, INSERT, SELECT, UPDATE
whatsapp_messages             | 4            | DELETE, INSERT, SELECT, UPDATE
whatsapp_sync_logs            | 4            | DELETE, INSERT, SELECT, UPDATE
```

### Verify SECURITY DEFINER Functions

```sql
-- Check function creation
SELECT
  proname as function_name,
  prosecdef as security_definer,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
  'can_access_daily_question',
  'user_owns_whatsapp_message'
)
ORDER BY proname;
```

**Expected:** 2 functions with `security_definer = true`

### Verify Performance Indexes

```sql
-- Check indexes on whatsapp_sync_logs
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_sync_logs'
  AND indexname LIKE 'idx_whatsapp_sync_logs%'
ORDER BY indexname;
```

**Expected:** 3 indexes (user_id, created_at, user_date composite)

---

## ⚠️ Troubleshooting

### Error: "Policy already exists"

**Symptom:**
```
ERROR: policy "Users can view their own messages" already exists
```

**Cause:** Migration was partially applied before, or policies were created manually.

**Solution:**
```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON whatsapp_messages;

-- Then re-run the migration for that table
```

### Error: "Function does not exist"

**Symptom:**
```
ERROR: function can_access_daily_question(uuid, uuid) does not exist
```

**Cause:** SECURITY DEFINER function was not created (Migration 3 or 4 failed).

**Solution:**
1. Re-run the specific migration file that creates the function
2. Check that the function exists: `SELECT proname FROM pg_proc WHERE proname = 'can_access_daily_question';`
3. If function exists but policies still fail, check for schema mismatch

### Error: "Table does not exist"

**Symptom:**
```
ERROR: relation "whatsapp_messages" does not exist
```

**Cause:** Table was not created in previous migrations, or you're in the wrong database.

**Solution:**
1. Verify you're in the correct project: `uzywajqzbdbrfammshdg`
2. Check table existence: `SELECT tablename FROM pg_tables WHERE tablename LIKE '%whatsapp%';`
3. If table doesn't exist, you need to run earlier migrations first (from Issue #42 - WhatsApp Integration)

### Warning: "Expected 4 policies, found 3"

**Symptom:**
```
WARNING: Expected 4 CRUD policies, found 3
```

**Cause:** One of the CRUD policies failed to create (likely syntax error or permission issue).

**Solution:**
1. Run the audit query to see which operation is missing:
   ```sql
   SELECT cmd::text FROM pg_policies WHERE tablename = 'whatsapp_messages';
   ```
2. Re-run just the missing policy creation from the migration file
3. If issue persists, check for RLS bypass (service role may have created policy manually)

### Error: "Permission denied"

**Symptom:**
```
ERROR: must be owner of table whatsapp_messages
```

**Cause:** You're not using the service role key (admin access required).

**Solution:**
1. Supabase SQL Editor should automatically use service role
2. If using CLI: Ensure you're authenticated with admin credentials
3. Verify project access in Supabase Dashboard → Settings → API

---

## 📊 Migration Timeline

**Estimated execution times:**

| Migration | Tables | Policies | Functions | Indexes | Est. Time |
|-----------|--------|----------|-----------|---------|-----------|
| 1/5       | 1      | 4        | 0         | 0       | 5-8 sec   |
| 2/5       | 1      | 4        | 0         | 0       | 5-8 sec   |
| 3/5       | 1      | 4        | 1         | 0       | 8-12 sec  |
| 4/5       | 1      | 4        | 1         | 0       | 8-12 sec  |
| 5/5       | 1      | 4        | 0         | 3       | 10-15 sec |
| **Total** | **5**  | **20**   | **2**     | **3**   | **30-60 sec** |

---

## ✅ Success Confirmation

After execution, you should see:

```
✅ Migration 1/5 SUCCESS: ai_usage_tracking_errors (4 policies)
✅ Migration 2/5 SUCCESS: data_deletion_requests (4 policies)
✅ Migration 3/5 SUCCESS: daily_questions (4 policies + SECURITY DEFINER)
✅ Migration 4/5 SUCCESS: whatsapp_messages (4 policies + SECURITY DEFINER)
✅ Migration 5/5 SUCCESS: whatsapp_sync_logs (4 policies + 3 indexes)

📊 SUMMARY STATISTICS:
   Total RLS Policies: 20 (expected: 20)
   SECURITY DEFINER Functions: 2 (expected: 2)
   Performance Indexes: 3 (expected: 3)

✅ PHASE 1 MIGRATION: 100% SUCCESS
```

---

## 🎯 Next Steps After Success

1. **Task 2.2:** Run full audit queries
   - File: `supabase/audit-queries/phase1-rls-coverage.sql`
   - Verify zero gaps in RLS coverage

2. **Task 2.3:** Test RLS policies with test users
   - Create test authenticated user
   - Attempt unauthorized access (should be blocked)
   - Verify user can only see own data

3. **Task 2.4:** Create 13 additional performance indexes
   - Analyze slow queries from production logs
   - Add composite indexes for common query patterns

4. **Task 2.5:** Run full security audit
   - Use: `supabase/audit-queries/security-audit-full.sql`
   - Generate report for security review

---

## 📝 Rollback Plan (If Needed)

If migration causes issues, rollback with:

```sql
-- Disable RLS on all affected tables (EMERGENCY ONLY)
ALTER TABLE ai_usage_tracking_errors DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sync_logs DISABLE ROW LEVEL SECURITY;

-- Drop all created policies
DROP POLICY "Users can view their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY "Users can insert their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY "Users can update their own tracking errors" ON ai_usage_tracking_errors;
DROP POLICY "Users can delete their own tracking errors" ON ai_usage_tracking_errors;
-- ... (repeat for all 20 policies across 5 tables)

-- Drop SECURITY DEFINER functions
DROP FUNCTION IF EXISTS public.can_access_daily_question(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_owns_whatsapp_message(UUID, UUID, UUID);

-- Drop performance indexes
DROP INDEX IF EXISTS idx_whatsapp_sync_logs_user_id;
DROP INDEX IF EXISTS idx_whatsapp_sync_logs_created_at;
DROP INDEX IF EXISTS idx_whatsapp_sync_logs_user_date;
```

**⚠️ WARNING:** Disabling RLS leaves data unprotected. Only use for critical production issues. Re-enable ASAP.

---

## 📞 Support & References

**Migration Files:**
- `supabase/migrations/20260110_fix_rls_*.sql` (5 individual files)
- `supabase/migrations/20260110_phase1_apply_all.sql` (consolidated)

**Audit Queries:**
- `supabase/audit-queries/phase1-rls-coverage.sql`
- `supabase/audit-queries/security-audit-full.sql`

**Documentation:**
- `docs/architecture/backend_architecture.md`
- `docs/MIGRATION_GUIDE_NEW_TABLES.md`

**Issue Tracking:**
- GitHub Issue: #73 (Phase 2 - Performance & Indexes)
- Related: #42 (WhatsApp Integration), #67 (Journey AI Tracking)

---

**Maintainer:** Backend Architect Agent + Lucas Boscacci Lima
**Last Updated:** 2026-01-10
**Version:** 1.0
