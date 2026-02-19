-- Migration: flux_performance_tests
-- Creates the performance_tests table for tracking athlete test results
-- (FTP, CSS, pace, VO2max, lactate threshold) over time.

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type text NOT NULL CHECK (test_type IN ('ftp', 'css', 'pace', 'vo2max', 'lactate')),
  test_value numeric NOT NULL,
  test_unit text NOT NULL CHECK (test_unit IN ('watts', 'min_per_100m', 'min_per_km', 'ml_kg_min', 'mmol_l')),
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.performance_tests IS 'Athlete performance test results tracked over time for trend analysis';

-- ============================================================================
-- 2. INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_performance_tests_athlete_type_date
  ON public.performance_tests (athlete_id, test_type, test_date DESC);

-- ============================================================================
-- 3. RLS
-- ============================================================================

ALTER TABLE public.performance_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can read own performance tests"
  ON public.performance_tests FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coach can insert own performance tests"
  ON public.performance_tests FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coach can update own performance tests"
  ON public.performance_tests FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coach can delete own performance tests"
  ON public.performance_tests FOR DELETE
  USING (auth.uid() = coach_id);

-- ============================================================================
-- 4. RPC: get_athlete_performance_trend
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_athlete_performance_trend(
  p_athlete_id uuid,
  p_test_type text
)
RETURNS TABLE (
  id uuid,
  test_value numeric,
  test_unit text,
  test_date date,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      pt.id,
      pt.test_value,
      pt.test_unit,
      pt.test_date,
      pt.notes,
      pt.created_at
    FROM public.performance_tests pt
    WHERE pt.athlete_id = p_athlete_id
      AND pt.test_type = p_test_type
      AND pt.coach_id = auth.uid()
    ORDER BY pt.test_date DESC
    LIMIT 12;
END;
$$;

COMMENT ON FUNCTION public.get_athlete_performance_trend IS 'Returns the last 12 performance tests for an athlete by type, ordered by test_date DESC';
