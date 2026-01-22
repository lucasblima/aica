-- ============================================================================
-- MIGRATION: Generated Decks (Sponsor Deck Generator - Issue #117)
-- Date: 2026-01-22
-- Author: Aica Backend Architect
--
-- PURPOSE:
-- Create database schema for HTML/PDF presentation generator with RAG-powered
-- content. Part of File Processing Pipeline (EPIC #113).
--
-- RELATED ISSUES:
-- - #114: Document upload and extraction
-- - #115: Automatic classification
-- - #116: RAG embeddings (document_embeddings table exists)
-- - #117: Presentation generator (THIS MIGRATION - Phase 1)
--
-- SCHEMA OVERVIEW:
-- 1. generated_decks - Presentation metadata and configuration
-- 2. deck_slides - Individual slides with flexible JSONB content
-- 3. Storage bucket: presentation-assets (PDFs, images, logos)
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Table: generated_decks
-- Stores presentation metadata, template configuration, and PDF export status
CREATE TABLE IF NOT EXISTS public.generated_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.grant_projects(id) ON DELETE CASCADE,

  -- Presentation metadata
  title TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('professional', 'creative', 'institutional')),

  -- Target audience customization (optional)
  target_company TEXT, -- Nome da empresa alvo do pitch
  target_focus TEXT CHECK (target_focus IN ('esg', 'tax', 'brand', 'impact', 'general') OR target_focus IS NULL),

  -- PDF export status
  pdf_storage_path TEXT, -- Caminho no bucket presentation-assets
  pdf_generated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: deck_slides
-- Stores individual slide content in flexible JSONB structure
-- Supports multiple slide types with varying content schemas
CREATE TABLE IF NOT EXISTS public.deck_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.generated_decks(id) ON DELETE CASCADE NOT NULL,

  -- Slide configuration
  slide_type TEXT NOT NULL CHECK (slide_type IN (
    'cover',
    'organization',
    'project',
    'impact-metrics',
    'timeline',
    'team',
    'incentive-law',
    'tiers',
    'testimonials',
    'media',
    'comparison',
    'contact'
  )),

  -- Flexible content structure (varies by slide_type)
  -- Example structures:
  -- cover: { projectName, tagline, organizationName, logoUrl, approvalNumber }
  -- organization: { name, description, mission, achievements[], logoUrl }
  -- project: { name, executiveSummary, objectives[], duration, location }
  -- impact-metrics: { metrics: [{ label, value, unit, icon }], impactDescription }
  -- tiers: { tiers: [{ id, name, value, deliverables[], isHighlighted }], currency }
  content JSONB NOT NULL DEFAULT '{}',

  -- Ordering
  sort_order INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PART 2: CREATE INDEXES
-- ============================================================================

-- Performance indexes for generated_decks
CREATE INDEX IF NOT EXISTS idx_generated_decks_user_id
  ON public.generated_decks(user_id);

CREATE INDEX IF NOT EXISTS idx_generated_decks_organization_id
  ON public.generated_decks(organization_id);

CREATE INDEX IF NOT EXISTS idx_generated_decks_project_id
  ON public.generated_decks(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_decks_created_at
  ON public.generated_decks(created_at DESC);

-- Performance indexes for deck_slides
CREATE INDEX IF NOT EXISTS idx_deck_slides_deck_id_sort
  ON public.deck_slides(deck_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_deck_slides_type
  ON public.deck_slides(slide_type);

-- GIN index for JSONB content search (useful for RAG queries)
CREATE INDEX IF NOT EXISTS idx_deck_slides_content_gin
  ON public.deck_slides USING GIN(content);

-- ============================================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.generated_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_slides ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user owns a deck
-- SECURITY DEFINER prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.user_owns_deck(_deck_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.generated_decks
    WHERE id = _deck_id
      AND user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.user_owns_deck IS
  'Security Definer function to check deck ownership without RLS recursion';

-- ============================================================================
-- PART 5: CREATE RLS POLICIES - generated_decks
-- ============================================================================

-- SELECT: Users can view only their own decks
DROP POLICY IF EXISTS "Users can view own decks" ON public.generated_decks;
CREATE POLICY "Users can view own decks"
  ON public.generated_decks FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can create decks for their organizations
DROP POLICY IF EXISTS "Users can create own decks" ON public.generated_decks;
CREATE POLICY "Users can create own decks"
  ON public.generated_decks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id
        AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own decks
DROP POLICY IF EXISTS "Users can update own decks" ON public.generated_decks;
CREATE POLICY "Users can update own decks"
  ON public.generated_decks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own decks
DROP POLICY IF EXISTS "Users can delete own decks" ON public.generated_decks;
CREATE POLICY "Users can delete own decks"
  ON public.generated_decks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 6: CREATE RLS POLICIES - deck_slides
-- ============================================================================

-- SELECT: Users can view slides of their decks
DROP POLICY IF EXISTS "Users can view slides of own decks" ON public.deck_slides;
CREATE POLICY "Users can view slides of own decks"
  ON public.deck_slides FOR SELECT
  USING (public.user_owns_deck(deck_id));

-- INSERT: Users can add slides to their decks
DROP POLICY IF EXISTS "Users can insert slides to own decks" ON public.deck_slides;
CREATE POLICY "Users can insert slides to own decks"
  ON public.deck_slides FOR INSERT
  WITH CHECK (public.user_owns_deck(deck_id));

-- UPDATE: Users can update slides of their decks
DROP POLICY IF EXISTS "Users can update slides of own decks" ON public.deck_slides;
CREATE POLICY "Users can update slides of own decks"
  ON public.deck_slides FOR UPDATE
  USING (public.user_owns_deck(deck_id))
  WITH CHECK (public.user_owns_deck(deck_id));

-- DELETE: Users can delete slides from their decks
DROP POLICY IF EXISTS "Users can delete slides of own decks" ON public.deck_slides;
CREATE POLICY "Users can delete slides of own decks"
  ON public.deck_slides FOR DELETE
  USING (public.user_owns_deck(deck_id));

-- ============================================================================
-- PART 7: CREATE UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger for generated_decks.updated_at
DROP TRIGGER IF EXISTS update_generated_decks_updated_at ON public.generated_decks;
CREATE TRIGGER update_generated_decks_updated_at
  BEFORE UPDATE ON public.generated_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for deck_slides.updated_at
DROP TRIGGER IF EXISTS update_deck_slides_updated_at ON public.deck_slides;
CREATE TRIGGER update_deck_slides_updated_at
  BEFORE UPDATE ON public.deck_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 8: CREATE STORAGE BUCKET
-- ============================================================================

-- Bucket: presentation-assets
-- Stores: Exported PDFs, custom slide images, organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-assets',
  'presentation-assets',
  false, -- Private bucket (access via RLS)
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 9: CREATE STORAGE RLS POLICIES
-- ============================================================================

-- Policy: Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload presentation assets" ON storage.objects;
CREATE POLICY "Users can upload presentation assets" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'presentation-assets'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Policy: Users can view their own files
DROP POLICY IF EXISTS "Users can view own presentation assets" ON storage.objects;
CREATE POLICY "Users can view own presentation assets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'presentation-assets'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Policy: Users can update their own files
DROP POLICY IF EXISTS "Users can update own presentation assets" ON storage.objects;
CREATE POLICY "Users can update own presentation assets" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'presentation-assets'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Policy: Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own presentation assets" ON storage.objects;
CREATE POLICY "Users can delete own presentation assets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'presentation-assets'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================================
-- PART 10: ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.generated_decks IS
  'Presentation metadata for sponsor deck generator. Stores template, target audience, and PDF export status.';

COMMENT ON TABLE public.deck_slides IS
  'Individual slides with flexible JSONB content. Slide structure varies by slide_type.';

COMMENT ON COLUMN public.generated_decks.template IS
  'Template ID: professional (corporate), creative (artistic), institutional (government)';

COMMENT ON COLUMN public.generated_decks.target_focus IS
  'Optional focus area for customized pitch: esg (ESG/sustainability), tax (tax incentives), brand (brand visibility), impact (social impact), general';

COMMENT ON COLUMN public.generated_decks.pdf_storage_path IS
  'Storage path in presentation-assets bucket. Format: {user_id}/decks/{deck_id}.pdf';

COMMENT ON COLUMN public.deck_slides.content IS
  'Flexible JSONB structure. Schema varies by slide_type. See sponsorDeck.ts types for reference.';

COMMENT ON COLUMN public.deck_slides.sort_order IS
  'Zero-indexed slide order. Lower values appear first in presentation.';

-- ============================================================================
-- PART 11: VERIFICATION QUERY (for testing)
-- ============================================================================

-- Run this query after migration to verify setup:
--
-- SELECT
--   tablename,
--   policyname,
--   cmd AS operation,
--   CASE
--     WHEN qual IS NOT NULL THEN 'USING clause'
--     WHEN with_check IS NOT NULL THEN 'WITH CHECK clause'
--     ELSE 'No conditions'
--   END AS policy_type
-- FROM pg_policies
-- WHERE tablename IN ('generated_decks', 'deck_slides')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '[Generated Decks Migration] ✅ Phase 1 Complete';
  RAISE NOTICE '  Tables created:';
  RAISE NOTICE '    - generated_decks (with RLS and 4 policies)';
  RAISE NOTICE '    - deck_slides (with RLS and 4 policies)';
  RAISE NOTICE '  Indexes created: 7 performance indexes';
  RAISE NOTICE '  Functions created: user_owns_deck (SECURITY DEFINER)';
  RAISE NOTICE '  Storage bucket: presentation-assets (private, 50MB limit)';
  RAISE NOTICE '  Storage RLS: 4 policies (upload, view, update, delete)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps (Phase 2):';
  RAISE NOTICE '  - Create Edge Function: generate-sponsor-deck';
  RAISE NOTICE '  - Implement RAG query for slide content generation';
  RAISE NOTICE '  - Build HTML template renderer';
END $$;
