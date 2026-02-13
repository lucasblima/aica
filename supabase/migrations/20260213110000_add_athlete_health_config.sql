-- Migration: Add health configuration fields to athletes table
-- Description: Adds coach-configurable health documentation requirements and PAR-Q onboarding permission
-- Author: Claude Sonnet 4.5
-- Date: 2026-02-13

-- ============================================
-- 1. Add health configuration columns
-- ============================================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS requires_cardio_exam BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_clearance_cert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_parq_onboarding BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. Add column comments for documentation
-- ============================================

COMMENT ON COLUMN public.athletes.requires_cardio_exam IS
  'Coach requires cardiological exam document from athlete before starting training';

COMMENT ON COLUMN public.athletes.requires_clearance_cert IS
  'Coach requires physical activity clearance certificate from athlete before starting training';

COMMENT ON COLUMN public.athletes.allow_parq_onboarding IS
  'Allow athlete to complete PAR-Q questionnaire + liability waiver in Flux module. If true, technical prescription is locked until athlete completes and signs.';

-- ============================================
-- 3. Create index for PAR-Q onboarding queries
-- ============================================

-- Index for filtering athletes who need to complete PAR-Q
CREATE INDEX IF NOT EXISTS idx_athletes_parq_onboarding
  ON public.athletes(allow_parq_onboarding, status)
  WHERE allow_parq_onboarding = TRUE AND status = 'active';

-- ============================================
-- 4. Update RLS policies (no changes needed)
-- ============================================

-- Note: Existing RLS policies on athletes table already cover these new columns:
-- - Coaches can read/update their own athletes (user_id = auth.uid())
-- - New columns follow same access pattern as other athlete fields

-- ============================================
-- 5. Add sample data comment (for reference)
-- ============================================

-- Example usage:
-- UPDATE athletes SET
--   requires_cardio_exam = TRUE,
--   requires_clearance_cert = TRUE,
--   allow_parq_onboarding = TRUE
-- WHERE id = 'athlete-uuid-here';

-- ============================================
-- 6. Verification query
-- ============================================

-- To verify the migration, run:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'athletes'
--   AND column_name IN ('requires_cardio_exam', 'requires_clearance_cert', 'allow_parq_onboarding')
-- ORDER BY column_name;
