-- ============================================================================
-- Migration: Finance Behavioral Economics Engine
-- Sprint 5 — Issue #575
-- Creates financial_health_scores table + seeds scientific models
-- ============================================================================

-- ============================================================================
-- TABLE: financial_health_scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spend_score REAL CHECK (spend_score >= 0 AND spend_score <= 100),
  save_score REAL CHECK (save_score >= 0 AND save_score <= 100),
  borrow_score REAL CHECK (borrow_score >= 0 AND borrow_score <= 100),
  plan_score REAL CHECK (plan_score >= 0 AND plan_score <= 100),
  composite_score REAL CHECK (composite_score >= 0 AND composite_score <= 100),
  tier TEXT CHECK (tier IN ('vulnerable', 'coping', 'healthy')),
  debt_to_income_ratio REAL,
  emergency_fund_months REAL,
  savings_rate REAL,
  component_details JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_computed
  ON financial_health_scores (user_id, computed_at DESC);

-- ============================================================================
-- RLS: financial_health_scores
-- ============================================================================

ALTER TABLE financial_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own financial health scores"
  ON financial_health_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial health scores"
  ON financial_health_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial health scores"
  ON financial_health_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial health scores"
  ON financial_health_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for Edge Functions
CREATE POLICY "Service role full access to financial_health_scores"
  ON financial_health_scores FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SEED: Scientific Model Registry (ON CONFLICT DO NOTHING)
-- ============================================================================

INSERT INTO scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  (
    'finhealth_score',
    'FinHealth Score',
    'finance',
    'scoring',
    'Financial Health Network (2020). FinHealth Score Methodology. https://finhealthnetwork.org/score/',
    '1.0.0',
    'Composite of 4 components (Spend, Save, Borrow, Plan), each 0-100. Composite = mean of 4. Tier: >=80 Healthy, >=40 Coping, <40 Vulnerable.',
    true,
    false,
    NULL
  ),
  (
    'prospect_theory',
    'Prospect Theory Value Function',
    'finance',
    'scoring',
    'Kahneman, D. & Tversky, A. (1979). Prospect Theory: An Analysis of Decision under Risk. Econometrica, 47(2), 263-291.',
    '1.0.0',
    'v(x) = x^0.88 for gains, v(x) = -2.25 * (-x)^0.88 for losses. Lambda (loss aversion) = 2.25.',
    true,
    false,
    NULL
  ),
  (
    'present_bias',
    'Present Bias (Beta-Delta Discounting)',
    'finance',
    'scoring',
    'Laibson, D. (1997). Golden Eggs and Hyperbolic Discounting. Quarterly Journal of Economics, 112(2), 443-478.',
    '1.0.0',
    'U0 = u(x0) + beta * sum(delta^t * u(xt)). Beta typically 0.7-0.9 (present bias), delta ~0.99 (time preference).',
    true,
    false,
    NULL
  ),
  (
    'planning_fallacy_financial',
    'Planning Fallacy (Financial Projections)',
    'finance',
    'scoring',
    'Kahneman, D. & Tversky, A. (1979). Intuitive Prediction: Biases and Corrective Procedures. TIMS Studies in Management Science, 12, 313-327.',
    '1.0.0',
    'Corrected projection = naive estimate * correction factor (0.6-0.8). Addresses systematic over-optimism in savings/investment projections.',
    true,
    false,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
