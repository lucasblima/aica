-- ============================================================================
-- Journey Psychometric Well-Being Scoring — Sprint 3
-- Issue #575: Scientific foundations for AICA Life OS
--
-- Tables: assessment_responses, ema_checkins, wellbeing_scores
-- Seeds 6 models in scientific_model_registry
-- RPCs for assessment CRUD
-- ============================================================================

-- ============================================================================
-- 1. ASSESSMENT RESPONSES
-- Stores completed psychometric instrument administrations and their scores.
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL CHECK (instrument IN (
    'perma_profiler', 'swls', 'panas', 'maas', 'affect_grid', 'incharge'
  )),
  version TEXT NOT NULL DEFAULT '1.0',
  responses JSONB NOT NULL,
  subscale_scores JSONB,
  composite_score REAL,
  context TEXT NOT NULL DEFAULT 'on_demand' CHECK (context IN (
    'on_demand', 'weekly_review', 'onboarding'
  )),
  administered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE assessment_responses IS 'Completed psychometric instrument administrations with raw responses and computed scores.';
COMMENT ON COLUMN assessment_responses.instrument IS 'Instrument ID: perma_profiler, swls, panas, maas, affect_grid, incharge';
COMMENT ON COLUMN assessment_responses.responses IS 'Raw user responses keyed by item code';
COMMENT ON COLUMN assessment_responses.subscale_scores IS 'Computed subscale scores (e.g., PERMA P/E/R/M/A)';
COMMENT ON COLUMN assessment_responses.composite_score IS 'Overall composite score for the instrument';

CREATE INDEX IF NOT EXISTS idx_ar_user_id ON assessment_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_instrument ON assessment_responses(instrument);
CREATE INDEX IF NOT EXISTS idx_ar_user_instrument ON assessment_responses(user_id, instrument, administered_at DESC);

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assessment responses"
  ON assessment_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. EMA CHECK-INS
-- Experience Sampling Method: 3x daily micro check-ins
-- ============================================================================

CREATE TABLE IF NOT EXISTS ema_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL CHECK (checkin_type IN (
    'morning_intention', 'midday_energy', 'evening_reflection'
  )),
  valence INTEGER CHECK (valence >= 1 AND valence <= 9),
  arousal INTEGER CHECK (arousal >= 1 AND arousal <= 9),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 10),
  gratitude_items TEXT[],
  intention TEXT,
  reflection TEXT,
  panas_positive INTEGER CHECK (panas_positive >= 10 AND panas_positive <= 50),
  panas_negative INTEGER CHECK (panas_negative >= 10 AND panas_negative <= 50),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ema_checkins IS 'Experience Sampling Method: 3x daily micro check-ins (morning/midday/evening).';
COMMENT ON COLUMN ema_checkins.valence IS 'Affect Grid X-axis: 1=unpleasant, 9=pleasant';
COMMENT ON COLUMN ema_checkins.arousal IS 'Affect Grid Y-axis: 1=low arousal, 9=high arousal';

CREATE INDEX IF NOT EXISTS idx_ema_user_id ON ema_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_ema_type ON ema_checkins(checkin_type);
CREATE INDEX IF NOT EXISTS idx_ema_user_date ON ema_checkins(user_id, checked_in_at DESC);

ALTER TABLE ema_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own EMA checkins"
  ON ema_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. WELLBEING SCORES
-- Computed wellbeing dimension scores from assessments and EMA data.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wellbeing_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  score REAL NOT NULL CHECK (score >= 0),
  raw_score REAL,
  methodology TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE wellbeing_scores IS 'Computed wellbeing dimension scores derived from assessments and EMA data.';
COMMENT ON COLUMN wellbeing_scores.dimension IS 'Wellbeing dimension: positive_emotion, engagement, relationships, meaning, accomplishment, life_satisfaction, mindfulness, financial_wellbeing, affect_balance';
COMMENT ON COLUMN wellbeing_scores.methodology IS 'Reference to scoring methodology used';

CREATE INDEX IF NOT EXISTS idx_ws_user_id ON wellbeing_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_dimension ON wellbeing_scores(dimension);
CREATE INDEX IF NOT EXISTS idx_ws_user_dimension ON wellbeing_scores(user_id, dimension, computed_at DESC);

ALTER TABLE wellbeing_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wellbeing scores"
  ON wellbeing_scores FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. SEED: Journey Psychometric Models in scientific_model_registry
-- ============================================================================

