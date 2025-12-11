/**
 * SQL Migrations for Recommendation Engine
 * Creates 4 tables to support the intelligent module recommendation system
 * Tables: module_definitions, user_module_recommendations, module_feedback, module_learning_weights
 *
 * @version 1.0
 * @date 2025-12-11
 */

-- =====================================================
-- TABLE 1: module_definitions
-- Catalog of all available learning modules
-- =====================================================

CREATE TABLE IF NOT EXISTS module_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),

  -- Complexity and time
  estimated_minutes INTEGER DEFAULT 120,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  priority INTEGER CHECK (priority >= 1 AND priority <= 10),

  -- Triggering conditions (JSON arrays)
  triggering_trails TEXT[] DEFAULT '{}',
  triggering_life_areas TEXT[] DEFAULT '{}',
  triggering_responses TEXT[] DEFAULT '{}',

  -- Dependencies and relationships (JSON arrays)
  prerequisites TEXT[] DEFAULT '{}',
  complementary_modules TEXT[] DEFAULT '{}',

  -- Content metadata
  lessons INTEGER,
  practice_activities BOOLEAN DEFAULT FALSE,
  resources TEXT[] DEFAULT '{}',

  -- Scoring adjustments
  urgency_boost DECIMAL(3,2),
  serendipity_factor DECIMAL(3,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_module_definitions_category ON module_definitions(category);
CREATE INDEX idx_module_definitions_priority ON module_definitions(priority DESC);
CREATE INDEX idx_module_definitions_difficulty ON module_definitions(difficulty);

-- Add constraint for valid category
ALTER TABLE module_definitions ADD CONSTRAINT check_valid_category CHECK (
  category IN (
    'emotional-health', 'physical-health', 'finance', 'relationships',
    'personal-growth', 'productivity', 'wellness', 'learning', 'spirituality', 'career'
  )
);

-- =====================================================
-- TABLE 2: user_module_recommendations
-- Current recommendations for each user (expires after 7 days)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_module_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recommended modules in order
  recommended_modules TEXT[] NOT NULL DEFAULT '{}',

  -- Complete recommendation data (JSON blob)
  recommendations_data JSONB NOT NULL,
  -- Structure:
  -- {
  --   "userId": "...",
  --   "recommendations": [
  --     {
  --       "moduleId": "...",
  --       "moduleName": "...",
  --       "description": "...",
  --       "score": 95,
  --       "confidence": 0.95,
  --       "priority": "critical",
  --       "reason": "...",
  --       "triggeringFactors": [...],
  --       "suggestedStartDate": "2025-12-11T...",
  --       "estimatedTimeToComplete": 240,
  --       "complementaryModules": [...],
  --       "prerequisites": [...]
  --     }
  --   ],
  --   "personalizationSummary": "...",
  --   "algorithmMetadata": {
  --     "trailWeight": 0.6,
  --     "momentWeight": 0.3,
  --     "behaviorWeight": 0.1
  --   },
  --   "nextReviewDate": "2025-12-18T...",
  --   "totalModulesEvaluated": 52,
  --   "generatedAt": "2025-12-11T..."
  -- }

  -- User feedback on recommendations (keyed by moduleId)
  user_feedback JSONB DEFAULT '{}',
  -- Structure:
  -- {
  --   "module_1": {
  --     "action": "accepted|rejected|completed|skipped",
  --     "feedback": "Optional feedback text",
  --     "rating": 4,
  --     "feedbackAt": "2025-12-11T..."
  --   },
  --   "module_2": { ... }
  -- }

  -- Validity tracking
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  refreshed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One recommendation record per user
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX idx_recommendations_user_id ON user_module_recommendations(user_id);
CREATE INDEX idx_recommendations_expires_at ON user_module_recommendations(expires_at);

-- =====================================================
-- TABLE 3: module_feedback
-- Individual feedback records for learning and analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS module_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES module_definitions(id) ON DELETE CASCADE,

  -- Feedback action
  action VARCHAR(20) NOT NULL CHECK (
    action IN ('accepted', 'rejected', 'completed', 'skipped')
  ),

  -- User feedback details
  feedback_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Context
  recommendation_id UUID REFERENCES user_module_recommendations(id) ON DELETE SET NULL,
  recommendation_score DECIMAL(5,2), -- Score when recommended
  recommendation_priority VARCHAR(20), -- Priority when recommended

  -- Timestamps
  feedback_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for queries
CREATE INDEX idx_module_feedback_user_id ON module_feedback(user_id);
CREATE INDEX idx_module_feedback_module_id ON module_feedback(module_id);
CREATE INDEX idx_module_feedback_action ON module_feedback(action);
CREATE INDEX idx_module_feedback_user_module ON module_feedback(user_id, module_id);

-- =====================================================
-- TABLE 4: module_learning_weights
-- Dynamic weights learned from user feedback
-- =====================================================

CREATE TABLE IF NOT EXISTS module_learning_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES module_definitions(id) ON DELETE CASCADE,

  -- Base priority from module definition
  base_priority INTEGER NOT NULL,

  -- Adjustment based on feedback (-1 to 1)
  feedback_adjustment DECIMAL(3,2) DEFAULT 0,

  -- Tendency to recommend (0-1, based on acceptance rate)
  recommendation_tendency DECIMAL(3,2) DEFAULT 0.5,

  -- Statistics for this module
  total_recommendations INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,

  -- Derived metrics
  acceptance_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE
      WHEN total_recommendations = 0 THEN 0
      ELSE accepted_count::DECIMAL / total_recommendations
    END
  ) STORED,

  completion_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE
      WHEN accepted_count = 0 THEN 0
      ELSE completed_count::DECIMAL / accepted_count
    END
  ) STORED,

  -- Timestamps
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per module
  UNIQUE(module_id)
);

