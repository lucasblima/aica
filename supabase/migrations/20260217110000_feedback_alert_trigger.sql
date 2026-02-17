-- Migration: feedback_alert_trigger
-- Creates the alerts table for Flux coach notifications (if not exists)
-- and a trigger to auto-insert an alert when an athlete submits feedback.

-- ============================================
-- 1. Create alerts table (Flux coach alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'custom',
  severity TEXT NOT NULL DEFAULT 'low',
  message_preview TEXT NOT NULL DEFAULT '',
  keywords_detected TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  feedback_id UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (trigger runs as SECURITY DEFINER)
CREATE POLICY "Service can insert alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_created
  ON public.alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged
  ON public.alerts(user_id)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_athlete
  ON public.alerts(athlete_id, created_at DESC);

-- ============================================
-- 2. Trigger function: notify coach on feedback
-- ============================================
CREATE OR REPLACE FUNCTION notify_coach_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coach_id UUID;
  v_athlete_name TEXT;
BEGIN
  -- Only fire when athlete_feedback changes from null to non-null
  IF OLD.athlete_feedback IS NULL AND NEW.athlete_feedback IS NOT NULL THEN
    SELECT a.user_id, a.name INTO v_coach_id, v_athlete_name
    FROM athletes a
    WHERE a.id = NEW.athlete_id;

    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.alerts (
        user_id,
        athlete_id,
        alert_type,
        severity,
        message_preview,
        metadata
      ) VALUES (
        v_coach_id,
        NEW.athlete_id,
        'feedback_received',
        'low',
        v_athlete_name || ' enviou feedback sobre o treino "' || COALESCE(NEW.name, 'Treino') || '"',
        jsonb_build_object(
          'slot_id', NEW.id,
          'feedback', LEFT(NEW.athlete_feedback, 100),
          'rpe', NEW.rpe
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. Attach trigger to workout_slots
-- ============================================
DROP TRIGGER IF EXISTS trg_feedback_alert ON public.workout_slots;

CREATE TRIGGER trg_feedback_alert
  AFTER UPDATE ON public.workout_slots
  FOR EACH ROW
  EXECUTE FUNCTION notify_coach_on_feedback();
