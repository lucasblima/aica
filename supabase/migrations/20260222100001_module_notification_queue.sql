-- ============================================================================
-- CS-005: Module Notification Pipeline
-- Queue + trigger for notifying waitlist users on status transitions
-- ============================================================================

-- 1. NOTIFICATION QUEUE TABLE
CREATE TABLE IF NOT EXISTS module_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES module_registry(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'teaser_to_preview', 'preview_to_beta', 'beta_to_live', 'status_change'
  )),
  old_status TEXT,
  new_status TEXT,
  title TEXT NOT NULL,
  body TEXT,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE module_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON module_notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_mnq_status ON module_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_mnq_module ON module_notification_queue(module_id);
CREATE INDEX IF NOT EXISTS idx_mnq_user ON module_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_mnq_created ON module_notification_queue(created_at);

-- 4. NOTIFICATION TEMPLATES
-- Maps old_status → new_status to notification content

CREATE OR REPLACE FUNCTION get_module_notification_template(
  p_module_name TEXT,
  p_old_status TEXT,
  p_new_status TEXT
)
RETURNS TABLE(title TEXT, body TEXT, notification_type TEXT) AS $$
BEGIN
  IF p_old_status = 'teaser' AND p_new_status = 'preview' THEN
    RETURN QUERY SELECT
      format('%s entrou em Preview!', p_module_name)::TEXT,
      format('%s agora esta disponivel em modo Preview. Experimente agora!', p_module_name)::TEXT,
      'teaser_to_preview'::TEXT;
  ELSIF p_old_status = 'preview' AND p_new_status = 'beta' THEN
    RETURN QUERY SELECT
      format('%s entrou em Beta!', p_module_name)::TEXT,
      format('%s agora esta em Beta. Como membro da lista de espera, voce tem acesso antecipado!', p_module_name)::TEXT,
      'preview_to_beta'::TEXT;
  ELSIF p_new_status = 'live' THEN
    RETURN QUERY SELECT
      format('%s esta disponivel!', p_module_name)::TEXT,
      format('Otima noticia! %s agora esta disponivel para todos. Acesse agora e explore todas as funcionalidades!', p_module_name)::TEXT,
      'beta_to_live'::TEXT;
  ELSE
    RETURN QUERY SELECT
      format('%s foi atualizado', p_module_name)::TEXT,
      format('O modulo %s mudou de %s para %s.', p_module_name, COALESCE(p_old_status, 'desconhecido'), p_new_status)::TEXT,
      'status_change'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. TRIGGER — on module_registry status change, queue notifications for waitlist users
CREATE OR REPLACE FUNCTION queue_module_status_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_template RECORD;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify for meaningful transitions
  IF NEW.status IN ('preview', 'beta', 'live') THEN
    -- Get notification template
    SELECT * INTO v_template
    FROM get_module_notification_template(NEW.name, OLD.status, NEW.status)
    LIMIT 1;

    -- Queue a notification for each user on the waitlist
    INSERT INTO module_notification_queue (module_id, user_id, notification_type, old_status, new_status, title, body)
    SELECT
      NEW.id,
      mw.user_id,
      v_template.notification_type,
      OLD.status,
      NEW.status,
      v_template.title,
      v_template.body
    FROM module_waitlist mw
    WHERE mw.module_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_queue_module_notifications
  AFTER UPDATE OF status ON module_registry
  FOR EACH ROW
  EXECUTE FUNCTION queue_module_status_notifications();
