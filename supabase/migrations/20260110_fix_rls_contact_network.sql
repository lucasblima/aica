-- ============================================================================
-- Migration: Fix contact_network RLS Policies
-- Date: 2026-01-10
-- Issue: #88 - Lista de contatos nao aparece na UI apos sincronizacao
-- ============================================================================
--
-- PROBLEM:
-- The RLS policies created in 20260108_contact_google_sync.sql use `created_by`
-- column which does not exist in the contact_network table. The actual column
-- is `user_id` as defined in the table schema.
--
-- The Edge Function sync-whatsapp-contacts correctly inserts with user_id,
-- but users cannot SELECT their own contacts because the RLS policy checks
-- the non-existent created_by column.
--
-- SOLUTION:
-- Drop the incorrect policies and recreate them using the correct user_id column.
--
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT: Log migration start
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX: contact_network RLS Policies';
  RAISE NOTICE 'Issue #88: Contacts not visible in UI';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Drop incorrect policies that reference created_by
-- ============================================================================

DROP POLICY IF EXISTS "contact_network_select_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_insert_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_update_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_delete_own" ON contact_network;

-- Also drop any other policies that might exist with different naming
DROP POLICY IF EXISTS "Users can view their own contacts" ON contact_network;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contact_network;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contact_network;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contact_network;

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped existing contact_network policies';
END $$;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE contact_network ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on contact_network';
END $$;

-- ============================================================================
-- STEP 3: Create corrected RLS policies using user_id
-- ============================================================================

-- SELECT: Users can only view their own contacts
CREATE POLICY "contact_network_select_own"
  ON contact_network
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "contact_network_select_own" ON contact_network IS
  'Users can only view contacts they own. Auth via user_id = auth.uid(). Fixed in Issue #88.';

-- INSERT: Users can only create contacts for themselves
CREATE POLICY "contact_network_insert_own"
  ON contact_network
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "contact_network_insert_own" ON contact_network IS
  'Users can only create contacts where user_id = their auth.uid(). Fixed in Issue #88.';

-- UPDATE: Users can only update their own contacts
CREATE POLICY "contact_network_update_own"
  ON contact_network
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "contact_network_update_own" ON contact_network IS
  'Users can only update contacts they own. Auth via user_id = auth.uid(). Fixed in Issue #88.';

-- DELETE: Users can only delete their own contacts (GDPR Right to Erasure)
CREATE POLICY "contact_network_delete_own"
  ON contact_network
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "contact_network_delete_own" ON contact_network IS
  'GDPR Article 17: Users can delete their own contacts (Right to Erasure). Fixed in Issue #88.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created corrected RLS policies for contact_network';
END $$;

-- ============================================================================
-- STEP 4: Grant permissions to roles
-- ============================================================================

-- Authenticated users have full CRUD on their own contacts (via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_network TO authenticated;

-- Service role has full access (for Edge Functions like sync-whatsapp-contacts)
GRANT ALL ON contact_network TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ Granted permissions to authenticated and service_role';
END $$;

-- ============================================================================
-- POST-FLIGHT: Verify policies
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'contact_network';

  IF policy_count >= 4 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUCCESS: contact_network has % RLS policies', policy_count;
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '⚠️ Expected at least 4 policies, found %', policy_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Apply this migration to staging';
  RAISE NOTICE '2. Test contacts sync in UI';
  RAISE NOTICE '3. Verify contacts appear after refresh';
  RAISE NOTICE '';
  RAISE NOTICE 'Completed at: %', NOW();
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
