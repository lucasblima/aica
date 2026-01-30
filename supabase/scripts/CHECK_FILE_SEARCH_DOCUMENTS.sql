-- =====================================================
-- DIAGNÓSTICO: Verificar documentos no file_search_documents
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver todos os documentos
SELECT
  id,
  user_id,
  original_filename,
  gemini_file_name,
  module_type,
  indexing_status,
  file_size_bytes,
  created_at
FROM file_search_documents
ORDER BY created_at DESC
LIMIT 50;

-- 2. Contar por status
SELECT
  indexing_status,
  COUNT(*) as count
FROM file_search_documents
GROUP BY indexing_status;

-- 3. Contar por module_type
SELECT
  COALESCE(module_type, 'NULL') as module_type,
  COUNT(*) as count
FROM file_search_documents
GROUP BY module_type;

-- 4. Ver se há documentos sem module_type
SELECT
  id,
  original_filename,
  indexing_status,
  created_at
FROM file_search_documents
WHERE module_type IS NULL;
