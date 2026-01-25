-- ============================================================================
-- MIGRATION: Document Processing Pipeline (Epic #113)
-- Date: 2026-01-12
-- Author: Backend Architect Agent
--
-- PURPOSE:
-- Create comprehensive document processing system for Aica Life OS:
-- 1. processed_documents - Main document metadata and extracted content
-- 2. document_chunks - Text chunks for embeddings
-- 3. document_embeddings - Vector embeddings for semantic search (pgvector)
-- 4. document_link_suggestions - AI-powered entity linking suggestions
--
-- DEPENDENCIES:
-- - pgvector extension (for embeddings)
-- - auth.users table
-- - organizations table (if exists)
-- - grant_projects table (if exists)
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE PGVECTOR EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PART 2: CREATE MAIN TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: processed_documents
-- Purpose: Store uploaded documents with extracted content and metadata
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.processed_documents (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and organization references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,  -- Optional: References public.organizations(id) if table exists
  project_id UUID,       -- Optional: References public.grant_projects(id) if table exists

  -- File storage information
  storage_path TEXT NOT NULL,                    -- Path in Supabase Storage bucket
  original_name TEXT NOT NULL,                   -- Original filename from user
  mime_type TEXT NOT NULL,                       -- MIME type (application/pdf, etc.)
  size_bytes INTEGER NOT NULL,                   -- File size in bytes

  -- Extracted content
  raw_text TEXT,                                 -- Full extracted text content
  structured_data JSONB DEFAULT '{}'::jsonb,     -- Structured data extraction results
  detected_type TEXT,                            -- Document type (projeto_rouanet, estatuto, relatorio, apresentacao, etc.)
  confidence NUMERIC(3,2),                       -- Detection confidence (0.00-1.00)
  extracted_fields JSONB DEFAULT '{}'::jsonb,    -- Key-value pairs extracted from document

  -- Processing metadata
  page_count INTEGER,                            -- Number of pages in document
  word_count INTEGER,                            -- Approximate word count
  has_images BOOLEAN DEFAULT false,              -- Whether document contains images
  processing_time_ms INTEGER,                    -- Processing duration in milliseconds
  processing_status TEXT DEFAULT 'pending'       -- Status: pending, processing, completed, failed
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,                            -- Error details if processing failed

  -- Source tracking (multi-channel support)
  source TEXT DEFAULT 'web'                      -- Source: web, whatsapp, email
    CHECK (source IN ('web', 'whatsapp', 'email')),
  source_phone TEXT,                             -- WhatsApp phone if source=whatsapp
  whatsapp_message_id TEXT,                      -- WhatsApp message ID for traceability

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),         -- When file was uploaded
  processed_at TIMESTAMPTZ,                      -- When processing completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- TABLE: document_chunks
-- Purpose: Store text chunks for embedding generation and semantic search
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.document_chunks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent document reference
  document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,

  -- Chunk metadata
  chunk_index INTEGER NOT NULL,                  -- Sequential index (0, 1, 2, ...)
  chunk_text TEXT NOT NULL,                      -- The actual text chunk
  chunk_tokens INTEGER,                          -- Approximate token count

  -- Location within document
  start_page INTEGER,                            -- First page of chunk
  end_page INTEGER,                              -- Last page of chunk
  section_title TEXT,                            -- Section/heading if detected

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique chunks per document
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- -----------------------------------------------------------------------------
-- TABLE: document_embeddings
-- Purpose: Store vector embeddings for semantic search using pgvector
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent chunk reference
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,

  -- Vector embedding (768 dimensions for text-embedding-004)
  embedding vector(768) NOT NULL,

  -- Model tracking
  model_version TEXT DEFAULT 'text-embedding-004',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- TABLE: document_link_suggestions
-- Purpose: Store AI-generated suggestions for linking documents to entities
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.document_link_suggestions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent document reference
  document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,

  -- Target entity
  entity_type TEXT NOT NULL                      -- Type: organization, project, opportunity
    CHECK (entity_type IN ('organization', 'project', 'opportunity')),
  entity_id UUID NOT NULL,                       -- UUID of the target entity

  -- Matching information
  match_reason TEXT NOT NULL                     -- Reason: cnpj, name_similarity, pronac, context
    CHECK (match_reason IN ('cnpj', 'name_similarity', 'pronac', 'context')),
  confidence NUMERIC(3,2) NOT NULL               -- Match confidence (0.00-1.00)
    CHECK (confidence >= 0 AND confidence <= 1),

  -- Confirmation tracking
  is_confirmed BOOLEAN DEFAULT false,            -- User confirmed the suggestion
  confirmed_at TIMESTAMPTZ,                      -- When user confirmed

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: CREATE INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Indexes for processed_documents
CREATE INDEX IF NOT EXISTS idx_processed_documents_user_id
  ON public.processed_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_processed_documents_organization_id
  ON public.processed_documents(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_documents_project_id
  ON public.processed_documents(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_documents_status
  ON public.processed_documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_processed_documents_detected_type
  ON public.processed_documents(detected_type) WHERE detected_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_documents_source
  ON public.processed_documents(source);

CREATE INDEX IF NOT EXISTS idx_processed_documents_created_at
  ON public.processed_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_processed_documents_whatsapp
  ON public.processed_documents(source_phone, whatsapp_message_id)
  WHERE source = 'whatsapp';

-- Indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON public.document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_chunk
  ON public.document_chunks(document_id, chunk_index);

-- Indexes for document_embeddings
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_id
  ON public.document_embeddings(chunk_id);

-- CRITICAL: HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
  ON public.document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Indexes for document_link_suggestions
CREATE INDEX IF NOT EXISTS idx_document_link_suggestions_document_id
  ON public.document_link_suggestions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_link_suggestions_entity
  ON public.document_link_suggestions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_document_link_suggestions_unconfirmed
  ON public.document_link_suggestions(is_confirmed)
  WHERE is_confirmed = false;

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.processed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_link_suggestions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user owns a document (via direct ownership)
CREATE OR REPLACE FUNCTION public.user_owns_document(
  _user_id UUID,
  _document_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.processed_documents
    WHERE id = _document_id
      AND user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: Check if user can access document (via organization membership)
CREATE OR REPLACE FUNCTION public.user_can_access_document(
  _user_id UUID,
  _document_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  doc_org_id UUID;
BEGIN
  -- Get organization_id of the document
  SELECT organization_id INTO doc_org_id
  FROM public.processed_documents
  WHERE id = _document_id;

  -- If no organization, only owner can access
  IF doc_org_id IS NULL THEN
    RETURN user_owns_document(_user_id, _document_id);
  END IF;

  -- Check if user is member of the organization
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = doc_org_id
      AND member_user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- PART 6: CREATE RLS POLICIES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- RLS Policies: processed_documents
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own documents"
  ON public.processed_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.processed_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.processed_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.processed_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Organization members can view shared documents
CREATE POLICY "Organization members can view shared documents"
  ON public.processed_documents FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND user_can_access_document(auth.uid(), id)
  );

-- -----------------------------------------------------------------------------
-- RLS Policies: document_chunks
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view chunks of accessible documents"
  ON public.document_chunks FOR SELECT
  USING (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

CREATE POLICY "System can insert chunks"
  ON public.document_chunks FOR INSERT
  WITH CHECK (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

CREATE POLICY "Users can delete chunks of own documents"
  ON public.document_chunks FOR DELETE
  USING (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

-- -----------------------------------------------------------------------------
-- RLS Policies: document_embeddings
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view embeddings of accessible chunks"
  ON public.document_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_chunks dc
      WHERE dc.id = chunk_id
        AND user_owns_document(auth.uid(), dc.document_id)
    )
  );

CREATE POLICY "System can insert embeddings"
  ON public.document_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_chunks dc
      WHERE dc.id = chunk_id
        AND user_owns_document(auth.uid(), dc.document_id)
    )
  );

CREATE POLICY "Users can delete embeddings of own chunks"
  ON public.document_embeddings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.document_chunks dc
      WHERE dc.id = chunk_id
        AND user_owns_document(auth.uid(), dc.document_id)
    )
  );

-- -----------------------------------------------------------------------------
-- RLS Policies: document_link_suggestions
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view suggestions for own documents"
  ON public.document_link_suggestions FOR SELECT
  USING (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

CREATE POLICY "System can insert suggestions"
  ON public.document_link_suggestions FOR INSERT
  WITH CHECK (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

CREATE POLICY "Users can update suggestions for own documents"
  ON public.document_link_suggestions FOR UPDATE
  USING (
    user_owns_document(
      auth.uid(),
      document_id
    )
  )
  WITH CHECK (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

CREATE POLICY "Users can delete suggestions for own documents"
  ON public.document_link_suggestions FOR DELETE
  USING (
    user_owns_document(
      auth.uid(),
      document_id
    )
  );

-- ============================================================================
-- PART 7: CREATE TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_processed_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to processed_documents
-- Drop first to make idempotent
DROP TRIGGER IF EXISTS update_processed_documents_updated_at_trigger ON public.processed_documents;

CREATE TRIGGER update_processed_documents_updated_at_trigger
  BEFORE UPDATE ON public.processed_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_processed_documents_updated_at();

-- ============================================================================
-- PART 8: CREATE UTILITY FUNCTIONS FOR SEMANTIC SEARCH
-- ============================================================================

-- Function: Search documents by semantic similarity
CREATE OR REPLACE FUNCTION public.search_documents_by_embedding(
  _query_embedding vector(768),
  _user_id UUID,
  _limit INTEGER DEFAULT 10,
  _min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  document_id UUID,
  chunk_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  document_name TEXT,
  detected_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id AS document_id,
    dc.id AS chunk_id,
    dc.chunk_text,
    1 - (de.embedding <=> _query_embedding) AS similarity,
    pd.original_name AS document_name,
    pd.detected_type
  FROM public.document_embeddings de
  JOIN public.document_chunks dc ON dc.id = de.chunk_id
  JOIN public.processed_documents pd ON pd.id = dc.document_id
  WHERE pd.user_id = _user_id
    AND pd.processing_status = 'completed'
    AND (1 - (de.embedding <=> _query_embedding)) >= _min_similarity
  ORDER BY de.embedding <=> _query_embedding
  LIMIT _limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: Get document processing statistics
CREATE OR REPLACE FUNCTION public.get_document_processing_stats(_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  completed_documents BIGINT,
  pending_documents BIGINT,
  failed_documents BIGINT,
  total_chunks BIGINT,
  total_embeddings BIGINT,
  avg_processing_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_documents,
    COUNT(*) FILTER (WHERE processing_status = 'completed')::BIGINT AS completed_documents,
    COUNT(*) FILTER (WHERE processing_status = 'pending')::BIGINT AS pending_documents,
    COUNT(*) FILTER (WHERE processing_status = 'failed')::BIGINT AS failed_documents,
    (SELECT COUNT(*) FROM public.document_chunks dc
     JOIN public.processed_documents pd ON pd.id = dc.document_id
     WHERE pd.user_id = _user_id)::BIGINT AS total_chunks,
    (SELECT COUNT(*) FROM public.document_embeddings de
     JOIN public.document_chunks dc ON dc.id = de.chunk_id
     JOIN public.processed_documents pd ON pd.id = dc.document_id
     WHERE pd.user_id = _user_id)::BIGINT AS total_embeddings,
    AVG(processing_time_ms) AS avg_processing_time_ms
  FROM public.processed_documents
  WHERE user_id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- PART 9: ADD TABLE AND COLUMN COMMENTS
-- ============================================================================

-- processed_documents comments
COMMENT ON TABLE public.processed_documents IS
  'Stores uploaded documents with extracted content and metadata for document processing pipeline';
COMMENT ON COLUMN public.processed_documents.id IS 'Unique document identifier';
COMMENT ON COLUMN public.processed_documents.user_id IS 'Owner of the document';
COMMENT ON COLUMN public.processed_documents.organization_id IS 'Optional organization for shared access';
COMMENT ON COLUMN public.processed_documents.project_id IS 'Optional grant project association';
COMMENT ON COLUMN public.processed_documents.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN public.processed_documents.detected_type IS 'AI-detected document type (projeto_rouanet, estatuto, etc.)';
COMMENT ON COLUMN public.processed_documents.structured_data IS 'Structured extraction results in JSONB format';
COMMENT ON COLUMN public.processed_documents.source IS 'Upload source: web, whatsapp, or email';
COMMENT ON COLUMN public.processed_documents.processing_status IS 'Current processing status: pending, processing, completed, failed';

-- document_chunks comments
COMMENT ON TABLE public.document_chunks IS
  'Text chunks from documents for embedding generation and semantic search';
COMMENT ON COLUMN public.document_chunks.chunk_index IS 'Sequential index of chunk within document (0-based)';
COMMENT ON COLUMN public.document_chunks.chunk_tokens IS 'Approximate token count for LLM context planning';

-- document_embeddings comments
COMMENT ON TABLE public.document_embeddings IS
  'Vector embeddings for semantic search using pgvector (768 dimensions from text-embedding-004)';
COMMENT ON COLUMN public.document_embeddings.embedding IS 'Vector embedding (768 dimensions) for semantic similarity search';
COMMENT ON COLUMN public.document_embeddings.model_version IS 'Embedding model version for tracking';

-- document_link_suggestions comments
COMMENT ON TABLE public.document_link_suggestions IS
  'AI-generated suggestions for linking documents to entities (organizations, projects, opportunities)';
COMMENT ON COLUMN public.document_link_suggestions.match_reason IS 'Why this link was suggested: cnpj, name_similarity, pronac, context';
COMMENT ON COLUMN public.document_link_suggestions.confidence IS 'Match confidence score (0.00-1.00)';
COMMENT ON COLUMN public.document_link_suggestions.is_confirmed IS 'Whether user has confirmed this suggestion';

-- ============================================================================
-- PART 10: ADD FOREIGN KEY CONSTRAINTS (IF TABLES EXIST)
-- ============================================================================

-- Add FK to organizations if table exists
-- ============================================================================
-- PATCH: Make Foreign Key Constraints Idempotent for Migration 0
-- Execute this INSTEAD of the original DO blocks for FK constraints
-- ============================================================================

-- Add FK to organizations if table exists (IDEMPOTENT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    -- Try to add constraint, ignore if exists
    BEGIN
      ALTER TABLE public.processed_documents
        ADD CONSTRAINT fk_processed_documents_organization
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint to organizations table';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'FK constraint to organizations already exists - skipping';
    END;
  END IF;
END $$;

-- Add FK to grant_projects if table exists (IDEMPOTENT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grant_projects'
  ) THEN
    -- Try to add constraint, ignore if exists
    BEGIN
      ALTER TABLE public.processed_documents
        ADD CONSTRAINT fk_processed_documents_project
        FOREIGN KEY (project_id)
        REFERENCES public.grant_projects(id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint to grant_projects table';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'FK constraint to grant_projects already exists - skipping';
    END;
  END IF;
END $$;
-- ============================================================================
-- PART 11: VERIFICATION AND LOGGING
-- ============================================================================

DO $$
DECLARE
  docs_exists BOOLEAN;
  chunks_exists BOOLEAN;
  embeddings_exists BOOLEAN;
  suggestions_exists BOOLEAN;
  pgvector_enabled BOOLEAN;
BEGIN
  -- Check if tables were created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'processed_documents'
  ) INTO docs_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_chunks'
  ) INTO chunks_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_embeddings'
  ) INTO embeddings_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_link_suggestions'
  ) INTO suggestions_exists;

  -- Check if pgvector is enabled
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO pgvector_enabled;

  -- Log results
  RAISE NOTICE '=== Document Processing Pipeline Migration ===';
  RAISE NOTICE 'pgvector extension enabled: %', pgvector_enabled;
  RAISE NOTICE 'processed_documents created: %', docs_exists;
  RAISE NOTICE 'document_chunks created: %', chunks_exists;
  RAISE NOTICE 'document_embeddings created: %', embeddings_exists;
  RAISE NOTICE 'document_link_suggestions created: %', suggestions_exists;

  IF docs_exists AND chunks_exists AND embeddings_exists AND suggestions_exists THEN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create storage bucket for document uploads';
    RAISE NOTICE '2. Implement document processing Edge Function';
    RAISE NOTICE '3. Set up embedding generation pipeline';
  ELSE
    RAISE WARNING '⚠️ Some tables may not have been created. Check logs above.';
  END IF;
END $$;
