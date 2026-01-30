# 🚀 APPLY JOURNEY MODULE FIX - Quick Guide

**Status:** ✅ Ready to Apply
**Time:** ~2 minutes
**Risk:** Low (idempotent migration, includes rollback)

---

## 🎯 WHAT THIS FIXES

- ❌ **RPC 400 Error**: `ensure_user_profile_exists` not found
- ❌ **Edge Function 401**: `generate-questions` unauthorized
- ❌ **Journey page**: LifeWeeksGrid not loading
- ❌ **Missing tables**: `user_profiles`, columns in `profiles`

---

## ⚡ QUICK APPLY (2 steps)

### Step 1: Apply Migration to Production

```bash
# Navigate to project root
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Push migration to production
npx supabase db push
```

**Expected Output:**
```
Applying migration 20260129_fix_journey_module_errors.sql...
✔ Migration applied successfully
```

---

### Step 2: Verify Deployment

Open Supabase SQL Editor and run:

```sql
-- Quick verification (copy/paste all at once)
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_user_profile_exists') as rpc_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as table_exists;

-- Test RPC function
DO $$
DECLARE test_id UUID := gen_random_uuid();
BEGIN
  PERFORM public.ensure_user_profile_exists(test_id);
  DELETE FROM public.user_profiles WHERE user_id = test_id;
  RAISE NOTICE 'RPC function works!';
END $$;
```

**Expected Output:**
```
rpc_exists: true
table_exists: true
NOTICE: RPC function works!
```

---

## ✅ TEST IN BROWSER

1. Open https://aica-staging-5p22u2w6jq-rj.a.run.app/
2. Login with Google
3. Navigate to "Vida" (Journey module)
4. Open DevTools → Console
5. Verify NO errors:
   - ❌ No "400 Bad Request" for `ensure_user_profile_exists`
   - ❌ No "401 Unauthorized" for `generate-questions`
6. Verify components render:
   - ✅ Life weeks grid displays
   - ✅ Daily question card shows

---

## 🔄 IF ERRORS PERSIST

### If 401 "Unauthorized" still happens:

The issue is **JWT token expiration**. Apply this frontend fix:

**File:** `src/modules/journey/services/questionGenerationService.ts`

**Line 234** (inside `validateSession()` function):

```typescript
async function validateSession(): Promise<SessionValidation> {
  try {
    // ✅ ADD THIS LINE (force token refresh)
    await supabase.auth.refreshSession()

    // Existing code below...
    const { data: userData, error: userError } = await supabase.auth.getUser()
    // ... rest of function
  }
}
```

Then redeploy frontend:

```bash
# Commit changes
git add -A
git commit -m "fix: Force session refresh before Edge Function calls"
git push origin main

# Deploy via Cloud Build
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=aica-461022
```

---

## 📋 ROLLBACK (if needed)

If migration causes issues, rollback with:

```sql
-- Rollback script (run in SQL Editor)
DROP FUNCTION IF EXISTS public.ensure_user_profile_exists(UUID);
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Note: This will delete user onboarding data!
-- Only use if migration causes critical errors
```

---

## 📊 MIGRATION DETAILS

**File:** `supabase/migrations/20260129_fix_journey_module_errors.sql`

**What it does:**
1. Creates `user_profiles` table (tracks onboarding status)
2. Creates RPC function `ensure_user_profile_exists(UUID)`
3. Adds missing columns to `profiles` table
4. Sets up RLS policies (users can only access their own data)
5. Creates indexes for performance
6. Includes self-test to verify deployment

**Safety:**
- ✅ Idempotent (`CREATE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- ✅ Non-destructive (only adds, never drops or alters existing data)
- ✅ Self-testing (includes verification query at end)
- ✅ Rollback-safe (can be reverted without data loss if no users onboarded yet)

---

## 📝 RELATED DOCS

- **Full Diagnosis:** `docs/implementation/JOURNEY_MODULE_ERROR_FIX.md`
- **Migration SQL:** `supabase/migrations/20260129_fix_journey_module_errors.sql`

---

## ❓ TROUBLESHOOTING

### Migration fails with "permission denied"

**Solution:** Run as service role:

```bash
# Get service role key from .env.local
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Apply migration with service role
npx supabase db push --db-url "postgresql://postgres:postgres@db.uzywajqzbdbrfammshdg.supabase.co:5432/postgres?sslmode=require"
```

---

### RPC still returns 400 after migration

**Verify function exists:**

```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'ensure_user_profile_exists';
```

**Expected:** 1 row with `(p_user_id uuid)`

If not found, re-run PART 2 of migration manually.

---

### Edge Function still returns 401

**Check session expiration:**

```typescript
// In browser DevTools console:
const { data: { session } } = await supabase.auth.getSession()
console.log('Session expires:', new Date(session.expires_at * 1000))
console.log('Now:', new Date())
```

If expired, apply the frontend fix above (force refresh).

---

## 🎉 SUCCESS!

When successful, you'll see:

- ✅ No console errors on Journey page
- ✅ Life weeks grid renders correctly
- ✅ Daily questions load automatically
- ✅ Onboarding status tracked properly

**Time to fix:** ~2 minutes
**Downtime:** None (zero-downtime migration)

---

**Need Help?** Check `docs/implementation/JOURNEY_MODULE_ERROR_FIX.md` for full diagnosis.
