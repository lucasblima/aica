# Journey Module Error Fix - Issues #167, #168, #169

**Date:** 2026-01-29
**Status:** ✅ Ready to Apply
**Migration:** `20260129_fix_journey_module_errors.sql`

---

## 🔴 PROBLEM SUMMARY

The Journey module ("Vida" page) is experiencing two critical errors in production:

1. **RPC Error 400**: `ensure_user_profile_exists` function does not exist
2. **Edge Function 401**: `generate-questions` returns Unauthorized (multiple retries)

These errors prevent users from accessing the Journey module features.

---

## 📊 ROOT CAUSE ANALYSIS

### Error 1: RPC 400 Bad Request

**Stack Trace:**
```
POST https://uzywajqzbdbrfammshdg.supabase.co/rest/v1/rpc/ensure_user_profile_exists
Status: 400 (Bad Request)
```

**Root Cause:**
The RPC function `ensure_user_profile_exists` was defined in migration files but **never applied to production database**.

**Evidence:**
- Migration `20260129000000_fix_schema_issues_167_168_169_FIXED.sql` defines the function (lines 117-126)
- Migration `APPLY_SCHEMA_FIX_SAFE.sql` also defines the function (lines 81-90)
- Both files exist in `supabase/migrations/` but are NOT in applied migrations list
- Frontend code calls this RPC in `src/services/supabaseService.ts:121`

**Call Chain:**
```
LifeWeeksGrid.tsx:67
  → getUserProfile(userId)
    → supabaseService.ts:118-121
      → supabase.rpc('ensure_user_profile_exists', { p_user_id: userId })
        → ❌ 400 Bad Request (function not found)
```

**Missing Database Objects:**
- ❌ Table `public.user_profiles` (may not exist or missing columns)
- ❌ RPC function `public.ensure_user_profile_exists(UUID)`
- ❌ Table `public.profiles` (missing columns: `birthdate`, `birth_date`, `country`)

---

### Error 2: Edge Function 401 Unauthorized

**Stack Trace:**
```
POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/generate-questions
Status: 401 (Unauthorized)
⚠️ [QuestionGenerationService] Edge function error: SERVER_ERROR Edge Function returned a non-2xx status code
```

**Root Cause:**
Edge Function correctly validates JWT token, but frontend may be sending expired/invalid token.

**Edge Function Logic** (`supabase/functions/generate-questions/index.ts`):
```typescript
// Lines 528-534: Require Authorization header
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(
    JSON.stringify({ success: false, error: 'Authorization required' }),
    { status: 401, headers: corsHeaders }
  )
}

// Lines 540-548: Verify JWT token
const token = authHeader.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabase.auth.getUser(token)

if (authError || !user) {
  return new Response(
    JSON.stringify({ success: false, error: 'Invalid authentication' }),
    { status: 401, headers: corsHeaders }
  )
}
```

**Frontend Logic** (`src/modules/journey/services/questionGenerationService.ts`):
```typescript
// Lines 234-267: validateSession() gets fresh token
async function validateSession(): Promise<SessionValidation> {
  // Triggers token refresh if needed
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return { isValid: false, error: userError.message }
  }

  // Get (potentially refreshed) session token
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  return { isValid: true, token, userId: userData.user.id }
}

// Lines 437-447: Validate session before calling Edge Function
const session = await validateSession()
if (!session.isValid || !session.token) {
  return { success: false, error: 'Session not valid' }
}

// Lines 375-384: Call Edge Function with token
const response = await supabase.functions.invoke('generate-questions', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: { /* ... */ }
})
```

**Possible Causes:**
1. ✅ **Session expired**: User inactive for >1 hour, token not auto-refreshed
2. ✅ **PKCE flow issue**: `@supabase/ssr` not properly handling token refresh
3. ⚠️ **Race condition**: validateSession() called before token refresh completes
4. ⚠️ **Cookie issue**: Session cookie not being sent to Edge Function

