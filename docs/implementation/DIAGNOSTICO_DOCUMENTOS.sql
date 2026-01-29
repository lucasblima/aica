-- =====================================================
-- DIAGNÓSTICO: Verificar estado dos documentos
-- =====================================================

-- 1. Verificar se existem documentos
SELECT COUNT(*) as total_documentos FROM file_search_documents;

-- 2. Verificar status de indexação
SELECT indexing_status, COUNT(*) as count
FROM file_search_documents
GROUP BY indexing_status;

-- 3. Ver últimos documentos criados (todos os status)
SELECT
  id,
  original_filename,
  module_type,
  indexing_status,
  created_at,
  gemini_file_name IS NOT NULL as tem_gemini_file
FROM file_search_documents
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver documentos WhatsApp especificamente
SELECT
  id,
  original_filename,
  module_type,
  indexing_status,
  created_at,
  custom_metadata
FROM file_search_documents
WHERE module_type = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar corpus associados
SELECT
  c.corpus_name,
  c.module_type,
  c.document_count,
  COUNT(d.id) as documentos_reais
FROM file_search_corpora c
LEFT JOIN file_search_documents d ON d.corpus_id = c.id
GROUP BY c.id, c.corpus_name, c.module_type, c.document_count
ORDER BY c.created_at DESC;
