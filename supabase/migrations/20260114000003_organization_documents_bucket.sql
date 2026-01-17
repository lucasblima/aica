-- Create organization_documents bucket for storing organization documents
-- Migration: 20260114_organization_documents_bucket
-- Issue #100 - Wizard gamificado para cadastro completo de organizacoes
--
-- This bucket stores organization documents like Cartao CNPJ, Estatuto, etc.
-- for automatic extraction and wizard auto-fill.

-- Create the bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-documents',
  'organization-documents',
  false, -- Private bucket
  20971520, -- 20MB limit (some estatutos are large)
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "org_docs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "org_docs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "org_docs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "org_docs_delete_policy" ON storage.objects;

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "org_docs_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to read their own files
CREATE POLICY "org_docs_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'organization-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own files
CREATE POLICY "org_docs_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'organization-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own files
CREATE POLICY "org_docs_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
