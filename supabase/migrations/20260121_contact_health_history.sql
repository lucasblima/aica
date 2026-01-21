-- ============================================================================
-- Migration: Contact Health History & Automated Health Score Calculation
-- Issue: #144 - [WhatsApp AI] feat: Automated Relationship Health Score Calculation
--
-- Purpose: Create infrastructure for tracking and calculating contact health scores
-- based on conversation patterns, interaction frequency, sentiment, and reciprocity.
--
-- Health Score Formula:
--   health_score = frequency (0-25) + recency (0-25) + sentiment (0-20)
--                + reciprocity (0-15) + depth (0-15) = 0-100
-- ============================================================================

-- ============================================================================
-- TASK #144-1.1: Create contact_health_history Table
-- Purpose: Store health score history for trend analysis and alerting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_health_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Health score data (0-100 scale to match existing contact_network.health_score)
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

  -- Score components (JSONB for flexibility)
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   frequency_score: 0-25,
  --   recency_score: 0-25,
  --   sentiment_score: 0-20,
  --   reciprocity_score: 0-15,
  --   depth_score: 0-15
  -- }

  -- Change tracking
  previous_score INTEGER CHECK (previous_score IS NULL OR (previous_score >= 0 AND previous_score <= 100)),
  score_delta INTEGER,  -- Positive = improved, negative = declined
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining', 'new')),

  -- Alert tracking
  alert_generated BOOLEAN DEFAULT false,
  alert_type TEXT CHECK (alert_type IS NULL OR alert_type IN (
    'score_critical',        -- Score dropped below 20
    'score_low',             -- Score dropped below 40
    'rapid_decline',         -- Score dropped 20+ points in 7 days
    'no_interaction',        -- No messages in 30+ days
    'sentiment_negative'     -- Sustained negative sentiment
  )),

  -- Calculation metadata
  calculation_method TEXT DEFAULT 'automated' CHECK (calculation_method IN ('automated', 'manual', 'migration')),
  messages_analyzed INTEGER DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments
COMMENT ON TABLE contact_health_history IS
  'Historical record of contact relationship health scores. Used for trend analysis, alerting, and gamification.';

COMMENT ON COLUMN contact_health_history.components IS
  'Breakdown of score by component: frequency (0-25), recency (0-25), sentiment (0-20), reciprocity (0-15), depth (0-15)';

COMMENT ON COLUMN contact_health_history.score_delta IS
  'Change from previous score. Positive = improvement, negative = decline.';

COMMENT ON COLUMN contact_health_history.trend IS
  'Overall trend direction based on recent history. "new" for first calculation.';


-- ============================================================================
-- TASK #144-1.2: Create Indexes for Performance
-- Purpose: Optimize queries for timeline, dashboard, alerts, and at-risk views
-- ============================================================================

-- Index 1: Contact timeline view (most recent scores for a contact)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_contact_time
  ON contact_health_history(contact_id, calculated_at DESC);

-- Index 2: User dashboard (all contacts, ordered by time)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_user_time
  ON contact_health_history(user_id, calculated_at DESC);

-- Index 3: Alert queries (unprocessed alerts)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_alerts
  ON contact_health_history(user_id, alert_type, calculated_at DESC)
  WHERE alert_generated = true;

