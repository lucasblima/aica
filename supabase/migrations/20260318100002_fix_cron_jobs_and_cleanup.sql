-- Fix failing cron jobs (#878)
-- Root causes:
--   1. vault.decrypted_secrets is empty → jobs using vault fail with NULL url
--   2. trigger_edge_function_for_users casts body to ::text but net.http_post expects jsonb
--   3. data_retention_policies references non-existent ai_usage_tracking table
--   4. process-scheduled-notifications uses current_setting without missing_ok flag

-- ============================================================
-- 1. Deactivate vault-dependent jobs (vault is empty)
--    These need vault secrets configured before reactivation
-- ============================================================

-- Job 24: process-telegram-notifications (23,718 failures, runs EVERY MINUTE)
SELECT cron.alter_job(24, active := false);

-- Job 25: check-credential-health (14 failures)
SELECT cron.alter_job(25, active := false);

-- Job 15: process-scheduled-notifications (8,066 failures, uses app.settings without missing_ok)
SELECT cron.alter_job(15, active := false);

-- ============================================================
-- 2. Fix trigger_edge_function_for_users
--    Bug: body := jsonb_build_object(...)::text → should stay as jsonb
--    Bug: Authorization header missing (v_service_key fetched but never used)
--    Bug: No NULL check for service_key
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_edge_function_for_users(p_function_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
  v_url TEXT;
  v_service_key TEXT;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to hardcoded URL if app.settings not available
  IF v_url IS NULL THEN
    v_url := 'https://uzywajqzbdbrfammshdg.supabase.co';
  END IF;

  -- Abort gracefully if no service key available
  IF v_service_key IS NULL THEN
    RAISE WARNING '[cron] service_role_key not configured for %', p_function_name;
    RETURN 0;
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
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('userId', v_user.id)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- ============================================================
-- 3. Deactivate retention policy for non-existent table
-- ============================================================

UPDATE data_retention_policies
SET is_active = false
WHERE table_name = 'ai_usage_tracking';

-- ============================================================
-- 4. Clean up accumulated failure records (52k+)
--    Keep only last 100 records per job for debugging
-- ============================================================

DELETE FROM cron.job_run_details
WHERE runid NOT IN (
  SELECT runid FROM (
    SELECT runid, ROW_NUMBER() OVER (PARTITION BY jobid ORDER BY start_time DESC) as rn
    FROM cron.job_run_details
  ) ranked
  WHERE rn <= 100
);
