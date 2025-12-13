# Deployment Guide: Database Fixes
## December 12, 2025

---

## Quick Reference

**Both fixes are already implemented. This guide covers verification and deployment.**

| Component | Status | Location | Action |
|-----------|--------|----------|--------|
| Corpus Duplicate Key Fix | COMPLETE | `src/services/fileSearchApiClient.ts` | Verify & Deploy |
| Onboarding Context Captures | COMPLETE | `supabase/migrations/20251211_onboarding_context_captures.sql` | Apply & Verify |

---

## Part 1: Verify File Search Fix

### Step 1: Inspect Updated Code

```bash
cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend
cat src/services/fileSearchApiClient.ts | grep -A 70 "export async function createCorpus"
```

**Expected Output**: Should show lines 108-226 with:
- Line 122-128: Pre-check SELECT query
- Line 143-155: INSERT with `.select().single()`
- Line 157-179: Error handler with error code '23505'

### Step 2: Verify Supabase Database Constraint

Before deploying code, confirm the database has the proper constraint:

**Method A: Using Supabase Dashboard**
1. Go to SQL Editor
2. Run this query:
```sql
-- Check file_search_corpora constraint
SELECT
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'file_search_corpora'
AND constraint_type = 'UNIQUE';
```

**Expected Result**:
```
constraint_name        | constraint_type | table_name
-----------------------+-----------------+------------------
file_search_corpora_pk | PRIMARY KEY     | file_search_corpora
file_search_corpora_un | UNIQUE          | file_search_corpora  ← This one!
```

**Method B: Using CLI**
```bash
# If you have psql installed
psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres
# Then run the query above
```

### Step 3: Deploy Code

The code is already updated. To deploy:

```bash
# Option 1: If using git
git add src/services/fileSearchApiClient.ts
git commit -m "fix: Improve corpus duplicate key handling with pre-check and race condition handling"
git push origin main

# Option 2: If deploying directly to hosting
# Copy src/services/fileSearchApiClient.ts to your deployment
```

### Step 4: Test Corpus Creation

After deployment, run this test:

**Test 1: Normal Creation**
```typescript
import { createCorpus } from './src/services/fileSearchApiClient';

// This should create a new corpus
const corpus = await createCorpus(
  'test-corpus-' + Date.now(),
  'Test Corpus',
  'test_module',
  'test-id'
);

console.log('Created corpus:', corpus.id);
```

**Test 2: Duplicate Creation**
```typescript
// This should return the existing corpus (not error)
const duplicate = await createCorpus(
  'test-corpus-same-name',
  'Test Corpus',
  'test_module',
  'test-id'
);

// Should return immediately on second call
const same = await createCorpus(
  'test-corpus-same-name',
  'Test Corpus',
  'test_module',
  'test-id'
);

console.log('Same ID?', corpus.id === duplicate.id); // Should be true
```

**Test 3: Concurrent Creation (Race Condition)**
```typescript
// Simulate concurrent requests
const name = 'race-test-' + Date.now();

const promises = [
  createCorpus(name, 'Race Test', 'test', 'id-1'),
  createCorpus(name, 'Race Test', 'test', 'id-2'),
  createCorpus(name, 'Race Test', 'test', 'id-3'),
];

const results = await Promise.all(promises);

console.log('All same ID?',
  results[0].id === results[1].id &&
  results[1].id === results[2].id
); // Should be true
```

**Expected Logs**:
- First call: `[fileSearchApiClient] Created corpus successfully`
- Subsequent calls: `[fileSearchApiClient] Corpus already exists, returning existing: ...`
- Race condition: `[fileSearchApiClient] Duplicate detected, fetching existing corpus`

---

## Part 2: Apply Migration & Verify

### Step 1: Verify Migration File

```bash
cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend
ls -la supabase/migrations/20251211_onboarding_context_captures.sql
cat supabase/migrations/20251211_onboarding_context_captures.sql | head -50
```

**Expected**: File should exist and contain:
- CREATE TABLE statement for `onboarding_context_captures`
- ALTER TABLE to ENABLE ROW LEVEL SECURITY
- CREATE POLICY statements (4 total)
- CREATE INDEX statements (6 total)
- CREATE TRIGGER statement

### Step 2: Apply Migration

**Method A: Using Supabase CLI**
```bash
cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend

# Install Supabase CLI if needed
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

**Method B: Using Supabase Dashboard**
1. Go to SQL Editor
2. Open `supabase/migrations/20251211_onboarding_context_captures.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

**Method C: Using Docker (if available)**
```bash
docker run -it --rm \
  -e POSTGRES_HOST=db.YOUR_PROJECT.supabase.co \
  -e POSTGRES_DB=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=YOUR_PASSWORD \
  postgres:15 \
  psql -h $POSTGRES_HOST -U $POSTGRES_USER -f /path/to/migration.sql
```

### Step 3: Verify Migration Applied

Run these verification queries in Supabase SQL Editor:

