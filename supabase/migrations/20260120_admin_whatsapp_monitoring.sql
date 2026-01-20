-- =============================================================================
-- Admin WhatsApp Monitoring Dashboard
-- Epic #122: Multi-Instance WhatsApp Architecture
-- Issue #129: WhatsApp Instance Monitoring Dashboard
-- =============================================================================

-- =============================================================================
-- PART 1: ADMIN CHECK FUNCTION
-- =============================================================================

-- Check if current user is an admin (uses user_metadata)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT raw_user_meta_data->>'is_admin' = 'true'
      FROM auth.users
      WHERE id = auth.uid()
    ),
    FALSE
  );
END;
$$;

COMMENT ON FUNCTION is_admin IS 'Checks if the current authenticated user has admin privileges via user_metadata.is_admin';

-- =============================================================================
-- PART 2: ADMIN VIEWS (use SECURITY DEFINER functions to access)
-- =============================================================================

-- Aggregated instance statistics (for dashboard metrics)
CREATE OR REPLACE VIEW admin_whatsapp_instance_stats AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE connected_at > now() - interval '24 hours') as connected_last_24h,
  COUNT(*) FILTER (WHERE consecutive_errors > 0) as with_errors,
  COALESCE(SUM(contacts_count), 0) as total_contacts,
  COALESCE(SUM(groups_count), 0) as total_groups,
  COALESCE(SUM(messages_synced_count), 0) as total_messages
FROM whatsapp_sessions
GROUP BY status;

COMMENT ON VIEW admin_whatsapp_instance_stats IS 'Aggregated WhatsApp instance statistics grouped by status (admin-only via RPC)';

-- Recent errors view (for errors log)
CREATE OR REPLACE VIEW admin_whatsapp_recent_errors AS
SELECT
  ws.id,
  ws.instance_name,
  ws.user_id,
  u.email as user_email,
  ws.status,
  ws.error_message,
  ws.error_code,
  ws.consecutive_errors,
  ws.last_activity_at,
  ws.disconnected_at,
  ws.updated_at
FROM whatsapp_sessions ws
LEFT JOIN auth.users u ON ws.user_id = u.id
WHERE ws.error_message IS NOT NULL
  OR ws.status IN ('error', 'disconnected', 'banned')
  OR ws.consecutive_errors > 0
ORDER BY ws.updated_at DESC
LIMIT 100;

COMMENT ON VIEW admin_whatsapp_recent_errors IS 'Recent errors and problematic sessions with user info (admin-only via RPC)';

-- Full instance list with user info (for admin table)
CREATE OR REPLACE VIEW admin_whatsapp_instances AS
SELECT
  ws.id,
  ws.instance_name,
  ws.instance_display_name,
  ws.user_id,
  u.email as user_email,
  ws.status,
  ws.phone_number,
  ws.phone_country_code,
  ws.profile_name,
  ws.profile_picture_url,
  ws.connected_at,
  ws.disconnected_at,
  ws.last_activity_at,
  ws.contacts_count,
  ws.groups_count,
  ws.messages_synced_count,
  ws.consecutive_errors,
  ws.error_message,
  ws.error_code,
  ws.pairing_attempts,
  ws.messages_sent_today,
  ws.created_at,
  ws.updated_at
FROM whatsapp_sessions ws
LEFT JOIN auth.users u ON ws.user_id = u.id
ORDER BY ws.last_activity_at DESC NULLS LAST;

COMMENT ON VIEW admin_whatsapp_instances IS 'Complete instance list with user info for admin dashboard (admin-only via RPC)';

-- =============================================================================
-- PART 3: ADMIN RPC FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- =============================================================================

