-- ============================================================================
-- OpenClaw Adaptation: Scheduled Jobs for Life Council & Pattern Synthesis
-- Issue: #251, #254, #255
-- Requires: pg_cron (1.6+), pg_net (0.19+)
-- ============================================================================

-- ============================================================================
-- Helper function: call Edge Function for each active user
-- Uses pg_net to make HTTP calls to Supabase Edge Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_edge_function_for_users(
  p_function_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
  v_url TEXT;
  v_service_key TEXT;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to env if app.settings not available
  IF v_url IS NULL THEN
    v_url := 'https://uzywajqzbdbrfammshdg.supabase.co';
  END IF;

  -- Get active users (signed in within last 7 days)
  FOR v_user IN
    SELECT id FROM auth.users
    WHERE last_sign_in_at >= NOW() - INTERVAL '7 days'
  LOOP
    -- Fire-and-forget HTTP call via pg_net
    PERFORM net.http_post(
      url := v_url || '/functions/v1/' || p_function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('userId', v_user.id)::text
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- Cron Job 1: Life Council — Daily at 06:00 BRT (09:00 UTC)
-- Generates daily insight for each active user
-- ============================================================================

SELECT cron.unschedule('life-council-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'life-council-daily'
);

SELECT cron.schedule(
  'life-council-daily',
  '0 9 * * *',  -- 09:00 UTC = 06:00 BRT
  $$SELECT trigger_edge_function_for_users('run-life-council')$$
);

-- ============================================================================
-- Cron Job 2: Pattern Synthesis — Weekly Sunday 23:00 BRT (Monday 02:00 UTC)
-- Synthesizes weekly behavioral patterns
-- ============================================================================

SELECT cron.unschedule('pattern-synthesis-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pattern-synthesis-weekly'
);

SELECT cron.schedule(
  'pattern-synthesis-weekly',
  '0 2 * * 1',  -- 02:00 UTC Monday = 23:00 BRT Sunday
  $$SELECT trigger_edge_function_for_users('synthesize-user-patterns')$$
);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_edge_function_for_users TO service_role;
