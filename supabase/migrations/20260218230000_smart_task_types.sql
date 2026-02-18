-- Smart Task Types: adds task classification and checklist support
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'task'
  CHECK (task_type IN ('task', 'list', 'event'));
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT NULL;
-- checklist format: [{text: string, done: boolean}]
