-- ============================================================
-- Athlete RLS Policies for Flux Module
-- Allows athletes to read their microcycles/slots and update slots
-- ============================================================

-- 1. microcycles: athlete can SELECT their own
CREATE POLICY "athlete_select_own_microcycles" ON public.microcycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = microcycles.athlete_id
      AND a.auth_user_id = auth.uid()
    )
  );

-- 2. workout_slots: athlete can SELECT their own
CREATE POLICY "athlete_select_own_slots" ON public.workout_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE m.id = workout_slots.microcycle_id
      AND a.auth_user_id = auth.uid()
    )
  );

-- 3. workout_slots: athlete can UPDATE their own (complete, feedback)
CREATE POLICY "athlete_update_own_slots" ON public.workout_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.microcycles m
      JOIN public.athletes a ON a.id = m.athlete_id
      WHERE m.id = workout_slots.microcycle_id
      AND a.auth_user_id = auth.uid()
    )
  );
