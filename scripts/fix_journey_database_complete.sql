-- ============================================================
-- AICA Life OS - Migration Completa para Corrigir Módulo Journey
-- Data: 2026-01-26
-- Issues: #150, #151, #152, #153
-- ============================================================
--
-- COMO APLICAR:
-- 1. Acesse: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql
-- 2. Cole este SQL completo
-- 3. Clique "Run"
-- 4. Verifique as mensagens NOTICE no resultado
--
-- ============================================================

BEGIN;

-- ============================================
-- ISSUE #150: ASSOCIATIONS TABLE - MISSING COLUMNS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'associations' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_active column to associations';
  ELSE
    RAISE NOTICE '⏭️ is_active column already exists in associations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'associations' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN type TEXT DEFAULT 'organization';
    RAISE NOTICE '✅ Added type column to associations';
  ELSE
    RAISE NOTICE '⏭️ type column already exists in associations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'associations' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN workspace_id UUID DEFAULT '11111111-1111-1111-1111-111111111111'::uuid;
    RAISE NOTICE '✅ Added workspace_id column to associations';
  ELSE
    RAISE NOTICE '⏭️ workspace_id column already exists in associations';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_associations_is_active ON public.associations(is_active);
CREATE INDEX IF NOT EXISTS idx_associations_type ON public.associations(type);
CREATE INDEX IF NOT EXISTS idx_associations_workspace_id ON public.associations(workspace_id);

-- ============================================
-- ISSUE #151: MODULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT modules_owner_check CHECK (
    (association_id IS NOT NULL AND user_id IS NULL) OR
    (association_id IS NULL AND user_id IS NOT NULL) OR
    (association_id IS NULL AND user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_modules_association_id ON public.modules(association_id);
CREATE INDEX IF NOT EXISTS idx_modules_user_id ON public.modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_slug ON public.modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON public.modules(is_active);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view modules" ON public.modules;
DROP POLICY IF EXISTS "Users can insert own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can update own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can delete own modules" ON public.modules;

CREATE POLICY "Anyone can view modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own modules" ON public.modules
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own modules" ON public.modules
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own modules" ON public.modules
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- ISSUE #152: USER_CONSCIOUSNESS_STATS - INSERT POLICY (BUG CRÍTICO!)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_consciousness_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  level INT DEFAULT 1,
  level_name TEXT DEFAULT 'Observador',
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_moment_date DATE,
  total_moments INT DEFAULT 0,
  total_questions_answered INT DEFAULT 0,
  total_summaries_reflected INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_consciousness_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stats" ON public.user_consciousness_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_consciousness_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_consciousness_stats;

CREATE POLICY "Users can view own stats" ON public.user_consciousness_stats
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ⚠️ ESTA POLICY ESTAVA FALTANDO - CAUSA DO BUG "0 PONTOS"
CREATE POLICY "Users can insert own stats" ON public.user_consciousness_stats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_consciousness_stats
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Helper function para garantir stats existem
CREATE OR REPLACE FUNCTION public.ensure_user_consciousness_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_consciousness_stats (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ISSUE #153: DAILY_QUESTIONS - COLUMNS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_questions' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.daily_questions ADD COLUMN category TEXT CHECK (
      category IN ('reflection', 'gratitude', 'energy', 'learning', 'change')
    );
    RAISE NOTICE '✅ Added category column to daily_questions';
  ELSE
    RAISE NOTICE '⏭️ category column already exists in daily_questions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_questions' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.daily_questions ADD COLUMN active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added active column to daily_questions';
  ELSE
    RAISE NOTICE '⏭️ active column already exists in daily_questions';
  END IF;
END $$;

UPDATE public.daily_questions SET category = 'reflection' WHERE category IS NULL;
UPDATE public.daily_questions SET active = true WHERE active IS NULL;

ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active questions" ON public.daily_questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.daily_questions;

CREATE POLICY "Anyone can view active questions" ON public.daily_questions
  FOR SELECT TO authenticated
  USING (active = true);

-- Seed questions if empty
INSERT INTO public.daily_questions (question_text, category, active)
SELECT * FROM (VALUES
  ('O que te trouxe energia essa semana?', 'energy', true),
  ('Se pudesse mudar uma coisa hoje, o que seria?', 'change', true),
  ('Qual foi seu maior aprendizado recente?', 'learning', true),
  ('Pelo que você é grato hoje?', 'gratitude', true),
  ('Como você está se sentindo neste momento?', 'reflection', true)
) AS v(question_text, category, active)
WHERE NOT EXISTS (SELECT 1 FROM public.daily_questions LIMIT 1);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INT;
  col_count INT;
BEGIN
  -- Verify user_consciousness_stats policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_consciousness_stats';

  IF policy_count >= 3 THEN
    RAISE NOTICE '✅ user_consciousness_stats: % policies (SELECT, INSERT, UPDATE)', policy_count;
  ELSE
    RAISE WARNING '⚠️ user_consciousness_stats: only % policies found!', policy_count;
  END IF;

  -- Verify daily_questions columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'daily_questions'
  AND column_name IN ('active', 'category');

  RAISE NOTICE '✅ daily_questions: % of 2 columns exist', col_count;
END $$;

COMMIT;

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT
  '🎉 Migration completa!' AS status,
  'Issues corrigidos: #150, #151, #152, #153' AS details,
  'Recarregue a página Journey para ver os 70 CP' AS next_step;