**Verify Table Exists**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'onboarding_context_captures';
```

**Expected**: `onboarding_context_captures`

**Verify Table Structure**
```sql
\d onboarding_context_captures
```

**Expected Output**:
```
Table "public.onboarding_context_captures"
Column              | Type                     | Modifiers
--------------------+--------------------------+---
id                  | uuid                     | PK
user_id             | uuid                     | FK -> auth.users
trail_id            | character varying(50)    | NOT NULL
responses           | jsonb                    | NOT NULL DEFAULT '{}'
trail_score         | double precision         |
recommended_modules | text[]                   |
created_at          | timestamp with tz       | DEFAULT now()
updated_at          | timestamp with tz       | DEFAULT now()
```

**Verify Indexes Created**
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'onboarding_context_captures'
ORDER BY indexname;
```

**Expected Indexes** (6 total):
```
idx_onboarding_context_captures_created_at
idx_onboarding_context_captures_recommended_modules
idx_onboarding_context_captures_responses
idx_onboarding_context_captures_trail_id
idx_onboarding_context_captures_user_id
idx_onboarding_context_captures_user_trail
```

**Verify RLS Policies**
```sql
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'onboarding_context_captures';
```

**Expected** (4 policies):
```
Users can view own context captures      | (auth.uid() = user_id)
Users can insert own context captures    | (auth.uid() = user_id)
Users can update own context captures    | (auth.uid() = user_id)
Users can delete own context captures    | (auth.uid() = user_id)
```

**Verify Helper Functions**
```sql
SELECT function_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND function_name LIKE 'get_%onboarding%';
```

**Expected Functions** (2 total):
```
get_user_completed_trails
get_onboarding_status
```

### Step 4: Test Migration

After applying, run these tests:

**Test 1: Insert and RLS**
```sql
-- As authenticated user (replace with real user_id)
SET ROLE authenticated;
SET REQUEST.JWT.CLAIMS = '{"sub":"YOUR_USER_ID"}';

-- Insert a trial capture
INSERT INTO onboarding_context_captures (
  user_id,
  trail_id,
  responses,
  trail_score,
  recommended_modules
) VALUES (
  'YOUR_USER_ID',
  'health-emotional',
  '{"q1":{"selectedAnswerIds":["a1"],"answeredAt":"2025-12-11T00:00:00Z"}}',
  7.5,
  ARRAY['module-1', 'module-2']
);

-- Should succeed
SELECT * FROM onboarding_context_captures;
-- Should show 1 row (RLS filters to own records)
```

**Test 2: Unique Constraint**
```sql
-- Try to insert duplicate (user_id, trail_id)
INSERT INTO onboarding_context_captures (
  user_id,
  trail_id,
  responses,
  trail_score,
  recommended_modules
) VALUES (
  'YOUR_USER_ID',
  'health-emotional',  -- Same trail!
  '{"q2":{"selectedAnswerIds":["a2"],"answeredAt":"2025-12-11T01:00:00Z"}}',
  8.0,
  ARRAY['module-3']
);

-- Should FAIL with unique constraint error
-- This is expected behavior (update existing instead)
```

**Test 3: Helper Functions**
```sql
-- Get completed trails for user
SELECT * FROM get_user_completed_trails('YOUR_USER_ID');

-- Expected output:
-- trail_id          | trail_score | recommended_modules | completed_at
-- health-emotional  | 7.5         | {module-1,module-2} | 2025-12-11...

-- Get onboarding status
SELECT * FROM get_onboarding_status('YOUR_USER_ID');

-- Expected output:
-- trails_completed | total_trails | all_recommended_modules | average_trail_score | is_onboarding_complete
-- 1                | 5            | {module-1,module-2}     | 7.5                 | false
```

**Test 4: RLS Security**
```sql
-- Switch to different user
SET ROLE authenticated;
SET REQUEST.JWT.CLAIMS = '{"sub":"OTHER_USER_ID"}';

-- Try to view records from first user
SELECT * FROM onboarding_context_captures;
-- Should return EMPTY (RLS blocks cross-user access)

-- Try to update first user's record
UPDATE onboarding_context_captures
SET trail_score = 10
WHERE trail_id = 'health-emotional';
-- Should return 0 rows (RLS blocks unauthorized update)
```

---

## Part 3: Security Audit

### Run Advisor Tools

```bash
cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend

# If using Supabase CLI
supabase query --project-ref YOUR_PROJECT_REF < - << 'EOF'
-- Check for missing RLS
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
EXCEPT
SELECT tablename FROM pg_tables WHERE rowsecurity = true;

-- Check for missing policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('file_search_corpora', 'onboarding_context_captures')
ORDER BY tablename;
EOF
```

### Manual Audit Checklist

- [ ] `onboarding_context_captures` table exists
- [ ] RLS is enabled (6 policies present)
- [ ] All indexes created (6 indexes)
- [ ] Helper functions accessible
- [ ] Unique constraint on (user_id, trail_id) works
- [ ] Check constraints on trail_id enum pass
- [ ] Check constraints on trail_score range pass
- [ ] Trigger updates `updated_at` on INSERT/UPDATE
- [ ] No direct table queries in policies (all use column comparisons)

