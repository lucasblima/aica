-- =====================================================
-- MIGRATION: 20251208180300_multimodal_analytics
-- Description: AI usage tracking and cost analytics
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- TABLE: ai_usage_analytics
-- Purpose: Track all AI API usage and costs for billing and analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operation identification
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'text_generation',      -- Gemini chat/completion
    'image_generation',     -- Imagen
    'video_generation',     -- Veo
    'audio_generation',     -- Music/TTS
    'transcription',        -- Audio → Text
    'file_indexing',        -- File Search indexing
    'file_search_query',    -- RAG query
    'image_analysis',       -- Vision API
    'embedding'             -- Vector embeddings
  )),

  -- Model used
  ai_model TEXT NOT NULL,  -- 'gemini-2.0-flash', 'veo-2', 'imagen-3', etc

  -- Usage metrics
  input_tokens INT,
  output_tokens INT,
  total_tokens INT,
  duration_seconds NUMERIC(10, 2),

  -- Costs (USD)
  input_cost_usd NUMERIC(10, 6),
  output_cost_usd NUMERIC(10, 6),
  total_cost_usd NUMERIC(10, 6) NOT NULL,

  -- Context
  module_type TEXT CHECK (module_type IN (
    'grants', 'journey', 'podcast', 'finance', 'atlas', 'chat', NULL
  )),
  module_id UUID,
  asset_id UUID REFERENCES public.ai_generated_assets(id) ON DELETE SET NULL,

  -- Metadata
  request_metadata JSONB, -- Prompt preview, parameters, etc

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.ai_usage_analytics IS 'Tracks all AI API usage and costs for billing and analytics';
COMMENT ON COLUMN public.ai_usage_analytics.total_cost_usd IS 'Calculated cost in USD based on model pricing';
COMMENT ON COLUMN public.ai_usage_analytics.operation_type IS 'Type of AI operation performed';
COMMENT ON COLUMN public.ai_usage_analytics.request_metadata IS 'Additional context: prompt snippet, parameters, etc';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_ai_usage_user ON public.ai_usage_analytics(user_id);
CREATE INDEX idx_ai_usage_operation ON public.ai_usage_analytics(operation_type);
CREATE INDEX idx_ai_usage_model ON public.ai_usage_analytics(ai_model);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_analytics(created_at DESC);
CREATE INDEX idx_ai_usage_module ON public.ai_usage_analytics(module_type, module_id) WHERE module_type IS NOT NULL;
CREATE INDEX idx_ai_usage_cost ON public.ai_usage_analytics(total_cost_usd DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.ai_usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage"
  ON public.ai_usage_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get total costs for user in date range
CREATE OR REPLACE FUNCTION get_user_ai_costs(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  operation_type TEXT,
  ai_model TEXT,
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.operation_type,
    a.ai_model,
    COUNT(*)::BIGINT as total_requests,
    COALESCE(SUM(a.total_tokens), 0)::BIGINT as total_tokens,
    COALESCE(SUM(a.total_cost_usd), 0) as total_cost_usd
  FROM ai_usage_analytics a
  WHERE a.user_id = p_user_id
    AND a.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY a.operation_type, a.ai_model
  ORDER BY total_cost_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_ai_costs IS 'Returns aggregated AI usage costs for a user in a date range';

-- Function: Get daily cost summary
CREATE OR REPLACE FUNCTION get_daily_ai_costs(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_cost_usd NUMERIC,
  total_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(a.created_at) as date,
    COALESCE(SUM(a.total_cost_usd), 0) as total_cost_usd,
    COUNT(*)::BIGINT as total_requests
  FROM ai_usage_analytics a
  WHERE a.user_id = p_user_id
    AND a.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(a.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_daily_ai_costs IS 'Returns daily cost summary for last N days';

-- Function: Get total cost for current month
CREATE OR REPLACE FUNCTION get_current_month_cost(
  p_user_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_cost_usd), 0)
  INTO v_total
  FROM ai_usage_analytics
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_month_cost IS 'Returns total AI cost for current calendar month';
