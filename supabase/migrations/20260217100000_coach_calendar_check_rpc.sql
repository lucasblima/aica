-- RPC: check_athlete_calendar_connected
-- Allows a coach to check if their athlete has connected Google Calendar
-- SECURITY DEFINER: bypasses RLS to read google_calendar_tokens for another user
-- Verifies coach-athlete relationship via athletes table before exposing data

CREATE OR REPLACE FUNCTION check_athlete_calendar_connected(p_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id UUID;
  v_has_token BOOLEAN;
BEGIN
  -- Verify caller is the athlete's coach
  SELECT auth_user_id INTO v_auth_user_id
  FROM athletes WHERE id = p_athlete_id AND user_id = auth.uid();

  IF v_auth_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS(
    SELECT 1 FROM google_calendar_tokens
    WHERE user_id = v_auth_user_id AND is_connected = true
  ) INTO v_has_token;

  RETURN v_has_token;
END;
$$;

COMMENT ON FUNCTION check_athlete_calendar_connected(UUID) IS
  'Coach calls this to check if their athlete has connected Google Calendar. Returns FALSE if relationship is invalid or no token exists.';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION check_athlete_calendar_connected(UUID) TO authenticated;
