-- Create project_sources bucket ONLY (simplified version)
-- Migration: 20251208_create_project_sources_bucket_simple
--
-- Use this if the full migration fails with permission errors
-- After running this, configure policies manually in Dashboard > Storage > project_sources > Policies

-- Create the bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project_sources',
  'project_sources',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- After running this, go to Dashboard and create 4 policies:
-- 1. INSERT policy: Allow authenticated users to upload
-- 2. SELECT policy: Allow authenticated users to read
-- 3. UPDATE policy: Allow authenticated users to update
-- 4. DELETE policy: Allow authenticated users to delete
