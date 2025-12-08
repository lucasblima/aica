-- Create project_sources bucket for storing project briefing documents
-- Migration: 20251208_create_project_sources_bucket
--
-- This migration creates the storage bucket for project source documents (DOCX, PDF, etc.)
-- and configures RLS policies for authenticated users

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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "project_sources_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_sources_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_sources_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_sources_delete_policy" ON storage.objects;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "project_sources_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project_sources'
);

-- Policy: Allow authenticated users to read files
CREATE POLICY "project_sources_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project_sources'
);

-- Policy: Allow authenticated users to update files
CREATE POLICY "project_sources_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project_sources'
)
WITH CHECK (
  bucket_id = 'project_sources'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "project_sources_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project_sources'
);
