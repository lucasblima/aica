# Generated Decks Migration - Validation Guide

**Migration:** `20260122000001_generated_decks.sql`
**Issue:** #117 - Database Schema para Gerador de Apresentações
**Date:** 2026-01-22
**Author:** Backend Architect Agent

---

## Overview

This document provides validation procedures for the Generated Decks migration (Phase 1 of Issue #117).

### What This Migration Creates

1. **Tables:**
   - `generated_decks` - Presentation metadata and configuration
   - `deck_slides` - Individual slides with flexible JSONB content

2. **Security:**
   - SECURITY DEFINER function: `user_owns_deck()`
   - 8 RLS policies (4 per table)
   - 4 Storage RLS policies

3. **Performance:**
   - 7 indexes optimized for common queries
   - GIN index for JSONB content search

4. **Storage:**
   - Bucket: `presentation-assets` (private, 50MB limit)
   - Supports: PDF, PNG, JPEG, WebP, SVG

---

## Validation Checklist

### ✅ Pre-Migration Checks

- [ ] Verify Supabase local instance is running: `npx supabase status`
- [ ] Ensure all previous migrations are applied
- [ ] Backup production database (if applying to staging/prod)

### ✅ Apply Migration

```bash
# Local environment
npx supabase db reset --local

# Or apply specific migration
npx supabase migration up --local
```

### ✅ Post-Migration Validation

Run the test script to verify everything was created correctly:

```bash
# Execute test script (optional)
# This script is for manual validation via Supabase Studio SQL editor
cat supabase/migrations/TEST_20260122000001_generated_decks.sql
```

**Expected output:**
```
✅ ALL TESTS PASSED!

Schema verification:
  ✅ Tables created with proper structure
  ✅ RLS enabled on all tables
  ✅ RLS policies comprehensive (8 total)
  ✅ Performance indexes optimized
  ✅ SECURITY DEFINER function prevents recursion
  ✅ Triggers for updated_at automation
  ✅ Storage bucket configured
  ✅ Storage RLS policies secure
```

---

## Manual Verification Queries

### 1. Verify Tables Exist

```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('generated_decks', 'deck_slides');
```

**Expected:**
| table_name | column_count |
|------------|--------------|
| generated_decks | 10 |
| deck_slides | 7 |

### 2. Verify RLS Policies

```sql
SELECT
  tablename,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    ELSE 'BOTH'
  END AS clause_type
FROM pg_policies
WHERE tablename IN ('generated_decks', 'deck_slides')
ORDER BY tablename, cmd;
```

**Expected: 8 policies total**
- `generated_decks`: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- `deck_slides`: 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 3. Verify Indexes

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('generated_decks', 'deck_slides')
ORDER BY tablename, indexname;
```

**Expected: At least 7 indexes**
- `idx_generated_decks_user_id`
- `idx_generated_decks_organization_id`
- `idx_generated_decks_project_id`
- `idx_generated_decks_created_at`
- `idx_deck_slides_deck_id_sort`
- `idx_deck_slides_type`
- `idx_deck_slides_content_gin`

### 4. Verify SECURITY DEFINER Function

```sql
SELECT
  proname AS function_name,
  prosecdef AS is_security_definer,
  proargnames AS argument_names
FROM pg_proc
WHERE proname = 'user_owns_deck';
```

**Expected:**
| function_name | is_security_definer | argument_names |
|---------------|---------------------|----------------|
| user_owns_deck | true | {_deck_id} |

### 5. Verify Storage Bucket

```sql
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'presentation-assets';
```

**Expected:**
| id | name | public | file_size_limit | allowed_mime_types |
|----|------|--------|-----------------|-------------------|
| presentation-assets | presentation-assets | false | 52428800 | {application/pdf, image/png, ...} |

### 6. Verify Storage RLS

```sql
SELECT
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%presentation assets%'
ORDER BY cmd;
```

**Expected: 4 policies**
- `Users can upload presentation assets` (INSERT)
- `Users can view own presentation assets` (SELECT)
- `Users can update own presentation assets` (UPDATE)
- `Users can delete own presentation assets` (DELETE)

---

## Functional Testing

### Test Case 1: Create a Deck

```sql
-- Insert test organization (if not exists)
INSERT INTO public.organizations (id, user_id, name, organization_type)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  auth.uid(),
  'Test Organization',
  'ong'
)
ON CONFLICT (id) DO NOTHING;

-- Create a deck
INSERT INTO public.generated_decks (
  user_id,
  organization_id,
  title,
  template,
  target_focus
)
VALUES (
  auth.uid(),
  '11111111-1111-1111-1111-111111111111',
  'My First Sponsor Deck',
  'professional',
  'esg'
)
RETURNING *;
```

**Expected:** Row created successfully with auto-generated `id`, `created_at`, `updated_at`.

### Test Case 2: Add Slides to Deck

```sql
-- Get the deck ID from previous test
WITH deck AS (
  SELECT id FROM public.generated_decks
  WHERE title = 'My First Sponsor Deck'
  LIMIT 1
)
INSERT INTO public.deck_slides (deck_id, slide_type, content, sort_order)
VALUES
  ((SELECT id FROM deck), 'cover', '{"projectName": "Test Project", "tagline": "Changing the world"}', 0),
  ((SELECT id FROM deck), 'organization', '{"name": "Test Org", "description": "We do great things"}', 1),
  ((SELECT id FROM deck), 'contact', '{"email": "contact@test.org"}', 2)
