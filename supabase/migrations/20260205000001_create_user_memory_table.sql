-- Migration: 20260205000001_create_user_memory_table.sql
-- Description: Create user_memory table for agent-based learning system (Mem0-style).
--              Stores facts, preferences, insights, and patterns learned about users
--              across modules for personalized AI interactions.
-- Related: Task #35 - User Memory Table

-- ============================================================================
-- 1. Create user_memory table with standard columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_memory (
  -- Standard columns
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('profile', 'preference', 'fact', 'insight', 'pattern')),
  module TEXT CHECK (module IN ('atlas', 'journey', 'studio', 'captacao', 'finance', 'connections')),
  -- NULL module = global/cross-module memory

  -- Content structure
  key TEXT NOT NULL,
  -- Examples: 'communication_style', 'work_hours', 'emotional_patterns', 'productivity_peak'
  value JSONB NOT NULL,
  -- Structured value for flexible data storage

  -- Metadata & confidence
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  -- Confidence level: 1.0 = high confidence, 0.0 = low confidence

  source TEXT NOT NULL CHECK (source IN ('explicit', 'inferred', 'observed')),
  -- explicit = user stated directly
  -- inferred = LLM deduced from conversations
  -- observed = system tracked behavior patterns

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  -- last_accessed_at tracks when this memory was last used by an agent

  -- Ensure unique keys per user per category per module
  CONSTRAINT unique_user_memory_key UNIQUE(user_id, category, key, module)
);

-- ============================================================================
-- 2. Enable Row-Level Security
-- ============================================================================

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Create SECURITY DEFINER helper functions (not needed for this table)
-- ============================================================================
-- Note: user_memory has simple ownership-based access, no complex logic needed

-- ============================================================================
-- 4. Create RLS policies
-- ============================================================================

-- Users can view their own memories
CREATE POLICY "Users can view own memory"
  ON user_memory FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own memories
CREATE POLICY "Users can insert own memory"
  ON user_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own memories
CREATE POLICY "Users can update own memory"
  ON user_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete own memory"
  ON user_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for agent operations (n8n, Edge Functions)
CREATE POLICY "Service role full access to memory"
  ON user_memory FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. Create updated_at trigger
-- ============================================================================

CREATE TRIGGER update_user_memory_updated_at
  BEFORE UPDATE ON user_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Create performance indexes
-- ============================================================================

-- Primary access patterns
CREATE INDEX idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX idx_user_memory_category ON user_memory(user_id, category);
CREATE INDEX idx_user_memory_module ON user_memory(user_id, module) WHERE module IS NOT NULL;
CREATE INDEX idx_user_memory_key ON user_memory(user_id, key);
CREATE INDEX idx_user_memory_last_accessed ON user_memory(last_accessed_at DESC);

-- JSONB value search (GIN index for efficient JSONB queries)
CREATE INDEX idx_user_memory_value ON user_memory USING GIN (value);

-- Composite index for common query patterns
CREATE INDEX idx_user_memory_category_module ON user_memory(user_id, category, module);

-- Source-based filtering
CREATE INDEX idx_user_memory_source ON user_memory(user_id, source);

-- Confidence-based retrieval (high confidence memories first)
CREATE INDEX idx_user_memory_confidence ON user_memory(confidence DESC) WHERE confidence >= 0.7;

