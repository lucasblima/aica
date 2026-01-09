# RLS Security Audit Report - Unified Timeline Feature

**Audit Date:** 2026-01-09
**Auditor:** Security & Privacy Agent
**Scope:** Row Level Security policies for Journey module Unified Timeline
**Compliance:** GDPR Article 32 (Security of Processing), LGPD Article 46

---

## Executive Summary

This audit examined Row Level Security (RLS) implementation for the Unified Timeline feature in the Journey module, which aggregates data from 7+ database tables. The audit identified **CRITICAL security gaps** that require immediate remediation to prevent unauthorized data access between users.

### Overall Security Posture

| Metric | Status |
|--------|--------|
| **Total Tables Audited** | 7 core tables + 3 supporting tables |
| **RLS Enabled** | 6 out of 7 (85.7%) |
| **Complete CRUD Policies** | 4 out of 7 (57.1%) |
| **Auth.uid() Enforcement** | 5 out of 7 (71.4%) |
| **Overall Rating** | ⚠️ **HIGH RISK - NEEDS IMMEDIATE ACTION** |

---

## 1. Tables Audited

The Unified Timeline service (`src/modules/journey/services/unifiedTimelineService.ts`) queries these tables:

### Core Timeline Tables
1. `whatsapp_messages` - Stores WhatsApp message history (privacy-sensitive)
2. `moments` - User journal moments (audio, text, emotions)
3. `tasks` / `work_items` - Task management (Atlas module integration)
4. `question_responses` - User responses to daily questions
5. `weekly_summaries` - AI-generated weekly summaries
6. `whatsapp_user_activity` - Activity tracking for gamification
7. `user_activities` - General user activity log

### Supporting Tables (Not Directly Queried)
- `grant_responses` - Grant approval workflow
- `daily_questions` - Question pool (public read)

---

## 2. Critical Findings

### 🔴 CRITICAL SEVERITY

#### Finding 1: Task Table Name Mismatch
**Location:** `unifiedTimelineService.ts` line 281
**Issue:** Service queries `tasks` table but schema defines `work_items` table

**Vulnerability:**
```typescript
// ❌ CURRENT CODE - queries non-existent table
let query = supabase
  .from('tasks')  // This table does not exist in migrations
  .select('*')
  .eq('user_id', userId)
```

**Impact:**
- Query silently fails, returning empty results
- RLS policies for `work_items` are never enforced
- If `tasks` table exists from legacy migration, it may lack RLS entirely

**Remediation:**
```typescript
// ✅ CORRECTED CODE
let query = supabase
  .from('work_items')  // Correct table name
  .select('*')
  .eq('user_id', userId)
```

**GDPR Impact:** Article 32 violation - inadequate security measures
**Priority:** **CRITICAL - Fix immediately before production use**

---

#### Finding 2: daily_questions Missing INSERT Policy
**Location:** `supabase/migrations/20251217_daily_questions_ai_integration.sql`

**Current RLS Policies:**
```sql
-- ✅ EXISTS: Public read for active questions
CREATE POLICY "Anyone can view active questions"
  ON daily_questions FOR SELECT
  USING (active = true);

-- ❌ MISSING: INSERT policy
-- ❌ MISSING: UPDATE policy
-- ❌ MISSING: DELETE policy
```

**Vulnerability:**
- `daily_questions` table extends with user-specific AI-generated questions
- Column `journey_id` (line 46) references `user_journeys(id)` - user-specific data
- Column `created_by_ai` (line 50) flags AI-generated questions
- **Without RLS, any authenticated user can insert questions for any user**

**Attack Scenario:**
```sql
-- Attacker inserts malicious question for victim user
INSERT INTO daily_questions (question_text, journey_id, created_by_ai)
VALUES (
  'What is your bank password?',  -- Malicious question
  '<victim-journey-id>',  -- Victim's journey
  true
);
```

**Remediation Required:**
```sql
-- Allow AI service (via Edge Function with service role) to insert
CREATE POLICY "Service role can insert AI questions"
  ON daily_questions FOR INSERT
  TO service_role
  WITH CHECK (created_by_ai = true);

-- Users cannot insert questions directly
CREATE POLICY "Users cannot insert questions"
  ON daily_questions FOR INSERT
  TO authenticated
  WITH CHECK (false);
```