INSERT INTO scientific_model_registry (id, name, module, category, methodology_reference, formula_description, is_contested, contested_note) VALUES
  ('panas', 'PANAS (Positive and Negative Affect Schedule)', 'journey', 'assessment',
    'Watson, Clark & Tellegen (1988). PANAS. PT-BR: Carvalho et al. (2013), alpha=0.88.',
    '20 items, 1-5 scale. PA = sum of 10 positive items (10-50). NA = sum of 10 negative items (10-50).',
    false, NULL),
  ('maas', 'Mindful Attention Awareness Scale', 'journey', 'assessment',
    'Brown & Ryan (2003). MAAS. PT-BR: Barros et al. (2015), alpha=0.83.',
    '15 items, 1-6 scale. Mean of all items (higher = more mindful). Items are reverse-scored.',
    false, NULL),
  ('affect_grid', 'Affect Grid', 'journey', 'assessment',
    'Russell, Weiss & Mendelsohn (1989). The Affect Grid.',
    'Single-item 9x9 grid. X-axis = valence (unpleasant-pleasant). Y-axis = arousal (sleepy-alert).',
    false, NULL),
  ('incharge_financial_wellbeing', 'InCharge Financial Distress/Financial Well-Being Scale', 'journey', 'assessment',
    'Prawitz et al. (2006). InCharge FDW Scale. PT-BR: Ponchio et al. (2019).',
    '8 items, 1-10 scale. Mean score: 1 = overwhelming distress, 10 = no distress.',
    false, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. RPCs
-- ============================================================================

-- Submit an assessment response
CREATE OR REPLACE FUNCTION submit_assessment_response(
  p_instrument TEXT,
  p_version TEXT DEFAULT '1.0',
  p_responses JSONB DEFAULT '{}',
  p_subscale_scores JSONB DEFAULT NULL,
  p_composite_score REAL DEFAULT NULL,
  p_context TEXT DEFAULT 'on_demand'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO assessment_responses (
    user_id, instrument, version, responses,
    subscale_scores, composite_score, context
  ) VALUES (
    auth.uid(), p_instrument, p_version, p_responses,
    p_subscale_scores, p_composite_score, p_context
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_assessment_response TO authenticated;

-- Get latest assessment for each instrument
CREATE OR REPLACE FUNCTION get_latest_assessments()
RETURNS TABLE (
  id UUID,
  instrument TEXT,
  version TEXT,
  subscale_scores JSONB,
  composite_score REAL,
  context TEXT,
  administered_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (instrument)
    id, instrument, version, subscale_scores,
    composite_score, context, administered_at
  FROM assessment_responses
  WHERE user_id = auth.uid()
  ORDER BY instrument, administered_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_latest_assessments TO authenticated;

-- Get assessment history for a specific instrument
CREATE OR REPLACE FUNCTION get_assessment_history(
  p_instrument TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  instrument TEXT,
  version TEXT,
  responses JSONB,
  subscale_scores JSONB,
  composite_score REAL,
  context TEXT,
  administered_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, instrument, version, responses, subscale_scores,
         composite_score, context, administered_at
  FROM assessment_responses
  WHERE user_id = auth.uid()
    AND instrument = p_instrument
  ORDER BY administered_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_assessment_history TO authenticated;

-- Submit EMA check-in
CREATE OR REPLACE FUNCTION submit_ema_checkin(
  p_checkin_type TEXT,
  p_valence INTEGER DEFAULT NULL,
  p_arousal INTEGER DEFAULT NULL,
  p_energy_level INTEGER DEFAULT NULL,
  p_focus_level INTEGER DEFAULT NULL,
  p_gratitude_items TEXT[] DEFAULT NULL,
  p_intention TEXT DEFAULT NULL,
  p_reflection TEXT DEFAULT NULL,
  p_panas_positive INTEGER DEFAULT NULL,
  p_panas_negative INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ema_checkins (
    user_id, checkin_type, valence, arousal,
    energy_level, focus_level, gratitude_items,
    intention, reflection, panas_positive, panas_negative
  ) VALUES (
    auth.uid(), p_checkin_type, p_valence, p_arousal,
    p_energy_level, p_focus_level, p_gratitude_items,
    p_intention, p_reflection, p_panas_positive, p_panas_negative
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_ema_checkin TO authenticated;

-- Get today's EMA check-ins
CREATE OR REPLACE FUNCTION get_todays_ema_checkins()
RETURNS TABLE (
  id UUID,
  checkin_type TEXT,
  valence INTEGER,
  arousal INTEGER,
  energy_level INTEGER,
  focus_level INTEGER,
  gratitude_items TEXT[],
  intention TEXT,
  reflection TEXT,
  panas_positive INTEGER,
  panas_negative INTEGER,
  checked_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, checkin_type, valence, arousal,
         energy_level, focus_level, gratitude_items,
         intention, reflection, panas_positive, panas_negative,
         checked_in_at
  FROM ema_checkins
  WHERE user_id = auth.uid()
    AND checked_in_at >= CURRENT_DATE
  ORDER BY checked_in_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_todays_ema_checkins TO authenticated;

-- Get recent wellbeing scores
CREATE OR REPLACE FUNCTION get_wellbeing_scores(
  p_dimension TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  dimension TEXT,
  score REAL,
  raw_score REAL,
  methodology TEXT,
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, dimension, score, raw_score, methodology, computed_at
  FROM wellbeing_scores
  WHERE user_id = auth.uid()
    AND (p_dimension IS NULL OR dimension = p_dimension)
  ORDER BY computed_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_wellbeing_scores TO authenticated;
