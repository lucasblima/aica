-- =====================================================
-- FIX: File Search Analytics
-- Data: 2026-01-28
-- Descrição: Corrige função RPC e adiciona 'whatsapp' aos módulos permitidos
-- =====================================================

-- ===========================
-- PARTE 1: Atualizar Constraint para incluir 'whatsapp'
-- ===========================

ALTER TABLE public.file_search_corpora
  DROP CONSTRAINT IF EXISTS chk_corpora_module_type;

ALTER TABLE public.file_search_corpora
  ADD CONSTRAINT chk_corpora_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', 'whatsapp')
  );

ALTER TABLE public.file_search_documents
  DROP CONSTRAINT IF EXISTS chk_documents_module_type;

ALTER TABLE public.file_search_documents
  ADD CONSTRAINT chk_documents_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', 'whatsapp')
  );

-- ===========================
-- PARTE 2: Corrigir função get_module_file_search_stats
-- ===========================

-- Dropar função antiga
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(UUID);

-- Recriar com campos corretos esperados pelo hook
CREATE OR REPLACE FUNCTION public.get_module_file_search_stats(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  module_type TEXT,
  document_count BIGINT,
  total_size_bytes BIGINT,
  avg_size_bytes BIGINT,
  corpus_count BIGINT,
  last_indexed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fd.module_type, 'unassigned') AS module_type,
    COUNT(fd.id) AS document_count,
    COALESCE(SUM(fd.file_size_bytes), 0) AS total_size_bytes,
    CASE
      WHEN COUNT(fd.id) > 0 THEN (COALESCE(SUM(fd.file_size_bytes), 0) / COUNT(fd.id))::BIGINT
      ELSE 0
    END AS avg_size_bytes,
    COUNT(DISTINCT fd.corpus_id) AS corpus_count,
    MAX(fd.created_at) AS last_indexed_at
  FROM public.file_search_documents fd
  WHERE
    -- Se p_user_id for NULL, retorna stats de todos os usuários (admin view)
    (p_user_id IS NULL OR fd.user_id = p_user_id)
    -- Só conta documentos completamente indexados
    AND fd.indexing_status = 'completed'
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_module_file_search_stats IS 'Retorna estatísticas de uso de File Search por módulo (compatível com useFileSearchAnalytics)';

-- ===========================
-- PARTE 3: Grant Permissões
-- ===========================

GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO anon;

-- ===========================
-- VERIFICAÇÃO
-- ===========================

-- Testar função (será visível nos logs do Supabase)
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '=== Testando get_module_file_search_stats ===';

  -- Testar sem user_id (retorna todos)
  FOR test_result IN SELECT * FROM public.get_module_file_search_stats(NULL) LIMIT 5
  LOOP
    RAISE NOTICE 'Módulo: %, Docs: %, Size: % bytes',
      test_result.module_type,
      test_result.document_count,
      test_result.total_size_bytes;
  END LOOP;

  RAISE NOTICE '✅ Função RPC atualizada com sucesso!';
END $$;
