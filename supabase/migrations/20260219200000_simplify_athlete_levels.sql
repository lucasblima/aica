-- Migration: simplify_athlete_levels
-- Collapse 7 sub-levels into 3 simple levels: iniciante, intermediario, avancado
-- This removes the numeric subdivision (e.g. intermediario_1/2/3 → intermediario)

-- ============================================================================
-- 1. DROP OLD CHECK CONSTRAINTS
-- ============================================================================

ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS athletes_level_check;
ALTER TABLE public.athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_level_check;

-- ============================================================================
-- 2. UPDATE DATA: collapse sub-levels
-- ============================================================================

UPDATE public.athletes
SET level = CASE
  WHEN level LIKE 'iniciante_%' THEN 'iniciante'
  WHEN level LIKE 'intermediario_%' THEN 'intermediario'
  ELSE level
END
WHERE level LIKE '%\_%';

UPDATE public.athlete_profiles
SET level = CASE
  WHEN level LIKE 'iniciante_%' THEN 'iniciante'
  WHEN level LIKE 'intermediario_%' THEN 'intermediario'
  ELSE level
END
WHERE level LIKE '%\_%';

-- ============================================================================
-- 3. ADD NEW CHECK CONSTRAINTS (3 simple levels only)
-- ============================================================================

ALTER TABLE public.athletes
ADD CONSTRAINT athletes_level_check
CHECK (level IN ('iniciante', 'intermediario', 'avancado'));

ALTER TABLE public.athlete_profiles
ADD CONSTRAINT athlete_profiles_level_check
CHECK (level IN ('iniciante', 'intermediario', 'avancado'));
