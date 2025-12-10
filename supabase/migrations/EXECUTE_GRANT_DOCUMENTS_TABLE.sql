-- =====================================================
-- MIGRATION: Create grant_project_documents table
-- =====================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql
-- 2. Cole TODO este arquivo no SQL Editor
-- 3. Clique em RUN (ou Ctrl+Enter)
-- 4. Aguarde a execução (pode levar alguns segundos)
-- =====================================================

-- Create grant_project_documents table
CREATE TABLE IF NOT EXISTS grant_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES grant_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document info
  file_name TEXT NOT NULL,
  document_path TEXT NOT NULL,
  document_type VARCHAR(10) NOT NULL CHECK (document_type IN ('md', 'pdf', 'txt', 'docx')),
  document_content TEXT NULL,
  file_size_bytes INTEGER NULL,

  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE grant_project_documents IS 'Multiple source documents for each grant project - used as context for AI generation';
COMMENT ON COLUMN grant_project_documents.file_name IS 'Original file name (user-friendly)';
COMMENT ON COLUMN grant_project_documents.document_path IS 'Path to document in Supabase Storage (bucket: project_sources)';
COMMENT ON COLUMN grant_project_documents.document_type IS 'Document type: md, pdf, docx, txt';
COMMENT ON COLUMN grant_project_documents.document_content IS 'Extracted text content from the document for AI processing';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grant_project_documents_project_id
ON grant_project_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_grant_project_documents_user_id
ON grant_project_documents(user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grant_project_documents_updated_at
  BEFORE UPDATE ON grant_project_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE grant_project_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own project documents
DROP POLICY IF EXISTS "Users can view own project documents" ON grant_project_documents;
CREATE POLICY "Users can view own project documents"
  ON grant_project_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own project documents
DROP POLICY IF EXISTS "Users can insert own project documents" ON grant_project_documents;
CREATE POLICY "Users can insert own project documents"
  ON grant_project_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own project documents
DROP POLICY IF EXISTS "Users can update own project documents" ON grant_project_documents;
CREATE POLICY "Users can update own project documents"
  ON grant_project_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own project documents
DROP POLICY IF EXISTS "Users can delete own project documents" ON grant_project_documents;
CREATE POLICY "Users can delete own project documents"
  ON grant_project_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Helper function to count documents for a project
CREATE OR REPLACE FUNCTION count_project_documents(project_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM grant_project_documents WHERE project_id = project_uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION count_project_documents IS 'Returns the number of source documents for a given project';

-- Helper function to get all document contents concatenated for a project
CREATE OR REPLACE FUNCTION get_project_documents_content(project_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT string_agg(
    E'=== DOCUMENTO: ' || file_name || E' ===\n\n' || COALESCE(document_content, '[Conteúdo não extraído]') || E'\n\n',
    E'\n---\n\n'
    ORDER BY uploaded_at ASC
  ) INTO result
  FROM grant_project_documents
  WHERE project_id = project_uuid
    AND document_content IS NOT NULL;

  RETURN COALESCE(result, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_project_documents_content IS 'Returns all document contents concatenated with separators for AI processing';

-- Migration completed successfully!
SELECT 'grant_project_documents table created successfully!' as status;
