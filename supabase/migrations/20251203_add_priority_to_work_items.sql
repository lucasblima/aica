-- Add priority column to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'none';

-- Add index for priority
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);

COMMENT ON COLUMN work_items.priority IS 'Priority level synced from Atlas/Plane (urgent, high, medium, low, none)';
