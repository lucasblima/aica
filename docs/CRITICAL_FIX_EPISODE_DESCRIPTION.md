# 🚨 CRITICAL FIX: Add Description Column to podcast_episodes

**Issue:** Episode creation fails with error: "Could not find the 'description' column"
**Root Cause:** `StudioWizard.tsx` tries to insert `description` field but column doesn't exist in database
**Priority:** CRITICAL - Blocks episode creation
**Date:** 2025-12-20

---

## Quick Fix (2 minutes)

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/editor

2. Click "SQL Editor" in the left sidebar

3. Copy and paste this SQL:

```sql
-- Add description column to podcast_episodes
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.podcast_episodes.description IS
  'Optional description or notes about the episode provided during creation';
```

4. Click "Run" button

5. **Verify:** You should see: "Success. No rows returned"

---

### Option 2: Apply via CLI (if migration sync is fixed)

```bash
npx supabase db push --include-all
```

**Note:** Currently fails due to migration sync issues. Use Option 1 instead.

---

## Verification

After applying the fix, verify the column exists:

1. In Supabase SQL Editor, run:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'podcast_episodes'
  AND column_name = 'description';
```

2. **Expected result:**
```
column_name | data_type
------------|----------
description | text
```

---

## Test the Fix

1. Navigate to http://localhost:3000/studio

2. Click "Criar Novo" to create a new episode

3. Fill out the wizard:
   - **Title:** "Test Episode After Fix"
   - **Description:** "This is a test description"
   - **Theme:** "Testing"
   - **Guest Name:** "Test Guest"

4. Click "Criar Episódio"

5. **Expected:** Episode creates successfully ✅

---

## Technical Details

### Files Affected
- **Database:** `podcast_episodes` table (missing `description` column)
- **Code:** `src/modules/studio/views/StudioWizard.tsx:187`

### Code Reference
```typescript
// StudioWizard.tsx line 187
const episode = await createEpisode({
  show_id: showId,
  user_id: userId,
  title: formData.title,
  description: formData.description || null,  // ← This field doesn't exist in DB
  guest_name: formData.guestName || null,
  episode_theme: formData.theme || null,
  status: 'draft',
});
```

### Migration File Created
```
supabase/migrations/20251220_add_description_to_podcast_episodes.sql
```

---

## Impact Assessment

**Severity:** CRITICAL
- ❌ Blocks all new episode creation
- ❌ Affects manual validation (Test 2.1 failed)
- ❌ Prevents Wave 9 progression

**Scope:**
- ✅ Does NOT affect existing episodes
- ✅ Does NOT affect workspace functionality
- ✅ Only affects wizard/creation flow

**User Impact:**
- Users cannot create new episodes until fixed
- Existing episodes work normally

---

## Post-Fix Actions

After applying the fix:

1. [ ] Re-run Manual Validation Test 2.1
2. [ ] Create test episode to verify
3. [ ] Update validation report
4. [ ] Continue with remaining manual tests
5. [ ] Proceed to Wave 9 if all tests pass

---

## Prevention

**Why This Happened:**
- Wizard UI added `description` field
- Migration to add column to DB was never created
- Schema and code got out of sync

**How to Prevent:**
1. Always create DB migration when adding form fields
2. Run E2E tests before committing (would have caught this)
3. Keep schema documentation updated

---

**Status:** ⏳ Awaiting manual application via Supabase Dashboard
**Next Step:** Apply SQL via Supabase Dashboard (Option 1)
**Estimated Fix Time:** 2 minutes
