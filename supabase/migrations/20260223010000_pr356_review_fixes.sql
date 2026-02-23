-- ============================================================================
-- PR #356 Review Fixes — RLS, search_path, CHECK constraints
-- ============================================================================

-- Fix 1: Restrict module_registry SELECT to authenticated users only
-- (prevents anonymous access to ai_preview_system_prompt)
DROP POLICY IF EXISTS "Anyone can read visible modules" ON module_registry;
CREATE POLICY "Authenticated users can read visible modules" ON module_registry
  FOR SELECT USING (auth.uid() IS NOT NULL AND status != 'hidden');

-- Fix 2: Add SET search_path to SECURITY DEFINER functions in module_registry migration
CREATE OR REPLACE FUNCTION update_module_waitlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE module_registry
    SET waitlist_count = (
      SELECT COUNT(*) FROM module_waitlist WHERE module_id = NEW.module_id
    ),
    updated_at = now()
    WHERE id = NEW.module_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE module_registry
    SET waitlist_count = (
      SELECT COUNT(*) FROM module_waitlist WHERE module_id = OLD.module_id
    ),
    updated_at = now()
    WHERE id = OLD.module_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_module_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: Add SET search_path to notification queue trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 4: Add CHECK constraint on entity_event_log.event_type
ALTER TABLE entity_event_log
  ADD CONSTRAINT chk_event_type CHECK (event_type IN (
    'quest_completed', 'quest_failed', 'quest_generated', 'hp_changed',
    'stat_changed', 'level_up', 'item_added', 'item_removed',
    'feedback_answered', 'agent_chat', 'decay_applied', 'recovery_applied'
  ));