**GDPR Impact:** GDPR Article 32 + Article 5(1)(f) (Integrity and confidentiality)
**Priority:** **CRITICAL**

---

#### Finding 3: question_responses Incomplete Policy Coverage
**Location:** `supabase/migrations/20251206_journey_redesign.sql` lines 167-175

**Current RLS Policies:**
```sql
-- ✅ EXISTS: SELECT policy
CREATE POLICY "Users can view own responses"
  ON question_responses FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ EXISTS: INSERT policy
CREATE POLICY "Users can insert own responses"
  ON question_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ❌ MISSING: UPDATE policy
-- ❌ MISSING: DELETE policy
```

**Vulnerability:**
- Users can view and insert, but no policy for updating responses
- Users cannot edit mistaken responses
- Users cannot exercise GDPR Right to Erasure (Article 17)

**Attack Surface:**
- Without DELETE policy, users cannot self-delete their responses
- Violates data minimization principle (GDPR Article 5(1)(c))

**Remediation:**
```sql
-- Allow users to update their own responses
CREATE POLICY "Users can update own responses"
  ON question_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own responses (GDPR Right to Erasure)
CREATE POLICY "Users can delete own responses"
  ON question_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**GDPR Impact:** Article 17 (Right to Erasure) non-compliance
**Priority:** **CRITICAL**

---

### 🟠 HIGH SEVERITY

#### Finding 4: user_activities Table Not Verified
**Location:** `unifiedTimelineService.ts` line 438

**Issue:**
- Service queries `user_activities` table
- No migration file found defining this table
- Cannot verify RLS policies exist

**Investigation Required:**
```bash
# Search for user_activities table definition
grep -r "CREATE TABLE.*user_activities" supabase/migrations/
```

**Possible Scenarios:**
1. Table does not exist → query fails silently
2. Table exists without RLS → **CRITICAL data leakage**
3. Table exists with RLS → needs verification

**Remediation:**
- Locate or create table migration
- Verify RLS enabled
- Add complete CRUD policies

**Priority:** **HIGH - Investigate immediately**

---

#### Finding 5: whatsapp_messages Uses SECURITY DEFINER Function
**Location:** `supabase/migrations/20260110_fix_rls_whatsapp_messages.sql` lines 49-71

**Current Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.user_owns_whatsapp_message(
  _user_id UUID,
  _message_user_id UUID,
  _contact_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Runs with elevated privileges
SET search_path = public
AS $$
BEGIN
  -- Direct ownership check
  IF _message_user_id = _user_id THEN
    RETURN TRUE;
  END IF;

  -- Check via contact_network
  RETURN EXISTS (
    SELECT 1 FROM contact_network
    WHERE id = _contact_id
      AND user_id = _user_id
  );
END;
$$;
```

**Security Review:**
- ✅ **GOOD:** `SET search_path = public` prevents schema manipulation attacks
- ✅ **GOOD:** Function logic is correct (checks ownership)
- ⚠️ **CONCERN:** SECURITY DEFINER bypasses RLS on `contact_network` query
- ⚠️ **CONCERN:** If `contact_network` has RLS issues, this function inherits them

**Recommendation:**
1. Verify `contact_network` has robust RLS policies
2. Add comment documenting why SECURITY DEFINER is required
3. Consider adding audit logging to function calls

**Priority:** **HIGH - Verify contact_network security**

---

### 🟡 MEDIUM SEVERITY

#### Finding 6: weekly_summaries Missing INSERT/DELETE Policies
**Location:** `supabase/migrations/20251206_journey_redesign.sql` lines 99-105

**Current RLS Policies:**
```sql
-- ✅ EXISTS: SELECT policy
CREATE POLICY "Users can view own summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ EXISTS: UPDATE policy
CREATE POLICY "Users can update own summaries"
  ON weekly_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- ❌ MISSING: INSERT policy (summaries generated by Edge Functions)
-- ❌ MISSING: DELETE policy (GDPR compliance)
```

**Context:**
- Weekly summaries are AI-generated via Edge Functions (service role)
- Users should be able to add reflections (UPDATE exists)
- Users should be able to delete summaries (GDPR Right to Erasure)

