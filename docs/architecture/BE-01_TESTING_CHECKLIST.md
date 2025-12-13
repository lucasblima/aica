# BE-01: Testing Checklist - Daily Reports Automation

## Pre-Deployment Testing

### Database Level Tests

#### Test 1: Function Exists and Has Correct Signature

**SQL**:
```sql
-- Verify function exists
SELECT proname, pronargs, prosecdef, proowner
FROM pg_proc
WHERE proname = 'generate_daily_report'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Expected result: 1 row with prosecdef = true
```

**Success Criteria**:
- [ ] Function exists
- [ ] Has SECURITY DEFINER flag (prosecdef = true)
- [ ] 2 parameters (UUID, DATE)

---

#### Test 2: Can Execute Function Directly

**SQL**:
```sql
-- Insert test data first
INSERT INTO users (id, email) VALUES (
  'test-user-1234::uuid'::uuid,
  'test@example.com'
)
ON CONFLICT DO NOTHING;

-- Test function execution
SELECT public.generate_daily_report(
  'test-user-1234::uuid'::uuid,
  CURRENT_DATE - 1
);

-- Expected: Returns a UUID (report_id)
```

**Success Criteria**:
- [ ] Function executes without error
- [ ] Returns a UUID value
- [ ] Report is created in daily_reports table

---

#### Test 3: Indexes Created for Performance

**SQL**:
```sql
-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN (
  'work_items',
  'daily_question_responses',
  'memories',
  'daily_reports'
)
ORDER BY tablename, indexname;
```

**Success Criteria**:
- [ ] `idx_work_items_user_date` exists
- [ ] `idx_daily_question_responses_user_date` exists
- [ ] `idx_memories_user_date_active` exists
- [ ] `idx_daily_reports_user_date` exists

---

#### Test 4: Function Handles Empty Data

**SQL**:
```sql
-- Create test user with no tasks
INSERT INTO users (id, email) VALUES (
  'empty-user-1234::uuid'::uuid,
  'empty@example.com'
)
ON CONFLICT DO NOTHING;

-- Execute function for this user
SELECT public.generate_daily_report(
  'empty-user-1234::uuid'::uuid,
  CURRENT_DATE
) AS report_id;

-- Verify report was created with defaults
SELECT *
FROM daily_reports
WHERE user_id = 'empty-user-1234::uuid'::uuid
AND report_date = CURRENT_DATE;

-- Expected:
-- - productivity_score = 0
-- - tasks_completed = 0
-- - tasks_total = 0
-- - mood_score = 0
-- - energy_level = 50 (default)
```

**Success Criteria**:
- [ ] Function completes without error
- [ ] Report created with sensible defaults
- [ ] No null values in required fields

---

#### Test 5: Function Calculates Metrics Correctly

**SQL**:
```sql
-- Setup: Create test user with known tasks
INSERT INTO users (id, email) VALUES (
  'calc-user-1234::uuid'::uuid,
  'calc@example.com'
)
ON CONFLICT DO NOTHING;

-- Create a personal association (required for user)
INSERT INTO associations (id, owner_id, name)
VALUES (
  'assoc-1234::uuid'::uuid,
  'calc-user-1234::uuid'::uuid,
  'Personal'
)
ON CONFLICT DO NOTHING;

-- Insert 10 tasks for today
INSERT INTO work_items (
  id, user_id, association_id, title, created_at
)
SELECT
  gen_random_uuid(),
  'calc-user-1234::uuid'::uuid,
  'assoc-1234::uuid'::uuid,
  'Task ' || i,
  CURRENT_TIMESTAMP
FROM generate_series(1, 10) AS i
ON CONFLICT DO NOTHING;

-- Mark 7 as completed
UPDATE work_items
SET completed_at = CURRENT_TIMESTAMP
WHERE user_id = 'calc-user-1234::uuid'::uuid
AND created_at::date = CURRENT_DATE
LIMIT 7;

-- Generate report
SELECT public.generate_daily_report(
  'calc-user-1234::uuid'::uuid,
  CURRENT_DATE
) AS report_id;

-- Verify calculations
SELECT
  tasks_completed,
  tasks_total,
  productivity_score,
  (tasks_completed::float / tasks_total::float * 100)::int AS expected_score
FROM daily_reports
WHERE user_id = 'calc-user-1234::uuid'::uuid
AND report_date = CURRENT_DATE;

-- Expected:
-- tasks_completed = 7
-- tasks_total = 10
-- productivity_score = 70
```

**Success Criteria**:
- [ ] Correct number of tasks counted
- [ ] Productivity score matches expected calculation
- [ ] No off-by-one errors

---

#### Test 6: UPSERT Works (Idempotent)

