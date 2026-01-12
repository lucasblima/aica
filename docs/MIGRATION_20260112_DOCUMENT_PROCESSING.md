# Migration: Document Processing Pipeline

**File:** `supabase/migrations/20260112_create_document_processing.sql`
**Date:** 2026-01-12
**Epic:** #113 - File Processing Pipeline
**Sprint:** Sprint 1 (Issue #114)
**Lines:** 637

---

## Overview

This migration creates the complete database infrastructure for the document processing pipeline in Aica Life OS. The system supports multi-channel document uploads (web, WhatsApp, email), AI-powered extraction, semantic search using pgvector embeddings, and intelligent entity linking suggestions.

---

## Architecture Components

### 1. Tables Created

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **processed_documents** | Main document storage | Multi-channel support, processing status tracking, extracted content |
| **document_chunks** | Text segmentation | Chunking for embeddings, page tracking, section context |
| **document_embeddings** | Vector search | 768-dim embeddings (text-embedding-004), HNSW index |
| **document_link_suggestions** | AI linking | Entity matching with confidence scores, confirmation workflow |

### 2. Security Architecture

**Pattern:** SECURITY DEFINER helper functions (no RLS recursion)

#### Helper Functions:
- `user_owns_document(_user_id, _document_id)` - Direct ownership check
- `user_can_access_document(_user_id, _document_id)` - Organization-based access

#### RLS Policies:
- **processed_documents**: Own + organization-shared access
- **document_chunks**: Cascade from document ownership
- **document_embeddings**: Cascade from chunk ownership
- **document_link_suggestions**: Own documents only

---

## Database Schema

### processed_documents

```sql
CREATE TABLE processed_documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,  -- Optional FK (added if table exists)
  project_id UUID,       -- Optional FK (added if table exists)

  -- File metadata
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,

  -- Extracted content
  raw_text TEXT,
  structured_data JSONB DEFAULT '{}',
  detected_type TEXT,  -- projeto_rouanet, estatuto, relatorio, etc.
  confidence NUMERIC(3,2),
  extracted_fields JSONB DEFAULT '{}',

  -- Processing metadata
  page_count INTEGER,
  word_count INTEGER,
  has_images BOOLEAN DEFAULT false,
  processing_time_ms INTEGER,
  processing_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  error_message TEXT,

  -- Multi-channel source tracking
  source TEXT DEFAULT 'web',  -- web, whatsapp, email
  source_phone TEXT,
  whatsapp_message_id TEXT,

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### document_chunks

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES processed_documents(id) ON DELETE CASCADE,

  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_tokens INTEGER,

  start_page INTEGER,
  end_page INTEGER,
  section_title TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, chunk_index)
);
```

### document_embeddings

```sql
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY,
  chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,

  embedding vector(768) NOT NULL,  -- text-embedding-004
  model_version TEXT DEFAULT 'text-embedding-004',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: HNSW index for fast vector similarity search
CREATE INDEX idx_document_embeddings_vector
  ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### document_link_suggestions

```sql
CREATE TABLE document_link_suggestions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES processed_documents(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL,  -- organization, project, opportunity
  entity_id UUID NOT NULL,

  match_reason TEXT NOT NULL,  -- cnpj, name_similarity, pronac, context
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Performance Indexes

### High-Priority Indexes:
- **Vector search:** `USING hnsw (embedding vector_cosine_ops)` - Fast similarity queries
- **Status filtering:** `idx_processed_documents_status` - Query by processing state
- **User queries:** `idx_processed_documents_user_id` - All user documents
- **WhatsApp tracking:** `idx_processed_documents_whatsapp` - Source phone + message ID

### Composite Indexes:
- `(document_id, chunk_index)` - Sequential chunk retrieval
- `(source_phone, whatsapp_message_id)` - WhatsApp message tracing

---

## Utility Functions

### 1. Semantic Search

```sql
search_documents_by_embedding(
  _query_embedding vector(768),
  _user_id UUID,
  _limit INTEGER DEFAULT 10,
  _min_similarity FLOAT DEFAULT 0.7
) RETURNS TABLE (...)
```

**Use Case:** Find relevant document chunks for RAG (Retrieval-Augmented Generation)

### 2. Processing Statistics

```sql
get_document_processing_stats(_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  completed_documents BIGINT,
  pending_documents BIGINT,
  failed_documents BIGINT,
  total_chunks BIGINT,
  total_embeddings BIGINT,
  avg_processing_time_ms NUMERIC
)
```

**Use Case:** Dashboard analytics for document processing system health

---

## Migration Safety Features

### 1. Conditional Foreign Keys

```sql
-- Only adds FK if tables exist
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
  ALTER TABLE processed_documents ADD CONSTRAINT fk_processed_documents_organization ...
END IF;
```

**Benefit:** Migration can run even if optional tables don't exist yet.

### 2. Idempotent Operations

All operations use `IF NOT EXISTS` or `CREATE OR REPLACE` to allow safe re-execution.

### 3. Verification Logging

```sql
DO $$
BEGIN
  RAISE NOTICE '=== Document Processing Pipeline Migration ===';
  RAISE NOTICE 'pgvector extension enabled: %', pgvector_enabled;
  RAISE NOTICE 'processed_documents created: %', docs_exists;
  -- ... (full verification report)
END $$;
```

---

## Integration Points

### 1. WhatsApp Integration
- **Source tracking:** `source='whatsapp'`, `source_phone`, `whatsapp_message_id`
- **Use case:** Link uploaded PDFs/images from Evolution API messages

### 2. Grants Module
- **Project linking:** `project_id` → `grant_projects(id)`
- **Use case:** Attach context documents to project proposals

### 3. Organizations Module
- **Shared access:** `organization_id` → `organizations(id)`
- **Use case:** Team collaboration on document processing

### 4. AI Processing (Edge Functions)
- **Chunking:** Split documents into semantic chunks
- **Embedding:** Generate vector embeddings via Gemini API
- **Linking:** Suggest entity matches based on extracted fields

---

## Next Steps (Post-Migration)

### Sprint 1 Deliverables:

1. **Storage Bucket Setup** (Issue #114)
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('processed-documents', 'processed-documents', false);

   -- RLS policies for bucket access
   ```

2. **Edge Function: `process-document`** (Issue #114)
   - Accept file upload
   - Extract text (PDF.js, Tesseract OCR)
   - Detect document type (Gemini)
   - Generate embeddings (text-embedding-004)
   - Store in tables

3. **Edge Function: `search-documents`** (Issue #114)
   - Convert query to embedding
   - Call `search_documents_by_embedding()`
   - Return ranked results

4. **Frontend Integration** (Issue #114)
   - Upload UI component
   - Processing status tracking
   - Search interface
   - Link suggestion confirmation

---

## Testing Checklist

### Database Level:
- [ ] RLS policies prevent cross-user access
- [ ] Cascading deletes work correctly (document → chunks → embeddings)
- [ ] Vector index performs efficiently (EXPLAIN ANALYZE)
- [ ] Helper functions return correct results
- [ ] Triggers update `updated_at` automatically

### Integration Level:
- [ ] Can upload document via web
- [ ] Can track WhatsApp-sourced documents
- [ ] Can link documents to organizations/projects
- [ ] Can search by semantic similarity
- [ ] Can confirm/reject link suggestions

### Security Level:
- [ ] Users cannot view other users' documents
- [ ] Organization members can view shared documents
- [ ] Service role can process documents (bypass RLS)
- [ ] SECURITY DEFINER functions have `SET search_path`

---

## Compliance Notes

### LGPD/GDPR Considerations:
- **Data Retention:** Implement document expiration policies
- **Right to Deletion:** Cascading deletes ensure full removal
- **Data Portability:** Export functions for user data
- **Consent Tracking:** Add `consent_id` FK in future migration

### Security Best Practices:
- **No direct table queries in RLS:** Always use SECURITY DEFINER functions
- **Parameterized functions:** Prevent SQL injection
- **Audit trail:** Consider adding `audit_log` table for document access

---

## Rollback Plan

```sql
-- Emergency rollback (if needed)
DROP TABLE IF EXISTS document_link_suggestions CASCADE;
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS processed_documents CASCADE;

DROP FUNCTION IF EXISTS search_documents_by_embedding;
DROP FUNCTION IF EXISTS get_document_processing_stats;
DROP FUNCTION IF EXISTS user_can_access_document;
DROP FUNCTION IF EXISTS user_owns_document;
```

**WARNING:** This will delete all processed documents and embeddings. Only use in emergency.

---

## Performance Benchmarks (Expected)

| Operation | Target Performance |
|-----------|-------------------|
| Vector search (10k docs) | < 50ms |
| Document insertion | < 100ms |
| Chunk generation (100 chunks) | < 500ms |
| Stats query | < 200ms |

**Monitoring:** Add `pg_stat_statements` tracking for slow queries.

---

## References

- **Architecture Guide:** `docs/architecture/backend_architecture.md`
- **RLS Patterns:** `supabase/migrations/20251204_professional_rls_architecture.sql`
- **Vector Search:** `supabase/migrations/20251211_message_embeddings.sql`
- **File Search:** `supabase/migrations/20251209170000_create_file_search_corpora_tables.sql`

---

## Contact

**Maintainer:** Backend Architect Agent
**Epic Owner:** Lucas Boscacci Lima
**Review Date:** 2026-01-12
**Status:** ✅ Ready for review and testing