-- Get aggregated instance stats (admin-only)
CREATE OR REPLACE FUNCTION get_admin_instance_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total INTEGER;
  v_by_status JSON;
  v_connected_24h INTEGER;
  v_with_errors INTEGER;
  v_total_contacts BIGINT;
  v_total_groups BIGINT;
  v_total_messages BIGINT;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get totals
  SELECT COUNT(*) INTO v_total FROM whatsapp_sessions;

  -- Get status breakdown
  SELECT COALESCE(
    json_object_agg(status, count),
    '{}'::json
  ) INTO v_by_status
  FROM admin_whatsapp_instance_stats;

  -- Get aggregated metrics
  SELECT
    COALESCE(SUM(connected_last_24h), 0),
    COALESCE(SUM(with_errors), 0),
    COALESCE(SUM(total_contacts), 0),
    COALESCE(SUM(total_groups), 0),
    COALESCE(SUM(total_messages), 0)
  INTO v_connected_24h, v_with_errors, v_total_contacts, v_total_groups, v_total_messages
  FROM admin_whatsapp_instance_stats;

  -- Build result
  SELECT json_build_object(
    'total', v_total,
    'byStatus', v_by_status,
    'connectedLast24h', v_connected_24h,
    'withErrors', v_with_errors,
    'totalContacts', v_total_contacts,
    'totalGroups', v_total_groups,
    'totalMessages', v_total_messages,
    'capacityPercent', CASE
      WHEN v_total = 0 THEN 0
      ELSE LEAST(100, ROUND((v_total::NUMERIC / 40) * 100))  -- 40 instances per 8GB server
    END,
    'timestamp', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_instance_stats IS 'Returns aggregated WhatsApp instance statistics for admin dashboard';

-- Get all instances with user info (admin-only)
CREATE OR REPLACE FUNCTION get_admin_instances(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
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

  SELECT json_agg(row_to_json(i))
  INTO result
  FROM (
    SELECT *
    FROM admin_whatsapp_instances
    WHERE (p_status IS NULL OR status = p_status)
    LIMIT p_limit
    OFFSET p_offset
  ) i;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

COMMENT ON FUNCTION get_admin_instances IS 'Returns paginated list of all WhatsApp instances with user info for admin';

-- Get recent errors (admin-only)
CREATE OR REPLACE FUNCTION get_admin_recent_errors(
  p_limit INTEGER DEFAULT 50
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

  SELECT json_agg(row_to_json(e))
  INTO result
  FROM (
    SELECT *
    FROM admin_whatsapp_recent_errors
    LIMIT p_limit
  ) e;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

COMMENT ON FUNCTION get_admin_recent_errors IS 'Returns recent WhatsApp errors and problematic sessions for admin';

-- =============================================================================
-- PART 4: ADMIN ACTIONS (reconnect, disconnect)
-- =============================================================================

-- Admin force disconnect an instance
CREATE OR REPLACE FUNCTION admin_disconnect_instance(
  p_instance_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session whatsapp_sessions;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update session status
  UPDATE whatsapp_sessions
  SET
    status = 'disconnected',
    disconnected_at = NOW(),
    error_message = 'Disconnected by administrator',
    updated_at = NOW()
  WHERE instance_name = p_instance_name
  RETURNING * INTO v_session;

  IF v_session IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Instance not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'instance_name', p_instance_name,
    'new_status', 'disconnected'
  );
END;
$$;

COMMENT ON FUNCTION admin_disconnect_instance IS 'Admin function to force disconnect a WhatsApp instance';

-- Admin reset instance errors
CREATE OR REPLACE FUNCTION admin_reset_instance_errors(
  p_instance_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session whatsapp_sessions;
BEGIN
  -- Verify admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Reset error state
  UPDATE whatsapp_sessions
  SET
    status = CASE
      WHEN status = 'error' THEN 'disconnected'
      ELSE status
    END,
    error_message = NULL,
    error_code = NULL,
    consecutive_errors = 0,
    updated_at = NOW()
  WHERE instance_name = p_instance_name
  RETURNING * INTO v_session;

  IF v_session IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Instance not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'instance_name', p_instance_name,
    'new_status', v_session.status
  );
END;
$$;

COMMENT ON FUNCTION admin_reset_instance_errors IS 'Admin function to reset error state on a WhatsApp instance';

-- =============================================================================
-- PART 5: GRANTS
-- =============================================================================

-- Revoke direct access to admin views (must use RPC functions)
REVOKE ALL ON admin_whatsapp_instance_stats FROM anon, authenticated;
REVOKE ALL ON admin_whatsapp_recent_errors FROM anon, authenticated;
REVOKE ALL ON admin_whatsapp_instances FROM anon, authenticated;

-- Grant execute on admin functions to authenticated users (is_admin check inside)
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_instance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_instances(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_errors(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_disconnect_instance(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_instance_errors(TEXT) TO authenticated;
