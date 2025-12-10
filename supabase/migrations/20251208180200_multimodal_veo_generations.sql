-- =====================================================
-- MIGRATION: 20251208180200_multimodal_veo_generations
-- Description: Track Google Veo video generation jobs
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- TABLE: veo_video_generations
-- Purpose: Track Veo video generation requests, status, and results
-- =====================================================

CREATE TABLE IF NOT EXISTS public.veo_video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.ai_generated_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Generation request
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  reference_images UUID[], -- Array of asset_id refs
  style_preset TEXT,       -- 'cinematic', 'documentary', 'animation', etc

  -- Video parameters
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 60),
  resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('480p', '720p', '1080p', '4K')),
  aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1', '4:3')),
  fps INT DEFAULT 30 CHECK (fps IN (24, 30, 60)),

  -- Generation status
  generation_status TEXT DEFAULT 'queued' CHECK (generation_status IN (
    'queued', 'processing', 'completed', 'failed', 'cancelled'
  )),
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_completion_at TIMESTAMPTZ,

  -- API response
  veo_job_id TEXT UNIQUE,  -- Google Veo job ID
  error_message TEXT,

  -- Costs
  processing_time_seconds INT,
  cost_usd NUMERIC(10, 6),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Comments
COMMENT ON TABLE public.veo_video_generations IS 'Tracking for Google Veo video generation jobs';
COMMENT ON COLUMN public.veo_video_generations.reference_images IS 'Asset IDs of reference images used for generation';
COMMENT ON COLUMN public.veo_video_generations.veo_job_id IS 'Google Veo API job identifier';
COMMENT ON COLUMN public.veo_video_generations.progress_percentage IS 'Generation progress (0-100)';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_veo_generations_asset ON public.veo_video_generations(asset_id);
CREATE INDEX idx_veo_generations_user ON public.veo_video_generations(user_id);
CREATE INDEX idx_veo_generations_status ON public.veo_video_generations(generation_status);
CREATE INDEX idx_veo_generations_job_id ON public.veo_video_generations(veo_job_id) WHERE veo_job_id IS NOT NULL;
CREATE INDEX idx_veo_generations_created ON public.veo_video_generations(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_veo_video_generations_updated_at
  BEFORE UPDATE ON public.veo_video_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.veo_video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
  ON public.veo_video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON public.veo_video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
  ON public.veo_video_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON public.veo_video_generations FOR DELETE
  USING (auth.uid() = user_id);
