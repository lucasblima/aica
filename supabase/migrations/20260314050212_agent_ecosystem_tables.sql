-- Agent Ecosystem Tables
-- Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md

-- 1. MODULE_EVENTS — Event Queue
CREATE TABLE IF NOT EXISTS module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE module_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own events" ON module_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON module_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_module_events_pending ON module_events (status, created_at) WHERE status = 'pending';
CREATE INDEX idx_module_events_user_type ON module_events (user_id, event_type);

-- 2. USER_CHANNEL_PREFERENCES
CREATE TABLE IF NOT EXISTS user_channel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_category TEXT NOT NULL,
  preferred_channels TEXT[] DEFAULT ARRAY['in_app'],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_category)
);

ALTER TABLE user_channel_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON user_channel_preferences FOR ALL USING (auth.uid() = user_id);

-- 3. NOTIFICATION_COOLDOWNS
CREATE TABLE IF NOT EXISTS notification_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_key)
);

ALTER TABLE notification_cooldowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own cooldowns" ON notification_cooldowns FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE by event-processor (service_role, bypasses RLS)

-- 4. HELPER RPC: is_quiet_hours (used by channel-router for timezone-aware quiet hours check)
CREATE OR REPLACE FUNCTION is_quiet_hours(p_start TIME, p_end TIME)
RETURNS TABLE (is_quiet BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::TIME BETWEEN p_start AND p_end;
$$;

-- 5. EVENT EMITTER TRIGGERS (all SECURITY DEFINER to bypass RLS on INSERT)

-- Atlas: task completed
CREATE OR REPLACE FUNCTION emit_task_completed()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO module_events (user_id, event_type, source_module, payload)
    VALUES (NEW.user_id, 'task.completed', 'atlas', jsonb_build_object(
      'task_id', NEW.id, 'title', NEW.title, 'priority', NEW.priority));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_task_completed AFTER UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION emit_task_completed();

-- Atlas: task created
CREATE OR REPLACE FUNCTION emit_task_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'task.created', 'atlas', jsonb_build_object('task_id', NEW.id, 'title', NEW.title));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_task_created AFTER INSERT ON work_items FOR EACH ROW EXECUTE FUNCTION emit_task_created();

-- Journey: moment created
CREATE OR REPLACE FUNCTION emit_moment_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'moment.created', 'journey', jsonb_build_object(
    'moment_id', NEW.id, 'emotion', COALESCE(NEW.emotion, 'neutral')));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_moment_created AFTER INSERT ON moments FOR EACH ROW EXECUTE FUNCTION emit_moment_created();

-- Finance: transaction imported
CREATE OR REPLACE FUNCTION emit_transaction_imported()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'transaction.imported', 'finance', jsonb_build_object(
    'transaction_id', NEW.id, 'amount', NEW.amount, 'type', NEW.type,
    'category', COALESCE(NEW.category, 'uncategorized')));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_transaction_imported AFTER INSERT ON finance_transactions FOR EACH ROW EXECUTE FUNCTION emit_transaction_imported();

-- Flux: workout logged (block status change to 'completed')
-- NOTE: workout_blocks.user_id = coach. In AICA's coaching model,
-- the coach manages the athlete's training. XP/notifications go to the coach
-- who completed the block. If athlete-facing events are needed later,
-- join athletes.auth_user_id for the athlete's own account.
CREATE OR REPLACE FUNCTION emit_workout_logged()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO module_events (user_id, event_type, source_module, payload)
    VALUES (NEW.user_id, 'workout.logged', 'flux', jsonb_build_object(
      'block_id', NEW.id, 'name', NEW.name, 'athlete_id', NEW.athlete_id));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_workout_logged AFTER UPDATE ON workout_blocks FOR EACH ROW EXECUTE FUNCTION emit_workout_logged();

-- Agenda: calendar event created
CREATE OR REPLACE FUNCTION emit_event_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'event.upcoming', 'agenda', jsonb_build_object(
    'event_id', NEW.id, 'title', NEW.title, 'start_time', NEW.start_time));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_event_created AFTER INSERT ON calendar_events FOR EACH ROW EXECUTE FUNCTION emit_event_created();
