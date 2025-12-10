-- =====================================================
-- MIGRATION: 20251208180600_create_storage_buckets
-- Description: Create Supabase Storage buckets for multimodal media
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- 1. User Media Bucket (fotos, vídeos pessoais do Journey)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-media',
  'user-media',
  false, -- Privado, acesso via RLS
  104857600, -- 100MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. AI Generated Media (Veo, Imagen, TTS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated',
  'ai-generated',
  false,
  524288000, -- 500MB (vídeos Veo)
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Podcast Recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast-recordings',
  'podcast-recordings',
  false,
  1073741824, -- 1GB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Thumbnails & Previews (público para CDN)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true, -- Público para CDN
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Transcriptions (texto)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcriptions',
  'transcriptions',
  false,
  10485760, -- 10MB
  ARRAY['text/plain', 'application/json', 'text/vtt', 'application/x-subrip']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- user-media bucket policies
CREATE POLICY "Users can upload own media" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can view own media" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ai-generated bucket policies
CREATE POLICY "Users can upload AI generated content" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-generated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can view AI generated content" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-generated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can update AI generated content" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'ai-generated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete AI generated content" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-generated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- podcast-recordings policies
CREATE POLICY "Users can manage podcast recordings" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'podcast-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'podcast-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- thumbnails (público, mas apenas owner pode upload)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload own thumbnails" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own thumbnails" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete own thumbnails" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- transcriptions policies
CREATE POLICY "Users can manage transcriptions" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'transcriptions'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'transcriptions'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
