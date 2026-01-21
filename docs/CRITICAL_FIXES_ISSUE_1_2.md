# Critical Database Fixes - Issues #1 and #2

**Date:** 2026-01-21
**Environment:** Staging (uzywajqzbdbrfammshdg.supabase.co)
**Status:** ✅ Solution Ready - Awaiting Deployment

---

## Executive Summary

Two critical database issues are blocking app functionality:
1. **406 Error:** `public.users` table missing required columns (blocking app bootstrap)
2. **400 Error:** RPC functions missing GRANT permissions (blocking WhatsApp pairing)

**Root Cause:** Schema drift between migrations and application code expectations.

**Solution:** Two migrations created to fix missing columns and permissions.

---

## Issue #1: Table `users` Does Not Exist (406 Error)

### Error Manifestation
```
GET https://uzywajqzbdbrfammshdg.supabase.co/rest/v1/users?select=*&id=eq.3d88f68e-87a5-4d45-93d1-5a28dfacaf86 406 (Not Acceptable)
Error: PGRST116: Cannot coerce the result to a single JSON object (0 rows)
```

### Root Cause Analysis

**Current Schema** (from `20251201_staging_bootstrap.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  birth_date DATE,
  ai_budget_monthly NUMERIC DEFAULT 10.00,
  ai_budget_used NUMERIC DEFAULT 0.00,
  ai_budget_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Missing Columns Required by Application Code:**

| Column | Used In | Purpose |
|--------|---------|---------|
| `name` | `supabaseService.ts:839,846,974` | User display name (NOT NULL) |
| `active` | `supabaseService.ts:847,982` | Account active status |
| `onboarding_completed` | `supabaseService.ts:930,962,982` | Onboarding completion flag |
| `onboarding_version` | `supabaseService.ts:930,963,983` | Onboarding version tracking |
| `onboarding_completed_at` | `supabaseService.ts:964,984` | Onboarding completion timestamp |

### Additional Problems Identified

1. **No auto-sync between `auth.users` and `public.users`**
   - New users created via OAuth don't automatically get `public.users` records
   - Causes 406 error when `getUserProfile()` is called

2. **No `updated_at` trigger**
   - `updated_at` column exists but has no trigger to auto-update

3. **Potential race conditions**
   - `updateUserProfile()` tries to UPDATE first, then INSERT if not found
   - This creates unnecessary queries and potential timing issues

### Solution Implemented

**Migration:** `20260121000004_fix_users_table_missing_columns.sql`

This migration performs:

1. **Add missing columns** with safe defaults
2. **Migrate existing data** from `full_name` → `name`
3. **Create `update_updated_at_column()` trigger function**
4. **Add `updated_at` trigger** to auto-update timestamps
5. **Create `ensure_user_profile_exists()` SECURITY DEFINER function**
   - Auto-creates `public.users` record from `auth.users` if missing
   - Returns existing record if found
   - Prevents 406 errors completely
6. **Create `handle_new_user()` trigger function**
   - Auto-creates `public.users` record when `auth.users` is inserted
   - Syncs email, metadata, avatar from OAuth
7. **Backfill missing users** from `auth.users`
8. **Add performance indexes** on frequently queried columns

### Code Changes Required

**File:** `src/services/supabaseService.ts`

**Before:**
```typescript
export const getUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        throw error;
    }
};
```

**After:**
```typescript
export const getUserProfile = async (userId: string) => {
    try {
        // Use RPC function to ensure profile exists before querying
        const { data, error } = await supabase
            .rpc('ensure_user_profile_exists', { p_user_id: userId });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        throw error;
    }
};
```

**Status:** ✅ Code change already applied to `supabaseService.ts`

---

## Issue #2: generate-pairing-code Returning 400 Bad Request

### Error Manifestation
```
POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/generate-pairing-code 400 (Bad Request)
```

### Root Cause Analysis

The Edge Function `generate-pairing-code` calls three RPC functions:
1. `get_or_create_whatsapp_session(p_user_id UUID)`
2. `record_pairing_attempt(p_session_id UUID, p_pairing_code TEXT, p_expires_at TIMESTAMPTZ)`
3. `update_session_phone_info(p_session_id UUID, p_phone_number TEXT, ...)`

**Problem:** These functions are defined in `20260113_whatsapp_sessions_multi_instance.sql` but lack explicit `GRANT EXECUTE` permissions.

By default, PostgreSQL does NOT grant execute permissions on functions to roles, even if RLS policies allow table access.

### Verification

**Functions Exist:** ✅ Confirmed in migrations
- `get_or_create_whatsapp_session` - line 142 of 20260113_whatsapp_sessions_multi_instance.sql
- `record_pairing_attempt` - line 207
- `update_session_phone_info` - line 235

**Permissions Missing:** ❌ No `GRANT EXECUTE` statements found

### Solution Implemented

**Migration:** `20260121000005_grant_whatsapp_rpc_permissions.sql`

Grants `EXECUTE` permissions on all WhatsApp RPC functions to:
- `authenticated` role (for client-side calls)
- `service_role` role (for Edge Function calls)

Functions granted:
- `generate_instance_name(UUID)`
- `get_or_create_whatsapp_session(UUID)`
- `update_whatsapp_session_status(UUID, TEXT, TEXT, TEXT)`
- `record_pairing_attempt(UUID, TEXT, TIMESTAMPTZ)`
- `update_session_phone_info(UUID, TEXT, TEXT, TEXT)`
- `update_session_sync_stats(UUID, INTEGER, INTEGER, INTEGER)`

---

## Migration Files Created

### 1. `20260121000004_fix_users_table_missing_columns.sql`
- **Size:** ~6.5 KB
- **Tables Modified:** `public.users`, `auth.users` (trigger)
- **Functions Created:** `ensure_user_profile_exists()`, `handle_new_user()`, `update_updated_at_column()`
- **Triggers Created:** `on_auth_user_created`, `update_users_updated_at`
- **Indexes Created:** 4 indexes for performance
- **Data Migration:** Backfills existing `auth.users` → `public.users`

### 2. `20260121000005_grant_whatsapp_rpc_permissions.sql`
- **Size:** ~1 KB
- **Functions Modified:** 6 WhatsApp RPC functions
- **Permissions Granted:** `EXECUTE` to `authenticated` and `service_role`

---

## Deployment Options

### Option 1: Supabase SQL Editor (Recommended - Safer)

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `20260121000004_fix_users_table_missing_columns.sql`
4. Execute
5. Verify success message
6. Create new query
7. Copy contents of `20260121000005_grant_whatsapp_rpc_permissions.sql`
8. Execute
9. Verify success

**Pros:**
- Visual feedback
- Can run line-by-line if needed
- Easy rollback if issues
- See execution results immediately

**Cons:**
- Manual process
- Doesn't update migration history in `schema_migrations` table

### Option 2: Supabase CLI Push (Automated)

```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend
npx supabase db push
```

**Pros:**
- Automatic
- Updates migration history
- Can be part of CI/CD

**Cons:**
- Less visibility into execution
- Harder to debug if issues
- Applies ALL pending migrations at once

### Option 3: Supabase Management API (Advanced)

```bash
# Set environment variable
export SUPABASE_ACCESS_TOKEN=your_token

