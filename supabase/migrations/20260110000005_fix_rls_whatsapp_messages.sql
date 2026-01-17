-- Migration: 20260110_fix_rls_whatsapp_messages.sql
-- Description: Add missing INSERT and DELETE policies for whatsapp_messages table
-- Issue: #73 Phase 1 - Security & Integrity
-- Table: whatsapp_messages (CRITICAL - privacy-sensitive communications)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'whatsapp_messages') THEN
    RAISE EXCEPTION 'Required table whatsapp_messages does not exist';
  END IF;
END $$;

-- Verify contact_network exists (FK dependency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contact_network') THEN
    RAISE EXCEPTION 'Required table contact_network does not exist';
  END IF;
END $$;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (if not already enabled)
-- ============================================================================

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (to rebuild complete set)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON whatsapp_messages;

-- Also drop old policies if they exist
DROP POLICY IF EXISTS "Users can select their messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update message status" ON whatsapp_messages;

-- ============================================================================
-- CREATE SECURITY DEFINER FUNCTION (check message ownership via contact_network)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_whatsapp_message(
  _user_id UUID,
  _message_user_id UUID,
  _contact_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================================================
-- CREATE COMPLETE RLS POLICIES (ALL CRUD)
-- ============================================================================

-- SELECT: Users can view messages they sent or received (via contact_network)
CREATE POLICY "Users can view their own messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  );

-- INSERT: Users can insert messages for their own contacts
CREATE POLICY "Users can insert their own messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM contact_network
      WHERE id = contact_id
        AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can update message status (read_at, delivered_at) for their own messages
CREATE POLICY "Users can update their own messages"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  )
  WITH CHECK (
    public.user_owns_whatsapp_message(auth.uid(), user_id, contact_id)
  );

-- DELETE: Users can delete their own messages (soft-delete recommended, but allow hard delete)
-- NOTE: Consider implementing soft-delete for compliance/audit trail
CREATE POLICY "Users can delete their own messages"
  ON whatsapp_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_messages IS
  'Stores WhatsApp message metadata (privacy-sensitive, CASCADE deletes with users and contacts)';

COMMENT ON FUNCTION public.user_owns_whatsapp_message(UUID, UUID, UUID) IS
  'SECURITY DEFINER: Checks if user owns a WhatsApp message via user_id or contact_network';

COMMENT ON POLICY "Users can view their own messages" ON whatsapp_messages IS
  'Users can view messages they sent or received (checked via contact_network ownership)';

COMMENT ON POLICY "Users can insert their own messages" ON whatsapp_messages IS
  'Users can insert messages for their own contacts only';

COMMENT ON POLICY "Users can update their own messages" ON whatsapp_messages IS
  'Users can update message status (read_at, delivered_at) for their messages';

COMMENT ON POLICY "Users can delete their own messages" ON whatsapp_messages IS
  'Users can delete their own messages (GDPR right to erasure). Consider soft-delete for audit trail.';

-- ============================================================================
-- POST-FLIGHT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'whatsapp_messages' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on whatsapp_messages';
  END IF;
END $$;

-- Verify all CRUD policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'whatsapp_messages'
    AND policyname IN (
      'Users can view their own messages',
      'Users can insert their own messages',
      'Users can update their own messages',
      'Users can delete their own messages'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 CRUD policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✅ All 4 CRUD policies verified for whatsapp_messages';
  END IF;
END $$;

-- Verify SECURITY DEFINER function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'user_owns_whatsapp_message'
  ) THEN
    RAISE EXCEPTION 'SECURITY DEFINER function user_owns_whatsapp_message not created';
  ELSE
    RAISE NOTICE '✅ SECURITY DEFINER function verified';
  END IF;
END $$;
