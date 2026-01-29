-- =====================================================
-- FORCE RECREATE: get_module_file_search_stats
-- Data: 2026-01-28
-- Descrição: Force recreate da função RPC para analytics
-- =====================================================

-- Dropar TODAS as versões da função (diferentes assinaturas)
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(UUID);
DROP FUNCTION IF EXISTS public.get_module_file_search_stats();
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(p_user_id UUID);

-- Recriar com assinatura correta e campos corretos
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    (p_user_id IS NULL OR fd.user_id = p_user_id)
    AND fd.indexing_status = 'completed'
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO anon;

-- Comentário
COMMENT ON FUNCTION public.get_module_file_search_stats IS 'Retorna estatísticas de uso de File Search por módulo (compatível com useFileSearchAnalytics)';

-- Forçar reload do schema cache
NOTIFY pgrst, 'reload schema';

-- Verificação
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_module_file_search_stats'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✅ Função get_module_file_search_stats criada com sucesso!';
  ELSE
    RAISE WARNING '❌ Função não foi criada!';
  END IF;
END $$;
