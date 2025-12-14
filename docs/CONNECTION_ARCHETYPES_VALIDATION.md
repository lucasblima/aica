# Connection Archetypes - Migration Validation Checklist

## Pre-Migration Checklist

- [ ] Database backup created
- [ ] Migration file reviewed: `20251214000000_connection_archetypes_base.sql`
- [ ] All SECURITY DEFINER functions reviewed for correct search_path
- [ ] RLS policies reviewed - no direct table queries in USING clauses
- [ ] All required columns included with correct types
- [ ] JSONB structures validated for extensibility
- [ ] Team approval obtained

## Post-Migration Verification

### 1. Tables Created

Execute this query to verify all tables exist:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'connection_spaces',
  'connection_members',
  'connection_events',
  'connection_documents',
  'connection_transactions'
)
ORDER BY tablename;
```

Expected output: 5 rows (one for each table)

**Checklist:**
- [ ] connection_spaces exists
- [ ] connection_members exists
- [ ] connection_events exists
- [ ] connection_documents exists
- [ ] connection_transactions exists

### 2. Enum Types Created

Execute this query to verify all enum types exist:

```sql
SELECT typname FROM pg_type
WHERE typname IN (
  'connection_archetype_type',
  'connection_member_role',
  'connection_event_type',
  'connection_transaction_type',
  'connection_transaction_split_type'
)
ORDER BY typname;
```

Expected output: 5 rows

**Checklist:**
- [ ] connection_archetype_type enum created
- [ ] connection_member_role enum created
- [ ] connection_event_type enum created
- [ ] connection_transaction_type enum created
- [ ] connection_transaction_split_type enum created

### 3. Security Functions Created

Execute this query to verify helper functions:

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'is_connection_space_member',
  'is_connection_space_admin',
  'is_connection_space_owner'
)
ORDER BY proname;
```

Expected output: 3 rows

**Checklist:**
- [ ] is_connection_space_member function exists
- [ ] is_connection_space_admin function exists
- [ ] is_connection_space_owner function exists

### 4. RLS Enabled on All Tables

Execute this query to verify RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'connection_%'
ORDER BY tablename;
```

Expected output: All tables should have rowsecurity = TRUE

**Checklist:**
- [ ] connection_spaces has RLS enabled
- [ ] connection_members has RLS enabled
- [ ] connection_events has RLS enabled
- [ ] connection_documents has RLS enabled
- [ ] connection_transactions has RLS enabled

### 5. RLS Policies Created

Execute this query to verify RLS policies:

```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'connection_spaces',
  'connection_members',
  'connection_events',
  'connection_documents',
  'connection_transactions'
)
ORDER BY tablename, policyname;
```

**Expected policies per table:**

**connection_spaces (4 policies):**
- [ ] connection_spaces_delete
- [ ] connection_spaces_insert
- [ ] connection_spaces_select
- [ ] connection_spaces_update

**connection_members (4 policies):**
- [ ] connection_members_delete
- [ ] connection_members_insert
- [ ] connection_members_select
- [ ] connection_members_update

**connection_events (4 policies):**
- [ ] connection_events_delete
- [ ] connection_events_insert
- [ ] connection_events_select
- [ ] connection_events_update

**connection_documents (4 policies):**
- [ ] connection_documents_delete
- [ ] connection_documents_insert
- [ ] connection_documents_select
- [ ] connection_documents_update

**connection_transactions (4 policies):**
- [ ] connection_transactions_delete
- [ ] connection_transactions_insert
- [ ] connection_transactions_select
- [ ] connection_transactions_update

**Total: 20 policies**

### 6. Indexes Created

Execute this query to verify indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'connection_%'
ORDER BY tablename, indexname;
```

**Expected index count:**
- connection_spaces: 5 indexes
- connection_members: 6 indexes
- connection_events: 6 indexes
- connection_documents: 7 indexes
- connection_transactions: 7 indexes
- **Total: 31 indexes**

### 7. Triggers Created

Execute this query to verify updated_at triggers:

```sql
SELECT tgname, tgrelname
FROM pg_trigger
WHERE tgrelname IN (
  'connection_spaces',
  'connection_members',
  'connection_events',
  'connection_documents',
  'connection_transactions'
)
ORDER BY tgrelname, tgname;
```

Expected: One trigger per table for updated_at