-- ============================================================================
-- 7. Create helper function for updating last_accessed_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_memory_last_accessed(memory_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_memory
  SET last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION update_user_memory_last_accessed IS
  'Updates last_accessed_at timestamp when an agent retrieves a memory. Call this after querying memories for context.';

-- ============================================================================
-- 8. Add documentation comments
-- ============================================================================

COMMENT ON TABLE user_memory IS
  'Stores user facts, preferences, insights, and patterns learned by AI agents over time (Mem0-style memory system).';

COMMENT ON COLUMN user_memory.id IS
  'Primary key UUID';

COMMENT ON COLUMN user_memory.user_id IS
  'Owner of this memory (references auth.users)';

COMMENT ON COLUMN user_memory.category IS
  'Type of memory: profile, preference, fact, insight, or pattern';

COMMENT ON COLUMN user_memory.module IS
  'Module context (atlas, journey, studio, captacao, finance, connections) or NULL for global';

COMMENT ON COLUMN user_memory.key IS
  'Semantic key identifying what this memory is about (e.g., communication_style, productivity_peak)';

COMMENT ON COLUMN user_memory.value IS
  'Structured JSONB value containing the memory data';

COMMENT ON COLUMN user_memory.confidence IS
  'Confidence level 0-1: how certain the agent is about this memory';

COMMENT ON COLUMN user_memory.source IS
  'How this memory was obtained: explicit (user said), inferred (LLM deduced), observed (system tracked)';

COMMENT ON COLUMN user_memory.created_at IS
  'When this memory was first created';

COMMENT ON COLUMN user_memory.updated_at IS
  'When this memory was last updated';

COMMENT ON COLUMN user_memory.last_accessed_at IS
  'When this memory was last retrieved by an agent';

-- ============================================================================
-- 9. Example usage data (for documentation/testing)
-- ============================================================================

/*
-- Example 1: Global preference (communication style)
INSERT INTO user_memory (user_id, category, module, key, value, source, confidence)
VALUES (
  auth.uid(),
  'preference',
  NULL,  -- Global preference
  'communication_style',
  '{"tone": "informal", "language": "pt-BR", "preferred_greeting": "E aí"}'::jsonb,
  'explicit',
  1.0
);

-- Example 2: Journey module fact (emotional trigger)
INSERT INTO user_memory (user_id, category, module, key, value, source, confidence)
VALUES (
  auth.uid(),
  'fact',
  'journey',
  'emotional_trigger',
  '{"trigger": "deadlines", "emotion": "anxious", "frequency": "high", "coping_strategy": "morning_meditation"}'::jsonb,
  'inferred',
  0.85
);

-- Example 3: Atlas module pattern (productivity peak hours)
INSERT INTO user_memory (user_id, category, module, key, value, source, confidence)
VALUES (
  auth.uid(),
  'pattern',
  'atlas',
  'productivity_peak',
  '{"best_hours": ["09:00", "10:00", "11:00"], "worst_hours": ["14:00", "15:00"], "sample_size": 45}'::jsonb,
  'observed',
  0.92
);

-- Example 4: Cross-module insight
INSERT INTO user_memory (user_id, category, module, key, value, source, confidence)
VALUES (
  auth.uid(),
  'insight',
  NULL,  -- Cross-module
  'productivity_emotion_correlation',
  '{"finding": "Produtividade aumenta 40% após reflexões matinais no Journey", "correlation": 0.78, "sample_days": 30}'::jsonb,
  'inferred',
  0.88
);

-- Example 5: Studio module preference (guest selection criteria)
INSERT INTO user_memory (user_id, category, module, key, value, source, confidence)
VALUES (
  auth.uid(),
  'preference',
  'studio',
  'guest_criteria',
  '{"min_follower_count": 10000, "preferred_topics": ["AI", "technology", "innovation"], "avoid_topics": ["politics"]}'::jsonb,
  'explicit',
  1.0
);

-- Query examples:

-- Get all high-confidence patterns for a user
SELECT * FROM user_memory
WHERE user_id = auth.uid()
  AND category = 'pattern'
  AND confidence >= 0.8
ORDER BY confidence DESC;

-- Get module-specific preferences
SELECT * FROM user_memory
WHERE user_id = auth.uid()
  AND category = 'preference'
  AND module = 'atlas';

-- Search JSONB values (e.g., find all memories mentioning "deadlines")
SELECT * FROM user_memory
WHERE user_id = auth.uid()
  AND value @> '{"trigger": "deadlines"}'::jsonb;

-- Get recently accessed memories (for agent context)
SELECT * FROM user_memory
WHERE user_id = auth.uid()
ORDER BY last_accessed_at DESC
LIMIT 10;

-- Update confidence after validation
UPDATE user_memory
SET confidence = 0.95,
    updated_at = NOW()
WHERE id = 'memory-uuid-here';
*/