**SQL**:
```sql
-- First call
SELECT public.generate_daily_report(
  'calc-user-1234::uuid'::uuid,
  CURRENT_DATE
) AS report_id_1;

-- Second call (should update, not error)
SELECT public.generate_daily_report(
  'calc-user-1234::uuid'::uuid,
  CURRENT_DATE
) AS report_id_2;

-- Verify only one report exists
SELECT COUNT(*) as report_count
FROM daily_reports
WHERE user_id = 'calc-user-1234::uuid'::uuid
AND report_date = CURRENT_DATE;

-- Expected: report_count = 1
-- Both calls should return same UUID
```

**Success Criteria**:
- [ ] Second call doesn't create duplicate
- [ ] Both calls return same report_id
- [ ] No errors on conflict

---

### Application Level Tests

#### Test 7: Service Function Exists

**TypeScript**:
```typescript
// In browser console or test file:
import { generateDailyReport, generateMissingDailyReports } from './services/dailyReportService';

// Check functions are available
console.log(typeof generateDailyReport); // Should be 'function'
console.log(typeof generateMissingDailyReports); // Should be 'function'
```

**Success Criteria**:
- [ ] Both functions are importable
- [ ] Both are callable (type === 'function')

---

#### Test 8: Generate Report for Today

**TypeScript**:
```typescript
// In browser console after login:
import { generateDailyReport } from './services/dailyReportService';

const today = new Date().toISOString().split('T')[0];
const userId = 'your-actual-user-id'; // Get from auth

const result = await generateDailyReport(userId, today);

console.log('Result:', result);
// Expected output:
// {
//   success: true,
//   reportId: 'uuid-here'
// }

// If failed:
// {
//   success: false,
//   error: 'error message'
// }
```

**Success Criteria**:
- [ ] Function returns success = true
- [ ] reportId is a valid UUID
- [ ] No console errors

---

#### Test 9: Generate Missing Reports

**TypeScript**:
```typescript
// In browser console after login:
import { generateMissingDailyReports } from './services/dailyReportService';

const userId = 'your-actual-user-id'; // Get from auth

const result = await generateMissingDailyReports(userId);

console.log('Result:', result);
// Expected output:
// {
//   success: true,
//   daysGenerated: 5,
//   message: 'Generated 5 daily reports'
// }
```

**Success Criteria**:
- [ ] Function completes without error
- [ ] daysGenerated >= 0
- [ ] success = true
- [ ] Message describes action taken

---

#### Test 10: Check Today's Report Exists

**TypeScript**:
```typescript
// In browser console:
import { hasTodayReport } from './services/dailyReportService';

const userId = 'your-actual-user-id';

const hasReport = await hasTodayReport(userId);

console.log('Has today report:', hasReport);
// Expected: true (after Test 8) or false (if none exists)
```

**Success Criteria**:
- [ ] Returns boolean value
- [ ] Correctly reflects if report exists

---

#### Test 11: Fetch Specific Report

**TypeScript**:
```typescript
// In browser console:
import { getDailyReport } from './services/dailyReportService';

const userId = 'your-actual-user-id';
const today = new Date().toISOString().split('T')[0];

const report = await getDailyReport(userId, today);

console.log('Report:', report);
// Expected output if exists:
// {
//   id: 'uuid',
//   user_id: 'uuid',
//   report_date: '2025-12-12',
//   tasks_completed: 5,
//   tasks_total: 10,
//   productivity_score: 50,
//   mood_score: 0.2,
//   energy_level: 75,
//   stress_level: 25,
//   active_modules: ['Health', 'Finances'],
//   memory_ids: ['uuid1', 'uuid2'],
//   created_at: '2025-12-12T10:30:00.000Z',
//   updated_at: '2025-12-12T10:30:00.000Z'
// }
```

**Success Criteria**:
- [ ] Returns report object or null
- [ ] All expected fields present
- [ ] Data types are correct

---

#### Test 12: Integration with App.tsx

**TypeScript** (in App.tsx or test):
```typescript
// Simulating auth flow:
import { generateMissingDailyReports } from './services/dailyReportService';

// This should be called after user login
const user = { id: 'test-user-uuid' };

const result = await generateMissingDailyReports(user.id);

console.log('Daily reports generated on login:', result);
// Expected: success = true, daysGenerated >= 0
```

**Success Criteria**:
- [ ] Function called without blocking app
- [ ] Handles errors gracefully
- [ ] App continues loading even if generation fails

---

### UI Tests

#### Test 13: EfficiencyTrendChart Shows Data

**Manual Steps**:
1. Log in as user with tasks from past 30 days
2. Navigate to page with `EfficiencyTrendChart` component
3. Wait for component to load

**Expected Results**:
- [ ] Chart renders (not "A mente está silenciosa hoje")
- [ ] Shows efficiency line chart with data points
- [ ] Statistics display (Média, Máximo, Dias Excelentes)
- [ ] Productivity distribution shows breakdown
- [ ] 7d, 14d, 30d buttons work to change timeframe

---

#### Test 14: EfficiencyTrendChart Empty State

**Manual Steps**:
1. Log in as brand new user (no tasks)
2. Navigate to page with `EfficiencyTrendChart` component