**Checklist:**
- [ ] update_connection_spaces_updated_at trigger exists
- [ ] update_connection_members_updated_at trigger exists
- [ ] update_connection_events_updated_at trigger exists
- [ ] update_connection_documents_updated_at trigger exists
- [ ] update_connection_transactions_updated_at trigger exists

### 8. Column Definitions

Verify key columns exist with correct types:

```sql
-- Check connection_spaces
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'connection_spaces'
ORDER BY ordinal_position;
```

**Checklist for connection_spaces:**
- [ ] id: UUID, NOT NULL (PRIMARY KEY)
- [ ] user_id: UUID, NOT NULL (FOREIGN KEY)
- [ ] archetype: connection_archetype_type, NOT NULL
- [ ] name: TEXT, NOT NULL
- [ ] subtitle: TEXT, nullable
- [ ] description: TEXT, nullable
- [ ] icon: TEXT, nullable
- [ ] color_theme: TEXT, nullable
- [ ] cover_image_url: TEXT, nullable
- [ ] is_active: BOOLEAN, NOT NULL (DEFAULT TRUE)
- [ ] is_favorite: BOOLEAN, NOT NULL (DEFAULT FALSE)
- [ ] last_accessed_at: TIMESTAMPTZ, nullable
- [ ] settings: JSONB, NOT NULL (DEFAULT {})
- [ ] created_at: TIMESTAMPTZ, NOT NULL
- [ ] updated_at: TIMESTAMPTZ, NOT NULL

Similar checks for other tables...

## Functional Testing

### Test 1: Owner Access to Own Space

```sql
-- As owner user
SET auth.uid TO 'owner-user-uuid'::text;

SELECT id, name FROM public.connection_spaces
WHERE archetype = 'habitat'::connection_archetype_type;

-- Should return owner's space
```

**Expected:** Owner can see own space

### Test 2: Non-Member Cannot Access Space

```sql
-- Create test space as User A
SET auth.uid TO 'user-a-uuid'::text;

INSERT INTO public.connection_spaces (
  user_id, archetype, name
) VALUES (auth.uid(), 'habitat', 'Test Habitat');

-- Switch to User B (not a member)
SET auth.uid TO 'user-b-uuid'::text;

SELECT id, name FROM public.connection_spaces;

-- Should NOT return User A's space
```

**Expected:** User B cannot see User A's space

### Test 3: Member Can Access Space

```sql
-- As User A (owner)
SET auth.uid TO 'user-a-uuid'::text;

-- Insert test space
INSERT INTO public.connection_spaces (
  user_id, archetype, name
) VALUES (auth.uid(), 'habitat', 'Test Habitat') RETURNING id;
-- Save returned id as 'space-id'

-- Add User B as member
INSERT INTO public.connection_members (
  space_id, user_id, role, is_active
) VALUES ('space-id', 'user-b-uuid', 'member', TRUE);

-- Switch to User B
SET auth.uid TO 'user-b-uuid'::text;

SELECT id, name FROM public.connection_spaces
WHERE id = 'space-id';

-- Should return the space
```

**Expected:** User B can see space after being added as member

### Test 4: Only Owner Can Modify Space

```sql
-- Create space as User A
SET auth.uid TO 'user-a-uuid'::text;

INSERT INTO public.connection_spaces (
  user_id, archetype, name
) VALUES (auth.uid(), 'habitat', 'Test') RETURNING id;
-- Save as 'space-id'

-- Add User B as member (but not admin)
INSERT INTO public.connection_members (
  space_id, user_id, role
) VALUES ('space-id', 'user-b-uuid', 'member');

-- Switch to User B
SET auth.uid TO 'user-b-uuid'::text;

-- Try to update space (should fail)
UPDATE public.connection_spaces
SET name = 'Modified Name'
WHERE id = 'space-id';

-- Should fail with permission denied
```

**Expected:** Update fails with RLS policy violation

### Test 5: Admin Can Manage Members

```sql
-- Create space as User A
SET auth.uid TO 'user-a-uuid'::text;

INSERT INTO public.connection_spaces (
  user_id, archetype, name
) VALUES (auth.uid(), 'habitat', 'Test') RETURNING id;
-- Save as 'space-id'

-- Add User B as admin
INSERT INTO public.connection_members (
  space_id, user_id, role
) VALUES ('space-id', 'user-b-uuid', 'admin');

-- Switch to User B
SET auth.uid TO 'user-b-uuid'::text;

-- Try to add User C (should succeed as B is admin)
INSERT INTO public.connection_members (
  space_id, user_id, role
) VALUES ('space-id', 'user-c-uuid', 'member');

-- Should succeed
```

