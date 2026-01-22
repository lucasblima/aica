-- Migration: Fix Database Issues #150, #151, #152, #153
-- Date: 2026-01-22
-- Description: Consolidates fixes for multiple schema/RLS issues found in staging console logs
--
-- Issue #150: associations table missing columns (is_active, type, workspace_id)
-- Issue #151: modules table missing or misconfigured
-- Issue #152: user_consciousness_stats RLS blocking INSERT (403 Forbidden)
-- Issue #153: daily_questions missing 'active' column

BEGIN;

-- ============================================
-- ISSUE #150: ASSOCIATIONS TABLE - MISSING COLUMNS
-- ============================================
-- The code expects: is_active, type, workspace_id
-- Existing migrations may have partially applied these

DO $$
BEGIN
  -- Add is_active column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column to associations';
  ELSE
    RAISE NOTICE 'is_active column already exists in associations';
  END IF;

  -- Add type column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN type TEXT DEFAULT 'organization';
    RAISE NOTICE 'Added type column to associations';
  ELSE
    RAISE NOTICE 'type column already exists in associations';
  END IF;

  -- Add workspace_id column if not exists (for MVP default workspace)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN workspace_id UUID DEFAULT '11111111-1111-1111-1111-111111111111'::uuid;
    RAISE NOTICE 'Added workspace_id column to associations';
  ELSE
    RAISE NOTICE 'workspace_id column already exists in associations';
  END IF;
END $$;

-- Create indexes for new columns (idempotent)
CREATE INDEX IF NOT EXISTS idx_associations_is_active ON public.associations(is_active);
CREATE INDEX IF NOT EXISTS idx_associations_type ON public.associations(type);
CREATE INDEX IF NOT EXISTS idx_associations_workspace_id ON public.associations(workspace_id);

-- ============================================
-- ISSUE #151: MODULES TABLE - ENSURE EXISTS AND CONFIGURED
-- ============================================
-- Re-run the modules table creation to ensure it exists with all columns

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

  -- Allow module to belong to either an association or a user
  CONSTRAINT modules_owner_check CHECK (
    (association_id IS NOT NULL AND user_id IS NULL) OR
    (association_id IS NULL AND user_id IS NOT NULL) OR
    (association_id IS NULL AND user_id IS NULL) -- Allow global modules
  )
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_modules_association_id ON public.modules(association_id);
CREATE INDEX IF NOT EXISTS idx_modules_user_id ON public.modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_slug ON public.modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON public.modules(is_active);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate (ensures correct configuration)
DROP POLICY IF EXISTS "Users can view accessible modules" ON public.modules;
DROP POLICY IF EXISTS "Users can insert own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can update own modules" ON public.modules;
DROP POLICY IF EXISTS "Users can delete own modules" ON public.modules;
DROP POLICY IF EXISTS "Anyone can view modules" ON public.modules;

-- Simple policy: Allow all authenticated users to view modules
-- This avoids recursion issues with association_members
CREATE POLICY "Anyone can view modules" ON public.modules
  FOR SELECT TO authenticated
  USING (true);

-- Users can insert modules for themselves
CREATE POLICY "Users can insert own modules" ON public.modules
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IS NULL -- Allow insertion of global/association modules for now
  );

-- Users can update their own modules
CREATE POLICY "Users can update own modules" ON public.modules
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can delete their own modules
CREATE POLICY "Users can delete own modules" ON public.modules
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

COMMENT ON TABLE public.modules IS 'System modules that can be enabled per association or user';

-- ============================================
-- ISSUE #152: USER_CONSCIOUSNESS_STATS - ADD INSERT POLICY
-- ============================================
-- The table exists but has no INSERT policy, causing 403 Forbidden errors
-- when trying to create initial stats for new users

-- First ensure the table exists
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

-- Enable RLS
ALTER TABLE public.user_consciousness_stats ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies to ensure correct state
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_consciousness_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_consciousness_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_consciousness_stats;

