-- Custom Coach Levels (#911)
-- Allows coaches to create up to 10 custom levels (e.g., "Elite", "Recreativo")
-- instead of being limited to the 3 hardcoded defaults.

CREATE TABLE IF NOT EXISTS public.coach_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'amber',
  min_consistency INT,
  min_weekly_volume INT,
  max_weekly_volume INT,
  min_weeks_active INT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.coach_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own levels" ON public.coach_levels
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own levels" ON public.coach_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own levels" ON public.coach_levels
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own levels" ON public.coach_levels
  FOR DELETE USING (auth.uid() = user_id);

-- FK on athletes table to reference custom level
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS custom_level_id UUID REFERENCES public.coach_levels(id) ON DELETE SET NULL;

-- Index for fast lookup by coach
CREATE INDEX idx_coach_levels_user_id ON public.coach_levels(user_id);
