-- ============================================================================
-- Fix: whatsapp_sessions CHECK constraint and RPC function
-- Issue: Check constraint only had old values (disconnected, pairing, connected, error)
--        but new code uses 'pending', 'connecting', 'banned'
-- Date: 2026-01-19
-- Applied via: Supabase Management API (already in production)
-- ============================================================================

-- Fix the CHECK constraint to include all valid status values
ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_status_check;
ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_status_check
CHECK (status IN ('pending', 'connecting', 'pairing', 'connected', 'disconnected', 'error', 'banned'));

-- Drop and recreate the function to ensure correct behavior
DROP FUNCTION IF EXISTS get_or_create_whatsapp_session(UUID);

CREATE OR REPLACE FUNCTION get_or_create_whatsapp_session(p_user_id UUID)
RETURNS whatsapp_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session whatsapp_sessions;
  v_instance_name TEXT;
BEGIN
  -- Try to get existing session
  SELECT * INTO v_session
  FROM whatsapp_sessions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no session exists, create one with explicit columns
  IF v_session IS NULL THEN
    -- Generate unique instance name
    v_instance_name := 'aica_' || REPLACE(LEFT(p_user_id::TEXT, 8), '-', '');

    -- Check for collision and add suffix if needed
    WHILE EXISTS (SELECT 1 FROM whatsapp_sessions WHERE instance_name = v_instance_name) LOOP
      v_instance_name := v_instance_name || '_' || FLOOR(RANDOM() * 1000)::TEXT;
    END LOOP;

    -- Insert with explicit column names to avoid any order issues
    INSERT INTO whatsapp_sessions (
      user_id,
      instance_name,
      status,
      pairing_attempts,
      contacts_count,
      groups_count,
      messages_synced_count,
      consecutive_errors,
      messages_sent_today,
      messages_sent_reset_at,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_instance_name,
      'pending',
      0,
      0,
      0,
      0,
      0,
      0,
      CURRENT_DATE,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_session;

    RAISE NOTICE 'Created new WhatsApp session: % for user %', v_instance_name, p_user_id;
  END IF;

  RETURN v_session;
END;
$$;

-- Also ensure generate_instance_name function exists
CREATE OR REPLACE FUNCTION generate_instance_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_instance_name TEXT;
  v_suffix INTEGER := 0;
BEGIN
  -- Base name: aica_<first 8 chars of user_id>
  v_instance_name := 'aica_' || REPLACE(LEFT(p_user_id::TEXT, 8), '-', '');

  -- Check if exists and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM whatsapp_sessions WHERE instance_name = v_instance_name) LOOP
    v_suffix := v_suffix + 1;
    v_instance_name := 'aica_' || REPLACE(LEFT(p_user_id::TEXT, 8), '-', '') || '_' || v_suffix;
  END LOOP;

  RETURN v_instance_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_whatsapp_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_whatsapp_session(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION generate_instance_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_instance_name(UUID) TO service_role;

-- Add comments
COMMENT ON FUNCTION get_or_create_whatsapp_session IS 'Gets existing WhatsApp session or creates new one for user (SECURITY DEFINER)';
COMMENT ON FUNCTION generate_instance_name IS 'Generates unique instance name based on user_id with collision handling';
