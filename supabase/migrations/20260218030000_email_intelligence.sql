-- =============================================================================
-- Migration: 20260218030000_email_intelligence.sql
-- Description: Phase 1 — Email Intelligence Layer for Google Workspace Hub
--              Creates tables and RPCs for Gmail email categorization and
--              automatic task extraction from emails.
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE gmail_email_categories TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS gmail_email_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'actionable', 'informational', 'newsletter',
    'receipt', 'personal', 'notification'
  )),
  confidence NUMERIC(3,2) DEFAULT 0,
  extracted_tasks JSONB DEFAULT '[]',
  extracted_contacts JSONB DEFAULT '[]',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

COMMENT ON TABLE gmail_email_categories IS
  'AI-categorized Gmail emails with extracted tasks and contacts per message.';

COMMENT ON COLUMN gmail_email_categories.category IS
  'AI-assigned category: actionable, informational, newsletter, receipt, personal, notification.';

COMMENT ON COLUMN gmail_email_categories.confidence IS
  'Model confidence score for the assigned category (0.00 to 1.00).';

-- Index for listing emails by category
CREATE INDEX IF NOT EXISTS idx_email_categories_user_cat
  ON gmail_email_categories(user_id, category, processed_at DESC);

-- =============================================================================
-- PART 2: CREATE email_extracted_tasks TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_extracted_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_message_id TEXT NOT NULL,
  source_subject TEXT,
  source_sender TEXT,
  task_description TEXT NOT NULL,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE email_extracted_tasks IS
  'Tasks automatically extracted from Gmail emails by AI. Can be accepted into Atlas work_items.';

COMMENT ON COLUMN email_extracted_tasks.work_item_id IS
  'Links to the Atlas work_item created when the user accepts this extracted task.';

-- Index for listing tasks by status
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_user_status
  ON email_extracted_tasks(user_id, status, created_at DESC);

-- =============================================================================
-- PART 3: ENABLE ROW-LEVEL SECURITY
-- =============================================================================

-- gmail_email_categories RLS
ALTER TABLE gmail_email_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email categories"
  ON gmail_email_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email categories"
  ON gmail_email_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email categories"
  ON gmail_email_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email categories"
  ON gmail_email_categories FOR DELETE
  USING (auth.uid() = user_id);

-- email_extracted_tasks RLS
ALTER TABLE email_extracted_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extracted tasks"
  ON email_extracted_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own extracted tasks"
  ON email_extracted_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extracted tasks"
  ON email_extracted_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own extracted tasks"
  ON email_extracted_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access on email categories"
  ON gmail_email_categories FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access on extracted tasks"
  ON email_extracted_tasks FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- PART 4: RPC — upsert_email_categories
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_email_categories(
  p_user_id UUID,
  p_categories JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item JSONB;
  _count INTEGER := 0;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    INSERT INTO gmail_email_categories (
      user_id,
      message_id,
      category,
      confidence,
      extracted_tasks,
      extracted_contacts,
      processed_at
    ) VALUES (
      p_user_id,
      _item->>'message_id',
      _item->>'category',
      COALESCE((_item->>'confidence')::NUMERIC, 0),
      COALESCE(_item->'extracted_tasks', '[]'::JSONB),
      COALESCE(_item->'extracted_contacts', '[]'::JSONB),
      NOW()
    )
    ON CONFLICT (user_id, message_id) DO UPDATE SET
      category = EXCLUDED.category,
      confidence = EXCLUDED.confidence,
      extracted_tasks = EXCLUDED.extracted_tasks,
      extracted_contacts = EXCLUDED.extracted_contacts,
      processed_at = NOW();

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

COMMENT ON FUNCTION upsert_email_categories IS
  'Bulk upsert email categories from AI classification. Accepts JSONB array of {message_id, category, confidence, extracted_tasks, extracted_contacts}.';

-- =============================================================================
-- PART 5: RPC — get_categorized_emails
-- =============================================================================

CREATE OR REPLACE FUNCTION get_categorized_emails(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS SETOF gmail_email_categories
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM gmail_email_categories
    WHERE user_id = p_user_id
      AND (p_category IS NULL OR category = p_category)
    ORDER BY processed_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_categorized_emails IS
  'Returns categorized emails for a user, optionally filtered by category. Ordered by most recent first.';

-- =============================================================================
-- PART 6: RPC — accept_extracted_task
-- =============================================================================

CREATE OR REPLACE FUNCTION accept_extracted_task(
  p_task_id UUID,
  p_work_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated BOOLEAN := FALSE;
BEGIN
  UPDATE email_extracted_tasks
  SET status = 'accepted',
      work_item_id = p_work_item_id
  WHERE id = p_task_id
    AND user_id = auth.uid();

  GET DIAGNOSTICS _updated = ROW_COUNT;

  RETURN _updated;
END;
$$;

COMMENT ON FUNCTION accept_extracted_task IS
  'Accepts an AI-extracted email task and links it to an Atlas work_item. Requires auth.uid() match.';

-- =============================================================================
-- PART 7: GRANT PERMISSIONS
-- =============================================================================

-- Table grants
GRANT ALL ON gmail_email_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON gmail_email_categories TO authenticated;

GRANT ALL ON email_extracted_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_extracted_tasks TO authenticated;

-- Function grants
GRANT EXECUTE ON FUNCTION upsert_email_categories(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_categorized_emails(UUID, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION accept_extracted_task(UUID, UUID) TO authenticated, service_role;

-- =============================================================================
-- PART 8: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  _table_count INTEGER;
  _rls_count INTEGER;
  _func_count INTEGER;
BEGIN
  -- Verify tables exist
  SELECT COUNT(*) INTO _table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('gmail_email_categories', 'email_extracted_tasks');

  IF _table_count < 2 THEN
    RAISE EXCEPTION 'Expected 2 tables, found %', _table_count;
  END IF;

  -- Verify RLS is enabled on both tables
  SELECT COUNT(*) INTO _rls_count
  FROM pg_class
  WHERE relname IN ('gmail_email_categories', 'email_extracted_tasks')
    AND relrowsecurity = TRUE;

  IF _rls_count < 2 THEN
    RAISE EXCEPTION 'RLS not enabled on all tables. Found % with RLS', _rls_count;
  END IF;

  -- Verify RPCs exist
  SELECT COUNT(*) INTO _func_count
  FROM pg_proc
  WHERE proname IN ('upsert_email_categories', 'get_categorized_emails', 'accept_extracted_task');

  IF _func_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 RPCs, found %', _func_count;
  END IF;

  RAISE NOTICE '=== Migration 20260218030000_email_intelligence completed ===';
  RAISE NOTICE '- Created gmail_email_categories table with UNIQUE(user_id, message_id)';
  RAISE NOTICE '- Created email_extracted_tasks table with FK to work_items';
  RAISE NOTICE '- Enabled RLS with 10 policies (4+4 user + 2 service_role)';
  RAISE NOTICE '- Created 3 RPCs: upsert_email_categories, get_categorized_emails, accept_extracted_task';
  RAISE NOTICE '- Created 2 indexes for efficient lookups';
END $$;
