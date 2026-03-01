-- ============================================================================
-- Scientific Scoring Engine (SSE) -- Sprint 1: Core Infrastructure
-- Issue #575: Scientific foundations for AICA Life OS
--
-- Tables: scientific_model_registry, score_attribution_log,
--         life_scores, user_domain_weights
-- ============================================================================

-- ============================================================================
-- 1. SCIENTIFIC MODEL REGISTRY
-- Metadata + versioning for all 60+ scientific models used in AICA.
-- Public read (no RLS needed for public catalog), admin write via service_role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS scientific_model_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('scoring', 'assessment', 'detection', 'matching', 'planning')),
  methodology_reference TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  formula_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_contested BOOLEAN DEFAULT false,
  contested_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE scientific_model_registry IS 'Catalog of scientific models powering AICA scores. Public read, admin write.';
COMMENT ON COLUMN scientific_model_registry.is_contested IS 'True for models with mixed evidence (ego depletion, strict Maslow, etc.)';
COMMENT ON COLUMN scientific_model_registry.contested_note IS 'Transparency note about limitations of contested models';

CREATE INDEX IF NOT EXISTS idx_smr_module ON scientific_model_registry(module);
CREATE INDEX IF NOT EXISTS idx_smr_category ON scientific_model_registry(category);
CREATE INDEX IF NOT EXISTS idx_smr_active ON scientific_model_registry(is_active);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_scientific_model_registry_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scientific_model_registry_updated_at ON scientific_model_registry;
CREATE TRIGGER trg_scientific_model_registry_updated_at
  BEFORE UPDATE ON scientific_model_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_scientific_model_registry_updated_at();

-- Public read access (no user_id -- catalog is shared)
ALTER TABLE scientific_model_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read model registry" ON scientific_model_registry;
CREATE POLICY "Anyone can read model registry"
  ON scientific_model_registry FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 2. SCORE ATTRIBUTION LOG
