-- =============================================================================
-- Migration: 20260218010000_google_resource_links.sql
-- Description: Create google_resource_links table for hybrid AI-assisted
--              linking of Google resources (Gmail, Drive) to AICA modules.
--              Supports auto-link (high confidence), suggest (medium), and
--              user confirm/reject workflow.
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS google_resource_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Google resource info
  resource_type TEXT NOT NULL CHECK (resource_type IN ('email', 'file')),
  resource_id TEXT NOT NULL,
  resource_title TEXT NOT NULL,
  resource_snippet TEXT,
  resource_metadata JSONB DEFAULT '{}',

  -- Link target
  linked_module TEXT NOT NULL,
  linked_entity_id TEXT,
  linked_entity_type TEXT,

  -- AI confidence + status
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  link_status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (link_status IN ('auto', 'suggested', 'confirmed', 'rejected')),
  relevance_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate links
  UNIQUE(user_id, resource_type, resource_id, linked_module, linked_entity_id)
);

COMMENT ON TABLE google_resource_links IS
  'Links between Google resources (emails, Drive files) and AICA modules. Supports AI auto-linking with confidence scores and user confirmation.';

COMMENT ON COLUMN google_resource_links.resource_type IS
  'Type of Google resource: email (Gmail) or file (Drive).';

COMMENT ON COLUMN google_resource_links.resource_id IS
  'Gmail message ID or Drive file ID.';

COMMENT ON COLUMN google_resource_links.resource_metadata IS
  'Extra data: sender/recipients for emails, mimeType/size for files, etc.';

COMMENT ON COLUMN google_resource_links.confidence_score IS
  'AI confidence in the link relevance (0.0 to 1.0). >=0.8 auto-linked, 0.5-0.79 suggested.';

COMMENT ON COLUMN google_resource_links.link_status IS
  'auto = AI auto-linked (high confidence), suggested = pending user review, confirmed = user approved, rejected = user dismissed.';

COMMENT ON COLUMN google_resource_links.relevance_reason IS
  'AI explanation in Portuguese of why this resource is relevant to the module.';

-- =============================================================================
-- PART 2: INDEXES
-- =============================================================================

-- Module queries: "show me all confirmed links for grants module"
CREATE INDEX IF NOT EXISTS idx_google_resource_links_module_status
  ON google_resource_links(user_id, linked_module, link_status);

-- Resource lookups: "is this email already linked?"
CREATE INDEX IF NOT EXISTS idx_google_resource_links_resource
  ON google_resource_links(user_id, resource_type, resource_id);

-- Ranked suggestions: "show highest confidence suggestions first"
CREATE INDEX IF NOT EXISTS idx_google_resource_links_confidence
  ON google_resource_links(user_id, confidence_score DESC);

-- =============================================================================
-- PART 3: ENABLE ROW-LEVEL SECURITY
-- =============================================================================

ALTER TABLE google_resource_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links"
  ON google_resource_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own links"
  ON google_resource_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own links"
  ON google_resource_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own links"
  ON google_resource_links FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access on google_resource_links"
  ON google_resource_links FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- PART 4: UPDATED_AT TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS update_google_resource_links_updated_at ON google_resource_links;

CREATE TRIGGER update_google_resource_links_updated_at
  BEFORE UPDATE ON google_resource_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 5: RPC — get_module_google_links
-- =============================================================================