**Why 401 persists (multiple retries):**
- Circuit breaker allows 3 attempts before opening (line 116)
- Retry logic with exponential backoff (lines 129-166)
- But if token is expired, all retries will fail with same 401
- Session validation SHOULD refresh token, but may fail silently

**Call Chain:**
```
questionService.ts:52,83
  → checkAndTriggerGenerationIfNeeded(userId)
    → questionGenerationService.ts:588-620
      → validateSession() // Should refresh token here
        → triggerQuestionGeneration()
          → callEdgeFunction(token, options)
            → supabase.functions.invoke('generate-questions', { headers: { Authorization: Bearer ${token} } })
              → ❌ 401 Unauthorized (token expired or invalid)
```

---

## 🔧 SOLUTION

### Step 1: Apply Database Migration

Run the migration to create missing tables and RPC function:

```bash
# Local testing (recommended first)
npx supabase db reset --local
npx supabase migration up

# Production deployment
npx supabase db push
```

**Migration File:** `supabase/migrations/20260129_fix_journey_module_errors.sql`

**What it does:**
1. ✅ Creates `public.user_profiles` table with all required columns
2. ✅ Creates RPC function `ensure_user_profile_exists(UUID)` with SECURITY DEFINER
3. ✅ Grants EXECUTE permission to authenticated users
4. ✅ Adds missing columns to `public.profiles` table (`birthdate`, `birth_date`, `country`)
5. ✅ Enables Row-Level Security (RLS) with proper policies
6. ✅ Creates indexes for performance
7. ✅ Adds updated_at trigger
8. ✅ Includes self-test to verify deployment

---

### Step 2: Fix Edge Function Auth (if 401 persists)

If 401 errors continue after migration, the issue is token refresh. Apply this fix:

**Option A: Add token refresh retry in questionGenerationService.ts**

```typescript
// Add to src/modules/journey/services/questionGenerationService.ts

async function validateSessionWithRetry(maxRetries = 2): Promise<SessionValidation> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const session = await validateSession()

    if (session.isValid && session.token) {
      return session
    }

    // If invalid, wait and try again (allows time for token refresh)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500))
      log.debug(`Session validation retry ${attempt + 1}/${maxRetries}`)
    }
  }

  return { isValid: false, error: 'Session validation failed after retries' }
}

// Update triggerQuestionGeneration() to use validateSessionWithRetry()
export async function triggerQuestionGeneration(...) {
  // ... existing code ...

  // Replace this line:
  // const session = await validateSession()

  // With:
  const session = await validateSessionWithRetry(2)

  // ... rest of code ...
}
```

**Option B: Force session refresh before validation**

```typescript
// Add to src/modules/journey/services/questionGenerationService.ts

async function validateSession(): Promise<SessionValidation> {
  try {
    // FORCE refresh session before validating
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      log.warn('Session refresh failed:', refreshError.message)
      // Continue with getUser() - it will try to refresh again
    }

    // Existing validation logic...
    const { data: userData, error: userError } = await supabase.auth.getUser()
    // ... rest of existing code ...
  } catch (error) {
    return { isValid: false, error: (error as Error).message }
  }
}
```

---

## ✅ VERIFICATION STEPS

### 1. Verify Migration Applied

Run in Supabase SQL Editor:

```sql
-- Check user_profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_profiles'
) as user_profiles_exists;

-- Check RPC function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'ensure_user_profile_exists'
    AND pronamespace = 'public'::regnamespace
) as rpc_function_exists;

-- Test RPC function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  PERFORM public.ensure_user_profile_exists(test_user_id);
  RAISE NOTICE 'RPC function works!';
  DELETE FROM public.user_profiles WHERE user_id = test_user_id;
END $$;
```

**Expected Output:**
```
user_profiles_exists: true
rpc_function_exists: true
NOTICE: RPC function works!
```

---

### 2. Verify Frontend (Dev Console)

Open browser DevTools → Console:

```javascript
// 1. Check RPC function
const { data, error } = await supabase.rpc('ensure_user_profile_exists', {
  p_user_id: user.id
})
console.log('RPC Result:', { data, error })
// Expected: { data: null, error: null }

// 2. Check getUserProfile
import { getUserProfile } from '@/services/supabaseService'
const profile = await getUserProfile(user.id)
console.log('Profile:', profile)
// Expected: { id, user_id, onboarding_completed, ... }

// 3. Check Edge Function auth
const { data, error } = await supabase.functions.invoke('generate-questions', {
  body: { batch_size: 5 }
})
console.log('Edge Function Result:', { data, error })
// Expected: { success: true, questions_generated: 5, ... }
```

---

### 3. Test Journey Module

1. Navigate to `/journey` or click "Vida" in bottom nav
2. Verify no 400 errors in Network tab
3. Verify no 401 errors for `generate-questions`
4. Verify `LifeWeeksGrid` renders correctly
5. Verify `DailyQuestionCard` shows questions

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] 1. Review migration SQL file
- [ ] 2. Test migration locally (`npx supabase db reset --local`)
- [ ] 3. Apply to production (`npx supabase db push`)
- [ ] 4. Verify RPC function in SQL Editor
- [ ] 5. Test `/journey` page in staging
- [ ] 6. Monitor Edge Function logs for 401 errors
- [ ] 7. Apply frontend fix if 401 persists (Option A or B)
- [ ] 8. Deploy frontend changes via Cloud Build
- [ ] 9. Verify production environment
- [ ] 10. Close issues #167, #168, #169

---

## 📝 RELATED FILES

**Backend (Migration):**
- `supabase/migrations/20260129_fix_journey_module_errors.sql` (NEW)

**Backend (Edge Functions):**
- `supabase/functions/generate-questions/index.ts` (lines 528-549: auth validation)

**Frontend (Services):**
- `src/services/supabaseService.ts` (line 118-121: getUserProfile calls RPC)
- `src/modules/journey/services/questionGenerationService.ts` (lines 234-267: validateSession)
- `src/modules/journey/services/questionService.ts` (lines 52, 83: triggers generation)

**Frontend (Components):**
- `src/components/features/LifeWeeksGrid.tsx` (line 67: calls getUserProfile)
- `src/modules/journey/views/JourneyMasterCard.tsx` (main Journey view)

**Related Issues:**
- #167: Missing user_profiles table
- #168: RPC ensure_user_profile_exists 400 error
- #169: Edge Function generate-questions 401 error

---

## 🔍 DEBUGGING TIPS

### If 400 persists after migration:

```sql
-- Check if RPC function has correct signature
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'ensure_user_profile_exists';

-- Check if function has EXECUTE permission
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'ensure_user_profile_exists'
  AND routine_schema = 'public';
```

---

### If 401 persists after migration:

```typescript
// Add debug logging to validateSession()
async function validateSession(): Promise<SessionValidation> {
  try {
    console.log('[DEBUG] Validating session...')

    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('[DEBUG] getUser result:', { user: !!userData.user, error: userError?.message })

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    console.log('[DEBUG] Session token:', token ? `${token.substring(0, 20)}...` : 'null')

    return { isValid: true, token, userId: userData.user.id }
  } catch (error) {
    console.error('[DEBUG] Session validation error:', error)
    return { isValid: false, error: (error as Error).message }
  }
}
```

---

### Check Edge Function logs:

```bash
# Tail Edge Function logs in real-time
npx supabase functions logs generate-questions --tail

# Look for:
# - "Authentication failed" (token validation failed)
# - "Authorization required" (no Authorization header)
# - "Invalid authentication" (JWT decode failed)
```

---

## 🎯 SUCCESS CRITERIA

Migration is successful when:

1. ✅ RPC call `ensure_user_profile_exists` returns 200 OK
2. ✅ `getUserProfile(userId)` returns profile data without errors
3. ✅ Edge Function `generate-questions` returns 200 OK (not 401)
4. ✅ Journey module loads without console errors
5. ✅ `LifeWeeksGrid` renders life weeks visualization
6. ✅ `DailyQuestionCard` displays AI-generated questions

---

**Maintained by:** Backend Architect Agent
**Last Updated:** 2026-01-29
