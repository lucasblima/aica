-- ============================================================================
-- Grants Scientometric Scoring — Sprint 6
-- Issue #575: Scientific foundations for AICA Life OS
--
-- Tables: researcher_profiles, grant_match_scores
-- Alters: grant_projects (add TRL columns)
-- Seeds: 3 new entries in scientific_model_registry
-- ============================================================================

-- Enable pgvector (already available but ensure it's enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. researcher_profiles — Bibliometric data + SPECTER embedding
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.researcher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  h_index INTEGER,
  total_citations INTEGER,
  m_quotient REAL,
  avg_journal_if REAL,
  collaboration_centrality REAL,
  researcher_strength_score REAL,
  lattes_id TEXT,
  orcid TEXT,
  research_embedding VECTOR(768),  -- SPECTER for semantic matching
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_profiles_user ON public.researcher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_researcher_profiles_embedding ON public.researcher_profiles USING ivfflat (research_embedding vector_cosine_ops) WITH (lists = 10);

ALTER TABLE public.researcher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own researcher profile" ON public.researcher_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. ALTER grant_projects — add TRL columns
-- ============================================================================

ALTER TABLE public.grant_projects ADD COLUMN IF NOT EXISTS trl_level INTEGER
  CHECK (trl_level IS NULL OR trl_level BETWEEN 1 AND 9);
ALTER TABLE public.grant_projects ADD COLUMN IF NOT EXISTS trl_evidence JSONB;

-- ============================================================================
-- 3. grant_match_scores — Semantic matching scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.grant_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.grant_opportunities(id) ON DELETE CASCADE,
  semantic_similarity REAL,
  profile_fit REAL,
  success_probability REAL,
  factor_breakdown JSONB,
  computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grant_match_scores_user ON public.grant_match_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_match_scores_opportunity ON public.grant_match_scores(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_grant_match_scores_probability ON public.grant_match_scores(success_probability DESC NULLS LAST);

ALTER TABLE public.grant_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own match scores" ON public.grant_match_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert match scores" ON public.grant_match_scores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. Seed scientific model registry
-- ============================================================================

INSERT INTO public.scientific_model_registry (id, name, module, category, methodology_reference, version, formula_description, is_active, is_contested, contested_note)
VALUES
  ('researcher_strength', 'Researcher Strength Score', 'grants', 'scoring',
   'Hirsch, J.E. (2005). An index to quantify an individual''s scientific research output. PNAS, 102(46), 16569-16572.',
   '1.0', 'RSS = 0.30*norm(h) + 0.20*norm(citations) + 0.15*norm(m_quotient) + 0.20*norm(avg_IF) + 0.15*norm(centrality)',
   true, false, NULL),

  ('trl_assessment', 'Technology Readiness Level', 'grants', 'scoring',
   'ISO 16290:2013 Space systems — Definition of the Technology Readiness Levels (TRLs) and their criteria of assessment.',
   '1.0', 'Binary evidence checklist per TRL level (1-9). Score = highest level where all criteria are met.',
   true, false, NULL),

  ('grant_semantic_match', 'Grant Semantic Matching', 'grants', 'matching',
   'Cohan, A. et al. (2020). SPECTER: Document-level Representation Learning using Citation-informed Transformers. ACL.',
   '1.0', 'Cosine similarity between researcher SPECTER embedding and opportunity text embedding.',
   true, false, NULL)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