CREATE OR REPLACE FUNCTION get_module_google_links(
  p_module TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS SETOF google_resource_links
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM google_resource_links
  WHERE user_id = auth.uid()
    AND linked_module = p_module
    AND (p_entity_id IS NULL OR linked_entity_id = p_entity_id)
    AND (p_status IS NULL OR link_status = p_status)
  ORDER BY confidence_score DESC, created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_module_google_links IS
  'Returns Google resource links for a specific module, optionally filtered by entity and status. Ordered by confidence DESC.';

-- =============================================================================
-- PART 6: RPC — confirm_google_link
-- =============================================================================

CREATE OR REPLACE FUNCTION confirm_google_link(p_link_id UUID)
RETURNS google_resource_links
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _result google_resource_links;
BEGIN
  UPDATE google_resource_links
  SET link_status = 'confirmed',
      updated_at = now()
  WHERE id = p_link_id
    AND user_id = auth.uid()
  RETURNING * INTO _result;

  IF _result.id IS NULL THEN
    RAISE EXCEPTION 'Link not found or unauthorized';
  END IF;

  RETURN _result;
END;
$$;

COMMENT ON FUNCTION confirm_google_link IS
  'Confirms a suggested Google resource link. User must own the link.';

-- =============================================================================
-- PART 7: RPC — reject_google_link
-- =============================================================================

CREATE OR REPLACE FUNCTION reject_google_link(p_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _found BOOLEAN;
BEGIN
  UPDATE google_resource_links
  SET link_status = 'rejected',
      updated_at = now()
  WHERE id = p_link_id
    AND user_id = auth.uid();

  GET DIAGNOSTICS _found = ROW_COUNT;

  IF NOT _found THEN
    RAISE EXCEPTION 'Link not found or unauthorized';
  END IF;
END;
$$;

COMMENT ON FUNCTION reject_google_link IS
  'Rejects a suggested Google resource link. User must own the link.';

-- =============================================================================
-- PART 8: RPC — upsert_google_links (SECURITY DEFINER for ON CONFLICT)
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_google_links(p_links JSONB)
RETURNS SETOF google_resource_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link JSONB;
  _user_id UUID;
  _result google_resource_links;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR _link IN SELECT * FROM jsonb_array_elements(p_links)
  LOOP
    INSERT INTO google_resource_links (
      user_id,
      resource_type,
      resource_id,
      resource_title,
      resource_snippet,
      resource_metadata,
      linked_module,
      linked_entity_id,
      linked_entity_type,
      confidence_score,
      link_status,
      relevance_reason
    ) VALUES (
      _user_id,
      _link->>'resource_type',
      _link->>'resource_id',
      _link->>'resource_title',
      _link->>'resource_snippet',
      COALESCE(_link->'resource_metadata', '{}'::jsonb),
      _link->>'linked_module',
      _link->>'linked_entity_id',
      _link->>'linked_entity_type',
      COALESCE((_link->>'confidence_score')::NUMERIC, 0),
      COALESCE(_link->>'link_status', 'suggested'),
      _link->>'relevance_reason'
    )
    ON CONFLICT (user_id, resource_type, resource_id, linked_module, linked_entity_id)
    DO UPDATE SET
      resource_title = EXCLUDED.resource_title,
      resource_snippet = EXCLUDED.resource_snippet,
      resource_metadata = EXCLUDED.resource_metadata,
      linked_entity_type = EXCLUDED.linked_entity_type,
      confidence_score = EXCLUDED.confidence_score,
      link_status = EXCLUDED.link_status,
      relevance_reason = EXCLUDED.relevance_reason,
      updated_at = now()
    RETURNING * INTO _result;

    RETURN NEXT _result;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION upsert_google_links IS
  'Batch upsert Google resource links. Used by Edge Functions after AI classification. SECURITY DEFINER to handle ON CONFLICT properly.';

-- =============================================================================
-- PART 9: GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON google_resource_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON google_resource_links TO authenticated;

GRANT EXECUTE ON FUNCTION get_module_google_links(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION confirm_google_link(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_google_link(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_google_links(JSONB) TO authenticated, service_role;

-- =============================================================================
-- PART 10: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  _table_exists BOOLEAN;
  _rls_enabled BOOLEAN;
  _policy_count INTEGER;
  _function_count INTEGER;
BEGIN
  -- Verify table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'google_resource_links'
  ) INTO _table_exists;

  IF NOT _table_exists THEN
    RAISE EXCEPTION 'Table google_resource_links not created';
  END IF;

  -- Verify RLS is enabled
  SELECT relrowsecurity
  INTO _rls_enabled
  FROM pg_class
  WHERE relname = 'google_resource_links';

  IF NOT _rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on google_resource_links';
  END IF;

  -- Count policies (expect 5: 4 user + 1 service role)
  SELECT COUNT(*) INTO _policy_count
  FROM pg_policies
  WHERE tablename = 'google_resource_links';

  IF _policy_count < 5 THEN
    RAISE WARNING 'Expected at least 5 RLS policies, found %', _policy_count;
  END IF;

  -- Count RPCs
  SELECT COUNT(*) INTO _function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'get_module_google_links',
      'confirm_google_link',
      'reject_google_link',
      'upsert_google_links'
    );

  IF _function_count < 4 THEN
    RAISE WARNING 'Expected 4 RPCs, found %', _function_count;
  END IF;

  RAISE NOTICE '=== Migration 20260218010000_google_resource_links completed ===';
  RAISE NOTICE '- Created google_resource_links table';
  RAISE NOTICE '- Enabled RLS with % policies', _policy_count;
  RAISE NOTICE '- Created 3 indexes (module_status, resource, confidence)';
  RAISE NOTICE '- Created 4 RPCs (get_module, confirm, reject, upsert)';
  RAISE NOTICE '- Updated_at trigger active';
END $$;
