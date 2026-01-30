-- =====================================================
-- MIGRATION: Complete File Search Tables Setup
-- Execute this in Supabase SQL Editor
-- Date: 2026-01-26
-- =====================================================

-- =====================================================
-- PART 1: Create file_search_corpora table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.file_search_corpora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpus_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  gemini_corpus_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_corpus_name'
  ) THEN
    ALTER TABLE public.file_search_corpora ADD CONSTRAINT unique_user_corpus_name UNIQUE (user_id, corpus_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_corpora_user_id ON public.file_search_corpora(user_id);
CREATE INDEX IF NOT EXISTS idx_corpora_created_at ON public.file_search_corpora(created_at DESC);

-- =====================================================
-- PART 2: Create file_search_documents table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.file_search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpus_id UUID REFERENCES public.file_search_corpora(id) ON DELETE CASCADE,
  gemini_file_name TEXT NOT NULL,
  gemini_document_name TEXT,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_url TEXT,
  custom_metadata JSONB DEFAULT '{}'::jsonb,
  indexing_status TEXT DEFAULT 'pending' CHECK (
    indexing_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.file_search_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_corpus_id ON public.file_search_documents(corpus_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.file_search_documents(indexing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.file_search_documents(created_at DESC);

-- =====================================================
-- PART 3: Enable RLS and create policies
-- =====================================================

ALTER TABLE public.file_search_corpora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_search_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can create their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can update their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can delete their own corpora" ON public.file_search_corpora;

DROP POLICY IF EXISTS "Users can view their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.file_search_documents;

-- RLS for corpora
CREATE POLICY "Users can view their own corpora" ON public.file_search_corpora FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own corpora" ON public.file_search_corpora FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own corpora" ON public.file_search_corpora FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own corpora" ON public.file_search_corpora FOR DELETE USING (auth.uid() = user_id);

-- RLS for documents
CREATE POLICY "Users can view their own documents" ON public.file_search_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON public.file_search_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.file_search_documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.file_search_documents FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PART 4: Add module_type and module_id columns
-- =====================================================

ALTER TABLE public.file_search_corpora
  ADD COLUMN IF NOT EXISTS module_type TEXT,
  ADD COLUMN IF NOT EXISTS module_id TEXT;

ALTER TABLE public.file_search_documents
  ADD COLUMN IF NOT EXISTS module_type TEXT,
  ADD COLUMN IF NOT EXISTS module_id TEXT;

-- Module type constraints (drop first to avoid duplicates)
ALTER TABLE public.file_search_corpora DROP CONSTRAINT IF EXISTS chk_corpora_module_type;
ALTER TABLE public.file_search_corpora
  ADD CONSTRAINT chk_corpora_module_type CHECK (
    module_type IS NULL OR module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat')
  );

ALTER TABLE public.file_search_documents DROP CONSTRAINT IF EXISTS chk_documents_module_type;
ALTER TABLE public.file_search_documents
  ADD CONSTRAINT chk_documents_module_type CHECK (
    module_type IS NULL OR module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat')
  );

-- Module indexes
CREATE INDEX IF NOT EXISTS idx_corpora_user_module ON public.file_search_corpora(user_id, module_type, module_id) WHERE module_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_module ON public.file_search_documents(user_id, module_type, module_id) WHERE module_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_no_corpus ON public.file_search_documents(user_id, module_type) WHERE corpus_id IS NULL;

-- =====================================================
-- PART 5: Helper functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_corpus_documents(p_corpus_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.file_search_documents WHERE corpus_id = p_corpus_id AND indexing_status = 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.count_user_documents(p_user_id UUID, p_module_type TEXT DEFAULT NULL)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM public.file_search_documents
    WHERE user_id = p_user_id
      AND (p_module_type IS NULL OR module_type = p_module_type)
      AND indexing_status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_corpora_updated_at ON public.file_search_corpora;
CREATE TRIGGER update_corpora_updated_at BEFORE UPDATE ON public.file_search_corpora FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.file_search_documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.file_search_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 6: Grants
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.file_search_corpora TO authenticated;
GRANT ALL ON public.file_search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_corpus_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_user_documents TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  corpora_exists BOOLEAN;
  documents_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_search_corpora') INTO corpora_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_search_documents') INTO documents_exists;

  IF corpora_exists AND documents_exists THEN
    RAISE NOTICE '✅ File Search tables created successfully!';
  ELSE
    RAISE WARNING '⚠️ Some tables may not have been created.';
  END IF;
END $$;

SELECT 'Migration completed successfully!' AS status;
