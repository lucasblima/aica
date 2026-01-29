-- =====================================================
-- MANUAL FIX V2: File Search Analytics RPC Function
-- =====================================================
-- CORRIGIDO: Type cast explícito para BIGINT
-- =====================================================

-- Passo 1: Remover TODAS as versões antigas da função
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(UUID);
DROP FUNCTION IF EXISTS public.get_module_file_search_stats();
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(p_user_id UUID);

-- Passo 2: Criar função com assinatura correta E CASTS EXPLÍCITOS
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
    COALESCE(SUM(fd.file_size_bytes), 0)::BIGINT AS total_size_bytes,  -- ✅ CAST ADICIONADO
    CASE
      WHEN COUNT(fd.id) > 0 THEN (COALESCE(SUM(fd.file_size_bytes), 0) / COUNT(fd.id))::BIGINT
      ELSE 0::BIGINT  -- ✅ CAST ADICIONADO
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

-- Passo 3: Atualizar constraints para incluir 'whatsapp'
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

-- Passo 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO anon;

-- Passo 5: Forçar reload do schema cache
NOTIFY pgrst, 'reload schema';

-- Passo 6: Testar a função
SELECT * FROM public.get_module_file_search_stats(NULL) LIMIT 5;

-- =====================================================
-- Se tudo funcionou, você deve ver uma tabela com:
-- module_type | document_count | total_size_bytes | avg_size_bytes | corpus_count | last_indexed_at
-- =====================================================
