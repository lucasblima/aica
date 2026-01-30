-- Add birth_date to profiles if it exists, or create it
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  birth_date date,
  updated_at timestamp with time zone
);

-- If profiles already exists but lacks birth_date
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE profiles ADD COLUMN birth_date date;
    END IF;
END $$;

-- Create life_events table
CREATE TABLE IF NOT EXISTS life_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  week_number integer NOT NULL, -- The week number from birth (0 to ~4000)
  event_date date, -- Calculated or specific date
  type text DEFAULT 'milestone', -- 'milestone', 'goal', 'memory'
  status text DEFAULT 'planned', -- 'planned', 'completed', 'skipped'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own life events" ON life_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own life events" ON life_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own life events" ON life_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own life events" ON life_events
  FOR DELETE USING (auth.uid() = user_id);
