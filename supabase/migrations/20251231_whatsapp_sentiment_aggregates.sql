-- Migration: WhatsApp Sentiment Aggregates - Privacy-First Analytics
-- Issue #12: Privacy-First WhatsApp Integration
--
-- This migration creates the analytics infrastructure that stores ONLY
-- aggregated sentiment data and topic clusters - NEVER raw message text.
-- All contact identifiers are hashed for privacy.

-- ============================================================================
-- FUNCTION: Hash Contact Identifier (Privacy Protection)
-- ============================================================================

CREATE OR REPLACE FUNCTION hash_contact_identifier(p_user_id UUID, p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  user_salt TEXT;
  combined_string TEXT;
  hashed_result TEXT;
BEGIN
  -- Get user-specific salt (or create one)
  -- This ensures each user's hashes are unique
  SELECT md5(p_user_id::text || 'whatsapp_contact_salt') INTO user_salt;

  -- Combine user_id, phone, and salt
  combined_string := p_user_id::text || '|' || p_phone || '|' || user_salt;

  -- Generate SHA256 hash
  hashed_result := encode(digest(combined_string, 'sha256'), 'hex');

  RETURN hashed_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_contact_identifier IS 'Generates SHA256 hash of contact identifier with user-specific salt for privacy';

-- ============================================================================
-- TABLE: whatsapp_sentiment_aggregates
-- ============================================================================
-- Stores time-windowed sentiment aggregates per contact
-- NO raw message text - only statistical aggregates

CREATE TABLE IF NOT EXISTS whatsapp_sentiment_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and contact (hashed)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_hash TEXT NOT NULL,  -- SHA256 hash of contact phone

  -- Time window for aggregation
  date_window DATE NOT NULL,  -- Day, week, or month window
  window_type TEXT NOT NULL CHECK (window_type IN ('day', 'week', 'month')),

  -- Sentiment aggregates
  avg_sentiment DECIMAL(4,3) CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),
  sentiment_std_dev DECIMAL(4,3),  -- Standard deviation
  min_sentiment DECIMAL(4,3),
  max_sentiment DECIMAL(4,3),

  -- Message volume (no content)
  message_count INTEGER DEFAULT 0,
  incoming_count INTEGER DEFAULT 0,
  outgoing_count INTEGER DEFAULT 0,

  -- Emotional trend indicator
  emotional_trend TEXT CHECK (emotional_trend IN ('improving', 'declining', 'stable', 'volatile')),
  trend_score DECIMAL(4,3),  -- Slope of sentiment over time

  -- Topic clusters (from embeddings)
  top_topics TEXT[],  -- Array of top 5 topics
  topic_scores JSONB,  -- {topic: frequency_score}

  -- Anomaly detection
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_type TEXT CHECK (anomaly_type IN ('spike_positive', 'spike_negative', 'volume_surge', 'new_topic')),
  anomaly_score DECIMAL(4,3),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint per window
  CONSTRAINT unique_user_contact_window UNIQUE(user_id, contact_hash, date_window, window_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary query: get sentiment trends for a contact
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_user_contact
  ON whatsapp_sentiment_aggregates(user_id, contact_hash, date_window DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_date
  ON whatsapp_sentiment_aggregates(user_id, date_window DESC, window_type);

-- Anomaly detection
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_anomalies
  ON whatsapp_sentiment_aggregates(user_id, is_anomaly, date_window DESC)
  WHERE is_anomaly = true;

-- Topic search
CREATE INDEX IF NOT EXISTS idx_sentiment_aggregates_topics
  ON whatsapp_sentiment_aggregates USING gin(top_topics);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_sentiment_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sentiment aggregates"
  ON whatsapp_sentiment_aggregates
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert/update for aggregation jobs
-- (RLS bypassed for service role by default)

-- ============================================================================
-- FUNCTION: Compute Sentiment Aggregates
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_sentiment_aggregates(
  p_time_window TEXT DEFAULT 'day',  -- 'day', 'week', or 'month'
  p_user_id UUID DEFAULT NULL  -- NULL = all users
)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  window_interval INTERVAL;
  current_window DATE;
BEGIN
  -- Determine interval based on window type
  window_interval := CASE p_time_window
    WHEN 'day' THEN INTERVAL '1 day'
    WHEN 'week' THEN INTERVAL '1 week'
    WHEN 'month' THEN INTERVAL '1 month'
    ELSE INTERVAL '1 day'
  END;

  -- Compute aggregates from message_embeddings table
  INSERT INTO whatsapp_sentiment_aggregates (
    user_id,
    contact_hash,
    date_window,
    window_type,
    avg_sentiment,
    sentiment_std_dev,
    min_sentiment,
    max_sentiment,
    message_count,
    incoming_count,
    outgoing_count,
    emotional_trend,
    trend_score,
    top_topics
  )
  SELECT
    me.user_id,
    me.contact_hash,
    DATE_TRUNC(p_time_window, me.created_at::date) AS date_window,
    p_time_window::text AS window_type,
    AVG(me.sentiment_score) AS avg_sentiment,
    STDDEV(me.sentiment_score) AS sentiment_std_dev,
    MIN(me.sentiment_score) AS min_sentiment,
    MAX(me.sentiment_score) AS max_sentiment,
    COUNT(*)::integer AS message_count,
    COUNT(*) FILTER (WHERE me.direction = 'incoming')::integer AS incoming_count,
    COUNT(*) FILTER (WHERE me.direction = 'outgoing')::integer AS outgoing_count,
    -- Determine trend based on slope
    CASE
      WHEN regr_slope(me.sentiment_score::numeric, EXTRACT(EPOCH FROM me.created_at)::numeric) > 0.1 THEN 'improving'
      WHEN regr_slope(me.sentiment_score::numeric, EXTRACT(EPOCH FROM me.created_at)::numeric) < -0.1 THEN 'declining'
      WHEN STDDEV(me.sentiment_score) > 0.5 THEN 'volatile'
      ELSE 'stable'
    END AS emotional_trend,
    regr_slope(me.sentiment_score::numeric, EXTRACT(EPOCH FROM me.created_at)::numeric)::decimal(4,3) AS trend_score,
    -- Extract top topics (array aggregate of most frequent)
    ARRAY(
      SELECT DISTINCT unnest(me.detected_topics)
      FROM message_embeddings me2
      WHERE me2.user_id = me.user_id
        AND me2.contact_hash = me.contact_hash
        AND DATE_TRUNC(p_time_window, me2.created_at::date) = DATE_TRUNC(p_time_window, me.created_at::date)
      ORDER BY unnest(me.detected_topics)
      LIMIT 5
    ) AS top_topics
  FROM message_embeddings me
  WHERE (p_user_id IS NULL OR me.user_id = p_user_id)
    AND me.created_at >= (CURRENT_DATE - interval_interval * 2)  -- Last 2 windows
  GROUP BY
    me.user_id,
    me.contact_hash,
    DATE_TRUNC(p_time_window, me.created_at::date)
  ON CONFLICT (user_id, contact_hash, date_window, window_type) DO UPDATE SET
    avg_sentiment = EXCLUDED.avg_sentiment,
    sentiment_std_dev = EXCLUDED.sentiment_std_dev,
    min_sentiment = EXCLUDED.min_sentiment,
    max_sentiment = EXCLUDED.max_sentiment,
    message_count = EXCLUDED.message_count,
    incoming_count = EXCLUDED.incoming_count,
    outgoing_count = EXCLUDED.outgoing_count,
    emotional_trend = EXCLUDED.emotional_trend,
    trend_score = EXCLUDED.trend_score,
    top_topics = EXCLUDED.top_topics,
    updated_at = now();

  GET DIAGNOSTICS processed_count = ROW_COUNT;
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_sentiment_aggregates IS 'Computes time-windowed sentiment aggregates from message embeddings';

-- ============================================================================
-- FUNCTION: Detect Sentiment Anomalies
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_sentiment_anomalies()
RETURNS INTEGER AS $$
DECLARE
  anomaly_count INTEGER := 0;
BEGIN
  -- Mark anomalies based on statistical thresholds
  UPDATE whatsapp_sentiment_aggregates
  SET
    is_anomaly = true,
    anomaly_type = CASE
      WHEN avg_sentiment > 0.7 AND (avg_sentiment - LAG(avg_sentiment) OVER w) > 0.5 THEN 'spike_positive'
      WHEN avg_sentiment < -0.7 AND (avg_sentiment - LAG(avg_sentiment) OVER w) < -0.5 THEN 'spike_negative'
      WHEN message_count > (AVG(message_count) OVER w * 2) THEN 'volume_surge'
      ELSE NULL
    END,
    anomaly_score = ABS(avg_sentiment - AVG(avg_sentiment) OVER w),
    updated_at = now()
  FROM (
    SELECT *
    FROM whatsapp_sentiment_aggregates
    WINDOW w AS (PARTITION BY user_id, contact_hash ORDER BY date_window ROWS BETWEEN 7 PRECEDING AND CURRENT ROW)
  ) subq
  WHERE whatsapp_sentiment_aggregates.id = subq.id
    AND subq.anomaly_type IS NOT NULL;

  GET DIAGNOSTICS anomaly_count = ROW_COUNT;
  RETURN anomaly_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_sentiment_anomalies IS 'Detects anomalies in sentiment trends using statistical methods';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sentiment_aggregates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sentiment_aggregates_updated_at ON whatsapp_sentiment_aggregates;
CREATE TRIGGER trigger_sentiment_aggregates_updated_at
  BEFORE UPDATE ON whatsapp_sentiment_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_sentiment_aggregates_updated_at();

-- ============================================================================
-- CRON JOB: Daily Sentiment Aggregation
-- ============================================================================

-- Schedule daily aggregation at 2 AM
SELECT cron.schedule(
  'whatsapp-daily-sentiment-aggregation',
  '0 2 * * *',  -- 2 AM daily
  $$
  SELECT compute_sentiment_aggregates('day');
  SELECT compute_sentiment_aggregates('week');
  SELECT compute_sentiment_aggregates('month');
  SELECT detect_sentiment_anomalies();
  $$
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_sentiment_aggregates IS 'Privacy-first sentiment analytics - stores ONLY aggregates, NEVER raw messages';
COMMENT ON COLUMN whatsapp_sentiment_aggregates.contact_hash IS 'SHA256 hash of contact phone - preserves privacy';
COMMENT ON COLUMN whatsapp_sentiment_aggregates.emotional_trend IS 'Trend indicator: improving, declining, stable, or volatile';
COMMENT ON COLUMN whatsapp_sentiment_aggregates.is_anomaly IS 'Flagged if sentiment shows unusual pattern';
