-- ============================================================================
-- MIGRATION: Create Missing RLS Test Tables
-- Date: 2026-01-16
-- Author: Backend Architect Agent + Claude Sonnet 4.5
--
-- PURPOSE:
-- Create database tables required for E2E security RLS tests:
-- 1. budget_categories - Finance module budget category tracking
-- 2. memories - User memories/notes storage
-- 3. podcast_topics - Podcast episode topic segments
--
-- STANDARDS APPLIED:
-- ✅ Standard columns (id, created_at, updated_at)
-- ✅ RLS enabled with complete CRUD policies
-- ✅ SECURITY DEFINER helper functions (no recursion)
-- ✅ Performance indexes on foreign keys + common queries
-- ✅ updated_at triggers
-- ✅ Comprehensive documentation comments
-- ============================================================================

-- ============================================================================
-- TABLE 1: budget_categories
-- Purpose: Budget category tracking for finance module
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Category details
  name TEXT NOT NULL,
  budget_limit NUMERIC(12, 2), -- Optional monthly budget limit
  color TEXT, -- Hex color code for UI (e.g., #FF5733)
  icon TEXT, -- Icon identifier for UI

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT budget_categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT budget_categories_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id
  ON public.budget_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_budget_categories_user_created
  ON public.budget_categories(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can insert own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can update own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can delete own budget categories" ON public.budget_categories;

-- RLS Policies (no SECURITY DEFINER needed - simple user_id check)
CREATE POLICY "Users can view own budget categories"
  ON public.budget_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget categories"
  ON public.budget_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget categories"
  ON public.budget_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget categories"
  ON public.budget_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE public.budget_categories IS
  'User-defined budget categories for finance tracking with optional spending limits';
COMMENT ON COLUMN public.budget_categories.budget_limit IS
  'Optional monthly budget limit for this category in user currency';
COMMENT ON COLUMN public.budget_categories.color IS
  'Hex color code for UI visualization (e.g., #FF5733)';
COMMENT ON COLUMN public.budget_categories.icon IS
  'Icon identifier for UI display (e.g., material-icons name)';

-- ============================================================================
-- TABLE 2: memories
-- Purpose: User memories, notes, reflections storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory content
  title TEXT,
  content TEXT NOT NULL,
  memory_type TEXT DEFAULT 'note'
    CHECK (memory_type IN ('note', 'reflection', 'insight')),
  tags TEXT[] DEFAULT '{}'::TEXT[], -- Array of tags for filtering

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT memories_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id
  ON public.memories(user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user_created
  ON public.memories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_memory_type
  ON public.memories(memory_type);

-- GIN index for tag array searches
CREATE INDEX IF NOT EXISTS idx_memories_tags
  ON public.memories USING GIN(tags);

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can update own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON public.memories;

-- RLS Policies (no SECURITY DEFINER needed - simple user_id check)
CREATE POLICY "Users can view own memories"
  ON public.memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON public.memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON public.memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON public.memories FOR DELETE
  USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE public.memories IS
  'User memories, notes, and reflections with tag-based organization';
COMMENT ON COLUMN public.memories.memory_type IS
  'Type classification: note (general), reflection (introspective), insight (aha moment)';
COMMENT ON COLUMN public.memories.tags IS
  'Array of tags for filtering and organization (searchable via GIN index)';

-- ============================================================================
-- TABLE 3: podcast_topics
-- Purpose: Topic segments within podcast episodes (for timeline/teleprompter)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.podcast_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Episode relationship (nullable to support standalone topics)
  episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Topic details
  topic_name TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER, -- Planned or actual duration
  order_index INTEGER NOT NULL DEFAULT 0, -- Position in episode timeline

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT podcast_topics_topic_name_not_empty CHECK (LENGTH(TRIM(topic_name)) > 0),
  CONSTRAINT podcast_topics_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT podcast_topics_order_non_negative CHECK (order_index >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_podcast_topics_user_id
  ON public.podcast_topics(user_id);

CREATE INDEX IF NOT EXISTS idx_podcast_topics_episode_id
  ON public.podcast_topics(episode_id);

CREATE INDEX IF NOT EXISTS idx_podcast_topics_episode_order
  ON public.podcast_topics(episode_id, order_index);

-- Enable RLS
ALTER TABLE public.podcast_topics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own podcast topics" ON public.podcast_topics;
DROP POLICY IF EXISTS "Users can insert own podcast topics" ON public.podcast_topics;
DROP POLICY IF EXISTS "Users can update own podcast topics" ON public.podcast_topics;
DROP POLICY IF EXISTS "Users can delete own podcast topics" ON public.podcast_topics;

-- SECURITY DEFINER helper function for episode ownership check
-- (Prevents RLS recursion if episode table also has RLS)
CREATE OR REPLACE FUNCTION public.is_podcast_episode_owner(_episode_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If episode_id is NULL, skip episode ownership check
  IF _episode_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if user owns the episode
  RETURN EXISTS (
    SELECT 1 FROM public.podcast_episodes
    WHERE id = _episode_id
      AND user_id = auth.uid()
  );
END;
$$;

-- RLS Policies (using SECURITY DEFINER for episode ownership)
CREATE POLICY "Users can view own podcast topics"
  ON public.podcast_topics FOR SELECT
  USING (
    auth.uid() = user_id
    OR (episode_id IS NOT NULL AND public.is_podcast_episode_owner(episode_id))
  );

CREATE POLICY "Users can insert own podcast topics"
  ON public.podcast_topics FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (episode_id IS NULL OR public.is_podcast_episode_owner(episode_id))
  );

CREATE POLICY "Users can update own podcast topics"
  ON public.podcast_topics FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (episode_id IS NOT NULL AND public.is_podcast_episode_owner(episode_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (episode_id IS NULL OR public.is_podcast_episode_owner(episode_id))
  );

CREATE POLICY "Users can delete own podcast topics"
  ON public.podcast_topics FOR DELETE
  USING (
    auth.uid() = user_id
    OR (episode_id IS NOT NULL AND public.is_podcast_episode_owner(episode_id))
  );

-- Updated timestamp trigger
CREATE TRIGGER update_podcast_topics_updated_at
  BEFORE UPDATE ON public.podcast_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE public.podcast_topics IS
  'Topic segments within podcast episodes for timeline organization and teleprompter';
COMMENT ON COLUMN public.podcast_topics.episode_id IS
  'Reference to podcast_episodes (nullable for standalone topic planning)';
COMMENT ON COLUMN public.podcast_topics.order_index IS
  'Sequential position in episode timeline (0-indexed, used for sorting)';
COMMENT ON COLUMN public.podcast_topics.duration_seconds IS
  'Planned or actual duration of this topic segment in seconds';

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify migration success)
-- ============================================================================

-- Verify table creation
-- SELECT table_name, table_type FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('budget_categories', 'memories', 'podcast_topics');

-- Verify RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('budget_categories', 'memories', 'podcast_topics');

-- Verify policies count (should have 4 each for budget_categories and memories, 4 for podcast_topics)
-- SELECT schemaname, tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('budget_categories', 'memories', 'podcast_topics')
-- GROUP BY schemaname, tablename;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
