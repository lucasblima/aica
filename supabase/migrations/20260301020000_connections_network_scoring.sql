-- =============================================================================
-- Migration: Connections Network Science Scoring
-- Sprint 4: Network science CRM — Dunbar layers, tie strength, decay, Gottman
-- =============================================================================

-- ============================================================================
-- 1. ALTER contact_network — add 5 scientific scoring columns
-- ============================================================================

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS dunbar_layer INTEGER;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS tie_strength REAL;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS relationship_score REAL;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS decay_rate REAL;

ALTER TABLE public.contact_network
ADD COLUMN IF NOT EXISTS gottman_ratio REAL;

-- Add CHECK constraint for dunbar_layer values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_network_dunbar_layer_check'
  ) THEN
    ALTER TABLE public.contact_network
    ADD CONSTRAINT contact_network_dunbar_layer_check
    CHECK (dunbar_layer IS NULL OR dunbar_layer IN (5, 15, 50, 150, 500));
  END IF;
END $$;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_contact_network_dunbar_layer
ON public.contact_network(dunbar_layer) WHERE dunbar_layer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_network_relationship_score
ON public.contact_network(relationship_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_contact_network_tie_strength
ON public.contact_network(tie_strength DESC NULLS LAST);

-- ============================================================================
-- 2. connection_interactions — interaction quality log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connection_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('message', 'call', 'meeting', 'email', 'social')),
  quality TEXT NOT NULL DEFAULT 'neutral' CHECK (quality IN ('positive', 'neutral', 'negative')),
  notes TEXT,
  interacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connection_interactions_user
ON public.connection_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_connection_interactions_contact
ON public.connection_interactions(contact_id);

CREATE INDEX IF NOT EXISTS idx_connection_interactions_time
ON public.connection_interactions(interacted_at DESC);

ALTER TABLE public.connection_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own interactions" ON public.connection_interactions;
CREATE POLICY "Users can read own interactions" ON public.connection_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interactions" ON public.connection_interactions;
CREATE POLICY "Users can insert own interactions" ON public.connection_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own interactions" ON public.connection_interactions;
CREATE POLICY "Users can update own interactions" ON public.connection_interactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interactions" ON public.connection_interactions;
CREATE POLICY "Users can delete own interactions" ON public.connection_interactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. network_metrics — network-level aggregate scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.network_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_network_size REAL,
  network_constraint REAL,
  diversity_index REAL,
  layer_distribution JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_network_metrics_user
ON public.network_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_network_metrics_computed
ON public.network_metrics(computed_at DESC);

ALTER TABLE public.network_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own network metrics" ON public.network_metrics;
CREATE POLICY "Users can read own network metrics" ON public.network_metrics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert network metrics" ON public.network_metrics;
CREATE POLICY "Service can insert network metrics" ON public.network_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. Seed 7 network science models into scientific_model_registry
-- ============================================================================

INSERT INTO public.scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('dunbar_layers', 'Dunbar Number & Social Brain', 'connections', 'scoring',
   'Dunbar, R.I.M. (1992). Neocortex size as a constraint on group size in primates. Journal of Human Evolution, 22(6), 469-493.',
   '1.0', 'Classify contacts into 5 concentric layers (5/15/50/150/500) by frequency and closeness.',
   true, false, NULL),

  ('tie_strength', 'Tie Strength (Granovetter)', 'connections', 'scoring',
   'Granovetter, M.S. (1973). The Strength of Weak Ties. American Journal of Sociology, 78(6), 1360-1380.',
   '1.0', '0.25*frequency + 0.30*emotional_closeness + 0.25*intimacy + 0.20*reciprocity',
   true, false, NULL),

  ('relationship_decay', 'Relationship Decay (Roberts & Dunbar)', 'connections', 'scoring',
   'Roberts, S.B.G. & Dunbar, R.I.M. (2011). The costs of family and friends. Journal of Evolutionary Psychology, 9(1), 3-18.',
   '1.0', 'closeness(t) = prev * e^(-lambda * days) + boost. Lambda varies by relationship type.',
   true, false, NULL),

  ('gottman_ratio', 'Gottman Positive-Negative Ratio', 'connections', 'scoring',
   'Gottman, J.M. (1994). What Predicts Divorce? The Relationship Between Marital Processes and Marital Outcomes. Lawrence Erlbaum.',
   '1.0', 'positive_interactions / negative_interactions >= 5.0 indicates healthy relationship.',
   true, true, 'The 5:1 ratio has been debated in replication studies. Original study focused on marital relationships; generalization to all relationships is an extrapolation.'),

  ('network_constraint', 'Network Constraint (Burt)', 'connections', 'scoring',
   'Burt, R.S. (1992). Structural Holes: The Social Structure of Competition. Harvard University Press.',
   '1.0', 'c_ij = (p_ij + sum_q(p_iq * p_qj))^2. Lower constraint = more structural holes = more social capital.',
   true, false, NULL),

  ('effective_network_size', 'Effective Network Size (Borgatti)', 'connections', 'scoring',
   'Borgatti, S.P. (1997). Structural Holes: Unpacking Burt''s Redundancy Measures. Connections, 20(1), 35-38.',
   '1.0', 'n - (2t/n), where n = contacts, t = ties among contacts.',
   true, false, NULL),

  ('diversity_index', 'Network Diversity (Inverse HHI)', 'connections', 'scoring',
   'Hirschman, A.O. (1964). The Paternity of an Index. The American Economic Review, 54(5), 761-762.',
   '1.0', '1 - sum(p_i^2), where p_i is proportion of contacts in category i. Higher = more diverse.',
   true, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
