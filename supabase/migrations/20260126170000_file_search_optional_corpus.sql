-- =====================================================
-- MIGRATION: Make corpus_id Optional for Direct File Uploads
-- Date: 2026-01-26
-- Description: Allows file_search_documents to exist without a corpus
--              for direct Google File Search API integration
-- =====================================================
--
-- This change supports the "Google File Search as single source" architecture:
-- - Files can be uploaded directly to Google Files API
-- - No need to create/manage corpus for simple use cases
-- - Corpus remains available for advanced grouping scenarios
-- =====================================================

-- =====================================================
-- PART 1: Make corpus_id Nullable
-- =====================================================

-- Remove NOT NULL constraint from corpus_id
ALTER TABLE public.file_search_documents
  ALTER COLUMN corpus_id DROP NOT NULL;

COMMENT ON COLUMN public.file_search_documents.corpus_id IS 'Optional reference to corpus. NULL for direct file uploads without corpus.';

-- =====================================================
-- PART 2: Add Index for Documents Without Corpus
-- =====================================================

-- Index for querying documents without corpus (direct uploads)
CREATE INDEX IF NOT EXISTS idx_documents_no_corpus
  ON public.file_search_documents(user_id, module_type)
  WHERE corpus_id IS NULL;

-- =====================================================
-- PART 3: Update Helper Functions
-- =====================================================

-- Function: Count documents including those without corpus
CREATE OR REPLACE FUNCTION public.count_user_documents(
  p_user_id UUID,
  p_module_type TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.file_search_documents
    WHERE user_id = p_user_id
      AND (p_module_type IS NULL OR module_type = p_module_type)
      AND indexing_status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.count_user_documents IS 'Counts all indexed documents for a user, optionally filtered by module';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.count_user_documents TO authenticated;

-- =====================================================
-- PART 4: Add RLS Policy for Service Role
-- =====================================================

-- Allow service role to insert documents (for Edge Functions)
CREATE POLICY IF NOT EXISTS "Service role can insert documents"
  ON public.file_search_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  is_nullable BOOLEAN;
BEGIN
  SELECT is_nullable = 'YES'
  INTO is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'file_search_documents'
    AND column_name = 'corpus_id';

  IF is_nullable THEN
    RAISE NOTICE '=== Migration Successful ===';
    RAISE NOTICE 'corpus_id is now NULLABLE';
    RAISE NOTICE 'Direct file uploads without corpus are now supported';
  ELSE
    RAISE WARNING 'corpus_id is still NOT NULL - migration may have failed';
  END IF;
END $$;
