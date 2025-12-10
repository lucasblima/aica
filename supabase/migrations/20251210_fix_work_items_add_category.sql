-- =====================================================
-- MIGRATION: Fix work_items - Add category support
-- Description: Adds task_categories table and category_id column
-- Date: 2025-12-10
-- =====================================================

-- Step 1: Create task_categories table if not exists
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

-- Step 2: Add category_id column to work_items if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'work_items'
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE work_items
        ADD COLUMN category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_work_items_category_id ON work_items(category_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON task_categories(user_id);

-- Step 4: Enable RLS on task_categories
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for task_categories
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

-- Step 6: Create trigger for updated_at on task_categories
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
CREATE TRIGGER update_task_categories_updated_at
    BEFORE UPDATE ON task_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Seed default categories for existing users
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

-- Step 8: Add comments
COMMENT ON TABLE task_categories IS 'User-defined categories for organizing tasks';
COMMENT ON COLUMN task_categories.is_system IS 'System-provided categories cannot be deleted';
COMMENT ON COLUMN work_items.category_id IS 'Optional category for task organization';
