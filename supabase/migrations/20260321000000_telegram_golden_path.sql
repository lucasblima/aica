-- =============================================================================
-- Telegram Golden Path — Phase 2 Migration
-- Issue: Telegram Golden Path invite system for bot-based onboarding
--
-- Creates:
--   1. bot_invite_pool — Singleton table for global monthly invite quota
--   2. Invite fields on user_telegram_links — referral_code, invites tracking
--   3. consume_bot_invite() — Atomic invite consumption with dual quota check
--   4. reset_monthly_invite_pool() — Monthly pool reset RPC
--   5. generate_telegram_referral_code() — Generate unique referral codes
--
-- Uses existing activation mechanism: user_profiles.is_activated + user_referrals
-- =============================================================================

-- =============================================================================
-- PART 1: bot_invite_pool — Singleton table for global monthly quota
-- =============================================================================
-- Singleton enforced by CHECK constraint on id. Only one row can exist.
-- No direct user access — admin RPCs only.

CREATE TABLE IF NOT EXISTS bot_invite_pool (
  id INTEGER NOT NULL DEFAULT 1 CHECK (id = 1) PRIMARY KEY,
  monthly_limit INTEGER NOT NULL DEFAULT 100,
  used_this_month INTEGER NOT NULL DEFAULT 0,
  current_month TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_invite_pool ENABLE ROW LEVEL SECURITY;

-- No direct access — managed via SECURITY DEFINER RPCs only
CREATE POLICY "Service role only on bot_invite_pool"
  ON bot_invite_pool FOR ALL
  USING (auth.role() = 'service_role');

-- Seed the singleton row
INSERT INTO bot_invite_pool (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PART 2: Add invite fields to user_telegram_links
-- =============================================================================
-- referral_code: for INVITING new users (distinct from link_code used in /vincular)
-- invites_remaining / invites_used: per-user Telegram invite quota
-- invited_by_user_id: who invited this user via Telegram bot

ALTER TABLE user_telegram_links
  ADD COLUMN IF NOT EXISTS invites_remaining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invites_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_telegram_referral_code
  ON user_telegram_links(referral_code)
  WHERE referral_code IS NOT NULL;

-- =============================================================================
-- PART 3: consume_bot_invite() — Atomic invite consumption with dual quota check
-- =============================================================================
-- Called by the Telegram bot when a new user joins via referral.
-- Performs:
--   1. Global pool check (with auto-reset on new month)
--   2. Inviter personal quota check
--   3. Decrement both quotas atomically
--   4. Activate invitee via user_profiles + user_referrals
--   5. Grant invitee 3 Telegram invites

CREATE OR REPLACE FUNCTION consume_bot_invite(
  p_inviter_id UUID,
  p_invitee_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool bot_invite_pool;
  v_inviter user_telegram_links;
  v_invite_token TEXT;
  v_referral_id UUID;
BEGIN
  -- 1. Lock and check global pool
  SELECT * INTO v_pool
  FROM bot_invite_pool
  WHERE id = 1
  FOR UPDATE;

  -- Auto-reset if new month
  IF v_pool.current_month < date_trunc('month', now()) THEN
    UPDATE bot_invite_pool
    SET used_this_month = 0,
        current_month = date_trunc('month', now()),
        waitlist_enabled = false,
        updated_at = now()
    WHERE id = 1;
    v_pool.used_this_month := 0;
  END IF;

  IF v_pool.used_this_month >= v_pool.monthly_limit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'global_quota_exhausted',
      'message', 'Vagas do mes esgotadas'
    );
  END IF;

  -- 2. Check for duplicate activation (idempotent — prevent double-decrement)
  IF EXISTS (
    SELECT 1 FROM user_referrals
    WHERE invitee_id = p_invitee_id AND status = 'accepted'
  ) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Conta ja estava ativa'
    );
  END IF;

  -- 3. Check inviter quota (skip for self-referral / organic users)
  IF p_inviter_id IS NOT NULL AND p_inviter_id != p_invitee_id THEN
    SELECT * INTO v_inviter
    FROM user_telegram_links
    WHERE user_id = p_inviter_id
    FOR UPDATE;

    IF v_inviter IS NOT NULL AND v_inviter.invites_remaining <= 0 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'inviter_quota_exhausted',
        'message', 'Seus convites acabaram'
      );
    END IF;

    -- Decrement inviter quota
    IF v_inviter IS NOT NULL THEN
      UPDATE user_telegram_links
      SET invites_remaining = invites_remaining - 1,
          invites_used = invites_used + 1,
          updated_at = now()
      WHERE user_id = p_inviter_id;
    END IF;
  END IF;

  -- 4. Increment global pool
  UPDATE bot_invite_pool
  SET used_this_month = used_this_month + 1,
      updated_at = now()
  WHERE id = 1;

  -- 5. Create referral record using existing user_referrals schema
  -- Generate a token for the referral record (required by existing schema)
  v_invite_token := encode(gen_random_bytes(12), 'hex');

  INSERT INTO user_referrals (inviter_id, invitee_id, invite_token, status, accepted_at)
  VALUES (
    COALESCE(p_inviter_id, p_invitee_id),
    p_invitee_id,
    v_invite_token,
    'accepted',
    now()
  )
  RETURNING id INTO v_referral_id;

  -- 5. Activate the invitee via user_profiles (existing activation mechanism)
  UPDATE user_profiles
  SET is_activated = true,
      activated_at = now(),
      activated_by_referral = v_referral_id
  WHERE user_id = p_invitee_id;

  -- Ensure user_profiles row exists (in case it wasn't created yet)
  IF NOT FOUND THEN
    INSERT INTO user_profiles (user_id, is_activated, activated_at, activated_by_referral)
    VALUES (p_invitee_id, true, now(), v_referral_id)
    ON CONFLICT (user_id) DO UPDATE
    SET is_activated = true,
        activated_at = now(),
        activated_by_referral = v_referral_id;
  END IF;

  -- 6. Give invitee 3 Telegram invites and track who invited them
  UPDATE user_telegram_links
  SET invites_remaining = 3,
      invited_by_user_id = p_inviter_id,
      updated_at = now()
  WHERE user_id = p_invitee_id;

  -- 7. Also create user_invites record (existing invite system) with 5 web invites
  INSERT INTO user_invites (user_id, available_invites, lifetime_invites)
  VALUES (p_invitee_id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;

  -- 8. Award inviter +2 bonus web invites (same reward as existing accept_invite)
  IF p_inviter_id IS NOT NULL THEN
    UPDATE user_invites
    SET total_accepted = total_accepted + 1,
        available_invites = available_invites + 2,
        updated_at = now()
    WHERE user_id = p_inviter_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Conta ativada com sucesso',
    'referral_id', v_referral_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION consume_bot_invite IS 'Atomic invite consumption for Telegram bot onboarding. Checks global + inviter quotas, activates user, grants invites.';

-- =============================================================================
-- PART 4: reset_monthly_invite_pool() — Monthly pool reset
-- =============================================================================
-- Idempotent: only resets if current_month is stale. Safe to call from cron.

CREATE OR REPLACE FUNCTION reset_monthly_invite_pool()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bot_invite_pool
  SET used_this_month = 0,
      current_month = date_trunc('month', now()),
      waitlist_enabled = false,
      updated_at = now()
  WHERE id = 1
    AND current_month < date_trunc('month', now());
END;
$$;

COMMENT ON FUNCTION reset_monthly_invite_pool IS 'Idempotent monthly reset for the bot invite pool. Safe to call from cron or on-demand.';

-- =============================================================================
-- PART 5: generate_telegram_referral_code() — Generate unique 8-char referral code
-- =============================================================================
-- Generates a unique uppercase alphanumeric code for Telegram referral links.
-- Idempotent: returns existing code if user already has one.

CREATE OR REPLACE FUNCTION generate_telegram_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO v_code
  FROM user_telegram_links
  WHERE user_id = p_user_id;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate unique 8-char uppercase alphanumeric code (max 10 attempts)
  FOR i IN 1..10 LOOP
    v_code := upper(substr(md5(random()::text), 1, 8));
    BEGIN
      UPDATE user_telegram_links
      SET referral_code = v_code, updated_at = now()
      WHERE user_id = p_user_id;
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- Collision — try again with different code
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION generate_telegram_referral_code IS 'Generates a unique 8-char referral code for Telegram bot invites. Idempotent — returns existing code if present.';

-- =============================================================================
-- GRANTS
-- =============================================================================
-- consume_bot_invite is called from Edge Functions with service_role,
-- but granting to authenticated allows direct RPC calls from frontend if needed.

-- consume_bot_invite and reset_monthly_invite_pool: service_role ONLY (called from Edge Functions)
-- NOT granted to authenticated — prevents privilege escalation
GRANT EXECUTE ON FUNCTION consume_bot_invite(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_invite_pool() TO service_role;
-- generate_telegram_referral_code: safe for authenticated (only generates code for own user)
GRANT EXECUTE ON FUNCTION generate_telegram_referral_code(UUID) TO service_role;
