-- Migration: Add source document fields to grant_projects
-- Created: 2025-12-08
-- Description: Adds support for uploading source documents (PDF, MD, DOCX, TXT) as "fonte de verdade" for projects

-- Add source document fields to grant_projects
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS source_document_path TEXT NULL,
ADD COLUMN IF NOT EXISTS source_document_type VARCHAR(10) NULL,
ADD COLUMN IF NOT EXISTS source_document_content TEXT NULL,
ADD COLUMN IF NOT EXISTS source_document_uploaded_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN grant_projects.source_document_path IS 'Path to source document in Supabase Storage (bucket: project_sources)';
COMMENT ON COLUMN grant_projects.source_document_type IS 'Document type: md, pdf, docx, txt';
COMMENT ON COLUMN grant_projects.source_document_content IS 'Extracted text content from the document';
COMMENT ON COLUMN grant_projects.source_document_uploaded_at IS 'Timestamp when document was uploaded';

-- Create index for finding projects with source documents
CREATE INDEX IF NOT EXISTS idx_grant_projects_source_document
ON grant_projects(source_document_path)
WHERE source_document_path IS NOT NULL;

-- Helper function to check if project has source document
CREATE OR REPLACE FUNCTION has_source_document(project_record grant_projects)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN project_record.source_document_path IS NOT NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION has_source_document IS 'Helper function to check if a project has a source document uploaded';
