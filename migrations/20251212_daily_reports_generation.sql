-- Migration: 20251212_daily_reports_generation.sql
-- Description: Create function to automatically generate daily reports
-- Calculates productivity, mood, and engagement metrics from raw data

-- Enable pgplv8 extension for advanced functions (if needed)
-- CREATE EXTENSION IF NOT EXISTS plv8;

-- Main function to generate daily report for a specific user and date
CREATE OR REPLACE FUNCTION public.generate_daily_report(
  p_user_id UUID,
  p_report_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_tasks_completed INT;
  v_tasks_total INT;
  v_productivity_score FLOAT;
  v_mood_score FLOAT;
  v_energy_level INT;
  v_stress_level INT;
  v_active_modules TEXT[];
  v_memory_ids UUID[];
  v_report_id UUID;
  v_day_start TIMESTAMP;
  v_day_end TIMESTAMP;
BEGIN
  -- Define day boundaries (UTC)
  v_day_start := p_report_date::TIMESTAMP AT TIME ZONE 'UTC';
  v_day_end := v_day_start + INTERVAL '1 day';

  -- 1. Count completed and total tasks for the day
  -- A task counts as completed for this day if completed_at falls within the day
  -- OR if it was created on this day (even if not completed)
  SELECT
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL
                      AND completed_at >= v_day_start
                      AND completed_at < v_day_end),
    COUNT(*) FILTER (WHERE created_at >= v_day_start
                      AND created_at < v_day_end)
  INTO v_tasks_completed, v_tasks_total
  FROM work_items
  WHERE user_id = p_user_id
    AND (
      -- Task created on this day
      (created_at >= v_day_start AND created_at < v_day_end)
      -- Or task completed on this day (even if created earlier)
      OR (completed_at >= v_day_start AND completed_at < v_day_end)
    );

  -- 2. Calculate productivity_score (0-100) based on completion ratio
  -- If no tasks exist, score defaults to 0
  IF v_tasks_total > 0 THEN
    v_productivity_score := LEAST(100, (v_tasks_completed::FLOAT / v_tasks_total::FLOAT) * 100);
  ELSE
    v_productivity_score := 0;
  END IF;

  -- 3. Fetch mood/energy data from daily question responses
  -- Maps mood descriptions to scores: excellent=1, good=0.6, neutral=0, bad=-0.6, terrible=-1
  SELECT
    COALESCE(
      AVG(CASE
        WHEN response_value = 'excellent' THEN 1.0
        WHEN response_value = 'good' THEN 0.6
        WHEN response_value = 'neutral' THEN 0.0
        WHEN response_value = 'bad' THEN -0.6
        WHEN response_value = 'terrible' THEN -1.0
        ELSE NULL
      END),
      0
    ),
    COALESCE(
      AVG(CASE
        WHEN response_value ~ '^\d+$' THEN CAST(response_value AS INT)
        ELSE NULL
      END),
      50
    )::INT
  INTO v_mood_score, v_energy_level
  FROM daily_question_responses
  WHERE user_id = p_user_id
    AND created_at >= v_day_start
    AND created_at < v_day_end
    AND (
      response_value IN ('excellent', 'good', 'neutral', 'bad', 'terrible')
      OR response_value ~ '^\d+$'
    );

  -- Set defaults if no data found
  v_mood_score := COALESCE(v_mood_score, 0);
  v_energy_level := COALESCE(v_energy_level, 50);

  -- 4. Calculate stress level (inverse of energy)
  -- High energy = low stress
  -- Low energy = high stress
  v_stress_level := CASE
    WHEN v_energy_level >= 80 THEN 20
    WHEN v_energy_level >= 60 THEN 40
    WHEN v_energy_level >= 40 THEN 60
    ELSE 80
  END;

  -- 5. List active modules (those with completed tasks)
  SELECT ARRAY_AGG(DISTINCT COALESCE(m.name, 'Uncategorized'))
  INTO v_active_modules
  FROM work_items wi
  LEFT JOIN modules m ON wi.module_id = m.id
  WHERE wi.user_id = p_user_id
    AND wi.completed_at IS NOT NULL
    AND wi.completed_at >= v_day_start
    AND wi.completed_at < v_day_end;

  v_active_modules := COALESCE(v_active_modules, ARRAY[]::TEXT[]);

  -- 6. Link memories created on this day
  SELECT ARRAY_AGG(id)
  INTO v_memory_ids
  FROM memories
  WHERE user_id = p_user_id
    AND created_at >= v_day_start
    AND created_at < v_day_end
    AND is_active = true;

  v_memory_ids := COALESCE(v_memory_ids, ARRAY[]::UUID[]);

  -- 7. Insert or update daily report
  -- Uses ON CONFLICT to upsert (idempotent operation)
  INSERT INTO daily_reports (
    user_id,
    report_date,
    tasks_completed,
    tasks_total,
    productivity_score,
    mood_score,
    energy_level,
    stress_level,
    active_modules,
    memory_ids,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_report_date,
    v_tasks_completed,
    v_tasks_total,
    v_productivity_score,
    v_mood_score,
    v_energy_level,
    v_stress_level,
    v_active_modules,
    v_memory_ids,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, report_date) DO UPDATE SET
    tasks_completed = v_tasks_completed,
    tasks_total = v_tasks_total,
    productivity_score = v_productivity_score,
    mood_score = v_mood_score,
    energy_level = v_energy_level,
    stress_level = v_stress_level,
    active_modules = v_active_modules,
    memory_ids = v_memory_ids,
    updated_at = NOW()
  WHERE daily_reports.user_id = p_user_id
    AND daily_reports.report_date = p_report_date;

  -- 8. Fetch and return the report ID
  SELECT id INTO v_report_id
  FROM daily_reports
  WHERE user_id = p_user_id
    AND report_date = p_report_date;

  RETURN COALESCE(v_report_id, NULL);

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE LOG 'Error generating daily report for user % on date %: % (%)',
    p_user_id, p_report_date, SQLERRM, SQLSTATE;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_daily_report(UUID, DATE) TO authenticated;

-- Create indexes for optimal performance
-- These support the queries used in generate_daily_report

-- Index for work_items lookups by user and date
CREATE INDEX IF NOT EXISTS idx_work_items_user_date
ON work_items(user_id, created_at, completed_at)
WHERE archived = false;

-- Index for daily_question_responses
CREATE INDEX IF NOT EXISTS idx_daily_question_responses_user_date
ON daily_question_responses(user_id, created_at)
WHERE response_value IS NOT NULL;

-- Index for memories
CREATE INDEX IF NOT EXISTS idx_memories_user_date_active
ON memories(user_id, created_at DESC)
WHERE is_active = true;

-- Index for daily_reports (already exists, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date
ON daily_reports(user_id, report_date DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_reports_updated_at ON daily_reports;
CREATE TRIGGER trigger_daily_reports_updated_at
BEFORE UPDATE ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION update_daily_reports_updated_at();

-- Verification queries to ensure everything is set up correctly
-- Uncomment to verify after deployment:

/*
-- Verify function exists
SELECT proname, pronargs FROM pg_proc
WHERE proname = 'generate_daily_report';

-- Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename IN ('work_items', 'daily_question_responses', 'memories', 'daily_reports')
AND indexname LIKE 'idx_%user%date%';

-- Verify trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'daily_reports';
*/