-- Add indexes
CREATE INDEX idx_module_weights_module_id ON module_learning_weights(module_id);
CREATE INDEX idx_module_weights_recommendation_tendency ON module_learning_weights(recommendation_tendency DESC);
CREATE INDEX idx_module_weights_acceptance_rate ON module_learning_weights(acceptance_rate DESC);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Module recommendation effectiveness
CREATE OR REPLACE VIEW v_module_recommendation_stats AS
SELECT
  m.id,
  m.name,
  m.category,
  m.priority,
  COALESCE(w.total_recommendations, 0) as total_recommendations,
  COALESCE(w.accepted_count, 0) as accepted_count,
  COALESCE(w.rejected_count, 0) as rejected_count,
  COALESCE(w.completed_count, 0) as completed_count,
  COALESCE(w.acceptance_rate, 0) as acceptance_rate,
  COALESCE(w.completion_rate, 0) as completion_rate,
  COALESCE(w.recommendation_tendency, 0.5) as recommendation_tendency
FROM module_definitions m
LEFT JOIN module_learning_weights w ON m.id = w.module_id
ORDER BY m.priority DESC, COALESCE(w.acceptance_rate, 0) DESC;

-- View: User recommendation history
CREATE OR REPLACE VIEW v_user_recommendation_history AS
SELECT
  f.user_id,
  m.id as module_id,
  m.name as module_name,
  m.category,
  f.action,
  f.rating,
  f.recommendation_score,
  f.recommendation_priority,
  f.feedback_at,
  ROW_NUMBER() OVER (PARTITION BY f.user_id ORDER BY f.feedback_at DESC) as feedback_recency
FROM module_feedback f
JOIN module_definitions m ON f.module_id = m.id
WHERE f.action != 'skipped';

