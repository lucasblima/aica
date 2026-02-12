-- =============================================================================
-- Quality-Based CP Scoring System
-- CP is now determined by quality_score instead of fixed values per type
-- Formula: CP = 2 + floor(quality_score * 18)  →  range 2-20 CP
-- =============================================================================

-- 1. consciousness_points_log: register quality_score per transaction
ALTER TABLE consciousness_points_log
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2)
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1));

-- 2. question_responses: detailed quality assessment
ALTER TABLE question_responses
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS quality_assessment JSONB;

-- 3. moments: quality score
ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);

-- 4. weekly_summaries: reflection quality score
ALTER TABLE weekly_summaries
  ADD COLUMN IF NOT EXISTS reflection_quality_score DECIMAL(3,2);

-- 5. user_question_context_bank: average quality for question adaptation
ALTER TABLE user_question_context_bank
  ADD COLUMN IF NOT EXISTS avg_quality_score DECIMAL(3,2) DEFAULT 0.5;

-- 6. Index for quality-based queries
CREATE INDEX IF NOT EXISTS idx_cp_log_quality
  ON consciousness_points_log(user_id, quality_score) WHERE quality_score IS NOT NULL;

-- 7. RPC: update average quality score using Exponential Moving Average (EMA)
CREATE OR REPLACE FUNCTION update_avg_quality_score(
  p_user_id UUID, p_new_quality_score DECIMAL(3,2)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_question_context_bank (user_id, avg_quality_score)
  VALUES (p_user_id, p_new_quality_score)
  ON CONFLICT (user_id) DO UPDATE
  SET avg_quality_score = LEAST(1.0, GREATEST(0.0,
        COALESCE(user_question_context_bank.avg_quality_score, 0.5) * 0.85
        + p_new_quality_score * 0.15
      )),
      last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_avg_quality_score(UUID, DECIMAL) TO authenticated;
