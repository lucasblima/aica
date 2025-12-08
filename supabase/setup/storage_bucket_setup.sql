-- =====================================================
-- STORAGE BUCKET SETUP FOR MOMENTS AUDIO
-- =====================================================
-- This script creates the moments-audio storage bucket
-- and configures RLS policies for secure access.
-- =====================================================

-- =====================================================
-- 1. CREATE BUCKET
-- =====================================================

-- Note: Bucket creation is typically done via Supabase Dashboard
-- or CLI. If you need to create via SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moments-audio',
  'moments-audio',
  true, -- Public bucket (users can access via signed URLs)
  10485760, -- 10 MB file size limit
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']
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
WHERE name = 'moments-audio';

-- =====================================================
-- 3. CREATE RLS POLICIES FOR STORAGE
-- =====================================================

-- 3.1 Policy: Users can upload their own audio files
-- Files must be stored in folder matching user's UUID
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.2 Policy: Users can read their own audio files
CREATE POLICY "Users can read own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.3 Policy: Users can update their own audio files
CREATE POLICY "Users can update own audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3.4 Policy: Users can delete their own audio files
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
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
AND policyname LIKE '%moments%audio%'
ORDER BY policyname;

-- =====================================================
-- 5. USAGE EXAMPLES
-- =====================================================

-- Example file path structure:
-- {user_id}/moments/{moment_id}.mp3
-- {user_id}/moments/{moment_id}.wav

-- Example: User with ID '123e4567-e89b-12d3-a456-426614174000'
-- uploading audio for moment 'abc123':
-- Path: '123e4567-e89b-12d3-a456-426614174000/moments/abc123.mp3'

-- When RLS checks:
-- (storage.foldername(name))[1] extracts '123e4567-e89b-12d3-a456-426614174000'
-- auth.uid()::text returns '123e4567-e89b-12d3-a456-426614174000'
-- They match, so upload is allowed.

-- =====================================================
-- 6. STORAGE BEST PRACTICES
-- =====================================================

COMMENT ON TABLE storage.objects IS 'Stores user-uploaded files with RLS protection';

-- Recommended file naming convention:
-- {user_id}/moments/{timestamp}_{moment_id}.{extension}
-- Example: 123e4567.../moments/20251206_abc123.mp3

-- Benefits:
-- 1. Easy to identify user's files
-- 2. Chronological ordering
-- 3. Unique filenames prevent conflicts
-- 4. RLS automatically enforces user ownership

-- =====================================================
-- 7. CLEANUP SCRIPT (if needed)
-- =====================================================

-- To remove all policies and bucket (use with caution):
/*
DROP POLICY IF EXISTS "Users can upload own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;

DELETE FROM storage.buckets WHERE name = 'moments-audio';
*/
