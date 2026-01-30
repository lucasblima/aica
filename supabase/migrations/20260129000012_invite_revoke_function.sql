-- ============================================================================
-- REVOKE INVITE FUNCTION
-- Allows users to delete pending invites and recover their quota
-- ============================================================================

-- Function to revoke a pending invite
CREATE OR REPLACE FUNCTION revoke_invite(
  p_referral_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Get the referral and verify ownership
  SELECT * INTO v_referral
  FROM user_referrals
  WHERE id = p_referral_id
    AND inviter_id = p_user_id
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'quota_returned', false,
      'error', 'Convite não encontrado ou já foi usado/expirado'
    );
  END IF;

  -- Delete the referral
  DELETE FROM user_referrals WHERE id = p_referral_id;

  -- Return the quota to the user
  UPDATE user_invites
  SET
    available_invites = available_invites + 1,
    total_sent = total_sent - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'quota_returned', true
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION revoke_invite(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION revoke_invite IS 'Revokes a pending invite and returns the quota to the user';