-- SELECT policy
CREATE POLICY "Users can view own stats" ON public.user_consciousness_stats
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy (THIS WAS MISSING - causes #152)
CREATE POLICY "Users can insert own stats" ON public.user_consciousness_stats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own stats" ON public.user_consciousness_stats
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create a helper function for initializing user stats (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.ensure_user_consciousness_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_consciousness_stats (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ensure_user_consciousness_stats IS 'Ensures consciousness stats exist for current user';

-- ============================================
-- ISSUE #153: DAILY_QUESTIONS - ADD ACTIVE AND CATEGORY COLUMNS
-- ============================================
-- The table was created without 'active' and 'category' columns

DO $$
BEGIN
  -- Add category column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_questions'
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.daily_questions ADD COLUMN category TEXT CHECK (
      category IN ('reflection', 'gratitude', 'energy', 'learning', 'change')
    );
    RAISE NOTICE 'Added category column to daily_questions';
  ELSE
    RAISE NOTICE 'category column already exists in daily_questions';
  END IF;

  -- Add active column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'daily_questions'
    AND column_name = 'active'
  ) THEN
    ALTER TABLE public.daily_questions ADD COLUMN active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added active column to daily_questions';
  ELSE
    RAISE NOTICE 'active column already exists in daily_questions';
  END IF;
END $$;

-- Update existing questions to have a category if null
UPDATE public.daily_questions
SET category = 'reflection'
WHERE category IS NULL;

-- Update existing questions to be active if null
UPDATE public.daily_questions
SET active = true
WHERE active IS NULL;

-- Enable RLS
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.daily_questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.daily_questions;

-- Recreate policy with active column
CREATE POLICY "Anyone can view active questions" ON public.daily_questions
  FOR SELECT TO authenticated
  USING (active = true);

-- Seed initial questions if table is empty
INSERT INTO public.daily_questions (question_text, category, active)
SELECT * FROM (VALUES
  ('O que te trouxe energia essa semana?', 'energy', true),
  ('Se pudesse mudar uma coisa hoje, o que seria?', 'change', true),
  ('Qual foi seu maior aprendizado recente?', 'learning', true),
  ('Pelo que você é grato hoje?', 'gratitude', true),
  ('Como você está se sentindo neste momento?', 'reflection', true),
  ('Que desafio você superou recentemente?', 'reflection', true),
  ('O que te fez sorrir hoje?', 'gratitude', true),
  ('Qual seu maior objetivo para esta semana?', 'change', true),
  ('Que hábito você gostaria de criar?', 'change', true),
  ('Quem te inspirou recentemente?', 'gratitude', true)
) AS v(question_text, category, active)
WHERE NOT EXISTS (SELECT 1 FROM public.daily_questions LIMIT 1);

-- ============================================
-- VERIFICATION QUERIES (for debugging)
-- ============================================
DO $$
DECLARE
  col_count INT;
BEGIN
  -- Verify associations columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'associations'
  AND column_name IN ('is_active', 'type', 'workspace_id');

  RAISE NOTICE 'associations: % of 3 expected columns exist', col_count;

  -- Verify modules table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modules') THEN
    RAISE NOTICE 'modules table exists';
  ELSE
    RAISE WARNING 'modules table DOES NOT exist';
  END IF;

  -- Verify user_consciousness_stats policies
  SELECT COUNT(*) INTO col_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_consciousness_stats';

  RAISE NOTICE 'user_consciousness_stats: % policies exist', col_count;

  -- Verify daily_questions columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'daily_questions'
  AND column_name IN ('active', 'category');

  RAISE NOTICE 'daily_questions: % of 2 expected columns exist', col_count;
END $$;

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Migration 20260122000002_fix_database_issues_150_153 completed!' AS message,
       'Fixed: #150 (associations columns), #151 (modules table), #152 (user_consciousness_stats RLS), #153 (daily_questions columns)' AS details;