**Remediation:**
```sql
-- Service role can insert AI-generated summaries
CREATE POLICY "Service role can insert summaries"
  ON weekly_summaries FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can delete their own summaries
CREATE POLICY "Users can delete own summaries"
  ON weekly_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**GDPR Impact:** Article 17 (Right to Erasure) partial compliance
**Priority:** **MEDIUM**

---

#### Finding 7: whatsapp_user_activity Missing UPDATE/DELETE Policies
**Location:** `supabase/migrations/20250101_whatsapp_gamification_tracking.sql` lines 52-61

**Current RLS Policies:**
```sql
-- ✅ EXISTS: SELECT policy
CREATE POLICY "Users can view own whatsapp activities"
  ON whatsapp_user_activity FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ EXISTS: INSERT policy
CREATE POLICY "Users can insert own whatsapp activities"
  ON whatsapp_user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ❌ MISSING: UPDATE policy
-- ❌ MISSING: DELETE policy
```

**Impact:**
- Activity log is append-only (INSERT + SELECT)
- Users cannot correct mistaken activity entries
- Users cannot delete activity history (GDPR concern)

**Recommendation:**
- For immutable audit logs, missing UPDATE/DELETE is acceptable
- **However**, GDPR Right to Erasure requires DELETE capability
- Add DELETE policy with audit logging

**Remediation:**
```sql
-- Users can delete their own activity records (GDPR compliance)
CREATE POLICY "Users can delete own activities"
  ON whatsapp_user_activity FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Optional: Prevent updates to maintain audit integrity
CREATE POLICY "Activities cannot be updated"
  ON whatsapp_user_activity FOR UPDATE
  TO authenticated
  USING (false);
```

**Priority:** **MEDIUM**

---

## 3. Verified Secure Tables

### ✅ whatsapp_messages
**Status:** SECURE (after 20260110 migration)
**Policies:** Complete CRUD coverage
**Auth Method:** `auth.uid()` via SECURITY DEFINER function
**Notes:** Uses `user_owns_whatsapp_message()` helper function

### ✅ moments
**Status:** SECURE
**Policies:** Complete CRUD coverage (SELECT, INSERT, UPDATE, DELETE)
**Auth Method:** `auth.uid() = user_id`
**Migration:** `20251206_journey_redesign.sql` lines 39-56

### ✅ work_items
**Status:** SECURE
**Policies:** Complete CRUD coverage
**Auth Method:** `auth.uid() = user_id`
**Migration:** `20251208_create_work_items_table.sql` lines 84-102
**Note:** Service queries wrong table name (`tasks` instead of `work_items`)

---

## 4. Compliance Assessment

### GDPR Article 32 - Security of Processing
**Status:** ⚠️ **PARTIAL COMPLIANCE**

**Compliant:**
- RLS enabled on most tables (6/7)
- Use of `auth.uid()` prevents client-side tampering
- `SET search_path = public` in SECURITY DEFINER functions

**Non-Compliant:**
- `daily_questions` allows unrestricted INSERT
- Table name mismatch bypasses RLS enforcement
- Missing DELETE policies prevent Right to Erasure

**Recommendation:** Implement missing policies before GDPR audit

---

### GDPR Article 17 - Right to Erasure
**Status:** ❌ **NON-COMPLIANT**

**Missing DELETE Policies:**
1. `question_responses` - Cannot delete responses
2. `weekly_summaries` - Cannot delete summaries
3. `whatsapp_user_activity` - Cannot delete activity logs
4. `user_activities` - Not verified

**Legal Risk:**
- Data subjects cannot exercise Right to Erasure
- 4% global turnover fine risk (GDPR Article 83)

**Priority Action:** Add DELETE policies within 30 days

---

### LGPD Article 46 - Security & Prevention
**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Compliant:**
- Technical measures implemented (RLS)
- Encryption at rest (Supabase default AES-256)
- Audit trails via `created_at` timestamps

**Non-Compliant:**
- Incomplete access controls (missing policies)
- Lack of data subject rights implementation

---

## 5. OWASP Top 10 Assessment

### A01: Broken Access Control
**Status:** ⚠️ **VULNERABLE**

**Findings:**
- Table name mismatch bypasses RLS
- Missing INSERT policy allows privilege escalation
- Horizontal privilege escalation prevented by existing policies

**Test Case:**
```sql
-- Without proper RLS, attacker could:
SET ROLE authenticated;
SET request.jwt.claim.sub TO '<attacker-uuid>';

