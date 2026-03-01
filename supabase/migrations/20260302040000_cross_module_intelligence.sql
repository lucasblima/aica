-- =============================================================================
-- Migration: Cross-Module Intelligence
-- Sprint 7: Correlation analysis, Goodhart detection, digital sabbatical
-- =============================================================================

-- 1. domain_correlations — Cached cross-domain correlation data
CREATE TABLE IF NOT EXISTS public.domain_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_a TEXT NOT NULL,
  domain_b TEXT NOT NULL,
  correlation_coefficient REAL NOT NULL,  -- Pearson r (-1 to 1)
  sample_size INTEGER NOT NULL,
  p_value REAL,
  is_significant BOOLEAN DEFAULT false,   -- p < 0.05
  window_days INTEGER DEFAULT 30,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, domain_a, domain_b, window_days)
);

CREATE INDEX IF NOT EXISTS idx_domain_correlations_user ON public.domain_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_correlations_significant ON public.domain_correlations(user_id, is_significant) WHERE is_significant = true;

ALTER TABLE public.domain_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own correlations" ON public.domain_correlations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own correlations" ON public.domain_correlations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. goodhart_alerts — Divergence alerts
CREATE TABLE IF NOT EXISTS public.goodhart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('score_health_divergence', 'metric_gaming', 'single_domain_inflation')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  affected_domains TEXT[] DEFAULT '{}',
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goodhart_alerts_user ON public.goodhart_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_goodhart_alerts_unacknowledged ON public.goodhart_alerts(user_id, acknowledged) WHERE acknowledged = false;

ALTER TABLE public.goodhart_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goodhart alerts" ON public.goodhart_alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. digital_sabbatical_state — Track user engagement + sabbatical periods
CREATE TABLE IF NOT EXISTS public.digital_sabbatical_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  consecutive_active_days INTEGER DEFAULT 0,
  last_active_date DATE,
  sabbatical_suggested_at TIMESTAMPTZ,
  sabbatical_accepted BOOLEAN,
  sabbatical_start_date DATE,
  sabbatical_end_date DATE,
  total_sabbaticals_taken INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.digital_sabbatical_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sabbatical state" ON public.digital_sabbatical_state
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Seed Sprint 7 scientific models
INSERT INTO public.scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('pearson_correlation', 'Pearson Cross-Domain Correlation', 'cross_module', 'detection',
   'Pearson, K. (1895). Notes on regression and inheritance in the case of two parents. Proceedings of the Royal Society of London, 58, 240-242.',
   '1.0', 'r = cov(X,Y) / (sigma_X * sigma_Y). Computed on 30-day rolling windows of domain scores.',
   true, false, NULL),

  ('goodhart_law', 'Goodhart Law Detection', 'cross_module', 'detection',
   'Goodhart, C.A.E. (1984). Problems of Monetary Management: The UK Experience. In Monetary Theory and Practice. Macmillan.',
   '1.0', 'Detect when Life Score composite rises while underlying health indicators (EMA, financial stress, relationship decay) decline.',
   true, false, NULL),

  ('digital_sabbatical', 'Digital Sabbatical', 'cross_module', 'detection',
   'Adapted from Newport, C. (2019). Digital Minimalism. Portfolio. Engagement sustainability research.',
   '1.0', 'Suggest 2-3 day reduced engagement after 30+ consecutive active days to prevent burnout and Goodhart gaming.',
   true, true, 'Specific thresholds (30 days, 2-3 day break) are practical heuristics, not from controlled studies.')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
