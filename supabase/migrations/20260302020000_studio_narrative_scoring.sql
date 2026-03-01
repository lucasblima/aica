-- =============================================================================
-- Migration: Studio Neuroscience-Informed Scoring
-- Sprint 6: Guest scoring + Narrative tension analysis
-- =============================================================================

-- 1. guest_scores — Multi-dimensional guest evaluation
CREATE TABLE IF NOT EXISTS public.guest_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  expertise_score REAL CHECK (expertise_score BETWEEN 0 AND 1),
  reach_score REAL CHECK (reach_score BETWEEN 0 AND 1),
  relevance_score REAL CHECK (relevance_score BETWEEN 0 AND 1),
  diversity_score REAL CHECK (diversity_score BETWEEN 0 AND 1),
  composite_score REAL CHECK (composite_score BETWEEN 0 AND 1),
  factor_details JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_scores_user ON public.guest_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_episode ON public.guest_scores(episode_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_composite ON public.guest_scores(composite_score DESC NULLS LAST);

ALTER TABLE public.guest_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own guest scores" ON public.guest_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own guest scores" ON public.guest_scores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own guest scores" ON public.guest_scores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own guest scores" ON public.guest_scores
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. ALTER podcast_episodes — add narrative scoring columns
ALTER TABLE public.podcast_episodes ADD COLUMN IF NOT EXISTS narrative_tension_score REAL;
ALTER TABLE public.podcast_episodes ADD COLUMN IF NOT EXISTS peak_end_moments JSONB;

-- 3. Seed scientific models
INSERT INTO public.scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('guest_scoring', 'Guest Composite Score', 'studio', 'scoring',
   'Composite multi-dimensional scoring for podcast guest selection based on expertise, reach, relevance, and diversity.',
   '1.0', 'Score = 0.30*expertise + 0.25*reach + 0.30*relevance + 0.15*diversity',
   true, false, NULL),

  ('peak_end_rule', 'Peak-End Rule (Kahneman)', 'studio', 'scoring',
   'Kahneman, D. et al. (1993). When More Pain Is Preferred to Less. Psychological Science, 4(6), 401-405.',
   '1.0', 'Listener memory dominated by peak moments and ending. Place strongest content at climax + finale.',
   true, false, NULL),

  ('narrative_tension', 'Narrative Tension Arc', 'studio', 'scoring',
   'Reagan, A.J. et al. (2016). The emotional arcs of stories are dominated by six basic shapes. EPJ Data Science, 5(1).',
   '1.0', 'Track emotional valence across episode segments. Score tension build-up, climax placement, resolution.',
   true, false, NULL),

  ('optimal_duration', 'Optimal Podcast Duration', 'studio', 'scoring',
   'Bridge Ratings (2023). Podcast Consumption Research. Drop-off analysis at 5min and 20min marks.',
   '1.0', 'Optimal length ~22 min. Critical drop-offs at 5min (weak hook) and 20min (diminishing returns).',
   true, true, 'Duration preferences vary significantly by genre and audience. 22-min figure from Bridge Ratings is a general average.')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
