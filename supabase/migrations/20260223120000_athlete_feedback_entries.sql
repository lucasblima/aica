-- Athlete Feedback Entries — structured questionnaire + weekly voice feedback
-- Stores per-exercise and weekly feedback from athletes, with optional
-- voice transcription and structured questionnaire responses.

CREATE TABLE public.athlete_feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  microcycle_id UUID NOT NULL REFERENCES public.microcycles(id) ON DELETE CASCADE,

  -- Scope
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('exercise', 'weekly')),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3),
  slot_id UUID REFERENCES public.workout_slots(id) ON DELETE SET NULL, -- NULL for weekly

  -- Structured questionnaire (6-point scales, 0-5)
  questionnaire JSONB,

  -- Free-form
  notes TEXT,
  voice_transcript TEXT,
  voice_duration_seconds INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_afe_athlete_micro ON public.athlete_feedback_entries(athlete_id, microcycle_id, week_number);
CREATE INDEX idx_afe_slot ON public.athlete_feedback_entries(slot_id) WHERE slot_id IS NOT NULL;
CREATE INDEX idx_afe_type ON public.athlete_feedback_entries(feedback_type, created_at DESC);

-- RLS
ALTER TABLE public.athlete_feedback_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.athlete_feedback_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.athlete_feedback_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.athlete_feedback_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.athlete_feedback_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_full" ON public.athlete_feedback_entries
  FOR ALL USING (auth.role() = 'service_role');

-- Coach read access (coach = microcycles.user_id)
CREATE POLICY "coach_select" ON public.athlete_feedback_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      WHERE m.id = athlete_feedback_entries.microcycle_id
        AND m.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_afe_updated_at
  BEFORE UPDATE ON public.athlete_feedback_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
