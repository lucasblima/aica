-- Migration: Life Visualization & Gamification Schema (Simplified)
-- Version: Compatible with existing schema
-- Purpose: Add gamification tables without strict FK dependencies

-- ============================================
-- Table: profiles
-- Extends auth.users with custom user data
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    birthdate DATE,
    country VARCHAR(50) DEFAULT 'BR', -- For life expectancy calculation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================
-- Table: user_stats
-- Tracks user gamification metrics
-- ============================================
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_tasks INTEGER DEFAULT 0,
    level VARCHAR(20) DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'Master')),
    efficiency_score DECIMAL(5,2) DEFAULT 0.0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- ============================================
-- Table: task_metrics
-- Tracks detailed metrics for each work item
-- NO FK constraint - allows flexible usage
-- ============================================
CREATE TABLE IF NOT EXISTS task_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL, -- References work_items(id) but no FK for flexibility
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 3,
    estimated_duration DECIMAL(6,2), -- in hours
    actual_duration DECIMAL(6,2), -- in hours
    priority_quadrant VARCHAR(20) CHECK (priority_quadrant IN ('urgent-important', 'important', 'urgent', 'low')),
    roi_score DECIMAL(5,2), -- Impact / Effort ratio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(work_item_id)
);

CREATE INDEX IF NOT EXISTS idx_task_metrics_work_item_id ON task_metrics(work_item_id);
CREATE INDEX IF NOT EXISTS idx_task_metrics_priority ON task_metrics(priority_quadrant);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User stats policies
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats" ON user_stats
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats" ON user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Task metrics policies (simplified - based on work_item ownership via associations)
DROP POLICY IF EXISTS "Users can view own task metrics" ON task_metrics;
CREATE POLICY "Users can view own task metrics" ON task_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM work_items wi
            JOIN association_members am ON wi.association_id = am.association_id
            WHERE wi.id = task_metrics.work_item_id 
            AND am.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own task metrics" ON task_metrics;
CREATE POLICY "Users can insert own task metrics" ON task_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM work_items wi
            JOIN association_members am ON wi.association_id = am.association_id
            WHERE wi.id = task_metrics.work_item_id 
            AND am.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own task metrics" ON task_metrics;
CREATE POLICY "Users can update own task metrics" ON task_metrics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM work_items wi
            JOIN association_members am ON wi.association_id = am.association_id
            WHERE wi.id = task_metrics.work_item_id 
            AND am.user_id = auth.uid()
        )
    );

-- ============================================
-- Helper function to initialize user profile and stats
-- ============================================
CREATE OR REPLACE FUNCTION initialize_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile entry
    INSERT INTO profiles (id, country)
    VALUES (NEW.id, 'BR')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create stats entry
    INSERT INTO user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile and stats for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_gamification();

-- ============================================
-- Success message
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully! Tables created: profiles, user_stats, task_metrics';
END $$;