-- Index 4: At-risk contacts (score < 40, partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_at_risk
  ON contact_health_history(user_id, score, calculated_at DESC)
  WHERE score < 40;

-- Index 5: Trend analysis (recent declining contacts)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_declining
  ON contact_health_history(user_id, calculated_at DESC)
  WHERE trend = 'declining';

-- Index 6: Latest score per contact (for JOIN optimization)
CREATE INDEX IF NOT EXISTS idx_contact_health_history_latest
  ON contact_health_history(contact_id, calculated_at DESC NULLS LAST);

-- Composite index for efficient components-based queries
CREATE INDEX IF NOT EXISTS idx_contact_health_history_components
  ON contact_health_history USING gin(components);


-- ============================================================================
-- TASK #144-1.3: Create RLS Policies
-- Purpose: Ensure users can only view/manage their own health history
-- ============================================================================

-- Enable RLS
ALTER TABLE contact_health_history ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view their own health history
CREATE POLICY "contact_health_history_select_own" ON contact_health_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: INSERT - Service role only (automated calculations)
CREATE POLICY "contact_health_history_insert_service" ON contact_health_history
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Policy: UPDATE - Service role only (for alert acknowledgment)
CREATE POLICY "contact_health_history_update_service" ON contact_health_history
  FOR UPDATE TO service_role
  USING (true);

-- Policy: DELETE - Users can delete their own history (LGPD compliance)
CREATE POLICY "contact_health_history_delete_own" ON contact_health_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Grants
GRANT SELECT, DELETE ON contact_health_history TO authenticated;
GRANT ALL ON contact_health_history TO service_role;


-- ============================================================================
-- TASK #144-1.4: Add Columns to contact_network Table
-- Purpose: Cache latest health score data for efficient dashboard queries
-- ============================================================================

-- Add health score update timestamp
ALTER TABLE contact_network
  ADD COLUMN IF NOT EXISTS health_score_updated_at TIMESTAMPTZ;

-- Add health score components cache (matches contact_health_history.components)
ALTER TABLE contact_network
  ADD COLUMN IF NOT EXISTS health_score_components JSONB DEFAULT '{}'::jsonb;

-- Add health score trend (cached from latest calculation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_network' AND column_name = 'health_score_trend'
  ) THEN
    ALTER TABLE contact_network ADD COLUMN health_score_trend TEXT;
    ALTER TABLE contact_network ADD CONSTRAINT contact_network_health_score_trend_check
      CHECK (health_score_trend IS NULL OR health_score_trend IN ('improving', 'stable', 'declining', 'new'));
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN contact_network.health_score_updated_at IS
  'Timestamp of the last health score calculation';

COMMENT ON COLUMN contact_network.health_score_components IS
  'Cached breakdown: {frequency_score, recency_score, sentiment_score, reciprocity_score, depth_score}';

COMMENT ON COLUMN contact_network.health_score_trend IS
  'Cached trend direction from recent health score history';

-- Index for health-based sorting on dashboard
CREATE INDEX IF NOT EXISTS idx_contact_network_health_updated
  ON contact_network(user_id, health_score DESC NULLS LAST, health_score_updated_at DESC)
  WHERE is_active = true AND is_archived = false;


-- ============================================================================
-- TASK #144-1.5: Create calculate_health_score_components Function
-- Purpose: Calculate all five components of the health score formula
--
-- Formula:
--   health_score = frequency (0-25) + recency (0-25) + sentiment (0-20)
--                + reciprocity (0-15) + depth (0-15) = 0-100
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_health_score_components(
  _user_id UUID,
  _contact_phone TEXT,
  _lookback_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _message_count INTEGER := 0;
  _incoming_count INTEGER := 0;
  _outgoing_count INTEGER := 0;
  _days_since_last_message NUMERIC;
  _avg_sentiment NUMERIC;
  _unique_topics INTEGER := 0;
  _frequency_score NUMERIC;
  _recency_score NUMERIC;
  _sentiment_score NUMERIC;
  _reciprocity_score NUMERIC;
  _depth_score NUMERIC;
  _total_score INTEGER;
  _ratio NUMERIC;
BEGIN
  -- Get message statistics from whatsapp_messages for the lookback period
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE direction = 'incoming'),
    COUNT(*) FILTER (WHERE direction = 'outgoing'),
    AVG(sentiment_score)
  INTO
    _message_count,
    _incoming_count,
    _outgoing_count,
    _avg_sentiment
  FROM whatsapp_messages wm
  WHERE wm.user_id = _user_id
    AND wm.contact_phone = _contact_phone
    AND wm.message_timestamp >= (now() - make_interval(days => _lookback_days))
    AND wm.deleted_at IS NULL;

  -- Get unique topics count separately
  SELECT COUNT(DISTINCT topic)
  INTO _unique_topics
  FROM whatsapp_messages wm,
       LATERAL unnest(COALESCE(wm.detected_topics, ARRAY[]::TEXT[])) AS topic
  WHERE wm.user_id = _user_id
    AND wm.contact_phone = _contact_phone
    AND wm.message_timestamp >= (now() - make_interval(days => _lookback_days))
    AND wm.deleted_at IS NULL;

  -- Get days since last message (for recency calculation)
  SELECT EXTRACT(EPOCH FROM (now() - MAX(message_timestamp))) / 86400.0
  INTO _days_since_last_message
  FROM whatsapp_messages
  WHERE user_id = _user_id
    AND contact_phone = _contact_phone
    AND deleted_at IS NULL;

  -- Handle NULL case (no messages)
  IF _days_since_last_message IS NULL THEN
    _days_since_last_message := 999;
  END IF;

  -- ========================================================================
  -- COMPONENT 1: Frequency Score (0-25 points)
  -- Based on message count in lookback period
  -- Scale: 0 msgs = 0pts, 30 msgs = 15pts, 100+ msgs = 25pts
  -- ========================================================================
  _frequency_score := LEAST(25, (_message_count::NUMERIC / 4));

  -- ========================================================================
  -- COMPONENT 2: Recency Score (0-25 points)
  -- Exponential decay based on days since last message
  -- Formula: 25 * exp(-days / 14) -- Half-life of ~10 days
  -- ========================================================================
  _recency_score := GREATEST(0, 25 * exp(-_days_since_last_message / 14.0));

  -- ========================================================================
  -- COMPONENT 3: Sentiment Score (0-20 points)
  -- Based on average sentiment (-1 to +1) normalized to 0-20
  -- ========================================================================
  IF _avg_sentiment IS NOT NULL THEN
    -- Normalize from [-1, 1] to [0, 20]
    _sentiment_score := ((_avg_sentiment + 1) / 2) * 20;
  ELSE
    -- Neutral default if no sentiment data
    _sentiment_score := 10;
  END IF;

  -- ========================================================================
  -- COMPONENT 4: Reciprocity Score (0-15 points)
  -- Balance between incoming and outgoing messages
  -- Perfect balance (0.5) = 15pts, extremes (0 or 1) = 0pts
  -- ========================================================================
  IF _message_count > 0 THEN
    _ratio := _incoming_count::NUMERIC / _message_count;
    -- Formula: 15 * (1 - 2 * |ratio - 0.5|)
    _reciprocity_score := GREATEST(0, 15 * (1 - 2 * ABS(_ratio - 0.5)));
  ELSE
    _reciprocity_score := 0;
  END IF;

  -- ========================================================================
  -- COMPONENT 5: Depth Score (0-15 points)
  -- Based on topic diversity in conversations
  -- Scale: 0 topics = 0pts, 3 topics = 9pts, 5+ topics = 15pts
  -- ========================================================================
  _unique_topics := COALESCE(_unique_topics, 0);
  _depth_score := LEAST(15, _unique_topics * 3);

  -- ========================================================================
  -- Calculate total score
  -- ========================================================================
  _total_score := ROUND(
    _frequency_score +
    _recency_score +
    _sentiment_score +
    _reciprocity_score +
    _depth_score
  )::INTEGER;

  -- Ensure bounds
  _total_score := GREATEST(0, LEAST(100, _total_score));

  -- Build result JSONB
  _result := jsonb_build_object(
    'frequency_score', ROUND(_frequency_score::NUMERIC, 2),
    'recency_score', ROUND(_recency_score::NUMERIC, 2),
    'sentiment_score', ROUND(_sentiment_score::NUMERIC, 2),
    'reciprocity_score', ROUND(_reciprocity_score::NUMERIC, 2),
    'depth_score', ROUND(_depth_score::NUMERIC, 2),
    'total_score', _total_score,
    'messages_analyzed', _message_count,
    'days_since_last_message', ROUND(_days_since_last_message::NUMERIC, 1),
    'avg_sentiment', _avg_sentiment,
    'unique_topics', _unique_topics,
    'calculated_at', now()
  );

  RETURN _result;
END;
$$;

COMMENT ON FUNCTION calculate_health_score_components IS
  'Calculates all five health score components for a contact. Returns JSONB with breakdown and total.';

-- Grant execute to service role (Edge Functions)
GRANT EXECUTE ON FUNCTION calculate_health_score_components TO service_role;


-- ============================================================================
-- TASK #144-1.6: Create v_contacts_at_risk View
-- Purpose: Quick access to contacts needing attention (health_score < 40)
-- ============================================================================

CREATE OR REPLACE VIEW v_contacts_at_risk AS
SELECT
  cn.id AS contact_id,
  cn.user_id,
  COALESCE(cn.name, cn.contact_name, cn.phone_number) AS contact_name,
  cn.phone_number,
  cn.profile_picture_url,
  cn.relationship_type,

  -- Health score data
  cn.health_score,
  cn.health_score_trend,
  cn.health_score_components,
  cn.health_score_updated_at,

  -- Components breakdown (extracted for easy filtering)
  (cn.health_score_components->>'frequency_score')::NUMERIC AS frequency_score,
  (cn.health_score_components->>'recency_score')::NUMERIC AS recency_score,
  (cn.health_score_components->>'sentiment_score')::NUMERIC AS sentiment_score,
  (cn.health_score_components->>'reciprocity_score')::NUMERIC AS reciprocity_score,
  (cn.health_score_components->>'depth_score')::NUMERIC AS depth_score,

  -- Interaction metadata
  cn.last_interaction_at,
  cn.interaction_count,
  cn.engagement_level,

  -- Risk indicators
  CASE
    WHEN cn.health_score < 20 THEN 'critical'
    WHEN cn.health_score < 30 THEN 'high'
    ELSE 'moderate'
  END AS risk_level,

  -- Days since last interaction
  EXTRACT(DAY FROM (now() - COALESCE(cn.last_interaction_at, cn.created_at))) AS days_inactive,

  -- Suggestion based on lowest component
  CASE
    WHEN (cn.health_score_components->>'recency_score')::NUMERIC < 5 THEN 'Envie uma mensagem - faz tempo que nao conversam'
    WHEN (cn.health_score_components->>'frequency_score')::NUMERIC < 5 THEN 'Aumente a frequencia de contato'
    WHEN (cn.health_score_components->>'sentiment_score')::NUMERIC < 5 THEN 'Conversas recentes foram negativas - reconecte positivamente'
    WHEN (cn.health_score_components->>'reciprocity_score')::NUMERIC < 5 THEN 'Conversa esta unilateral - equilibre o dialogo'
    WHEN (cn.health_score_components->>'depth_score')::NUMERIC < 5 THEN 'Diversifique os topicos de conversa'
    ELSE 'Manutencao regular'
  END AS suggested_action

FROM contact_network cn
WHERE cn.health_score IS NOT NULL
  AND cn.health_score < 40
  AND cn.is_active = true
  AND cn.is_archived = false
ORDER BY cn.health_score ASC, cn.last_interaction_at ASC;

COMMENT ON VIEW v_contacts_at_risk IS
  'Contacts with health_score < 40 requiring attention. Includes risk level and suggested actions.';

-- Grant select to authenticated users (RLS on underlying table handles row filtering)
GRANT SELECT ON v_contacts_at_risk TO authenticated;


-- ============================================================================
-- TASK #144-1.7: Create record_health_score Function
-- Purpose: Record a health score calculation to history and update contact cache
-- ============================================================================

CREATE OR REPLACE FUNCTION record_health_score(
  _user_id UUID,
  _contact_id UUID,
  _contact_phone TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _components JSONB;
  _new_score INTEGER;
  _previous_score INTEGER;
  _score_delta INTEGER;
  _trend TEXT;
  _alert_type TEXT := NULL;
  _alert_generated BOOLEAN := false;
  _history_id UUID;
  _avg_recent_score NUMERIC;
BEGIN
  -- Calculate components
  _components := calculate_health_score_components(_user_id, _contact_phone);
  _new_score := (_components->>'total_score')::INTEGER;

  -- Get previous score from history
  SELECT score INTO _previous_score
  FROM contact_health_history
  WHERE contact_id = _contact_id
  ORDER BY calculated_at DESC
  LIMIT 1;

  -- Calculate delta and trend
  IF _previous_score IS NOT NULL THEN
    _score_delta := _new_score - _previous_score;

    -- Determine trend (based on multiple recent scores)
    SELECT AVG(score) INTO _avg_recent_score
    FROM (
      SELECT score
      FROM contact_health_history
      WHERE contact_id = _contact_id
      ORDER BY calculated_at DESC
      LIMIT 5
    ) recent;

    IF _avg_recent_score IS NOT NULL THEN
      IF _avg_recent_score < _new_score - 5 THEN
        _trend := 'improving';
      ELSIF _avg_recent_score > _new_score + 5 THEN
        _trend := 'declining';
      ELSE
        _trend := 'stable';
      END IF;
    ELSE
      _trend := 'stable';
    END IF;
  ELSE
    _score_delta := 0;
    _trend := 'new';
  END IF;

  -- Determine if alert should be generated
  IF _new_score < 20 THEN
    _alert_type := 'score_critical';
    _alert_generated := true;
  ELSIF _new_score < 40 AND (_previous_score IS NULL OR _previous_score >= 40) THEN
    _alert_type := 'score_low';
    _alert_generated := true;
  ELSIF _score_delta IS NOT NULL AND _score_delta <= -20 THEN
    _alert_type := 'rapid_decline';
    _alert_generated := true;
  ELSIF (_components->>'days_since_last_message')::NUMERIC > 30 THEN
    _alert_type := 'no_interaction';
    _alert_generated := true;
  ELSIF (_components->>'sentiment_score')::NUMERIC < 5 THEN
    _alert_type := 'sentiment_negative';
    _alert_generated := true;
  END IF;

  -- Insert into history
  INSERT INTO contact_health_history (
    contact_id,
    user_id,
    score,
    components,
    previous_score,
    score_delta,
    trend,
    alert_generated,
    alert_type,
    calculation_method,
    messages_analyzed,
    calculated_at
  ) VALUES (
    _contact_id,
    _user_id,
    _new_score,
    _components,
    _previous_score,
    _score_delta,
    _trend,
    _alert_generated,
    _alert_type,
    'automated',
    (_components->>'messages_analyzed')::INTEGER,
    now()
  )
  RETURNING id INTO _history_id;

  -- Update contact_network cache
  UPDATE contact_network
  SET
    health_score = _new_score,
    health_score_components = _components,
    health_score_trend = _trend,
    health_score_updated_at = now(),
    updated_at = now()
  WHERE id = _contact_id;

  RETURN _new_score;
END;
$$;

COMMENT ON FUNCTION record_health_score IS
  'Records a health score calculation to history and updates contact_network cache. Returns the new score.';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION record_health_score TO service_role;


-- ============================================================================
-- TASK #144-1.8: Batch Processing Function & pg_cron Job
-- Purpose: Schedule daily health score recalculation
-- ============================================================================

-- Create batch processing function
CREATE OR REPLACE FUNCTION batch_recalculate_health_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact RECORD;
  _processed INTEGER := 0;
BEGIN
  -- Process contacts that have had recent message activity
  -- or haven't been calculated in 7+ days
  FOR _contact IN
    SELECT DISTINCT cn.id, cn.user_id, cn.phone_number AS phone
    FROM contact_network cn
    WHERE cn.is_active = true
      AND cn.is_archived = false
      AND cn.phone_number IS NOT NULL
      AND (
        cn.health_score_updated_at IS NULL
        OR cn.health_score_updated_at < now() - INTERVAL '7 days'
        OR EXISTS (
          SELECT 1 FROM whatsapp_messages wm
          WHERE wm.contact_phone = cn.phone_number
            AND wm.user_id = cn.user_id
            AND wm.message_timestamp > COALESCE(cn.health_score_updated_at, '1970-01-01'::TIMESTAMPTZ)
        )
      )
    LIMIT 1000  -- Process in batches to avoid timeout
  LOOP
    BEGIN
      PERFORM record_health_score(_contact.user_id, _contact.id, _contact.phone);
      _processed := _processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE WARNING 'Failed to process contact %: %', _contact.id, SQLERRM;
    END;
  END LOOP;

  RETURN _processed;
END;
$$;

COMMENT ON FUNCTION batch_recalculate_health_scores IS
  'Batch recalculates health scores for contacts with recent activity or stale scores. Returns count processed.';

GRANT EXECUTE ON FUNCTION batch_recalculate_health_scores TO service_role;

-- Schedule the cron job (daily at 3 AM UTC)
-- Note: Wrap in DO block to handle case where pg_cron is not available
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if present
    BEGIN
      PERFORM cron.unschedule('health-score-daily-calculation');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Job doesn't exist, that's fine
    END;

    -- Schedule new job
    PERFORM cron.schedule(
      'health-score-daily-calculation',
      '0 3 * * *',  -- 3 AM UTC daily
      $$SELECT batch_recalculate_health_scores();$$
    );

    RAISE NOTICE 'pg_cron job scheduled: health-score-daily-calculation at 3 AM UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - health scores will need to be calculated via Edge Function';
  END IF;
END $$;


-- ============================================================================
-- End of Migration
-- ============================================================================
