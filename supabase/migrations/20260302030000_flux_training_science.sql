-- =============================================================================
-- Migration: Flux Training Science — Fatigue Modeling
-- Sprint 6: CTL/ATL/TSB tracking, readiness scoring
-- =============================================================================

-- 1. training_stress_history — Daily TSS + computed load metrics
CREATE TABLE IF NOT EXISTS public.training_stress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tss REAL,                              -- Training Stress Score (from workout)
  ctl REAL,                              -- Chronic Training Load (42-day EMA)
  atl REAL,                              -- Acute Training Load (7-day EMA)
  tsb REAL,                              -- Training Stress Balance (CTL - ATL)
  rpe INTEGER CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  session_duration_minutes INTEGER,
  notes TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, date)
);

CREATE INDEX IF NOT EXISTS idx_training_stress_user ON public.training_stress_history(user_id);
CREATE INDEX IF NOT EXISTS idx_training_stress_athlete ON public.training_stress_history(athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_stress_date ON public.training_stress_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_training_stress_athlete_date ON public.training_stress_history(athlete_id, date DESC);

ALTER TABLE public.training_stress_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read own athletes stress" ON public.training_stress_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can insert athletes stress" ON public.training_stress_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update athletes stress" ON public.training_stress_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can delete athletes stress" ON public.training_stress_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. ALTER athletes — add readiness + fatigue columns
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS readiness_score REAL;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS fatigue_risk TEXT
  CHECK (fatigue_risk IS NULL OR fatigue_risk IN ('low', 'moderate', 'high', 'overtraining'));

-- 3. Seed scientific models
INSERT INTO public.scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('training_stress_balance', 'Training Stress Balance (Banister)', 'flux', 'scoring',
   'Banister, E.W. (1991). Modeling elite athletic performance. In: Physiological Testing of Elite Athletes. Human Kinetics.',
   '1.0', 'CTL = 42-day EMA of TSS. ATL = 7-day EMA of TSS. TSB = CTL - ATL. Positive TSB = fresh, negative = fatigued.',
   true, false, NULL),

  ('rpe_session', 'Session RPE Method', 'flux', 'scoring',
   'Foster, C. et al. (2001). A new approach to monitoring exercise training. Journal of Strength and Conditioning Research, 15(1), 109-115.',
   '1.0', 'sRPE = RPE * duration_minutes. Alternative to power/pace-based TSS when devices unavailable.',
   true, false, NULL),

  ('fatigue_risk_model', 'Fatigue Risk Classification', 'flux', 'detection',
   'Halson, S.L. (2014). Monitoring training load to understand fatigue in athletes. Sports Medicine, 44(S2), 139-147.',
   '1.0', 'TSB < -30 = overtraining risk. TSB < -10 = high fatigue. -10 to +5 = moderate. > +5 = fresh.',
   true, true, 'TSB thresholds are general guidelines. Individual variation is significant. Monitor alongside subjective markers.')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
