-- ============================================
-- Migration: Grant Context Separation
-- Date: 2025-12-16
-- Description:
--   1. Add CSV support to grant_project_documents
--   2. Create grant_opportunity_documents table for edital-level context
--   3. Create helper functions for context retrieval
-- ============================================

-- ============================================
-- PART 1: ADD CSV SUPPORT TO EXISTING TABLE
-- ============================================

-- Drop existing constraint if exists
ALTER TABLE grant_project_documents
DROP CONSTRAINT IF EXISTS grant_project_documents_document_type_check;

-- Add new constraint with CSV support
ALTER TABLE grant_project_documents
ADD CONSTRAINT grant_project_documents_document_type_check
CHECK (document_type IN ('md', 'pdf', 'txt', 'docx', 'csv'));

-- ============================================
-- PART 2: CREATE OPPORTUNITY DOCUMENTS TABLE
-- ============================================

-- Table for documents attached to the grant opportunity (edital)
-- These are shared across ALL projects for this opportunity
CREATE TABLE IF NOT EXISTS grant_opportunity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document info (same schema as grant_project_documents)
  file_name TEXT NOT NULL,
  document_path TEXT NOT NULL,
  document_type VARCHAR(10) NOT NULL CHECK (document_type IN ('md', 'pdf', 'txt', 'docx', 'csv')),
  document_content TEXT NULL,
  file_size_bytes INTEGER NULL,

  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grant_opportunity_documents_opportunity_id
ON grant_opportunity_documents(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_grant_opportunity_documents_user_id
ON grant_opportunity_documents(user_id);

-- ============================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE grant_opportunity_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents from opportunities they own
CREATE POLICY "Users can view their opportunity documents"
ON grant_opportunity_documents
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  opportunity_id IN (
    SELECT id FROM grant_opportunities WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert documents into their opportunities
CREATE POLICY "Users can insert opportunity documents"
ON grant_opportunity_documents
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  opportunity_id IN (
    SELECT id FROM grant_opportunities WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their opportunity documents"
ON grant_opportunity_documents
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their opportunity documents"
ON grant_opportunity_documents
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Function to get combined content of opportunity documents
CREATE OR REPLACE FUNCTION get_opportunity_documents_content(opportunity_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT string_agg(
    E'=== DOCUMENTO DO EDITAL: ' || file_name || E' ===\n\n' ||
    COALESCE(document_content, '[Conteudo nao extraido]') || E'\n\n',
    E'\n---\n\n'
    ORDER BY uploaded_at ASC
  ) INTO result
  FROM grant_opportunity_documents
  WHERE opportunity_id = opportunity_uuid
    AND document_content IS NOT NULL;

  RETURN COALESCE(result, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to count opportunity documents
CREATE OR REPLACE FUNCTION count_opportunity_documents(opportunity_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count
  FROM grant_opportunity_documents
  WHERE opportunity_id = opportunity_uuid;

  RETURN doc_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get full context for AI generation
-- Combines: edital text + opportunity documents + project documents
CREATE OR REPLACE FUNCTION get_full_grant_context(
  opportunity_uuid UUID,
  project_uuid UUID
)
RETURNS TABLE (
  edital_content TEXT,
  opportunity_documents_content TEXT,
  project_documents_content TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT edital_text_content FROM grant_opportunities WHERE id = opportunity_uuid) AS edital_content,
    get_opportunity_documents_content(opportunity_uuid) AS opportunity_documents_content,
    get_project_documents_content(project_uuid) AS project_documents_content;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- PART 5: UPDATED_AT TRIGGER
-- ============================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_grant_opportunity_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_grant_opportunity_documents_updated_at ON grant_opportunity_documents;
CREATE TRIGGER trigger_update_grant_opportunity_documents_updated_at
  BEFORE UPDATE ON grant_opportunity_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_grant_opportunity_documents_updated_at();

-- ============================================
-- PART 6: GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON grant_opportunity_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_opportunity_documents_content(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_opportunity_documents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_full_grant_context(UUID, UUID) TO authenticated;
