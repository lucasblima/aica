-- Create user_tour_progress table to track which tours users have seen
-- This table is used by the organic onboarding system to show contextual tooltips
-- only on first visit to each feature

CREATE TABLE user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL, -- Unique identifier for each tour (e.g., 'atlas-first-visit')
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each user can only have one record per tour
  UNIQUE(user_id, tour_key),

  CONSTRAINT tour_key_format CHECK (tour_key ~ '^[a-z-]+$')
);

-- Enable RLS
ALTER TABLE user_tour_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tour progress
CREATE POLICY "Users can view their own tour progress"
  ON user_tour_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own tour progress
CREATE POLICY "Users can insert their own tour progress"
  ON user_tour_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own tour progress
CREATE POLICY "Users can update their own tour progress"
  ON user_tour_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries when checking if user has seen a tour
CREATE INDEX idx_user_tour_progress_user_id_tour_key
  ON user_tour_progress(user_id, tour_key);

-- Create index for finding users who have completed a specific tour
CREATE INDEX idx_user_tour_progress_tour_key
  ON user_tour_progress(tour_key);

COMMENT ON TABLE user_tour_progress IS 'Tracks which onboarding tours each user has completed. Used to show tooltips only on first visit.';
COMMENT ON COLUMN user_tour_progress.tour_key IS 'Unique identifier for each tour (e.g., atlas-first-visit, journey-first-visit)';
COMMENT ON COLUMN user_tour_progress.completed_at IS 'Timestamp when user completed or skipped this tour';
