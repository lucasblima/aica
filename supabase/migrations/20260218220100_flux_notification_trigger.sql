-- Trigger function: notify athlete when microcycle becomes active
-- Inserts into scheduled_notifications (the user-facing table read by useNotifications hook)
CREATE OR REPLACE FUNCTION public.notify_athlete_on_prescription()
RETURNS TRIGGER AS $$
DECLARE
  v_athlete_auth_id UUID;
  v_coach_name TEXT;
BEGIN
  -- Only fire when status changes to 'active'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active')) THEN
    -- Get athlete's auth_user_id
    SELECT a.auth_user_id INTO v_athlete_auth_id
    FROM public.athletes a
    WHERE a.id = NEW.athlete_id;

    -- Only notify if athlete is linked to an auth user
    IF v_athlete_auth_id IS NOT NULL THEN
      -- Get coach name from auth.users
      SELECT COALESCE(raw_user_meta_data->>'full_name', 'Seu coach')
      INTO v_coach_name
      FROM auth.users
      WHERE id = NEW.user_id;

      -- Insert into scheduled_notifications (frontend reads this table)
      INSERT INTO public.scheduled_notifications (
        user_id,
        title,
        body,
        notification_type,
        channel,
        status,
        priority,
        scheduled_for,
        sent_at,
        metadata
      ) VALUES (
        v_athlete_auth_id,
        'Novo treino disponivel!',
        'Seu coach ' || v_coach_name || ' prescreveu: ' || COALESCE(NEW.name, 'Novo microciclo'),
        'custom',
        'push',
        'sent',
        'high',
        NOW(),
        NOW(),
        jsonb_build_object(
          'microcycle_id', NEW.id,
          'athlete_id', NEW.athlete_id,
          'coach_user_id', NEW.user_id,
          'coach_name', v_coach_name,
          'action_url', '/meu-treino',
          'source', 'flux_prescription'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to microcycles table
DROP TRIGGER IF EXISTS trg_notify_athlete_on_prescription ON public.microcycles;
CREATE TRIGGER trg_notify_athlete_on_prescription
  AFTER UPDATE ON public.microcycles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_athlete_on_prescription();
