-- Migration: Remove ProAC from incentive_laws
-- Date: 2026-01-12
-- Reason: Focusing MVP on Rouanet (federal) and ISS Cultural RJ (municipal)

-- Remove ProAC seed data
DELETE FROM public.incentive_laws
WHERE short_name = 'ProAC';

-- Success log
DO $$
BEGIN
  RAISE NOTICE '[Remove ProAC Migration] Completed successfully';
  RAISE NOTICE '  - Removed ProAC from incentive_laws';
END $$;
