-- Athlete groups table
CREATE TABLE IF NOT EXISTS public.athlete_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'amber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Group membership (many-to-many: athletes <-> groups)
CREATE TABLE IF NOT EXISTS public.athlete_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.athlete_groups(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, athlete_id)
);

-- RLS
ALTER TABLE public.athlete_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own groups" ON public.athlete_groups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own groups" ON public.athlete_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups" ON public.athlete_groups
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON public.athlete_groups
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own group members" ON public.athlete_group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own group members" ON public.athlete_group_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own group members" ON public.athlete_group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_athlete_groups_user_id ON public.athlete_groups(user_id);
CREATE INDEX idx_athlete_group_members_group_id ON public.athlete_group_members(group_id);
CREATE INDEX idx_athlete_group_members_athlete_id ON public.athlete_group_members(athlete_id);
