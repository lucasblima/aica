-- =====================================================
-- MIGRATION: File Search Module-Aware
-- Data: 2025-12-09
-- Descrição: Adiciona suporte para filtros por módulo
-- =====================================================

-- =====================================================
-- PARTE 1: Adicionar Colunas module_type e module_id
-- =====================================================

-- Tabela: file_search_corpora
ALTER TABLE public.file_search_corpora
  ADD COLUMN IF NOT EXISTS module_type TEXT,
  ADD COLUMN IF NOT EXISTS module_id TEXT;

COMMENT ON COLUMN public.file_search_corpora.module_type IS 'Tipo do módulo (grants, podcast, finance, journey, atlas, chat)';
COMMENT ON COLUMN public.file_search_corpora.module_id IS 'ID da entidade no módulo (project_id, episode_id, etc.)';

-- Tabela: file_search_documents
ALTER TABLE public.file_search_documents
  ADD COLUMN IF NOT EXISTS module_type TEXT,
  ADD COLUMN IF NOT EXISTS module_id TEXT;

COMMENT ON COLUMN public.file_search_documents.module_type IS 'Tipo do módulo (grants, podcast, finance, journey, atlas, chat)';
COMMENT ON COLUMN public.file_search_documents.module_id IS 'ID da entidade no módulo (project_id, episode_id, etc.)';

-- =====================================================
-- PARTE 2: Criar Índices para Performance
-- =====================================================

-- Índice composto para file_search_corpora
-- Otimiza queries do tipo: WHERE user_id = ? AND module_type = ? AND module_id = ?
CREATE INDEX IF NOT EXISTS idx_corpora_user_module
  ON public.file_search_corpora(user_id, module_type, module_id)
  WHERE module_type IS NOT NULL;

-- Índice para buscar todos corpora de um módulo específico
CREATE INDEX IF NOT EXISTS idx_corpora_module_type
  ON public.file_search_corpora(module_type)
  WHERE module_type IS NOT NULL;

-- Índice composto para file_search_documents
-- Otimiza queries do tipo: WHERE user_id = ? AND module_type = ? AND module_id = ?
CREATE INDEX IF NOT EXISTS idx_documents_user_module
  ON public.file_search_documents(user_id, module_type, module_id)
  WHERE module_type IS NOT NULL;

-- Índice para buscar documentos por corpus + módulo
CREATE INDEX IF NOT EXISTS idx_documents_corpus_module
  ON public.file_search_documents(corpus_id, module_type, module_id)
  WHERE module_type IS NOT NULL;

-- Índice para buscar documentos por tipo de módulo
CREATE INDEX IF NOT EXISTS idx_documents_module_type
  ON public.file_search_documents(module_type)
  WHERE module_type IS NOT NULL;

-- Índice para status de indexação + módulo
CREATE INDEX IF NOT EXISTS idx_documents_status_module
  ON public.file_search_documents(indexing_status, module_type)
  WHERE indexing_status IS NOT NULL;

-- =====================================================
-- PARTE 3: Atualizar RLS Policies
-- =====================================================

-- ===========================
-- RLS: file_search_corpora
-- ===========================

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can create their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can update their own corpora" ON public.file_search_corpora;
DROP POLICY IF EXISTS "Users can delete their own corpora" ON public.file_search_corpora;

-- Policy SELECT: Ver apenas próprios corpora
CREATE POLICY "Users can view their own corpora"
  ON public.file_search_corpora
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy INSERT: Criar apenas próprios corpora
CREATE POLICY "Users can create their own corpora"
  ON public.file_search_corpora
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: Atualizar apenas próprios corpora
CREATE POLICY "Users can update their own corpora"
  ON public.file_search_corpora
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy DELETE: Deletar apenas próprios corpora
CREATE POLICY "Users can delete their own corpora"
  ON public.file_search_corpora
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================
-- RLS: file_search_documents
-- ===========================

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.file_search_documents;

-- Policy SELECT: Ver apenas próprios documentos
CREATE POLICY "Users can view their own documents"
  ON public.file_search_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy INSERT: Criar apenas próprios documentos
CREATE POLICY "Users can create their own documents"
  ON public.file_search_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: Atualizar apenas próprios documentos
CREATE POLICY "Users can update their own documents"
  ON public.file_search_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy DELETE: Deletar apenas próprios documentos
CREATE POLICY "Users can delete their own documents"
  ON public.file_search_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PARTE 4: Helper Functions
-- =====================================================

