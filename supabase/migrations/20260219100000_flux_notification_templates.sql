-- Migration: flux_notification_templates
-- Adds Flux-specific notification templates and a trigger to auto-create
-- in-app notifications when new alerts are inserted in the alerts table.

-- ============================================================================
-- 1. INSERT FLUX NOTIFICATION TEMPLATES
-- ============================================================================

INSERT INTO notification_templates (
  template_key, template_name, template_description,
  message_template, required_variables, notification_type, is_system
)
VALUES
  (
    'flux_feedback_received',
    'Feedback de Atleta',
    'Notificacao quando um atleta envia feedback sobre o treino',
    'Atleta {{athlete_name}} enviou feedback sobre o treino',
    ARRAY['athlete_name'],
    'flux_alert',
    true
  ),
  (
    'flux_low_adherence',
    'Aderencia Baixa',
    'Notificacao quando um atleta esta com aderencia abaixo do limite',
    'Atleta {{athlete_name}} com aderencia abaixo de {{threshold}}%',
    ARRAY['athlete_name', 'threshold'],
    'flux_alert',
    true
  ),
  (
    'flux_parq_expiring',
    'PAR-Q Expirando',
    'Notificacao quando o PAR-Q de um atleta esta proximo de expirar',
    'PAR-Q de {{athlete_name}} expira em {{days}} dias',
    ARRAY['athlete_name', 'days'],
    'flux_alert',
    true
  ),
  (
    'flux_alert_critical',
    'Alerta Critico',
    'Notificacao para alertas criticos do Flux',
    'Alerta critico: {{message_preview}}',
    ARRAY['message_preview'],
    'flux_alert',
    true
  )
ON CONFLICT (template_key) DO NOTHING;

-- ============================================================================
-- 2. TRIGGER: Auto-create notification_log entry on new alert
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_flux_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_log (
    user_id,
    target_phone,
    attempt_number,
    status,
    started_at,
    completed_at,
    evolution_response
  ) VALUES (
    NEW.user_id,
    'in_app',
    1,
    'success',
    now(),
    now(),
    jsonb_build_object(
      'channel', 'in_app',
      'source', 'flux_alert',
      'alert_id', NEW.id,
      'alert_type', NEW.alert_type,
      'severity', NEW.severity,
      'message_preview', NEW.message_preview,
      'athlete_id', NEW.athlete_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to alerts table
DROP TRIGGER IF EXISTS trg_flux_alert_notification ON public.alerts;

CREATE TRIGGER trg_flux_alert_notification
  AFTER INSERT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_flux_alert();

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION notify_on_flux_alert IS 'Auto-creates an in-app notification log entry when a Flux alert is inserted';