**Expected Results**:
- [ ] Component shows "A mente está silenciosa hoje" message
- [ ] No console errors
- [ ] Component gracefully handles empty data

---

### Performance Tests

#### Test 15: Single Report Generation Time

**Measurement**:
```typescript
import { generateDailyReport } from './services/dailyReportService';

const userId = 'your-user-id';
const today = new Date().toISOString().split('T')[0];

console.time('generateDailyReport');
const result = await generateDailyReport(userId, today);
console.timeEnd('generateDailyReport');

// Expected: < 200ms
```

**Success Criteria**:
- [ ] Completes in < 200ms
- [ ] No timeout errors
- [ ] CPU usage reasonable (< 50%)

---

#### Test 16: Missing Reports Generation Time

**Measurement**:
```typescript
import { generateMissingDailyReports } from './services/dailyReportService';

const userId = 'your-user-id';

console.time('generateMissingDailyReports');
const result = await generateMissingDailyReports(userId);
console.timeEnd('generateMissingDailyReports');

console.log('Days generated:', result.daysGenerated);
console.log('Average time per day:', (performance.now() - startTime) / result.daysGenerated);

// Expected:
// - Total time: < 5s for 30 days
// - Per day: < 200ms
```

**Success Criteria**:
- [ ] 30 days < 5 seconds
- [ ] Batching working (not sequential)
- [ ] No memory leaks

---

### Security Tests

#### Test 17: RLS Policies Enforced

**SQL**:
```sql
-- Verify RLS is enabled on daily_reports
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'daily_reports';

-- Expected: rowsecurity = true

-- Verify policies exist
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'daily_reports'
ORDER BY policyname;

-- Expected: Multiple policies for SELECT, INSERT, UPDATE, DELETE
```

**Success Criteria**:
- [ ] RLS is enabled
- [ ] Policies exist for all operations
- [ ] Users cannot access other users' reports

---

#### Test 18: Function Uses SECURITY DEFINER

**SQL**:
```sql
-- Verify SECURITY DEFINER
SELECT prosecdef
FROM pg_proc
WHERE proname = 'generate_daily_report';

-- Expected: true

-- This means function runs with creator's permissions
-- Even authenticated users can call it safely
```

**Success Criteria**:
- [ ] prosecdef = true
- [ ] Function safe for use by authenticated users

---

## Test Execution Plan

### Phase 1: Database Tests (15 minutes)
Run Tests 1-6 in Supabase SQL Editor

```bash
# Expected output: All 6 tests pass
# If any fail, fix SQL before proceeding
```

### Phase 2: Application Tests (10 minutes)
Run Tests 7-11 in browser console after login

```bash
# After each test, check console for success
# If errors, debug service code
```

### Phase 3: Integration Tests (10 minutes)
Run Tests 12-14 with actual app

```bash
# Login to app
# Check EfficiencyTrendChart displays data
# Verify no console errors
```

### Phase 4: Performance Tests (5 minutes)
Run Tests 15-16 to validate speed

```bash
# All tests should complete < target time
# If slow, review query performance
```

### Phase 5: Security Tests (5 minutes)
Run Tests 17-18 to confirm isolation

```bash
# RLS should be enforced
# Function should use SECURITY DEFINER
```

---

## Troubleshooting Guide

### If Test Fails: "function does not exist"

**Cause**: Migration not executed

**Fix**:
1. Go to Supabase SQL Editor
2. Paste `20251212_daily_reports_generation.sql`
3. Click Execute
4. Re-run test

---

### If Test Fails: "permission denied"

**Cause**: Insufficient privileges

**Fix**:
1. Use project owner/admin account
2. Or grant explicit permissions:
   ```sql
   GRANT EXECUTE ON FUNCTION public.generate_daily_report TO authenticated;
   ```

---

### If Test Fails: "no data returned"

**Cause**: No tasks exist for test user

**Fix**:
1. Create test tasks manually:
   ```sql
   INSERT INTO work_items (user_id, association_id, title, created_at)
   VALUES (...)
   ```
2. Mark some as completed:
   ```sql
   UPDATE work_items SET completed_at = NOW() WHERE id = ...
   ```

---

### If Tests Pass But UI Shows No Data

**Troubleshooting**:
1. Verify reports were created:
   ```sql
   SELECT COUNT(*) FROM daily_reports WHERE user_id = '...';
   ```
2. Check browser console for errors
3. Clear browser cache and reload
4. Verify auth.uid() matches user_id in reports

---

## Acceptance Criteria

All of the following must pass for release:

- [ ] All Database Tests pass (1-6)
- [ ] All Application Tests pass (7-11)
- [ ] Integration tests pass (12-14)
- [ ] Performance tests pass (15-16)
- [ ] Security tests pass (17-18)
- [ ] EfficiencyTrendChart displays real data
- [ ] No console errors
- [ ] Generation time < 5s for 30 days
- [ ] RLS enforced (no data leakage)

---

**Total Testing Time**: ~45 minutes
**Success Rate Target**: 100%

---

*Last updated: 2025-12-12*
