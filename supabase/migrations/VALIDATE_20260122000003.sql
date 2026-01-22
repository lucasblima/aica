-- ============================================================================
-- VALIDATION SCRIPT: WhatsApp Document Input Infrastructure
-- Date: 2026-01-22
-- Migration: 20260122000003_whatsapp_document_tracking.sql
--
-- PURPOSE:
-- Comprehensive validation of Fase 1 infrastructure deployment
-- ============================================================================

-- ============================================================================
-- VALIDATION 1: Storage Bucket
-- ============================================================================

SELECT
  'Storage Bucket: whatsapp-documents' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Bucket exists'
    ELSE 'Bucket not found'
  END AS message
FROM storage.buckets
WHERE id = 'whatsapp-documents';

-- ============================================================================
-- VALIDATION 2: Bucket Configuration
-- ============================================================================

SELECT
  'Bucket Configuration: file_size_limit' AS check_name,
  CASE
    WHEN file_size_limit = 26214400 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  file_size_limit AS actual_value,
  26214400 AS expected_value,
  CASE
    WHEN file_size_limit = 26214400 THEN 'File size limit is 25MB (26214400 bytes)'
    ELSE format('File size limit is %s bytes (expected 26214400)', file_size_limit)
  END AS message
FROM storage.buckets
WHERE id = 'whatsapp-documents';

-- ============================================================================
-- VALIDATION 3: Bucket MIME Types
-- ============================================================================

SELECT
  'Bucket Configuration: allowed_mime_types' AS check_name,
  CASE
    WHEN 'application/pdf' = ANY(allowed_mime_types)
      AND 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' = ANY(allowed_mime_types)
      AND 'image/jpeg' = ANY(allowed_mime_types)
      AND 'image/png' = ANY(allowed_mime_types)
      THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  array_length(allowed_mime_types, 1) AS mime_types_count,
  6 AS expected_count,
  CASE
    WHEN 'application/pdf' = ANY(allowed_mime_types)
      AND 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' = ANY(allowed_mime_types)
      AND 'image/jpeg' = ANY(allowed_mime_types)
      AND 'image/png' = ANY(allowed_mime_types)
      THEN 'All critical MIME types configured'
    ELSE 'Some MIME types missing'
  END AS message
FROM storage.buckets
WHERE id = 'whatsapp-documents';

-- ============================================================================
-- VALIDATION 4: Table Exists
-- ============================================================================

SELECT
  'Table: whatsapp_media_tracking' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Table exists in public schema'
    ELSE 'Table not found'
  END AS message
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_media_tracking';

-- ============================================================================
-- VALIDATION 5: Table Columns
-- ============================================================================

SELECT
  'Table Columns: whatsapp_media_tracking' AS check_name,
  CASE
    WHEN COUNT(*) >= 14 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  '>=14' AS expected_count,
  CASE
    WHEN COUNT(*) >= 14 THEN format('%s columns present', COUNT(*))
    ELSE format('Only %s columns found (expected 14+)', COUNT(*))
  END AS message
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_media_tracking';

-- ============================================================================
-- VALIDATION 6: Unique Constraint
-- ============================================================================

SELECT
  'Constraint: unique_user_message' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Deduplication constraint exists (user_id, message_id)'
    ELSE 'Unique constraint not found'
  END AS message
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_media_tracking'
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'unique_user_message';

-- ============================================================================
-- VALIDATION 7: Indexes on whatsapp_media_tracking
-- ============================================================================

SELECT
  'Indexes: whatsapp_media_tracking' AS check_name,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  '>=3' AS expected_count,
  CASE
    WHEN COUNT(*) >= 3 THEN format('%s indexes created (idx_whatsapp_media_*)', COUNT(*))
    ELSE format('Only %s indexes found (expected 3+)', COUNT(*))
  END AS message
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_media_tracking'
  AND indexname LIKE 'idx_whatsapp_media_%';

-- ============================================================================
-- VALIDATION 8: RLS Enabled on Table
-- ============================================================================

SELECT
  'RLS: Enabled on whatsapp_media_tracking' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Row Level Security is enabled'
    ELSE 'RLS not enabled'
  END AS message
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_media_tracking'
  AND rowsecurity = true;

-- ============================================================================
-- VALIDATION 9: RLS Policies on Table
-- ============================================================================