-- This should fail but might succeed if RLS missing:
INSERT INTO daily_questions (question_text, journey_id, created_by_ai)
VALUES ('Malicious question', '<victim-journey-id>', true);
```

---

### A03: Injection
**Status:** ✅ **PROTECTED**

**Assessment:**
- Supabase client uses parameterized queries
- No raw SQL string concatenation detected
- SECURITY DEFINER functions use `SET search_path = public`

---

## 6. Remediation Roadmap

### Phase 1: CRITICAL (Complete within 48 hours)
1. ✅ Fix table name mismatch: `tasks` → `work_items` in service code
2. ✅ Add INSERT policy to `daily_questions` (service role only)
3. ✅ Add UPDATE/DELETE policies to `question_responses`
4. ✅ Verify `user_activities` table exists and has RLS

### Phase 2: HIGH (Complete within 1 week)
1. ✅ Audit `contact_network` RLS (dependency of `whatsapp_messages`)
2. ✅ Add DELETE policies for GDPR compliance
3. ✅ Run verification script (`verify_rls_policies.sql`)

### Phase 3: MEDIUM (Complete within 2 weeks)
1. ✅ Add INSERT policy to `weekly_summaries` (service role)
2. ✅ Add DELETE policy to `whatsapp_user_activity`
3. ✅ Document SECURITY DEFINER functions
4. ✅ Create E2E RLS tests

### Phase 4: ONGOING
1. ✅ Quarterly RLS policy reviews
2. ✅ Automated RLS testing in CI/CD
3. ✅ Monitor Supabase security advisories

---

## 7. Testing Recommendations

### Test Case 1: User Isolation
```sql
-- Create two test users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@test.com');

-- Insert data for user1
SET ROLE authenticated;
SET request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111';
INSERT INTO moments (user_id, content) VALUES
  ('11111111-1111-1111-1111-111111111111', 'User 1 private moment');

-- Switch to user2 and attempt access
SET request.jwt.claim.sub TO '22222222-2222-2222-2222-222222222222';
SELECT * FROM moments WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 0 rows (RLS blocks cross-user access)
```

### Test Case 2: INSERT Privilege Escalation
```sql
-- Attempt to insert data for another user
SET ROLE authenticated;
SET request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111';

INSERT INTO moments (user_id, content) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Malicious insert');
-- Expected: ERROR - RLS policy violation
```

### Test Case 3: DELETE for GDPR
```sql
-- User should be able to delete own data
SET ROLE authenticated;
SET request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111';

DELETE FROM question_responses WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Expected: Success (if DELETE policy exists)
```

---

## 8. Recommendations

### Immediate Actions
1. ✅ Apply migration `20260109_add_missing_rls_policies.sql` (see separate file)
2. ✅ Fix service code: `tasks` → `work_items`
3. ✅ Run `verify_rls_policies.sql` to confirm fixes
4. ✅ Deploy to staging and run manual tests

### Architecture Improvements
1. ✅ Standardize table naming conventions (avoid `tasks`/`work_items` confusion)
2. ✅ Add RLS verification to CI/CD pipeline
3. ✅ Document all SECURITY DEFINER functions with security rationale
4. ✅ Implement soft-delete pattern for audit trail compliance

### Monitoring
1. ✅ Enable Supabase RLS logging
2. ✅ Alert on RLS policy violations
3. ✅ Quarterly security audits

---

## 9. References

- GDPR Article 32: https://gdpr-info.eu/art-32-gdpr/
- GDPR Article 17: https://gdpr-info.eu/art-17-gdpr/
- LGPD Article 46: http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Supabase RLS Best Practices: https://supabase.com/docs/guides/auth/row-level-security
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

## 10. Audit Approval

**Auditor:** Security & Privacy Agent
**Date:** 2026-01-09
**Status:** ⚠️ **REQUIRES REMEDIATION BEFORE APPROVAL**

**Next Review:** After Phase 1 remediation complete

---

**End of Report**
