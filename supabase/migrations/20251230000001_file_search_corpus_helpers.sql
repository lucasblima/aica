-- ===========================================================================
-- File Search Corpus Helper Functions
-- ===========================================================================
-- Created: 2025-12-30
-- Purpose: Add stored procedures to manage document counts in file_search_corpora
-- ===========================================================================

-- Function to increment document count in a corpus
CREATE OR REPLACE FUNCTION increment_corpus_document_count(corpus_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.file_search_corpora
  SET document_count = COALESCE(document_count, 0) + 1,
      updated_at = NOW()
  WHERE id = corpus_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement document count in a corpus
CREATE OR REPLACE FUNCTION decrement_corpus_document_count(corpus_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.file_search_corpora
  SET document_count = GREATEST(COALESCE(document_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = corpus_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate document count for a corpus (for data integrity checks)
CREATE OR REPLACE FUNCTION recalculate_corpus_document_count(corpus_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  actual_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO actual_count
  FROM public.file_search_documents
  WHERE corpus_id = corpus_uuid;

  UPDATE public.file_search_corpora
  SET document_count = actual_count,
      updated_at = NOW()
  WHERE id = corpus_uuid;

  RETURN actual_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_corpus_document_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_corpus_document_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_corpus_document_count(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION increment_corpus_document_count IS 'Increments the document count for a file search corpus. Called when a document is indexed.';
COMMENT ON FUNCTION decrement_corpus_document_count IS 'Decrements the document count for a file search corpus. Called when a document is deleted.';
COMMENT ON FUNCTION recalculate_corpus_document_count IS 'Recalculates the actual document count for a corpus. Use for data integrity checks.';
