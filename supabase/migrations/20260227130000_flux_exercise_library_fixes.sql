-- Migration: flux_exercise_library_fixes
-- Add usage_count tracking to workout_templates via trigger on workout_slots

-- 1. Add usage_count column to workout_templates
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

-- 2. Create trigger function to maintain usage_count
CREATE OR REPLACE FUNCTION public.update_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.template_id IS NOT NULL THEN
    UPDATE workout_templates SET usage_count = usage_count + 1 WHERE id = NEW.template_id;
  ELSIF TG_OP = 'DELETE' AND OLD.template_id IS NOT NULL THEN
    UPDATE workout_templates SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.template_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.template_id IS DISTINCT FROM NEW.template_id THEN
      IF OLD.template_id IS NOT NULL THEN
        UPDATE workout_templates SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.template_id;
      END IF;
      IF NEW.template_id IS NOT NULL THEN
        UPDATE workout_templates SET usage_count = usage_count + 1 WHERE id = NEW.template_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on workout_slots
DROP TRIGGER IF EXISTS trg_template_usage_count ON public.workout_slots;
CREATE TRIGGER trg_template_usage_count
  AFTER INSERT OR UPDATE OR DELETE ON public.workout_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_template_usage_count();

-- 4. Backfill existing usage counts from workout_slots
UPDATE public.workout_templates wt
SET usage_count = (
  SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.template_id = wt.id
);
