-- Migration: Fix handle_telegram_mood_response — use existing moments schema
-- Issue #586: PR review found that original function used non-existent columns
--
-- The moments table has: type CHECK ('audio','text','both'), emotion TEXT, sentiment_data JSONB
-- Original incorrectly used: type='mood', mood_score, source, emotions (none exist)

-- ============================================================================
-- FIX: Replace handle_telegram_mood_response with correct column references
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_telegram_mood_response(
  p_user_id UUID,
  p_mood_score INTEGER,
  p_notification_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert a mood entry into moments using existing schema columns:
  --   type='text' (valid CHECK value), emotion (text), sentiment_data (jsonb)
  INSERT INTO moments (
    user_id,
    type,
    content,
    emotion,
    sentiment_data,
    tags,
    created_at
  ) VALUES (
    p_user_id,
    'text',
    'Check-in de humor via Telegram: ' || p_mood_score || '/5',
    CASE p_mood_score
      WHEN 5 THEN 'muito_feliz'
      WHEN 4 THEN 'feliz'
      WHEN 3 THEN 'neutro'
      WHEN 2 THEN 'triste'
      WHEN 1 THEN 'muito_triste'
      ELSE 'neutro'
    END,
    jsonb_build_object(
      'mood_score', p_mood_score,
      'source', 'telegram',
      'type', 'mood_checkin'
    ),
    ARRAY['telegram', 'mood_checkin'],
    now()
  );

  -- Mark the notification as acknowledged
  PERFORM handle_telegram_notification_ack(p_notification_id, 'mood_response');
END;
$$;
