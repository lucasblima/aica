-- =============================================================================
-- Admin Telegram Monitoring Dashboard RPCs
-- Issue #848: Telegram Monitoring Dashboard
--
-- Creates 5 SECURITY DEFINER RPCs for admin monitoring of the Telegram
-- integration. Uses existing is_admin() function from migration 20260120000000.
-- Tables referenced: user_telegram_links, telegram_conversations, telegram_message_log
-- =============================================================================

-- =============================================================================
-- RPC 1: get_admin_telegram_stats()
-- Returns aggregated 24h statistics for the Telegram pipeline
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_telegram_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_messages_24h BIGINT;
  v_failed_24h BIGINT;
  v_error_rate NUMERIC;
  v_active_users BIGINT;
  v_linked_accounts BIGINT;
  v_ai_tokens_used BIGINT;
  v_avg_processing_ms NUMERIC;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Messages in last 24h
  SELECT COUNT(*)
  INTO v_messages_24h
  FROM telegram_message_log
  WHERE created_at > now() - interval '24 hours';

  -- Failed messages in last 24h
  SELECT COUNT(*)
  INTO v_failed_24h
  FROM telegram_message_log
  WHERE created_at > now() - interval '24 hours'
    AND processing_status = 'failed';

  -- Error rate (percentage)
  v_error_rate := CASE
    WHEN v_messages_24h = 0 THEN 0
    ELSE ROUND((v_failed_24h::NUMERIC / v_messages_24h) * 100, 2)
  END;

  -- Active users (distinct in 24h)
  SELECT COUNT(DISTINCT user_id)
  INTO v_active_users
  FROM telegram_message_log
  WHERE created_at > now() - interval '24 hours'
    AND user_id IS NOT NULL;

  -- Linked accounts
  SELECT COUNT(*)
  INTO v_linked_accounts
  FROM user_telegram_links
  WHERE status = 'linked';

  -- AI tokens used (sum last 24h)
  SELECT COALESCE(SUM(ai_tokens_used), 0)
  INTO v_ai_tokens_used
  FROM telegram_message_log
  WHERE created_at > now() - interval '24 hours';

  -- Average processing time (last 24h)
  SELECT COALESCE(ROUND(AVG(processing_duration_ms)::NUMERIC, 2), 0)
  INTO v_avg_processing_ms
  FROM telegram_message_log
  WHERE created_at > now() - interval '24 hours'
    AND processing_duration_ms IS NOT NULL;

  -- Build result
  SELECT json_build_object(
    'messages_24h', v_messages_24h,
    'error_rate', v_error_rate,
    'active_users', v_active_users,
    'linked_accounts', v_linked_accounts,
    'ai_tokens_used', v_ai_tokens_used,
    'avg_processing_ms', v_avg_processing_ms,
    'timestamp', now()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_telegram_stats IS 'Returns aggregated 24h Telegram pipeline statistics for admin dashboard';

-- =============================================================================
-- RPC 2: get_admin_telegram_message_log(p_limit, p_status)
-- Returns recent message log entries with user info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_telegram_message_log(
  p_limit INTEGER DEFAULT 20,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
  INTO result
  FROM (
    SELECT
      tml.id,
      tml.created_at,
      tml.user_id,
      utl.telegram_username,
      tml.direction,
      tml.message_type,
      tml.intent_summary,
      tml.processing_status,
      tml.ai_action,
      tml.ai_tokens_used,
      tml.processing_duration_ms,
      tml.error_message
    FROM telegram_message_log tml
    LEFT JOIN user_telegram_links utl ON tml.user_id = utl.user_id
    WHERE (p_status IS NULL OR tml.processing_status = p_status)
    ORDER BY tml.created_at DESC
    LIMIT p_limit
  ) m;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_telegram_message_log IS 'Returns recent Telegram message log entries with username for admin dashboard';

-- =============================================================================
-- RPC 3: get_admin_telegram_user_status()
-- Returns linked/pending counts, consent rate, and recent links
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_telegram_user_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total_linked BIGINT;
  v_total_pending BIGINT;
  v_total_with_consent BIGINT;
  v_total_accounts BIGINT;
  v_consent_rate NUMERIC;
  v_recent_links JSON;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Linked count
  SELECT COUNT(*)
  INTO v_total_linked
  FROM user_telegram_links
  WHERE status = 'linked';

  -- Pending count
  SELECT COUNT(*)
  INTO v_total_pending
  FROM user_telegram_links
  WHERE status = 'pending';

  -- Consent rate
  SELECT COUNT(*), COUNT(*) FILTER (WHERE consent_given = TRUE)
  INTO v_total_accounts, v_total_with_consent
  FROM user_telegram_links;

  v_consent_rate := CASE
    WHEN v_total_accounts = 0 THEN 0
    ELSE ROUND((v_total_with_consent::NUMERIC / v_total_accounts) * 100, 2)
  END;

  -- Recent links (last 10)
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
  INTO v_recent_links
  FROM (
    SELECT
      user_id,
      telegram_username,
      status,
      linked_at,
      consent_given
    FROM user_telegram_links
    ORDER BY created_at DESC
    LIMIT 10
  ) r;

  -- Build result
  SELECT json_build_object(
    'total_linked', v_total_linked,
    'total_pending', v_total_pending,
    'consent_rate', v_consent_rate,
    'recent_links', v_recent_links
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_telegram_user_status IS 'Returns Telegram account linking status and consent metrics for admin dashboard';

-- =============================================================================
-- RPC 4: get_admin_telegram_conversations(p_limit)
-- Returns active conversations with user info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_telegram_conversations(
  p_limit INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
  INTO result
  FROM (
    SELECT
      tc.id,
      tc.user_id,
      utl.telegram_username,
      tc.telegram_chat_id,
      tc.active_flow,
      tc.flow_state,
      tc.last_message_at,
      COALESCE(tc.context_token_count, 0) AS context_token_count
    FROM telegram_conversations tc
    LEFT JOIN user_telegram_links utl ON tc.user_id = utl.user_id
    ORDER BY tc.last_message_at DESC
    LIMIT p_limit
  ) c;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_telegram_conversations IS 'Returns active Telegram conversations with user info for admin dashboard';

-- =============================================================================
-- RPC 5: get_admin_telegram_error_log(p_limit, p_hours)
-- Returns error rate and failed message details
-- =============================================================================

CREATE OR REPLACE FUNCTION get_admin_telegram_error_log(
  p_limit INTEGER DEFAULT 50,
  p_hours INTEGER DEFAULT 24
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total_in_period BIGINT;
  v_failed_in_period BIGINT;
  v_error_rate NUMERIC;
  v_errors JSON;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Total messages in period
  SELECT COUNT(*)
  INTO v_total_in_period
  FROM telegram_message_log
  WHERE created_at > now() - (p_hours || ' hours')::interval;

  -- Failed messages in period
  SELECT COUNT(*)
  INTO v_failed_in_period
  FROM telegram_message_log
  WHERE created_at > now() - (p_hours || ' hours')::interval
    AND processing_status = 'failed';

  -- Error rate
  v_error_rate := CASE
    WHEN v_total_in_period = 0 THEN 0
    ELSE ROUND((v_failed_in_period::NUMERIC / v_total_in_period) * 100, 2)
  END;

  -- Error details
  SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
  INTO v_errors
  FROM (
    SELECT
      id,
      created_at,
      user_id,
      message_type,
      error_message,
      retry_count,
      processing_duration_ms
    FROM telegram_message_log
    WHERE processing_status = 'failed'
      AND created_at > now() - (p_hours || ' hours')::interval
    ORDER BY created_at DESC
    LIMIT p_limit
  ) e;

  -- Build result
  SELECT json_build_object(
    'error_rate', v_error_rate,
    'errors', v_errors
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_telegram_error_log IS 'Returns Telegram error rate and failed message details for admin dashboard';

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_admin_telegram_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_telegram_message_log(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_telegram_user_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_telegram_conversations(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_telegram_error_log(INTEGER, INTEGER) TO authenticated;
