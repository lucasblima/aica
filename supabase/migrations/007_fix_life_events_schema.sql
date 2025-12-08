-- Fix life_events schema and add module column
-- Run this in the Supabase SQL Editor

-- 1. Ensure 'type' column exists (it was missing in the schema cache error)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'life_events' AND column_name = 'type') THEN
        ALTER TABLE life_events ADD COLUMN type text DEFAULT 'milestone';
    END IF;
END $$;

-- 2. Add 'module' column for Life Areas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'life_events' AND column_name = 'module') THEN
        ALTER TABLE life_events ADD COLUMN module text;
    END IF;
END $$;

-- 3. Add 'status' column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'life_events' AND column_name = 'status') THEN
        ALTER TABLE life_events ADD COLUMN status text DEFAULT 'planned';
    END IF;
END $$;