**Expected:** User B can add User C as User B is admin

### Test 6: JSONB Fields Work Correctly

```sql
-- Test settings JSONB
INSERT INTO public.connection_spaces (
  user_id, archetype, name, settings
) VALUES (
  auth.uid(),
  'ventures',
  'Test Startup',
  '{
    "stage": "seed",
    "co_founders": ["alice@ex.com", "bob@ex.com"],
    "preferences": {"calendar_sync": true}
  }'::jsonb
) RETURNING settings;

-- Test split_data JSONB in transactions
INSERT INTO public.connection_transactions (
  space_id, created_by, description, amount, type, split_type, split_data
) VALUES (
  'space-id',
  auth.uid(),
  'Shared Expense',
  150.00,
  'expense',
  'percentage',
  '{"user-a": 0.60, "user-b": 0.40}'::jsonb
) RETURNING split_data;
```

**Expected:** JSONB values stored and retrieved correctly

### Test 7: Timestamps Auto-Update

```sql
-- Create a transaction
INSERT INTO public.connection_transactions (
  space_id, created_by, description, amount, type, transaction_date
) VALUES (
  'space-id',
  auth.uid(),
  'Test',
  100.00,
  'expense',
  NOW()
) RETURNING id, created_at, updated_at;
-- Save returned id

-- Wait a moment, then update
UPDATE public.connection_transactions
SET description = 'Updated'
WHERE id = 'transaction-id';

-- Check updated_at changed
SELECT created_at, updated_at
FROM public.connection_transactions
WHERE id = 'transaction-id';
```

**Expected:** updated_at changes, created_at stays same

### Test 8: Cascading Delete

```sql
-- Create space
INSERT INTO public.connection_spaces (
  user_id, archetype, name
) VALUES (auth.uid(), 'habitat', 'Test') RETURNING id;
-- Save as 'space-id'

-- Add members, events, documents
INSERT INTO public.connection_members (
  space_id, user_id, role
) VALUES ('space-id', 'other-user', 'member');

INSERT INTO public.connection_events (
  space_id, created_by, title, starts_at
) VALUES ('space-id', auth.uid(), 'Test Event', NOW());

-- Delete space
DELETE FROM public.connection_spaces
WHERE id = 'space-id';

-- Verify members and events deleted
SELECT COUNT(*) FROM public.connection_members
WHERE space_id = 'space-id';
-- Should return 0
```

**Expected:** All dependent records deleted

## Performance Testing

### Test 9: Index Usage

```sql
-- This query should use indexes
EXPLAIN ANALYZE
SELECT id, name FROM public.connection_spaces
WHERE user_id = 'user-uuid'::uuid
AND is_active = TRUE
AND archetype = 'ventures'::connection_archetype_type;

-- Should show index usage in plan
```

**Expected:** Index scans, not sequential scans

### Test 10: JSONB Query Performance

```sql
-- Test GIN index on tags
EXPLAIN ANALYZE
SELECT id FROM public.connection_documents
WHERE space_id = 'space-uuid'::uuid
AND tags && ARRAY['important'];

-- Should show GIN index usage
```

**Expected:** GIN index used for array overlap

### Test 11: Composite Index Usage

```sql
-- Test composite index
EXPLAIN ANALYZE
SELECT id, user_id FROM public.connection_members
WHERE space_id = 'space-uuid'::uuid
AND is_active = TRUE;

-- Should use composite index
```

**Expected:** Index on (space_id, is_active)

## Security Testing

### Test 12: Verify No Direct Table Queries in Policies

Run this to check policy definitions:

```sql
SELECT
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE 'connection_%'
AND (
  qual LIKE '%connection_spaces%'
  OR with_check LIKE '%connection_spaces%'
  OR qual LIKE '%connection_members%'
  OR with_check LIKE '%connection_members%'
);
```

**Expected:** No policies with direct table queries. All should reference SECURITY DEFINER functions only.

### Test 13: Verify SECURITY DEFINER Functions Have Correct search_path

```sql
SELECT
  proname,
  prosecdef,
  proconfig
FROM pg_proc
WHERE proname LIKE 'is_connection_%'
ORDER BY proname;
```

**Expected:** All functions have:
- `prosecdef = true` (SECURITY DEFINER)
- `proconfig` includes `search_path = public`

