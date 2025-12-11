# Applying the Migration to Supabase

**Status**: Ready to apply
**Migration File**: `supabase/migrations/20251211_onboarding_context_captures.sql`
**Date Created**: 2025-12-11

---

## Method 1: Using Supabase CLI (Recommended)

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref=YOUR_PROJECT_ID
```

### Apply Migration
```bash
# From project root directory
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Push migration to Supabase
supabase db push

# You'll see output like:
# ✓ Linked to project YOUR_PROJECT_ID
# ✓ Supabase API URL: https://YOUR_PROJECT_ID.supabase.co
# ✓ Created new migration
# ✓ Applied migration successfully
```

---

## Method 2: Using Supabase Dashboard

### Steps

1. **Go to Supabase Dashboard**
   - Open https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration Content**
   - Open `supabase/migrations/20251211_onboarding_context_captures.sql`
   - Copy entire file content

4. **Paste and Execute**
   - Paste in SQL Editor
   - Click "Run" button
   - Wait for success message

5. **Verify**
   - Go to "Table Editor"
   - Should see `onboarding_context_captures` table

---

## Method 3: Using psql (Direct PostgreSQL)

### Prerequisites
```bash
# Get connection string from Supabase dashboard
# Go to Settings → Database → Connection string
# Copy "URI" connection string
```

### Execute
```bash
# Replace CONNECTION_STRING with your actual connection string
psql CONNECTION_STRING < supabase/migrations/20251211_onboarding_context_captures.sql

# Example:
psql "postgresql://postgres:PASSWORD@HOSTNAME:5432/postgres" < supabase/migrations/20251211_onboarding_context_captures.sql
```

---

## Verification

### Check Table Creation

```sql
-- Run this in SQL Editor to verify table was created
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'onboarding_context_captures';

-- Should return:
-- | table_name                        |
-- | onboarding_context_captures       |
```

### Check Columns

```sql
-- Verify all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'onboarding_context_captures'
ORDER BY ordinal_position;

-- Should return 8 rows:
-- | column_name           | data_type      |
-- | id                    | uuid           |
-- | user_id               | uuid           |
-- | trail_id              | character varying |
-- | responses             | jsonb          |
-- | trail_score           | double precision |
-- | recommended_modules   | text[]         |
-- | created_at            | timestamp with time zone |
-- | updated_at            | timestamp with time zone |
```

### Check RLS Status

```sql
-- Verify RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'onboarding_context_captures';

-- Should return:
-- | relname                        | relrowsecurity |
-- | onboarding_context_captures    | true           |
```

### Check RLS Policies

```sql
-- List all RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'onboarding_context_captures'
ORDER BY policyname;

-- Should show 4 policies:
-- 1. Users can view own context captures (SELECT)
-- 2. Users can insert own context captures (INSERT)
-- 3. Users can update own context captures (UPDATE)
-- 4. Users can delete own context captures (DELETE)
```

### Check Indexes

```sql
-- List all indexes on the table
SELECT indexname
FROM pg_indexes
WHERE tablename = 'onboarding_context_captures'
ORDER BY indexname;

-- Should return 6 indexes:
-- idx_onboarding_context_captures_created_at
-- idx_onboarding_context_captures_recommended_modules
-- idx_onboarding_context_captures_responses
-- idx_onboarding_context_captures_trail_id
-- idx_onboarding_context_captures_user_id
-- idx_onboarding_context_captures_user_trail
```

### Test RLS Security

```sql
-- Set RLS context (simulate different user)
SET ROLE authenticated;
SET CLAIM 'sub' = 'different-user-id';

-- Try to select another user's data
SELECT *
FROM onboarding_context_captures
WHERE user_id = 'different-user-id';

