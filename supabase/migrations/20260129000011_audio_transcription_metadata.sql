-- Migration: Add audio transcription metadata column
-- Issue #176: Implement audio transcription in WhatsApp document processing
--
-- This migration adds support for storing detailed audio transcription metadata
-- including duration, detected language, and confidence score.

-- ============================================================================
-- ADD TRANSCRIPTION METADATA COLUMN
-- ============================================================================

-- Add JSONB column for structured transcription metadata
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS transcription_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN whatsapp_messages.transcription_metadata IS 'Audio transcription metadata: {duration_seconds, language, confidence, model, processed_at}';

-- ============================================================================
-- INDEX FOR AUDIO MESSAGES
-- ============================================================================

-- Index for querying audio messages with transcriptions
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_audio_transcription
  ON whatsapp_messages(user_id, message_timestamp DESC)
  WHERE message_type = 'audio' AND content_transcription IS NOT NULL;

-- GIN index for querying transcription metadata (e.g., by language)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_transcription_metadata
  ON whatsapp_messages USING gin(transcription_metadata jsonb_path_ops)
  WHERE transcription_metadata IS NOT NULL;

-- ============================================================================
-- ADD AI MODEL PRICING FOR GEMINI AUDIO
-- ============================================================================

-- Ensure Gemini 2.0 Flash Exp is in pricing table (free during preview)
INSERT INTO ai_model_pricing (
  model_name,
  input_price_per_1m_tokens,
  output_price_per_1m_tokens,
  provider,
  model_family,
  context_window_tokens
)
VALUES (
  'gemini-2.0-flash-exp',
  0.000,  -- Free during preview
  0.000,  -- Free during preview
  'google',
  'gemini',
  1048576
)
ON CONFLICT (model_name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Get audio transcription stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_audio_transcription_stats(p_user_id UUID)
RETURNS TABLE (
  total_transcriptions BIGINT,
  total_duration_seconds BIGINT,
  languages_used TEXT[],
  avg_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_transcriptions,
    COALESCE(SUM((transcription_metadata->>'duration_seconds')::INT), 0)::BIGINT as total_duration_seconds,
    ARRAY_AGG(DISTINCT transcription_metadata->>'language') FILTER (WHERE transcription_metadata->>'language' IS NOT NULL) as languages_used,
    ROUND(AVG((transcription_metadata->>'confidence')::NUMERIC), 2) as avg_confidence
  FROM whatsapp_messages
  WHERE user_id = p_user_id
    AND message_type = 'audio'
    AND content_transcription IS NOT NULL
    AND transcription_metadata IS NOT NULL
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_audio_transcription_stats IS 'Returns audio transcription statistics for a user (Issue #176)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_audio_transcription_stats TO authenticated;