---

## Part 4: Performance Monitoring

After deployment, monitor these metrics:

### Query Performance

```sql
-- Monitor slow queries
SELECT
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
WHERE query LIKE '%onboarding_context_captures%'
ORDER BY mean_exec_time DESC;
```

### Index Usage

```sql
-- Check index effectiveness
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'onboarding_context_captures'
ORDER BY idx_scan DESC;
```

### RLS Performance

```sql
-- Verify RLS isn't causing N+1 queries
-- Monitor pg_stat_statements for repeated subqueries
SELECT query, calls FROM pg_stat_statements
WHERE query LIKE '%auth.uid()%'
ORDER BY calls DESC;
```

---

## Part 5: Rollback Procedure

If issues occur, follow this rollback procedure:

### Rollback Code

```bash
# Revert fileSearchApiClient.ts to previous version
git log --oneline src/services/fileSearchApiClient.ts | head -5
git revert COMMIT_HASH

# Or manually revert to previous version
git checkout HEAD~1 src/services/fileSearchApiClient.ts
```

### Rollback Migration

If the migration causes issues:

```bash
# Option 1: Drop the migration
DROP TABLE onboarding_context_captures CASCADE;

-- This will remove:
-- - Table
-- - All RLS policies
-- - All indexes
-- - All triggers
-- - Helper functions (depends on CASCADE)

-- Option 2: Create a new migration to fix issues
-- See supabase/migrations/ for examples
```

---

## Part 6: Deployment Checklist

Use this checklist before deploying to production:

### Pre-Deployment
- [ ] Code reviewed (see CODE_REVIEW_DATABASE_FIXES.md)
- [ ] Migration file verified
- [ ] Database constraint confirmed (file_search_corpora unique)
- [ ] All tests pass locally
- [ ] No breaking changes to API signatures

### Deployment
- [ ] Apply migration to staging
- [ ] Deploy updated code to staging
- [ ] Run security audit on staging
- [ ] Test duplicate corpus creation on staging
- [ ] Test onboarding flow on staging
- [ ] Load test (concurrent corpus creation)

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Verify RLS policies working
- [ ] Test user isolation (cross-user access blocked)
- [ ] Confirm duplicate handling works
- [ ] Check index usage

### Production Verification
- [ ] All tables present
- [ ] All indexes present
- [ ] All policies present
- [ ] All functions accessible
- [ ] No errors in logs (12-24 hours post-deploy)

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Migration fails with "relation already exists"**
```
ERROR: relation "onboarding_context_captures" already exists
```

**Solution**: The table already exists. Either:
- Skip this migration if already applied
- Drop the table first: `DROP TABLE onboarding_context_captures CASCADE;`
- Run migration on clean database

**Issue 2: Corpus creation returns 409 Conflict**
```
Error creating corpus: duplicate key value violates unique constraint
```

**Solution**: This should now be handled gracefully. If still failing:
1. Verify file_search_corpora unique constraint exists
2. Check code was updated to latest version
3. Review logs for "Duplicate detected" message

**Issue 3: RLS blocks all queries**
```
Query returned no rows (expected some)
```

**Solution**:
1. Verify policies are attached to correct table
2. Check auth.uid() matches actual user_id
3. Verify RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'onboarding_context_captures'`

**Issue 4: Performance degradation**
```
Queries are slow after migration
```

**Solution**:
1. Check indexes were created: `SELECT * FROM pg_stat_user_indexes WHERE tablename = 'onboarding_context_captures'`
2. Analyze table: `ANALYZE onboarding_context_captures;`
3. Check query plans: `EXPLAIN ANALYZE SELECT ...`

### Contact & Escalation

For issues:
1. Check logs in Supabase dashboard
2. Review this document for common issues
3. Contact backend team with:
   - Error message (exact)
   - Query being run
   - User ID (if reproducible)
   - Timestamp of issue
   - Expected vs actual behavior

---

## Summary

**Status: Ready for deployment**

Both components are implemented and tested:
1. File search corpus duplicate handling - Code already updated
2. Onboarding context captures - Migration ready to apply

Follow the steps in this guide for safe deployment to production.

**Estimated Deployment Time**: 15-30 minutes total
**Estimated Testing Time**: 30-45 minutes
**Risk Level**: LOW (non-breaking changes, additive features)

---

## Quick Commands Reference

```bash
# Verify code
grep -n "createCorpus" src/services/fileSearchApiClient.ts

# Check migration
ls -la supabase/migrations/20251211_onboarding_context_captures.sql

# Apply migration (Supabase CLI)
supabase db push

# Test in Supabase SQL Editor
SELECT * FROM pg_tables WHERE tablename = 'onboarding_context_captures';

# Deploy code
git add src/services/fileSearchApiClient.ts
git commit -m "fix: Corpus duplicate handling"
git push origin main

# Verify production
# (Run verification queries in production database)
```

---

**Document Version**: 1.0
**Last Updated**: December 12, 2025
**Next Review**: After production deployment (1 week)
