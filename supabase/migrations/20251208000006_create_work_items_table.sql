-- =====================================================
-- MIGRATION: Create work_items table for Atlas module
-- Description: Tasks management system with categories
-- Date: 2025-12-08
-- =====================================================

-- Create task_categories table first (for foreign key reference)
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#948D82',
    icon TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT task_categories_name_user_unique UNIQUE(user_id, name)
);

-- Create work_items table (tasks)
CREATE TABLE IF NOT EXISTS work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    association_id UUID REFERENCES associations(id) ON DELETE SET NULL,

    -- Basic fields
    title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 500),
    description TEXT CHECK (description IS NULL OR length(description) <= 5000),

    -- Task management
    priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'medium',
    priority_quadrant INTEGER CHECK (priority_quadrant BETWEEN 1 AND 4),
    status TEXT CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',

    -- Categorization
    category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,

    -- Flags
    is_completed BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,

    -- Dates
    due_date DATE,
    start_date DATE,
    scheduled_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Additional metadata
    estimated_duration INTEGER CHECK (estimated_duration IS NULL OR estimated_duration > 0),
    life_area_id UUID,
    life_event_id UUID,
    assignee_name TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_association_id ON work_items(association_id);
CREATE INDEX IF NOT EXISTS idx_work_items_category_id ON work_items(category_id);
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_due_date ON work_items(due_date);
CREATE INDEX IF NOT EXISTS idx_work_items_archived ON work_items(archived);
CREATE INDEX IF NOT EXISTS idx_work_items_is_completed ON work_items(is_completed);

CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON task_categories(user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- work_items policies
DROP POLICY IF EXISTS "Users can view their own work items" ON work_items;
CREATE POLICY "Users can view their own work items"
    ON work_items FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own work items" ON work_items;
CREATE POLICY "Users can insert their own work items"
    ON work_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own work items" ON work_items;
CREATE POLICY "Users can update their own work items"
    ON work_items FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own work items" ON work_items;
CREATE POLICY "Users can delete their own work items"
    ON work_items FOR DELETE
    USING (auth.uid() = user_id);

-- task_categories policies
DROP POLICY IF EXISTS "Users can view their own categories" ON task_categories;
CREATE POLICY "Users can view their own categories"
    ON task_categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON task_categories;
CREATE POLICY "Users can insert their own categories"
    ON task_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON task_categories;
CREATE POLICY "Users can update their own categories"
    ON task_categories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON task_categories;
CREATE POLICY "Users can delete their own categories"
    ON task_categories FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_work_items_updated_at ON work_items;
CREATE TRIGGER update_work_items_updated_at
    BEFORE UPDATE ON work_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
CREATE TRIGGER update_task_categories_updated_at
    BEFORE UPDATE ON task_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set completed_at when is_completed changes to true
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        NEW.completed_at = now();
    ELSIF NEW.is_completed = false THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_work_items_completed_at ON work_items;
CREATE TRIGGER set_work_items_completed_at
    BEFORE UPDATE ON work_items
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- =====================================================
-- SEED DEFAULT CATEGORIES
-- =====================================================

-- Insert default system categories for all users
-- (Will be executed once during migration)
INSERT INTO task_categories (user_id, name, color, icon, is_system)
SELECT
    u.id,
    c.name,
    c.color,
    c.icon,
    true
FROM auth.users u
CROSS JOIN (
    VALUES
        ('Pessoal', '#3B82F6', '👤'),
        ('Trabalho', '#10B981', '💼'),
        ('Saúde', '#EF4444', '❤️'),
        ('Educação', '#8B5CF6', '📚'),
        ('Finanças', '#F59E0B', '💰'),
        ('Casa', '#06B6D4', '🏠')
) AS c(name, color, icon)
ON CONFLICT (user_id, name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE work_items IS 'Tasks managed by Atlas module - daily agenda items';
COMMENT ON TABLE task_categories IS 'User-defined categories for organizing tasks';
COMMENT ON COLUMN work_items.priority_quadrant IS 'Eisenhower Matrix quadrant: 1=Urgent+Important, 2=Important, 3=Urgent, 4=Neither';
COMMENT ON COLUMN work_items.estimated_duration IS 'Estimated task duration in minutes';
COMMENT ON COLUMN task_categories.is_system IS 'System-provided categories cannot be deleted';