# Apply migrations via API
npx supabase db push --linked
```

**Pros:**
- Programmatic
- Can be scripted

**Cons:**
- Requires access token
- More complex setup

---

## Rollback Plan (If Needed)

### Rollback Migration 20260121000004

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_user_profile_exists(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_onboarding_completed;
DROP INDEX IF EXISTS idx_users_created_at;

-- Remove columns (CAUTION: data loss)
ALTER TABLE public.users
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS active,
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_version,
  DROP COLUMN IF EXISTS onboarding_completed_at;
```

### Rollback Migration 20260121000005

```sql
-- Revoke permissions
REVOKE EXECUTE ON FUNCTION public.generate_instance_name(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_instance_name(UUID) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.get_or_create_whatsapp_session(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_whatsapp_session(UUID) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.update_whatsapp_session_status(UUID, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_whatsapp_session_status(UUID, TEXT, TEXT, TEXT) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.record_pairing_attempt(UUID, TEXT, TIMESTAMPTZ) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_pairing_attempt(UUID, TEXT, TIMESTAMPTZ) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.update_session_phone_info(UUID, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_session_phone_info(UUID, TEXT, TEXT, TEXT) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.update_session_sync_stats(UUID, INTEGER, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_session_sync_stats(UUID, INTEGER, INTEGER, INTEGER) FROM service_role;
```

