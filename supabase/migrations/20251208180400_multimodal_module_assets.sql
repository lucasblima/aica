-- =====================================================
-- MIGRATION: 20251208180400_multimodal_module_assets
-- Description: Many-to-many relationships between modules and assets
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Check if user owns asset
-- =====================================================

CREATE OR REPLACE FUNCTION user_owns_asset(p_asset_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ai_generated_assets
    WHERE id = p_asset_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_owns_asset IS 'Check if current user owns the specified asset';

-- =====================================================
-- TABLE: module_assets
-- Purpose: Many-to-many relationships between modules and assets
-- =====================================================

CREATE TABLE IF NOT EXISTS public.module_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.ai_generated_assets(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL CHECK (module_type IN (
    'grants', 'journey', 'podcast', 'finance', 'atlas'
  )),
  module_id UUID NOT NULL,

  -- Relationship metadata
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'cover_image',     -- Imagem de capa
    'attachment',      -- Anexo genérico
    'transcript',      -- Transcrição
    'chapter_marker',  -- Marcador de capítulo (podcast)
    'social_cut',      -- Corte para redes sociais
    'thumbnail',       -- Miniatura
    'reference'        -- Material de referência
  )),

  display_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: same asset can't have duplicate relationship to same module entity
  UNIQUE(asset_id, module_type, module_id, relationship_type)
);

-- Comments
COMMENT ON TABLE public.module_assets IS 'Many-to-many relationships between modules and assets';
COMMENT ON COLUMN public.module_assets.relationship_type IS 'How the asset relates to the module entity';
COMMENT ON COLUMN public.module_assets.display_order IS 'Order for displaying multiple assets of same type';
COMMENT ON COLUMN public.module_assets.metadata IS 'Additional relationship-specific data';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_module_assets_asset ON public.module_assets(asset_id);
CREATE INDEX idx_module_assets_module ON public.module_assets(module_type, module_id);
CREATE INDEX idx_module_assets_type ON public.module_assets(relationship_type);
CREATE INDEX idx_module_assets_order ON public.module_assets(module_type, module_id, display_order);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.module_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module assets"
  ON public.module_assets FOR SELECT
  USING (user_owns_asset(asset_id));

CREATE POLICY "Users can insert own module assets"
  ON public.module_assets FOR INSERT
  WITH CHECK (user_owns_asset(asset_id));

CREATE POLICY "Users can update own module assets"
  ON public.module_assets FOR UPDATE
  USING (user_owns_asset(asset_id))
  WITH CHECK (user_owns_asset(asset_id));

CREATE POLICY "Users can delete own module assets"
  ON public.module_assets FOR DELETE
  USING (user_owns_asset(asset_id));
