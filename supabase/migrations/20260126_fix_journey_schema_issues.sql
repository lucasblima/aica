-- =============================================================================
-- Migration: Fix Journey Module Schema Issues
-- Description: Adds missing columns and RLS policies reported in console errors
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add created_at to question_responses if not exists
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_responses' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE question_responses ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

    -- Backfill with responded_at for existing rows
    UPDATE question_responses SET created_at = responded_at WHERE created_at IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Add created_at to weekly_summaries if not exists
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_summaries' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE weekly_summaries ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

    -- Backfill with week_start_date for existing rows
    UPDATE weekly_summaries
    SET created_at = week_start_date
    WHERE created_at IS NULL AND week_start_date IS NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Add document_count to file_search_corpora if not exists
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_search_corpora' AND column_name = 'document_count'
  ) THEN
    ALTER TABLE file_search_corpora ADD COLUMN document_count INT DEFAULT 0;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Fix RLS policies for weekly_summaries
-- -----------------------------------------------------------------------------

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view own summaries" ON weekly_summaries;
CREATE POLICY "Users can view own summaries" ON weekly_summaries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Add INSERT policy
DROP POLICY IF EXISTS "Users can insert own summaries" ON weekly_summaries;
CREATE POLICY "Users can insert own summaries" ON weekly_summaries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy
DROP POLICY IF EXISTS "Users can update own summaries" ON weekly_summaries;
CREATE POLICY "Users can update own summaries" ON weekly_summaries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. Ensure question_responses has all necessary policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own responses" ON question_responses;
CREATE POLICY "Users can view own responses" ON question_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own responses" ON question_responses;
CREATE POLICY "Users can insert own responses" ON question_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own responses" ON question_responses;
CREATE POLICY "Users can update own responses" ON question_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. Ensure file_search_corpora has all necessary policies
-- -----------------------------------------------------------------------------

ALTER TABLE file_search_corpora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own corpora" ON file_search_corpora;
CREATE POLICY "Users can view own corpora" ON file_search_corpora
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own corpora" ON file_search_corpora;
CREATE POLICY "Users can insert own corpora" ON file_search_corpora
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own corpora" ON file_search_corpora;
CREATE POLICY "Users can update own corpora" ON file_search_corpora
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. Refresh schema cache (helps with 406 errors)
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
