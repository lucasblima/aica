-- =====================================================
-- MIGRATION: Create File Search Corpora Tables (Base)
-- Data: 2025-12-09
-- Descrição: Cria tabelas base para arquitetura Corpora
-- =====================================================
--
-- Esta migration cria as tabelas necessárias para o
-- sistema de File Search baseado em Gemini Corpora API
-- =====================================================

-- =====================================================
-- TABELA: file_search_corpora
-- =====================================================

CREATE TABLE IF NOT EXISTS public.file_search_corpora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpus_name TEXT NOT NULL,              -- Nome único do corpus (slug)
  display_name TEXT NOT NULL,             -- Nome para exibição
  gemini_corpus_id TEXT,                  -- ID do corpus no Gemini API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_corpus_name UNIQUE (user_id, corpus_name)
);

COMMENT ON TABLE public.file_search_corpora IS 'Corpora (coleções de documentos) para File Search';
COMMENT ON COLUMN public.file_search_corpora.corpus_name IS 'Nome único do corpus (slug, ex: grants-project-123)';
COMMENT ON COLUMN public.file_search_corpora.display_name IS 'Nome amigável para exibição';
COMMENT ON COLUMN public.file_search_corpora.gemini_corpus_id IS 'ID do corpus na Gemini API (corpora/xxx)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_corpora_user_id ON public.file_search_corpora(user_id);
CREATE INDEX IF NOT EXISTS idx_corpora_created_at ON public.file_search_corpora(created_at DESC);

-- =====================================================
-- TABELA: file_search_documents
-- =====================================================

CREATE TABLE IF NOT EXISTS public.file_search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corpus_id UUID NOT NULL REFERENCES public.file_search_corpora(id) ON DELETE CASCADE,

  -- Gemini File API identifiers
  gemini_file_name TEXT NOT NULL,        -- Nome do arquivo no Gemini (files/xxx)
  gemini_document_name TEXT,             -- Nome do documento no corpus

  -- File metadata
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_url TEXT,                      -- URL no Supabase Storage

  -- Custom metadata
  custom_metadata JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  indexing_status TEXT DEFAULT 'pending' CHECK (
    indexing_status IN ('pending', 'processing', 'completed', 'failed')
  ),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.file_search_documents IS 'Documentos indexados em corpora do File Search';
COMMENT ON COLUMN public.file_search_documents.gemini_file_name IS 'Nome do arquivo na Gemini File API (files/xxx)';
COMMENT ON COLUMN public.file_search_documents.gemini_document_name IS 'Nome do documento no corpus (corpora/xxx/documents/yyy)';
COMMENT ON COLUMN public.file_search_documents.storage_url IS 'URL pública do arquivo no Supabase Storage';
COMMENT ON COLUMN public.file_search_documents.custom_metadata IS 'Metadados customizados em formato JSONB';
COMMENT ON COLUMN public.file_search_documents.indexing_status IS 'Status da indexação: pending, processing, completed, failed';

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.file_search_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_corpus_id ON public.file_search_documents(corpus_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.file_search_documents(indexing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.file_search_documents(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.file_search_corpora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_search_documents ENABLE ROW LEVEL SECURITY;

-- ===========================
-- RLS: file_search_corpora
-- ===========================

CREATE POLICY "Users can view their own corpora"
  ON public.file_search_corpora
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own corpora"
  ON public.file_search_corpora
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own corpora"
  ON public.file_search_corpora
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own corpora"
  ON public.file_search_corpora
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================
-- RLS: file_search_documents
-- ===========================

CREATE POLICY "Users can view their own documents"
  ON public.file_search_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.file_search_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.file_search_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.file_search_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNÇÕES HELPER
-- =====================================================

-- Função: Contar documentos em um corpus
CREATE OR REPLACE FUNCTION public.count_corpus_documents(p_corpus_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.file_search_documents
    WHERE corpus_id = p_corpus_id
      AND indexing_status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.count_corpus_documents IS 'Conta documentos indexados em um corpus';

-- Função: Obter tamanho total de um corpus
CREATE OR REPLACE FUNCTION public.get_corpus_size(p_corpus_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(file_size_bytes), 0)
    FROM public.file_search_documents
    WHERE corpus_id = p_corpus_id
      AND indexing_status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_corpus_size IS 'Retorna tamanho total em bytes de um corpus';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corpora_updated_at
  BEFORE UPDATE ON public.file_search_corpora
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.file_search_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- GRANTS DE PERMISSÕES
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.file_search_corpora TO authenticated;
GRANT ALL ON public.file_search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_corpus_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_corpus_size TO authenticated;

-- =====================================================
-- VERIFICAÇÃO DA MIGRATION
-- =====================================================

DO $$
DECLARE
  corpora_exists BOOLEAN;
  documents_exists BOOLEAN;
BEGIN
  -- Verificar tabelas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'file_search_corpora'
  ) INTO corpora_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'file_search_documents'
  ) INTO documents_exists;

  -- Log dos resultados
  RAISE NOTICE '=== Verificação da Migration Base ===';
  RAISE NOTICE 'file_search_corpora criada: %', corpora_exists;
  RAISE NOTICE 'file_search_documents criada: %', documents_exists;

  IF corpora_exists AND documents_exists THEN
    RAISE NOTICE '✅ Migration base concluída com sucesso!';
    RAISE NOTICE 'Próximo passo: Aplicar migration module-aware (20251209180000)';
  ELSE
    RAISE WARNING '⚠️ Algumas tabelas podem não ter sido criadas.';
  END IF;
END $$;
