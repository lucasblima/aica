-- Web auth codes for Telegram cross-device login (Netflix pattern)
-- Desktop shows 6-digit code, user types it in Telegram bot, session created on desktop

CREATE TABLE IF NOT EXISTS web_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  session_token UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  magic_link_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ
);

-- Index for fast code lookup
CREATE INDEX idx_web_auth_codes_code ON web_auth_codes(code) WHERE status = 'pending';
-- Index for polling by session_token
CREATE INDEX idx_web_auth_codes_session ON web_auth_codes(session_token) WHERE status IN ('pending', 'claimed');

-- RLS: service_role only (no user-facing access, edge functions handle all operations)
ALTER TABLE web_auth_codes ENABLE ROW LEVEL SECURITY;

-- Cleanup: auto-expire old codes (run via pg_cron or application logic)
-- No pg_cron needed — edge function checks expires_at on every query

-- RPC: Create a new auth code (called from frontend)
CREATE OR REPLACE FUNCTION create_web_auth_code()
RETURNS TABLE (code TEXT, session_token UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_session UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Generate 6-digit numeric code (avoid leading zeros)
  v_code := LPAD(FLOOR(100000 + random() * 899999)::TEXT, 6, '0');
  v_session := gen_random_uuid();
  v_expires := now() + interval '5 minutes';

  -- Expire any existing pending codes with the same code (collision handling)
  UPDATE web_auth_codes SET status = 'expired'
  WHERE web_auth_codes.code = v_code AND web_auth_codes.status = 'pending';

  INSERT INTO web_auth_codes (code, session_token, expires_at)
  VALUES (v_code, v_session, v_expires);

  RETURN QUERY SELECT v_code, v_session, v_expires;
END;
$$;

-- RPC: Poll for code status (called from frontend)
CREATE OR REPLACE FUNCTION poll_web_auth_code(p_session_token UUID)
RETURNS TABLE (status TEXT, magic_link_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Auto-expire if past deadline
  UPDATE web_auth_codes SET status = 'expired'
  WHERE session_token = p_session_token
    AND web_auth_codes.status = 'pending'
    AND expires_at < now();

  RETURN QUERY
  SELECT wac.status, wac.magic_link_url
  FROM web_auth_codes wac
  WHERE wac.session_token = p_session_token
  LIMIT 1;
END;
$$;

-- RPC: Claim a code (called from telegram-webhook via service_role)
CREATE OR REPLACE FUNCTION claim_web_auth_code(p_code TEXT, p_user_id UUID, p_magic_link_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  UPDATE web_auth_codes
  SET status = 'claimed',
      user_id = p_user_id,
      magic_link_url = p_magic_link_url,
      claimed_at = now()
  WHERE code = p_code
    AND status = 'pending'
    AND expires_at > now();

  GET DIAGNOSTICS v_found = ROW_COUNT;
  RETURN v_found > 0;
END;
$$;