-- Função para contar documentos por módulo
CREATE OR REPLACE FUNCTION public.count_documents_by_module(
  p_user_id UUID,
  p_module_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  module_type TEXT,
  document_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fd.module_type, 'unassigned') AS module_type,
    COUNT(*)::BIGINT AS document_count
  FROM public.file_search_documents fd
  WHERE fd.user_id = p_user_id
    AND (p_module_type IS NULL OR fd.module_type = p_module_type)
    AND fd.indexing_status = 'completed'
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.count_documents_by_module IS 'Conta documentos indexados agrupados por tipo de módulo';

-- Função para listar documentos de um módulo específico
CREATE OR REPLACE FUNCTION public.get_module_documents(
  p_user_id UUID,
  p_module_type TEXT,
  p_module_id TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  corpus_id UUID,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_url TEXT,
  module_type TEXT,
  module_id TEXT,
  custom_metadata JSONB,
  indexing_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fd.id,
    fd.corpus_id,
    fd.original_filename,
    fd.mime_type,
    fd.file_size_bytes,
    fd.storage_url,
    fd.module_type,
    fd.module_id,
    fd.custom_metadata,
    fd.indexing_status,
    fd.created_at
  FROM public.file_search_documents fd
  WHERE fd.user_id = p_user_id
    AND fd.module_type = p_module_type
    AND (p_module_id IS NULL OR fd.module_id = p_module_id)
  ORDER BY fd.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_module_documents IS 'Lista documentos de um módulo específico com paginação';

-- Função para obter estatísticas de uso por módulo
CREATE OR REPLACE FUNCTION public.get_module_file_search_stats(
  p_user_id UUID
)
RETURNS TABLE (
  module_type TEXT,
  corpus_count BIGINT,
  document_count BIGINT,
  total_size_mb NUMERIC,
  last_indexed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fd.module_type, 'unassigned') AS module_type,
    COUNT(DISTINCT fd.corpus_id) AS corpus_count,
    COUNT(fd.id) AS document_count,
    ROUND(SUM(fd.file_size_bytes)::NUMERIC / 1024 / 1024, 2) AS total_size_mb,
    MAX(fd.created_at) AS last_indexed_at
  FROM public.file_search_documents fd
  WHERE fd.user_id = p_user_id
    AND fd.indexing_status = 'completed'
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_module_file_search_stats IS 'Retorna estatísticas de uso de File Search por módulo';

-- =====================================================
-- PARTE 5: Validações e Constraints
-- =====================================================

-- Constraint: module_type deve ser um dos valores válidos
ALTER TABLE public.file_search_corpora
  DROP CONSTRAINT IF EXISTS chk_corpora_module_type;

ALTER TABLE public.file_search_corpora
  ADD CONSTRAINT chk_corpora_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat')
  );

ALTER TABLE public.file_search_documents
  DROP CONSTRAINT IF EXISTS chk_documents_module_type;

ALTER TABLE public.file_search_documents
  ADD CONSTRAINT chk_documents_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat')
  );

-- =====================================================
-- PARTE 6: Grants de Permissões
-- =====================================================

-- Grant execute nas funções helper
GRANT EXECUTE ON FUNCTION public.count_documents_by_module TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats TO authenticated;

-- =====================================================
-- VERIFICAÇÃO DA MIGRATION
-- =====================================================

-- Query para verificar se as colunas foram criadas
DO $$
DECLARE
  corpora_module_type_exists BOOLEAN;
  corpora_module_id_exists BOOLEAN;
  documents_module_type_exists BOOLEAN;
  documents_module_id_exists BOOLEAN;
BEGIN
  -- Verificar colunas em file_search_corpora
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_search_corpora'
      AND column_name = 'module_type'
  ) INTO corpora_module_type_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_search_corpora'
      AND column_name = 'module_id'
  ) INTO corpora_module_id_exists;

  -- Verificar colunas em file_search_documents
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_search_documents'
      AND column_name = 'module_type'
  ) INTO documents_module_type_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_search_documents'
      AND column_name = 'module_id'
  ) INTO documents_module_id_exists;

  -- Log dos resultados
  RAISE NOTICE '=== Verificação da Migration ===';
  RAISE NOTICE 'file_search_corpora.module_type: %', corpora_module_type_exists;
  RAISE NOTICE 'file_search_corpora.module_id: %', corpora_module_id_exists;
  RAISE NOTICE 'file_search_documents.module_type: %', documents_module_type_exists;
  RAISE NOTICE 'file_search_documents.module_id: %', documents_module_id_exists;

  IF corpora_module_type_exists AND corpora_module_id_exists AND
     documents_module_type_exists AND documents_module_id_exists THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Algumas colunas podem não ter sido criadas.';
  END IF;
END $$;
