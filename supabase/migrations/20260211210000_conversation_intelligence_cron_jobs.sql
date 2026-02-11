-- Migration: Conversation Intelligence Cron Jobs (Task #8)
-- Schedule batch dossier builds + conversation threading for active WhatsApp users
--
-- Schedule:
--   build-contact-dossier:       every 30 min at :00 and :30
--   build-conversation-threads:  every 30 min at :15 and :45
--   route-entities-to-modules:   every hour at :45 (after threads are built)
--
-- REQUIRES app.settings:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- ============================================================================
-- ENABLE EXTENSIONS (idempotent)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- HELPER: Get active WhatsApp user IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_whatsapp_users()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT ws.user_id
  FROM public.whatsapp_sessions ws
  WHERE ws.status = 'connected';
$$;

COMMENT ON FUNCTION get_active_whatsapp_users() IS
  'Returns distinct user IDs with connected WhatsApp sessions';

-- ============================================================================
-- HELPER: Trigger Edge Function for all active WhatsApp users
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_ci_edge_function(
  function_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING '[CI-cron] app.settings.supabase_url or service_role_key not configured';
    RETURN jsonb_build_object(
      'error', 'settings_not_configured',
      'function', function_name
    );
  END IF;

  FOR user_record IN
    SELECT u.user_id FROM get_active_whatsapp_users() u
  LOOP
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/' || function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('userId', user_record.user_id::text)
    ) INTO request_id;

    total_users := total_users + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'function', function_name,
    'users_triggered', total_users,
    'triggered_at', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[CI-cron] Error triggering %: %', function_name, SQLERRM;
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'function', function_name
    );
END;
$$;

COMMENT ON FUNCTION trigger_ci_edge_function(TEXT) IS
  'Triggers a Conversation Intelligence Edge Function for all active WhatsApp users via pg_net';

-- ============================================================================
-- CRON JOB 1: Build Contact Dossiers (every 30 min at :00 and :30)
-- ============================================================================

SELECT cron.unschedule('ci-build-contact-dossier')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ci-build-contact-dossier'
);

SELECT cron.schedule(
  'ci-build-contact-dossier',
  '0,30 * * * *',
  $$SELECT trigger_ci_edge_function('build-contact-dossier')$$
);

-- ============================================================================
-- CRON JOB 2: Build Conversation Threads (every 30 min at :15 and :45)
-- ============================================================================

SELECT cron.unschedule('ci-build-conversation-threads')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ci-build-conversation-threads'
);

SELECT cron.schedule(
  'ci-build-conversation-threads',
  '15,45 * * * *',
  $$SELECT trigger_ci_edge_function('build-conversation-threads')$$
);

-- ============================================================================
-- CRON JOB 3: Route Entities to Modules (every hour at :50)
-- Runs after threads are built to extract entities from new threads
-- ============================================================================

SELECT cron.unschedule('ci-route-entities-to-modules')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ci-route-entities-to-modules'
);

SELECT cron.schedule(
  'ci-route-entities-to-modules',
  '50 * * * *',
  $$SELECT trigger_ci_edge_function('route-entities-to-modules')$$
);

-- ============================================================================
-- HELPER: Manual trigger for testing
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_ci_pipeline_manually(
  p_function_name TEXT DEFAULT 'all',
  p_user_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Validate function name
  IF p_function_name NOT IN ('build-contact-dossier', 'build-conversation-threads', 'route-entities-to-modules', 'all') THEN
    RAISE EXCEPTION 'Invalid function_name. Must be one of: build-contact-dossier, build-conversation-threads, route-entities-to-modules, all';
  END IF;

  -- If specific user, call directly
  IF p_user_id IS NOT NULL THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);

    IF supabase_url IS NULL OR service_key IS NULL THEN
      RETURN jsonb_build_object('error', 'settings_not_configured');
    END IF;

    IF p_function_name = 'all' THEN
      -- Run all three in sequence for a single user
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/build-contact-dossier',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object('userId', p_user_id)
      ) INTO request_id;

      SELECT net.http_post(
        url := supabase_url || '/functions/v1/build-conversation-threads',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object('userId', p_user_id)
      ) INTO request_id;

      SELECT net.http_post(
        url := supabase_url || '/functions/v1/route-entities-to-modules',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object('userId', p_user_id)
      ) INTO request_id;

      RETURN jsonb_build_object('triggered', 'all', 'user_id', p_user_id, 'triggered_at', now());
    ELSE
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/' || p_function_name,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object('userId', p_user_id)
      ) INTO request_id;

      RETURN jsonb_build_object('triggered', p_function_name, 'user_id', p_user_id, 'triggered_at', now());
    END IF;
  END IF;

  -- No user specified: trigger for all active users
  IF p_function_name = 'all' THEN
    result := jsonb_build_object(
      'dossier', trigger_ci_edge_function('build-contact-dossier'),
      'threads', trigger_ci_edge_function('build-conversation-threads'),
      'entities', trigger_ci_edge_function('route-entities-to-modules')
    );
  ELSE
    result := trigger_ci_edge_function(p_function_name);
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_ci_pipeline_manually(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_ci_pipeline_manually(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION trigger_ci_pipeline_manually(TEXT, TEXT) IS
  'Manually trigger Conversation Intelligence pipeline for testing. Use function_name=all to run all stages.';

-- ============================================================================
-- STATUS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW conversation_intelligence_cron_status AS
SELECT
  j.jobname,
  j.schedule,
  j.command,
  j.active
FROM cron.job j
WHERE j.database = current_database()
  AND j.jobname LIKE 'ci-%'
ORDER BY j.jobname;

COMMENT ON VIEW conversation_intelligence_cron_status IS
  'Shows status of Conversation Intelligence cron jobs';