---

## Testing Plan

### Test Issue #1 Fix

1. **Login to staging app**
   - URL: https://aica-staging-5p22u2w6jq-rj.a.run.app/
   - Use Google OAuth

2. **Check browser console**
   - Should NOT see: `406 (Not Acceptable)` error
   - Should see: User profile loaded successfully

3. **Verify database**
   ```sql
   SELECT id, email, name, active, onboarding_completed, onboarding_version
   FROM public.users
   WHERE id = 'your-user-id';
   ```
   - All columns should have values

### Test Issue #2 Fix

1. **Navigate to WhatsApp pairing**
   - Route: `/onboarding` or WhatsApp setup page

2. **Click "Generate Pairing Code"**
   - Should NOT see: `400 (Bad Request)` error
   - Should see: 6-digit pairing code displayed

3. **Check Edge Function logs**
   ```bash
   npx supabase functions logs generate-pairing-code --project-ref uzywajqzbdbrfammshdg
   ```
   - Should see: "Code generated for user ..."
   - Should NOT see: "permission denied" errors

---

## Impact Assessment

### Breaking Changes
❌ None - All changes are additive and backward compatible

### Performance Impact
✅ **Improved** - Added indexes will speed up common queries

### Security Impact
✅ **Improved** - SECURITY DEFINER functions enforce proper access control

### Data Integrity
✅ **Maintained** - All data migrations are safe and use COALESCE/defaults

---

## Compliance with Standards

### ✅ Mandatory Table Standards
- [x] Standard columns: `id`, `created_at`, `updated_at`
- [x] Row-Level Security: Already enabled in bootstrap migration
- [x] Updated timestamp trigger: ✅ Added in 20260121000004
- [x] Appropriate indexes: ✅ Added 4 indexes

### ✅ Complete Migration Template
- [x] Descriptive header with issue reference
- [x] Standard columns included
- [x] RLS enabled (already done)
- [x] SECURITY DEFINER functions used
- [x] RLS policies comprehensive (already done)
- [x] Updated trigger created
- [x] Performance indexes added
- [x] Documentation comments added
- [x] Naming convention: `YYYYMMDD_descriptive_name.sql`

### ✅ Security Pattern: SECURITY DEFINER Functions
- [x] `ensure_user_profile_exists()` - bypasses RLS to auto-create users
- [x] `handle_new_user()` - trigger function with elevated privileges
- [x] `SET search_path = public` - prevents search_path attacks
- [x] No direct table queries in RLS policies

---

## Conclusion

Both issues have been diagnosed and solutions implemented. The migrations are ready to apply and follow all project standards for security, performance, and maintainability.

**Recommended Next Steps:**
1. Review this document
2. Choose deployment option (recommend SQL Editor for visibility)
3. Apply migrations
4. Run tests
5. Monitor staging for 24 hours
6. If successful, document as resolved

---

**Prepared by:** Backend Architect Agent (Claude Sonnet 4.5)
**Reviewed by:** [Awaiting human review]
**Applied by:** [Pending]
