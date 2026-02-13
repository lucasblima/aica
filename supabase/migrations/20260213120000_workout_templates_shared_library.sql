-- Migration: Shared exercise library
-- Makes workout_templates readable by all authenticated users (shared library)
-- Keeps INSERT/UPDATE/DELETE restricted to owner only

-- Drop the owner-only SELECT policy
DROP POLICY IF EXISTS "select_own" ON public.workout_templates;

-- Create shared SELECT policy: all authenticated users can read all templates
CREATE POLICY "select_all_authenticated" ON public.workout_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT, UPDATE, DELETE policies remain unchanged (owner-only)