-- If RLS works correctly, you can only see your own data
-- Switch back to original user to verify
RESET ROLE;
RESET CLAIM;
```

---

## Insert Test Data (Optional)

### Sample Insert

```sql
-- Insert test data
INSERT INTO onboarding_context_captures (
  user_id,
  trail_id,
  responses,
  trail_score,
  recommended_modules
) VALUES (
  'test-user-uuid-123',
  'health-emotional',
  jsonb_build_object(
    'q1_emotion', jsonb_build_object(
      'selectedAnswerIds', jsonb_build_array('anxious'),
      'answeredAt', now()
    ),
    'q2_areas', jsonb_build_object(
      'selectedAnswerIds', jsonb_build_array('self_awareness', 'stress_management'),
      'answeredAt', now()
    ),
    'q3_reflection_frequency', jsonb_build_object(
      'selectedAnswerIds', jsonb_build_array('rarely'),
      'answeredAt', now()
    ),
    'q4_goal', jsonb_build_object(
      'selectedAnswerIds', jsonb_build_array('reduce_stress'),
      'answeredAt', now()
    )
  ),
  6.5,
  ARRAY['meditation', 'stress_management', 'breathing_exercises']
);

-- Verify insert
SELECT * FROM onboarding_context_captures
WHERE user_id = 'test-user-uuid-123';
```

---

## Rollback (If Needed)

### Drop Table

```sql
-- DANGER: This drops the entire table and all data
DROP TABLE IF EXISTS onboarding_context_captures CASCADE;
```

### Safer Approach: Archive

```sql
-- Rename table to archive it
ALTER TABLE onboarding_context_captures
RENAME TO onboarding_context_captures_archive;

-- Later, re-create from migration if needed
```

---

## Troubleshooting

### Error: "relation already exists"
**Cause**: Table already created (migration ran twice)
**Solution**:
```sql
-- Check if table exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'onboarding_context_captures';

-- If it exists and you want to recreate:
DROP TABLE IF EXISTS onboarding_context_captures CASCADE;
-- Then run migration again
```

### Error: "permission denied for schema public"
**Cause**: User role doesn't have permissions
**Solution**: Run migration as superuser (default in Supabase CLI)

### Error: "type 'uuid' does not exist"
**Cause**: UUID extension not enabled (very rare in Supabase)
**Solution**:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### RLS Policies Not Working
**Debug**:
```sql
-- Check that RLS is enabled
SELECT relrowsecurity FROM pg_class
WHERE relname = 'onboarding_context_captures';

-- Should return: true

-- Check policies exist
SELECT policyname FROM pg_policies
WHERE tablename = 'onboarding_context_captures';

-- Should return: 4 policy names
```

---

## Post-Migration Steps

### 1. Update Frontend Code
```bash
# Make sure you have the latest code
git pull origin main

# Install dependencies (if needed)
npm install
```

### 2. Test Endpoints
```typescript
// In your React component or test file
import { listAllTrails, captureContextualTrail } from '@/api/onboardingAPI';

// Try to list trails
const result = await listAllTrails();
console.log(result.trails.length); // Should be 5
```

### 3. Run Migration Tests
```bash
# If you have the testing setup
npm run test:onboarding

# Or manually test with cURL
curl http://localhost:3000/api/onboarding/trails
```

### 4. Monitor Database
```sql
-- Check table size
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE tablename = 'onboarding_context_captures';
```

---

## Success Checklist

- [ ] Migration applied without errors
- [ ] Table exists in database
- [ ] All 8 columns present with correct types
- [ ] RLS enabled on table
- [ ] 4 RLS policies created
- [ ] 6 indexes created
- [ ] Test data inserts successfully
- [ ] RLS prevents cross-user access
- [ ] Frontend can list trails
- [ ] Frontend can capture responses

---

## Support

If you encounter issues:

1. **Check SQL syntax** - Copy exact SQL from migration file
2. **Verify permissions** - Ensure using correct Supabase user
3. **Check extension** - UUID extension should be enabled by default
4. **Review logs** - Supabase dashboard shows error details
5. **Ask for help** - Reference this document and error message

---

## Next Steps After Migration

Once verified:

1. Create UI components for trail selection
2. Create UI components for question display
3. Create UI components for results
4. Integrate with onboarding flow
5. Test end-to-end
6. Deploy to production

---

**Created**: 2025-12-11
**Status**: Ready to execute
**Duration**: ~5 minutes
**Complexity**: Low (one-time operation)
