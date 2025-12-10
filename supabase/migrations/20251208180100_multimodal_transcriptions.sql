-- =====================================================
-- MIGRATION: 20251208180100_multimodal_transcriptions
-- Description: AI-generated transcriptions table with speaker diarization
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- TABLE: ai_transcriptions
-- Purpose: Store AI-generated transcriptions from audio/video assets
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.ai_generated_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transcription metadata
  transcription_model TEXT NOT NULL, -- 'gemini-2.0-flash', 'whisper-large-v3', etc
  language TEXT DEFAULT 'pt-BR',
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Content
  full_text TEXT NOT NULL,

  -- Timestamped segments (for video editing, podcast chapters)
  segments JSONB, -- [{start_ms, end_ms, text, speaker, confidence}]

  -- Extracted entities
  speakers JSONB, -- [{speaker_id, name, total_duration_ms}]
  topics JSONB,   -- [{topic, relevance_score, timestamps}]
  keywords TEXT[],

  -- Processing
  processing_time_ms INT,
  cost_usd NUMERIC(10, 6),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.ai_transcriptions IS 'AI-generated transcriptions from audio/video assets';
COMMENT ON COLUMN public.ai_transcriptions.segments IS 'Timestamped transcript segments with speaker diarization';
COMMENT ON COLUMN public.ai_transcriptions.speakers IS 'Identified speakers with metadata';
COMMENT ON COLUMN public.ai_transcriptions.topics IS 'AI-extracted topics with relevance scores';
COMMENT ON COLUMN public.ai_transcriptions.keywords IS 'Key phrases extracted from transcript';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_transcriptions_asset ON public.ai_transcriptions(asset_id);
CREATE INDEX idx_transcriptions_user ON public.ai_transcriptions(user_id);
CREATE INDEX idx_transcriptions_keywords ON public.ai_transcriptions USING gin(keywords);
CREATE INDEX idx_transcriptions_created ON public.ai_transcriptions(created_at DESC);

-- Full-text search on transcription text
CREATE INDEX idx_transcriptions_text_search ON public.ai_transcriptions
USING gin(to_tsvector('portuguese', full_text));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_ai_transcriptions_updated_at
  BEFORE UPDATE ON public.ai_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcriptions"
  ON public.ai_transcriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcriptions"
  ON public.ai_transcriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions"
  ON public.ai_transcriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions"
  ON public.ai_transcriptions FOR DELETE
  USING (auth.uid() = user_id);
