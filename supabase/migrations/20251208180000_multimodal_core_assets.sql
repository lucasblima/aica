-- =====================================================
-- MIGRATION: 20251208180000_multimodal_core_assets
-- Description: Create core ai_generated_assets table for multimodal media
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE: ai_generated_assets
-- Purpose: Central registry for all user media - uploaded and AI-generated
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Asset identification
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'document',      -- PDFs, DOCX, TXT, MD
    'image',         -- PNG, JPG, WebP
    'video',         -- MP4, WebM
    'audio',         -- MP3, WAV, OGG
    'transcript',    -- Text transcriptions
    'thumbnail',     -- Generated previews
    'music'          -- AI-generated music
  )),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN (
    'upload',        -- User uploaded
    'ai_generated',  -- AI created (Imagen, Veo, etc)
    'ai_extracted',  -- AI processed (transcript, thumbnail)
    'external_link'  -- URL reference
  )),

  -- AI generation metadata
  ai_model TEXT,           -- 'gemini-2.0-flash', 'imagen-3', 'veo-2', etc
  generation_prompt TEXT,  -- Prompt usado para gerar
  generation_params JSONB, -- Parâmetros: temperature, style, duration, etc
  generation_version INT DEFAULT 1, -- Iteração/versão
  parent_asset_id UUID REFERENCES public.ai_generated_assets(id) ON DELETE SET NULL,

  -- Storage
  storage_path TEXT,       -- Supabase Storage path or NULL for external
  external_url TEXT,       -- URL externa (YouTube, Vimeo, etc)
  mime_type TEXT,
  file_size_bytes BIGINT,

  -- Media-specific metadata
  media_metadata JSONB,    -- duration_seconds, width, height, codec, bitrate, etc

  -- Indexing for search
  file_search_store_id UUID REFERENCES public.user_file_search_stores(id) ON DELETE SET NULL,
  gemini_file_name TEXT,   -- Nome no Gemini File API
  indexing_status TEXT DEFAULT 'pending' CHECK (indexing_status IN (
    'pending', 'processing', 'completed', 'failed', 'not_indexable'
  )),
  indexed_at TIMESTAMPTZ,

  -- Content extraction
  extracted_text TEXT,     -- Transcript, OCR, document text
  extracted_metadata JSONB, -- AI-extracted entities, topics, sentiment

  -- Module relationships (polymorphic)
  module_type TEXT CHECK (module_type IN (
    'grants', 'journey', 'podcast', 'finance', 'atlas', NULL
  )),
  module_id UUID,          -- ID do registro no módulo

  -- Lifecycle
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.ai_generated_assets IS 'Central registry for all user media - uploaded and AI-generated';
COMMENT ON COLUMN public.ai_generated_assets.asset_type IS 'Type of media asset';
COMMENT ON COLUMN public.ai_generated_assets.source_type IS 'How asset was created';
COMMENT ON COLUMN public.ai_generated_assets.generation_prompt IS 'Prompt used to generate this asset (if AI-generated)';
COMMENT ON COLUMN public.ai_generated_assets.parent_asset_id IS 'Parent asset if this is a derived version (e.g., thumbnail from video)';
COMMENT ON COLUMN public.ai_generated_assets.media_metadata IS 'Type-specific metadata: {duration_seconds, width, height, fps, codec, sample_rate, etc}';
COMMENT ON COLUMN public.ai_generated_assets.module_type IS 'Which module owns this asset (polymorphic relationship)';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_ai_assets_user_id ON public.ai_generated_assets(user_id);
CREATE INDEX idx_ai_assets_asset_type ON public.ai_generated_assets(asset_type);
CREATE INDEX idx_ai_assets_source_type ON public.ai_generated_assets(source_type);
CREATE INDEX idx_ai_assets_module ON public.ai_generated_assets(module_type, module_id) WHERE module_type IS NOT NULL;
CREATE INDEX idx_ai_assets_parent ON public.ai_generated_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL;
CREATE INDEX idx_ai_assets_store ON public.ai_generated_assets(file_search_store_id) WHERE file_search_store_id IS NOT NULL;
CREATE INDEX idx_ai_assets_created ON public.ai_generated_assets(created_at DESC);

-- Full-text search on extracted text
CREATE INDEX idx_ai_assets_text_search ON public.ai_generated_assets
USING gin(to_tsvector('portuguese', COALESCE(extracted_text, '')));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_ai_generated_assets_updated_at
  BEFORE UPDATE ON public.ai_generated_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON public.ai_generated_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON public.ai_generated_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON public.ai_generated_assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON public.ai_generated_assets FOR DELETE
  USING (auth.uid() = user_id);
