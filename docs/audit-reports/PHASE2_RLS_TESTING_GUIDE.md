# Phase 2.3: RLS Policy Testing Guide

**Issue**: #73 Phase 2 - Performance & Indexes
**Task**: 2.3 - RLS Policy Testing (Cross-User Access)
**Date**: 2026-01-10
**Environment**: Staging (uzywajqzbdbrfammshdg)

---

## Overview

This guide walks through testing RLS policies to ensure:
- ✅ Users can only see their own data
- ✅ Users cannot modify other users' data
- ✅ Global data (user_id = NULL) is accessible to all
- ✅ Cross-user access attempts are properly blocked

---

## Prerequisites

- ✅ Phase 1 migrations applied (20 policies, 2 functions, 3 indexes)
- ✅ Phase 2.2 audit passed (all 4/4 checks)
- ✅ Access to Supabase Dashboard
- ✅ 2 test user accounts created in staging

---

## Step 1: Create Test User Accounts

### Create Test User 1

1. Go to: https://supabase.com/dashboard
2. Project: **uzywajqzbdbrfammshdg**
3. Navigate to: **Authentication** → **Users**
4. Click: **+ Add user**

**Test User 1:**
```
Email: test.user1@staging.test
Password: TestUser1Pass123!
```

**Copy User ID** (you'll need it for testing): `user_id_1`

### Create Test User 2

**Test User 2:**
```
Email: test.user2@staging.test
Password: TestUser2Pass123!
```

**Copy User ID**: `user_id_2`

---

## Step 2: Prepare Test Data

Insert test data for each user:

### SQL: Insert Test Data

```sql
-- Run this in SQL Editor with service role (automatic in Dashboard)

-- INSERT DATA FOR USER 1
INSERT INTO ai_usage_tracking_errors
  (user_id, error_type, error_message, model_used)
VALUES
  ('USER_ID_1', 'rate_limit', 'API rate limit exceeded', 'gemini-1.5-flash');

INSERT INTO daily_questions
  (user_id, question_text, answer_text, date_asked)
VALUES
  ('USER_ID_1', 'How was my day?', 'Productive', CURRENT_DATE);

-- INSERT DATA FOR USER 2
INSERT INTO ai_usage_tracking_errors
  (user_id, error_type, error_message, model_used)
VALUES
  ('USER_ID_2', 'connection_error', 'Network timeout', 'gemini-1.5-pro');

INSERT INTO daily_questions
  (user_id, question_text, answer_text, date_asked)
VALUES
  ('USER_ID_2', 'What did I learn?', 'RLS security patterns', CURRENT_DATE);

-- INSERT GLOBAL DATA (visible to all)
INSERT INTO daily_questions
  (user_id, question_text, answer_text, date_asked)
VALUES
  (NULL, 'What is today?', 'A learning opportunity', CURRENT_DATE);
```

**Replace:**
- `USER_ID_1` with actual test user 1 UUID
- `USER_ID_2` with actual test user 2 UUID

---

## Step 3: Test RLS Policies

### Test Scenario 1: User 1 Can Only See Own Data

**What to test:**
- User 1 logs in
- Views their own `ai_usage_tracking_errors`
- Should see: 1 record (rate_limit error)
- Should NOT see: User 2's error (connection_error)

**Manual Test (via App):**
1. Open app: https://aica-staging-5562559893.southamerica-east1.run.app
2. Login as: `test.user1@staging.test`
3. Navigate to errors/logs page (if available)
4. **Verify:** Only see their own rate_limit error
5. **Confirm:** Do NOT see user 2's connection_error

**Expected Result:** ✅ PASS

---

### Test Scenario 2: Global Data Is Visible to All

**What to test:**
- Both users can see global questions (user_id = NULL)
- CRUD operations respect ownership for personal data
- But global data is read-only

**Manual Test:**
1. Login as User 1
2. View daily_questions
3. **Should see:**
   - "How was my day?" (personal, user_id_1)
   - "What is today?" (global, user_id = NULL)
4. **Should NOT see:**
   - "What did I learn?" (personal to user_id_2)

**Expected Result:** ✅ PASS

---

### Test Scenario 3: User Cannot Modify Other User's Data

**What to test:**
- User 1 tries to UPDATE User 2's question
- Should get permission denied error
- Data should remain unchanged

**Manual Test (via SQL Editor with User 1 session):**

```sql
-- Attempt to update user 2's question as user 1
-- This should FAIL with permission denied

UPDATE daily_questions
SET answer_text = 'HACKED'
WHERE user_id = 'USER_ID_2'
  AND question_text = 'What did I learn?';

-- Expected: ERROR - permission denied
-- User 1 cannot access user 2's data
```

**Expected Result:** ✅ PASS (gets error, data unchanged)

---

### Test Scenario 4: User Cannot Delete Other User's Data

**What to test:**
- User 1 tries to DELETE User 2's error log
- Should get permission denied
- Record should still exist

**Manual Test:**

```sql
-- Attempt to delete user 2's error as user 1
DELETE FROM ai_usage_tracking_errors
WHERE user_id = 'USER_ID_2';

-- Expected: ERROR - permission denied
-- Or: 0 rows deleted (if silently blocked)

-- Verify data still exists
SELECT * FROM ai_usage_tracking_errors
WHERE user_id = 'USER_ID_2';
-- Should return: 1 row (connection_error)
```

**Expected Result:** ✅ PASS (error or 0 rows affected)

---

### Test Scenario 5: WhatsApp Messages - Contact Network

**What to test:**
- User 1 can only see messages from their own contacts
- User 1 cannot see messages from User 2's contacts

**Setup:**
```sql
-- Create contacts for User 1
INSERT INTO contact_network (user_id, contact_name, contact_phone)
VALUES ('USER_ID_1', 'Alice', '5511999999999');

-- Create contacts for User 2
INSERT INTO contact_network (user_id, contact_name, contact_phone)
VALUES ('USER_ID_2', 'Bob', '5511988888888');

-- User 1 sends message to Alice
INSERT INTO whatsapp_messages
  (user_id, contact_id, message_text, message_direction)
SELECT 'USER_ID_1', id, 'Hello Alice', 'outgoing'
FROM contact_network
WHERE user_id = 'USER_ID_1' AND contact_name = 'Alice';

-- User 2 sends message to Bob
INSERT INTO whatsapp_messages
  (user_id, contact_id, message_text, message_direction)
SELECT 'USER_ID_2', id, 'Hello Bob', 'outgoing'
FROM contact_network
WHERE user_id = 'USER_ID_2' AND contact_name = 'Bob';
```

**Test:**
```sql
-- Login as User 1, query messages
-- Should see: only Alice messages
-- Should NOT see: Bob messages

SELECT * FROM whatsapp_messages;
-- Expected: 1 row (message to Alice)
```

**Expected Result:** ✅ PASS

---

## Step 4: Security-Focused Tests

### Test 4.1: Direct SQL Injection Attempt

**What to test:**
- RLS still applies even if someone tries SQL injection
- Policies protect against unauthorized queries

**Test:**
```sql
-- Try to select all records (without RLS restrictions)
-- RLS should automatically filter by auth.uid()

SELECT COUNT(*) FROM ai_usage_tracking_errors;
-- Expected: Only user's own count (1 if user 1)
-- NOT: All records in table
```

**Expected Result:** ✅ PASS

---

### Test 4.2: INSERT Violation Check

**What to test:**
- User 1 tries to INSERT data with User 2's user_id
- Should fail (WITH CHECK clause enforces auth.uid())

**Test:**
```sql
-- User 1 logged in, try to create error for User 2
INSERT INTO ai_usage_tracking_errors
  (user_id, error_type, error_message)
VALUES ('USER_ID_2', 'fake_error', 'Should fail');

-- Expected: ERROR - new row violates row-level security policy
```

**Expected Result:** ✅ PASS (error thrown)

---

### Test 4.3: SECURITY DEFINER Function Verification

**What to test:**
- `can_access_daily_question()` works correctly
- Allows access to own questions
- Allows access to global questions (user_id = NULL)
- Blocks access to other users' questions

**Test:**
```sql
-- User 1 can see own question
SELECT * FROM daily_questions
WHERE question_text = 'How was my day?';
-- Expected: 1 row

-- User 1 can see global question
SELECT * FROM daily_questions
WHERE user_id IS NULL;
-- Expected: 1 row (global question)

-- User 1 cannot see User 2's question
SELECT * FROM daily_questions
WHERE question_text = 'What did I learn?';
-- Expected: 0 rows (silently filtered by RLS)
```

**Expected Result:** ✅ PASS

---

## Summary: Success Criteria

Phase 2.3 is **PASS** when:

- ✅ Test 1: User sees only own data (not other users')
- ✅ Test 2: Global data visible to all
- ✅ Test 3: Update attempts blocked with error
- ✅ Test 4: Delete attempts blocked with error
- ✅ Test 5: WhatsApp messages properly isolated
- ✅ Test 4.1: SQL injection attempts still blocked
- ✅ Test 4.2: INSERT with wrong user_id rejected
- ✅ Test 4.3: SECURITY DEFINER functions work correctly

---

## Troubleshooting

### Issue: User sees other users' data

**Symptom:** User 1 can see User 2's records

**Diagnosis:**
1. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'ai_usage%';`
2. Check policies exist: `SELECT policyname FROM pg_policies WHERE tablename = 'ai_usage_tracking_errors';`

**Fix:**
```sql
-- Re-enable RLS
ALTER TABLE ai_usage_tracking_errors ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'ai_usage_tracking_errors';
```

---

### Issue: Cannot INSERT own data

**Symptom:** Getting "WITH CHECK violation" when trying to insert own data

**Diagnosis:**
1. Verify you're logged in (check `auth.uid()`)
2. Check policy logic in policy definition

**Test:**
```sql
-- Check your current auth.uid()
SELECT auth.uid();

-- Verify you're inserting with correct user_id
SELECT current_user;
```

---

### Issue: Global data (user_id = NULL) not visible

**Symptom:** User cannot see global questions

**Diagnosis:**
- `can_access_daily_question()` function may have issue
- Or global question doesn't exist

**Fix:**
```sql
-- Check function definition
SELECT pg_get_functiondef('can_access_daily_question'::regprocedure);

-- Check global questions exist
SELECT * FROM daily_questions WHERE user_id IS NULL;

-- Test function directly
SELECT can_access_daily_question(NULL, '12345678-1234-1234-1234-123456789012');
-- Expected: true (should allow access to global questions)
```

---

## Next Steps

After Phase 2.3 passes:

- **Phase 2.4:** Create 13 performance indexes (identify slow queries)
- **Phase 2.5:** Run performance baseline (measure query times)
- **Phase 2.6:** Migration cleanup (consolidate history)

---

## References

- **RLS Documentation:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **SECURITY DEFINER Functions:** https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY
- **Test Data Setup:** See SQL examples in Step 2
- **Issue #73:** Database Security & Integrity Audit

---

**Status**: Ready for Manual Testing
**Tester**: Lucas Boscacci Lima
**Next Review**: After testing complete
