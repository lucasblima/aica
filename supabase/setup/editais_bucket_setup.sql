-- =====================================================
-- STORAGE BUCKET SETUP FOR EDITAIS PDFs
-- =====================================================
-- This script creates the editais storage bucket
-- and configures RLS policies for secure access.
-- =====================================================

-- =====================================================
-- 1. CREATE BUCKET
-- =====================================================

-- Create editais bucket for PDF storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editais',
  'editais',
  true, -- Public bucket (users can access via public URLs)
  20971520, -- 20 MB file size limit (PDF files can be large)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. VERIFY BUCKET CREATED
-- =====================================================

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'editais';

-- =====================================================
-- 3. CREATE RLS POLICIES FOR STORAGE
-- =====================================================

-- 3.1 Policy: Users can upload editais PDFs to their own folder
-- Files must be stored in folder matching user's UUID
CREATE POLICY "Users can upload own editais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'editais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.2 Policy: Users can read their own editais PDFs
CREATE POLICY "Users can read own editais"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'editais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.3 Policy: Users can update their own editais PDFs
CREATE POLICY "Users can update own editais"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'editais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.4 Policy: Users can delete their own editais PDFs
CREATE POLICY "Users can delete own editais"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'editais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 4. VERIFY POLICIES CREATED
-- =====================================================

SELECT
  policyname as policy_name,
  cmd as operation,
  array_to_string(roles, ', ') as allowed_roles
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%editais%'
ORDER BY policyname;

-- =====================================================
-- 5. USAGE EXAMPLES
-- =====================================================

-- Example file path structure:
-- {user_id}/{opportunity_id}/{timestamp}_edital.pdf
-- {user_id}/{opportunity_id}/1733701234_edital_finep_2025.pdf

-- Example: User with ID '123e4567-e89b-12d3-a456-426614174000'
-- uploading PDF for opportunity 'opp-abc123':
-- Path: '123e4567-e89b-12d3-a456-426614174000/opp-abc123/1733701234_edital.pdf'

-- When RLS checks:
-- (storage.foldername(name))[1] extracts '123e4567-e89b-12d3-a456-426614174000'
-- auth.uid()::text returns '123e4567-e89b-12d3-a456-426614174000'
-- They match, so upload is allowed.

-- =====================================================
-- 6. STORAGE BEST PRACTICES
-- =====================================================

COMMENT ON TABLE storage.objects IS 'Stores user-uploaded files with RLS protection';

-- Recommended file naming convention:
-- {user_id}/{opportunity_id}/{timestamp}_{sanitized_filename}.pdf
-- Example: 123e4567.../opp-abc123/1733701234_edital_finep.pdf

-- Benefits:
-- 1. Easy to identify user's files
-- 2. Files organized by opportunity
-- 3. Timestamp prevents filename conflicts
-- 4. RLS automatically enforces user ownership
-- 5. Public URLs allow easy sharing and viewing

-- =====================================================
-- 7. CLEANUP SCRIPT (if needed)
-- =====================================================

-- To remove all policies and bucket (use with caution):
/*
DROP POLICY IF EXISTS "Users can upload own editais" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own editais" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own editais" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own editais" ON storage.objects;

DELETE FROM storage.buckets WHERE name = 'editais';
*/