### Test 14: Verify No Circular RLS Dependencies

Create test scenario:
```sql
-- Add connection_members to user A's space
-- Verify the policy doesn't cause recursion
-- Test by adding many members and querying

SET auth.uid TO 'user-a-uuid'::text;
INSERT INTO public.connection_spaces (user_id, archetype, name)
VALUES (auth.uid(), 'habitat', 'Test');
-- Get space-id

-- Add 100 members
INSERT INTO public.connection_members (space_id, user_id, role)
SELECT 'space-id', gen_random_uuid(), 'member'
FROM generate_series(1, 100);

-- Query should complete without recursion error
SELECT COUNT(*) FROM public.connection_members
WHERE space_id = 'space-id';
```

**Expected:** Query completes quickly without "infinite recursion" error

## Rollback Testing

### Test 15: Can Rollback If Needed

Before applying migration, ensure you have a rollback plan:

```sql
-- Drop all objects in reverse order of creation
DROP TABLE IF EXISTS public.connection_transactions CASCADE;
DROP TABLE IF EXISTS public.connection_documents CASCADE;
DROP TABLE IF EXISTS public.connection_events CASCADE;
DROP TABLE IF EXISTS public.connection_members CASCADE;
DROP TABLE IF EXISTS public.connection_spaces CASCADE;

DROP FUNCTION IF EXISTS public.is_connection_space_owner(uuid);
DROP FUNCTION IF EXISTS public.is_connection_space_admin(uuid);
DROP FUNCTION IF EXISTS public.is_connection_space_member(uuid);

DROP TYPE IF EXISTS public.connection_transaction_split_type;
DROP TYPE IF EXISTS public.connection_transaction_type;
DROP TYPE IF EXISTS public.connection_event_type;
DROP TYPE IF EXISTS public.connection_member_role;
DROP TYPE IF EXISTS public.connection_archetype_type;
```

**Checklist:**
- [ ] Keep this rollback script available
- [ ] Test rollback on staging environment first
- [ ] Document rollback procedure

## Post-Migration Steps

1. **Update Documentation**
   - [ ] Update API documentation with new tables
   - [ ] Add endpoint specs for CRUD operations
   - [ ] Document RLS policies for frontend team

2. **Update Frontend Code**
   - [ ] Update Supabase client code to reference new tables
   - [ ] Create type definitions from schema
   - [ ] Update query files

3. **Update Tests**
   - [ ] Add integration tests for RLS policies
   - [ ] Add tests for SECURITY DEFINER functions
   - [ ] Test all archetype scenarios

4. **Monitor Performance**
   - [ ] Monitor query performance in production
   - [ ] Check slow query logs
   - [ ] Validate index usage

5. **Team Communication**
   - [ ] Notify frontend team of schema changes
   - [ ] Schedule training on new tables
   - [ ] Document archetype-specific workflows

## Verification Summary

Run this comprehensive check:

```sql
-- Summary query
WITH table_count AS (
  SELECT COUNT(*) as count FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'connection_%'
),
enum_count AS (
  SELECT COUNT(*) as count FROM pg_type
  WHERE typname LIKE 'connection_%'
),
function_count AS (
  SELECT COUNT(*) as count FROM pg_proc
  WHERE proname LIKE 'is_connection_%'
),
policy_count AS (
  SELECT COUNT(*) as count FROM pg_policies
  WHERE tablename LIKE 'connection_%'
),
index_count AS (
  SELECT COUNT(*) as count FROM pg_indexes
  WHERE schemaname = 'public' AND tablename LIKE 'connection_%'
),
trigger_count AS (
  SELECT COUNT(*) as count FROM pg_trigger
  WHERE tgrelname LIKE 'connection_%'
)
SELECT
  (SELECT count FROM table_count) as "Tables (expected: 5)",
  (SELECT count FROM enum_count) as "Enums (expected: 5)",
  (SELECT count FROM function_count) as "Functions (expected: 3)",
  (SELECT count FROM policy_count) as "RLS Policies (expected: 20)",
  (SELECT count FROM index_count) as "Indexes (expected: 31+)",
  (SELECT count FROM trigger_count) as "Triggers (expected: 5)";
```

**Expected Output:**
```
Tables | Enums | Functions | RLS Policies | Indexes | Triggers
   5   |   5   |     3     |      20      |   31+   |    5
```

If all values match expected, the migration has been successfully applied!
