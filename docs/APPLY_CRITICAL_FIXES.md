# Quick Guide: Apply Critical Fixes for Issues #1 and #2

**⚠️ IMPORTANT:** Read `CRITICAL_FIXES_ISSUE_1_2.md` first for full context.

---

## Option 1: Supabase SQL Editor (Recommended)

### Step 1: Apply Users Table Fix

1. Open: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
2. Copy entire contents of: `supabase/migrations/20260121000004_fix_users_table_missing_columns.sql`
3. Paste into SQL Editor
4. Click "Run" (or Ctrl+Enter)
5. Wait for completion (~2-5 seconds)
6. Verify output shows success message with user counts

**Expected Output:**
```
NOTICE: Created user profile for: <user-id>
NOTICE: Migration complete! Total users: X, Backfilled: Y
```

### Step 2: Apply WhatsApp RPC Permissions

1. Open: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
2. Copy entire contents of: `supabase/migrations/20260121000005_grant_whatsapp_rpc_permissions.sql`
3. Paste into SQL Editor
4. Click "Run" (or Ctrl+Enter)
5. Wait for completion (~1 second)
6. Verify output shows success message

**Expected Output:**
```
NOTICE: Granted EXECUTE permissions on WhatsApp RPC functions to authenticated and service_role
```

### Step 3: Verify Deployment

Run this query in SQL Editor:
```sql
-- Verify users table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('name', 'active', 'onboarding_completed', 'onboarding_version', 'onboarding_completed_at')
ORDER BY column_name;

-- Verify functions have permissions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%whatsapp%'
ORDER BY routine_name;
```

**Expected Results:**
- 5 rows for users columns
- 6 rows for WhatsApp functions

---

## Option 2: Supabase CLI (Automated)

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Project linked (already done in config.toml)

### Apply Migrations

```bash
# Navigate to project
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Apply all pending migrations to staging
npx supabase db push

# Check migration status
npx supabase migration list
```

**Expected Output:**
```
Applying migration 20260121000004_fix_users_table_missing_columns.sql...
Applying migration 20260121000005_grant_whatsapp_rpc_permissions.sql...
✔ All migrations applied successfully
```

---

## Verification Tests

### Test 1: User Profile (Issue #1)

1. **Open staging app:** https://aica-staging-5p22u2w6jq-rj.a.run.app/
2. **Login with Google OAuth**
3. **Open browser DevTools console** (F12)
4. **Check for errors:**
   - ❌ Should NOT see: `406 (Not Acceptable)` from `/rest/v1/users`
   - ✅ Should see: User profile loaded successfully

### Test 2: WhatsApp Pairing (Issue #2)

1. **Navigate to:** WhatsApp onboarding or connections page
2. **Click:** "Generate Pairing Code" or similar button
3. **Check for errors:**
   - ❌ Should NOT see: `400 (Bad Request)` from `/functions/v1/generate-pairing-code`
   - ✅ Should see: 6-digit pairing code displayed (e.g., "123-456")

### Test 3: Database Verification

Run in Supabase SQL Editor:
```sql
-- Test ensure_user_profile_exists function
SELECT ensure_user_profile_exists(auth.uid());

-- Check your user record
SELECT id, email, name, active, onboarding_completed, onboarding_version
FROM public.users
WHERE id = auth.uid();
```

**Expected:**
- Function returns your user profile
- Query shows all columns populated

---

## Rollback (If Needed)

If something goes wrong, run these in SQL Editor:

```sql
-- Rollback migration 20260121000005
\i supabase/migrations/rollback_20260121000005.sql

-- Rollback migration 20260121000004
\i supabase/migrations/rollback_20260121000004.sql
```

Or manually apply rollback commands from `CRITICAL_FIXES_ISSUE_1_2.md` → "Rollback Plan" section.

---

## Monitoring After Deployment

### Check Edge Function Logs
```bash
# View generate-pairing-code logs
npx supabase functions logs generate-pairing-code --project-ref uzywajqzbdbrfammshdg

# View last 50 lines
npx supabase functions logs generate-pairing-code --project-ref uzywajqzbdbrfammshdg --tail 50
```

### Check Database Logs
Open: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/logs/postgres-logs

Look for:
- ❌ Errors related to "users" table
- ❌ "permission denied" errors on functions
- ✅ Success messages from triggers

---

## Troubleshooting

### Issue: Migration fails with "column already exists"
**Cause:** Migration was partially applied before
**Solution:**
```sql
-- Check which columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('name', 'active', 'onboarding_completed');

-- Manually apply only missing parts
```

### Issue: "permission denied" when running migration
**Cause:** Insufficient database privileges
**Solution:** Use Supabase Dashboard SQL Editor (has elevated privileges)

### Issue: Trigger not firing
**Cause:** Trigger may have been dropped in previous migration
**Solution:**
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Recreate if missing (from migration file)
```

---

## Success Criteria

✅ All migrations applied without errors
✅ No 406 errors when loading app
✅ No 400 errors when generating pairing code
✅ User profiles auto-created on login
✅ All tests passing

---

**Questions?** Check `CRITICAL_FIXES_ISSUE_1_2.md` for detailed analysis.