-- Tracks what caused each score change (task completed, moment created, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_attribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES scientific_model_registry(id),
  previous_score REAL,
  new_score REAL,
  delta REAL,
  trigger_action TEXT NOT NULL,
  trigger_reference_id UUID,
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE score_attribution_log IS 'Audit trail: why did a score change? Links to the scientific model and triggering action.';

CREATE INDEX IF NOT EXISTS idx_sal_user_id ON score_attribution_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sal_model_id ON score_attribution_log(model_id);
CREATE INDEX IF NOT EXISTS idx_sal_computed_at ON score_attribution_log(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_user_model ON score_attribution_log(user_id, model_id);

ALTER TABLE score_attribution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own attribution logs" ON score_attribution_log;
CREATE POLICY "Users read own attribution logs"
  ON score_attribution_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own attribution logs" ON score_attribution_log;
CREATE POLICY "Users insert own attribution logs"
  ON score_attribution_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. LIFE SCORES
-- Composite Life Score history (weighted geometric mean across domains)
-- ============================================================================

CREATE TABLE IF NOT EXISTS life_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_scores JSONB NOT NULL,
  domain_weights JSONB NOT NULL,
  composite_score REAL NOT NULL CHECK (composite_score >= 0 AND composite_score <= 1),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  spiral_detected BOOLEAN DEFAULT false,
  spiral_domains TEXT[],
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE life_scores IS 'Composite Life Score snapshots. Weighted geometric mean (HDI-inspired) across all AICA domains.';
COMMENT ON COLUMN life_scores.composite_score IS 'Normalized 0-1, computed via weighted geometric mean';
COMMENT ON COLUMN life_scores.spiral_detected IS 'True when 3+ correlated domains are declining simultaneously';

CREATE INDEX IF NOT EXISTS idx_ls_user_id ON life_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_ls_computed_at ON life_scores(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ls_user_recent ON life_scores(user_id, computed_at DESC);

ALTER TABLE life_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own life scores" ON life_scores;
CREATE POLICY "Users read own life scores"
  ON life_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own life scores" ON life_scores;
CREATE POLICY "Users insert own life scores"
  ON life_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. USER DOMAIN WEIGHTS
-- User-customizable weights for Life Score domains (slider or AHP method)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_domain_weights (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{"atlas":1,"journey":1,"connections":1,"finance":1,"grants":1,"studio":1,"flux":1}',
  method TEXT NOT NULL DEFAULT 'equal' CHECK (method IN ('equal', 'slider', 'ahp')),
  ahp_comparisons JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE user_domain_weights IS 'User preferences for Life Score domain weighting. Supports equal, slider, or AHP (Saaty 1980) methods.';

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_user_domain_weights_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_domain_weights_updated_at ON user_domain_weights;
CREATE TRIGGER trg_user_domain_weights_updated_at
  BEFORE UPDATE ON user_domain_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_user_domain_weights_updated_at();

ALTER TABLE user_domain_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own domain weights" ON user_domain_weights;
CREATE POLICY "Users manage own domain weights"
  ON user_domain_weights FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. RPCs
-- ============================================================================

-- Get latest Life Score for current user
CREATE OR REPLACE FUNCTION get_latest_life_score()
RETURNS TABLE (
  id UUID,
  domain_scores JSONB,
  domain_weights JSONB,
  composite_score REAL,
  trend TEXT,
  spiral_detected BOOLEAN,
  spiral_domains TEXT[],
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, domain_scores, domain_weights, composite_score, trend,
         spiral_detected, spiral_domains, computed_at
  FROM life_scores
  WHERE user_id = auth.uid()
  ORDER BY computed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_latest_life_score TO authenticated;

-- Get Life Score history (last N entries)
CREATE OR REPLACE FUNCTION get_life_score_history(p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  composite_score REAL,
  domain_scores JSONB,
  trend TEXT,
  spiral_detected BOOLEAN,
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, composite_score, domain_scores, trend, spiral_detected, computed_at
  FROM life_scores
  WHERE user_id = auth.uid()
  ORDER BY computed_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_life_score_history TO authenticated;

-- Get user domain weights (or defaults)
CREATE OR REPLACE FUNCTION get_user_domain_weights()
RETURNS TABLE (
  weights JSONB,
  method TEXT,
  ahp_comparisons JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT weights, method, ahp_comparisons, updated_at
  FROM user_domain_weights
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_domain_weights TO authenticated;

-- Upsert user domain weights
CREATE OR REPLACE FUNCTION upsert_user_domain_weights(
  p_weights JSONB,
  p_method TEXT DEFAULT 'slider',
  p_ahp_comparisons JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_domain_weights (user_id, weights, method, ahp_comparisons)
  VALUES (auth.uid(), p_weights, p_method, p_ahp_comparisons)
  ON CONFLICT (user_id) DO UPDATE SET
    weights = EXCLUDED.weights,
    method = EXCLUDED.method,
    ahp_comparisons = EXCLUDED.ahp_comparisons;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_user_domain_weights TO authenticated;

-- Get recent attribution log entries
CREATE OR REPLACE FUNCTION get_score_attributions(
  p_model_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  model_id TEXT,
  previous_score REAL,
  new_score REAL,
  delta REAL,
  trigger_action TEXT,
  trigger_reference_id UUID,
  metadata JSONB,
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, model_id, previous_score, new_score, delta,
         trigger_action, trigger_reference_id, metadata, computed_at
  FROM score_attribution_log
  WHERE user_id = auth.uid()
    AND (p_model_id IS NULL OR model_id = p_model_id)
  ORDER BY computed_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_score_attributions TO authenticated;

-- ============================================================================
-- 6. SEED: Scientific Model Registry
-- Initial catalog of cross-module models for Sprint 1
-- ============================================================================

INSERT INTO scientific_model_registry (id, name, module, category, methodology_reference, formula_description, is_contested, contested_note) VALUES
  -- Cross-module (Sprint 1 core)
  ('life_score', 'Life Score (Composite)', 'cross', 'scoring',
    'HDI geometric mean (UNDP); GNH sufficiency threshold (Ura et al., 2012)',
    'Weighted geometric mean of normalized domain scores (0-1). Weights via slider or AHP (Saaty, 1980).',
    false, NULL),
  ('spiral_detection', 'Negative Spiral Detection', 'cross', 'detection',
    'Cross-domain correlation analysis; clinical comorbidity patterns',
    'Alert when 3+ correlated domains decline simultaneously over 14-day window.',
    false, NULL),
  ('domain_weight_ahp', 'AHP Domain Weighting', 'cross', 'scoring',
    'Saaty (1980). The Analytic Hierarchy Process. McGraw-Hill.',
    'Pairwise comparison matrix -> eigenvector -> normalized weights. CR < 0.10 required for consistency.',
    false, NULL),

  -- Atlas
  ('flow_state', 'Flow State Probability', 'atlas', 'scoring',
    'Csikszentmihalyi (1990). Flow: The Psychology of Optimal Experience.',
    'FP = balanceRatio * aboveAvgModifier * goalClarity * feedbackPresence. High when challenge ~ skill.',
    false, NULL),
  ('cognitive_load', 'Cognitive Load Theory', 'atlas', 'scoring',
    'Sweller (1988). Instructional design implications of cognitive load theory.',
    'CL = elements * interactivity * (1/expertise). Scale: 0-1 normalized.',
    false, NULL),
  ('planning_fallacy', 'Planning Fallacy Correction', 'atlas', 'scoring',
    'Buehler, Griffin & Ross (1994). Exploring the planning fallacy.',
    'corrected_estimate = estimate * personal_multiplier (rolling avg of actual/estimated).',
    false, NULL),
  ('task_priority', 'Scientific Task Priority', 'atlas', 'scoring',
    'Composite: Eisenhower + energy matching + context similarity + switch cost',
    'w1*urgency + w2*importance + w3*energyMatch + w4*contextSim - w5*switchCost',
    false, NULL),

  -- Journey
  ('perma_profiler', 'PERMA-Profiler', 'journey', 'assessment',
    'Butler & Kern (2016). The PERMA-Profiler. PT-BR: de Carvalho et al. (2021), CFI=0.97.',
    '23 items, 0-10 scale. 5 subscales (P,E,R,M,A) = mean of 3 items each.',
    false, NULL),
  ('swls', 'Satisfaction With Life Scale', 'journey', 'assessment',
    'Diener et al. (1985). SWLS. PT-BR: Gouveia et al. (2009).',
    '5 items, 1-7 scale. Sum 5-35. 31+ = extremely satisfied, 20 = neutral.',
    false, NULL),

  -- Connections
  ('dunbar_layers', 'Dunbar Number Layers', 'connections', 'scoring',
    'Dunbar (1992, 2024). Neocortex size as constraint on group size.',
    'Layers: 5 (intimate), 15 (close), 50 (friends), 150 (meaningful), 500 (acquaintances).',
    false, NULL),
  ('tie_strength', 'Tie Strength (Granovetter)', 'connections', 'scoring',
    'Granovetter (1973). The strength of weak ties.',
    '0.25*frequency + 0.30*emotional_intensity + 0.25*intimacy + 0.20*reciprocity',
    false, NULL),

  -- Finance
  ('finhealth_score', 'Financial Health Score', 'finance', 'scoring',
    'Financial Health Network (2024). FinHealth Score methodology.',
    '4 components: spend (0-100), save (0-100), borrow (0-100), plan (0-100). Mean = composite.',
    false, NULL),

  -- Flux
  ('ctl_atl_tsb', 'Training Stress Balance', 'flux', 'scoring',
    'Banister et al. (1975). Dose-response model. Popularized by Coggan/Allen (2003).',
    'CTL = 42d EMA(TSS), ATL = 7d EMA(TSS), TSB = CTL - ATL. Positive = fresh, negative = fatigued.',
    false, NULL)
ON CONFLICT (id) DO NOTHING;
