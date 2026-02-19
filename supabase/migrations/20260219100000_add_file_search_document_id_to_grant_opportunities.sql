-- Add file_search_document_id column to grant_opportunities
-- Links the edital to its indexed document in file_search_documents
ALTER TABLE grant_opportunities
ADD COLUMN IF NOT EXISTS file_search_document_id UUID REFERENCES file_search_documents(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_file_search_doc
ON grant_opportunities(file_search_document_id)
WHERE file_search_document_id IS NOT NULL;