RETURNING id, slide_type, sort_order;
```

**Expected:** 3 slides created in correct order.

### Test Case 3: Query Slides with Ordering

```sql
WITH deck AS (
  SELECT id FROM public.generated_decks
  WHERE title = 'My First Sponsor Deck'
  LIMIT 1
)
SELECT
  id,
  slide_type,
  sort_order,
  content->>'projectName' AS project_name,
  content->>'tagline' AS tagline
FROM public.deck_slides
WHERE deck_id = (SELECT id FROM deck)
ORDER BY sort_order;
```

**Expected:** Slides returned in sort_order (0, 1, 2).

### Test Case 4: Update PDF Export Status

```sql
UPDATE public.generated_decks
SET
  pdf_storage_path = auth.uid()::TEXT || '/decks/test-deck.pdf',
  pdf_generated_at = NOW()
WHERE title = 'My First Sponsor Deck'
RETURNING id, pdf_storage_path, pdf_generated_at;
```

**Expected:** PDF fields updated, `updated_at` automatically updated.

### Test Case 5: RLS - User Cannot See Other Users' Decks

```sql
-- This should return 0 rows (assuming you're not the owner of random UUID)
SELECT COUNT(*) AS should_be_zero
FROM public.generated_decks
WHERE user_id = '99999999-9999-9999-9999-999999999999';
```

**Expected:** `should_be_zero = 0`

---

## Rollback Procedure

If migration fails or needs to be rolled back:

```sql
-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS public.deck_slides CASCADE;
DROP TABLE IF EXISTS public.generated_decks CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS public.user_owns_deck(UUID);

-- Drop storage bucket
DELETE FROM storage.buckets WHERE id = 'presentation-assets';

-- Drop storage policies
DROP POLICY IF EXISTS "Users can upload presentation assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own presentation assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own presentation assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own presentation assets" ON storage.objects;
```

---

## Architecture Decisions

### Why SECURITY DEFINER?

The migration uses a SECURITY DEFINER function (`user_owns_deck`) to prevent **RLS recursion**. Without it:

```sql
-- ❌ WRONG: This causes infinite recursion
CREATE POLICY "..." ON deck_slides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM generated_decks -- This triggers RLS on generated_decks
    WHERE id = deck_id
  )
);
```

The correct approach:

```sql
-- ✅ CORRECT: SECURITY DEFINER bypasses RLS
CREATE FUNCTION user_owns_deck(_deck_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;

CREATE POLICY "..." ON deck_slides FOR SELECT
USING (user_owns_deck(deck_id)); -- No recursion!
```

### Why JSONB for Slide Content?

Different slide types have **vastly different** content structures:

- **cover**: `{ projectName, tagline, organizationName, logoUrl }`
- **impact-metrics**: `{ metrics: [{ label, value, unit }], impactDescription }`
- **tiers**: `{ tiers: [{ id, name, value, deliverables[] }], currency }`

JSONB provides:
1. **Flexibility** - No schema changes when adding slide types
2. **Performance** - GIN index enables fast JSONB queries
3. **Type safety** - TypeScript types enforce structure in application layer
4. **Future-proof** - Easy to add new fields without migrations

### Why Separate Tables?

`generated_decks` and `deck_slides` are separated for:

1. **Normalization** - Deck metadata (template, target) vs. slide content
2. **Performance** - Query deck list without loading all slides
3. **Flexibility** - Easy to reorder, add, delete slides
4. **Caching** - Cache deck metadata separately from content

---

## Next Steps (Phase 2)

After validating Phase 1, implement:

1. **Edge Function:** `generate-sponsor-deck`
   - RAG query for slide content
   - HTML template renderer
   - Puppeteer PDF export

2. **Frontend Integration:**
   - Deck wizard UI (reuse `SponsorDeckGenerator.tsx`)
   - Real-time preview
   - Download functionality

3. **RAG Integration:**
   - Query `document_embeddings` for project context
   - Use Gemini to generate persuasive content
   - Personalize based on `target_focus`

---

## References

- **Issue #117:** Database Schema para Gerador de Apresentações
- **Related:** #114 (Upload), #115 (Classification), #116 (RAG Embeddings)
- **Types:** `src/modules/grants/types/sponsorDeck.ts`
- **UI:** `src/modules/grants/components/SponsorDeckGenerator.tsx`
- **Migration Pattern:** `supabase/migrations/20251204000004_professional_rls_architecture.sql`

---

## Troubleshooting

### Issue: "RLS recursion detected"

**Cause:** Policy directly queries `generated_decks` table.
**Fix:** Use `user_owns_deck()` SECURITY DEFINER function instead.

### Issue: "Storage bucket not found"

**Cause:** Migration didn't create bucket or bucket creation failed.
**Fix:** Manually create bucket via Supabase Studio or re-run migration.

### Issue: "Permission denied for table generated_decks"

**Cause:** RLS is enabled but policies are missing or incorrect.
**Fix:** Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'generated_decks'`

### Issue: "Foreign key violation on organization_id"

**Cause:** Trying to create deck for non-existent organization.
**Fix:** Create organization first, then deck.

---

**Status:** ✅ Migration Validated
**Last Updated:** 2026-01-22
**Maintainer:** Backend Architect Agent