-- View: User acceptance/rejection trends
CREATE OR REPLACE VIEW v_user_feedback_trends AS
SELECT
  f.user_id,
  COUNT(*) as total_feedback,
  COALESCE(SUM(CASE WHEN f.action = 'accepted' THEN 1 ELSE 0 END), 0) as accepted_count,
  COALESCE(SUM(CASE WHEN f.action = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
  COALESCE(SUM(CASE WHEN f.action = 'completed' THEN 1 ELSE 0 END), 0) as completed_count,
  ROUND(COALESCE(SUM(CASE WHEN f.action = 'accepted' THEN 1 ELSE 0 END)::NUMERIC, 0) / NULLIF(COUNT(*), 0), 4) as acceptance_rate,
  ROUND(COALESCE(SUM(CASE WHEN f.action = 'completed' THEN 1 ELSE 0 END)::NUMERIC, 0) / NULLIF(SUM(CASE WHEN f.action = 'accepted' THEN 1 ELSE 0 END), 0), 4) as completion_rate
FROM module_feedback f
GROUP BY f.user_id;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function: Get user's latest recommendations
CREATE OR REPLACE FUNCTION get_user_recommendations(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  recommendations JSONB,
  personalization_summary TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    umr.user_id,
    umr.recommendations_data,
    (umr.recommendations_data->>'personalizationSummary')::TEXT,
    umr.expires_at,
    (umr.expires_at < NOW())::BOOLEAN
  FROM user_module_recommendations umr
  WHERE umr.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Record module feedback and update weights
CREATE OR REPLACE FUNCTION record_module_feedback(
  p_user_id UUID,
  p_module_id UUID,
  p_action VARCHAR,
  p_feedback TEXT DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL
)
RETURNS TABLE (
  feedback_id UUID,
  updated_weights JSON
) AS $$
DECLARE
  v_feedback_id UUID;
  v_weights JSON;
BEGIN
  -- Insert feedback record
  INSERT INTO module_feedback (
    user_id,
    module_id,
    action,
    feedback_text,
    rating,
    feedback_at
  ) VALUES (
    p_user_id,
    p_module_id,
    p_action,
    p_feedback,
    p_rating,
    NOW()
  )
  RETURNING id INTO v_feedback_id;

  -- Update learning weights
  UPDATE module_learning_weights
  SET
    total_recommendations = total_recommendations + 1,
    accepted_count = accepted_count + CASE WHEN p_action = 'accepted' THEN 1 ELSE 0 END,
    rejected_count = rejected_count + CASE WHEN p_action = 'rejected' THEN 1 ELSE 0 END,
    completed_count = completed_count + CASE WHEN p_action = 'completed' THEN 1 ELSE 0 END,
    last_updated = NOW(),
    updated_at = NOW()
  WHERE module_id = p_module_id;

  -- Get updated weights
  SELECT row_to_json(row) INTO v_weights
  FROM (
    SELECT
      module_id,
      total_recommendations,
      accepted_count,
      rejected_count,
      completed_count,
      acceptance_rate,
      completion_rate
    FROM module_learning_weights
    WHERE module_id = p_module_id
  ) row;

  RETURN QUERY SELECT v_feedback_id, v_weights;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger: Update updated_at timestamp on module_definitions
CREATE OR REPLACE FUNCTION update_module_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_module_definitions
BEFORE UPDATE ON module_definitions
FOR EACH ROW
EXECUTE FUNCTION update_module_definitions_timestamp();

-- Trigger: Update updated_at timestamp on user_module_recommendations
CREATE OR REPLACE FUNCTION update_recommendations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recommendations
BEFORE UPDATE ON user_module_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_recommendations_timestamp();

-- Trigger: Update updated_at timestamp on module_feedback
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback
BEFORE UPDATE ON module_feedback
FOR EACH ROW
EXECUTE FUNCTION update_feedback_timestamp();

-- Trigger: Update updated_at timestamp on module_learning_weights
CREATE OR REPLACE FUNCTION update_weights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weights
BEFORE UPDATE ON module_learning_weights
FOR EACH ROW
EXECUTE FUNCTION update_weights_timestamp();

-- =====================================================
-- SEED DATA: Initialize learning weights for all modules
-- =====================================================

-- This function initializes learning weights for modules not yet in the table
CREATE OR REPLACE FUNCTION initialize_module_weights()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO module_learning_weights (module_id, base_priority, recommendation_tendency)
  SELECT
    m.id,
    m.priority,
    CASE
      WHEN m.priority >= 8 THEN 0.8
      WHEN m.priority >= 6 THEN 0.6
      WHEN m.priority >= 4 THEN 0.4
      ELSE 0.2
    END
  FROM module_definitions m
  LEFT JOIN module_learning_weights w ON m.id = w.module_id
  WHERE w.id IS NULL
  ON CONFLICT (module_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Execute initialization
SELECT initialize_module_weights();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE user_module_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own recommendations
CREATE POLICY user_recommendations_isolation ON user_module_recommendations
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Users can only see their own feedback
CREATE POLICY user_feedback_isolation ON module_feedback
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Module definitions are publicly readable
CREATE POLICY module_definitions_public ON module_definitions
  FOR SELECT USING (true);

-- RLS Policy: Learning weights are admin only
ALTER TABLE module_learning_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_weights_admin_only ON module_learning_weights
  FOR ALL USING (false); -- Will be managed via functions

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE module_definitions IS
  'Catalog of all available learning modules. Each module has metadata about content, difficulty, triggering conditions, and prerequisites.';

COMMENT ON TABLE user_module_recommendations IS
  'Current personalized recommendations for each user. Data is cached and expires after 7 days. Tracks user feedback on recommendations.';

COMMENT ON TABLE module_feedback IS
  'Individual feedback records from users on recommended modules. Used for analytics and learning algorithm.';

COMMENT ON TABLE module_learning_weights IS
  'Dynamically adjusted weights for each module based on user feedback. Tracks acceptance and completion rates.';

COMMENT ON VIEW v_module_recommendation_stats IS
  'Analytics view showing how each module performs in recommendations, including acceptance and completion rates.';

COMMENT ON VIEW v_user_recommendation_history IS
  'User-specific view of their recommendation history with feedback and ratings.';

COMMENT ON VIEW v_user_feedback_trends IS
  'Aggregate feedback trends for each user showing acceptance and completion patterns.';

-- =====================================================
-- END OF MIGRATIONS
-- =====================================================