SELECT
  'RLS Policies: whatsapp_media_tracking' AS check_name,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  '>=4' AS expected_count,
  CASE
    WHEN COUNT(*) >= 4 THEN format('%s policies created (SELECT, INSERT, UPDATE, DELETE)', COUNT(*))
    ELSE format('Only %s policies found (expected 4+)', COUNT(*))
  END AS message
FROM pg_policies
WHERE tablename = 'whatsapp_media_tracking';

-- ============================================================================
-- VALIDATION 10: Storage RLS Policies
-- ============================================================================

SELECT
  'Storage RLS Policies: whatsapp-documents bucket' AS check_name,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  '>=4' AS expected_count,
  CASE
    WHEN COUNT(*) >= 4 THEN format('%s storage policies created', COUNT(*))
    ELSE format('Only %s storage policies found (expected 4)', COUNT(*))
  END AS message
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%whatsapp documents%';

-- ============================================================================
-- VALIDATION 11: whatsapp_pending_actions Constraint Updated
-- ============================================================================

SELECT
  'Constraint: whatsapp_pending_actions action_type' AS check_name,
  CASE
    WHEN consrc LIKE '%process_document%' AND consrc LIKE '%link_document%' THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  1 AS actual_count,
  1 AS expected_count,
  CASE
    WHEN consrc LIKE '%process_document%' AND consrc LIKE '%link_document%' THEN 'New action types added (process_document, link_document)'
    ELSE 'Constraint not updated with new action types'
  END AS message
FROM pg_constraint
WHERE conname = 'whatsapp_pending_actions_action_type_check'
  AND conrelid = 'public.whatsapp_pending_actions'::regclass;

-- ============================================================================
-- VALIDATION 12: Helper Functions Created
-- ============================================================================

SELECT
  'Function: generate_whatsapp_document_path' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Helper function for path generation exists'
    ELSE 'Function not found'
  END AS message
FROM pg_proc
WHERE proname = 'generate_whatsapp_document_path';

SELECT
  'Function: get_pending_whatsapp_media' AS check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE
    WHEN COUNT(*) = 1 THEN 'Queue function for processing media exists'
    ELSE 'Function not found'
  END AS message
FROM pg_proc
WHERE proname = 'get_pending_whatsapp_media';

-- ============================================================================
-- VALIDATION 13: Table Comments
-- ============================================================================

SELECT
  'Table Comments: whatsapp_media_tracking' AS check_name,
  CASE
    WHEN description IS NOT NULL THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result,
  CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END AS actual_count,
  1 AS expected_count,
  COALESCE(description, 'No comment found') AS message
FROM pg_description
WHERE objoid = 'public.whatsapp_media_tracking'::regclass
  AND objsubid = 0;

-- ============================================================================
-- VALIDATION SUMMARY
-- ============================================================================

SELECT
  '========== VALIDATION SUMMARY ==========' AS summary;

SELECT
  'Total Validations' AS metric,
  13 AS value,
  'All critical components checked' AS description
UNION ALL
SELECT
  'Expected Pass Rate' AS metric,
  100 AS value,
  'All validations should pass' AS description;

-- ============================================================================
-- MANUAL TESTS TO RUN
-- ============================================================================

-- Test 1: Verify storage path generation
-- SELECT public.generate_whatsapp_document_path(
--   '123e4567-e89b-12d3-a456-426614174000'::UUID,
--   'test_document.pdf'
-- );
-- Expected: 123e4567-e89b-12d3-a456-426614174000/YYYYMMDD_HHMMSS_test_document.pdf

-- Test 2: Verify pending media query
-- SELECT * FROM public.get_pending_whatsapp_media(5);
-- Expected: Empty result set (no pending media yet)

-- Test 3: Try inserting a test record (cleanup after)
-- INSERT INTO public.whatsapp_media_tracking (
--   user_id, message_id, instance_name, media_type, mime_type, original_filename, file_size_bytes
-- ) VALUES (
--   auth.uid(), 'test_msg_123', 'aica_test', 'document', 'application/pdf', 'test.pdf', 1024
-- );
-- Expected: Success (if authenticated)

-- Test 4: Verify RLS (should see only own records)
-- SELECT COUNT(*) FROM public.whatsapp_media_tracking;
-- Expected: Count of own records only
