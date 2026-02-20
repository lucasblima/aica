-- Migration: Invite Dashboard RPC
-- Date: 2026-02-20
-- Description: Recalculates invite metrics from actual referral data and creates
--   get_invite_dashboard() RPC returning stats + referral details for the UI.

-- ============================================================================
-- 1. RECALCULATE METRICS FROM ACTUAL REFERRAL DATA
-- ============================================================================

UPDATE public.user_invites ui SET
  total_sent = COALESCE(ref.sent_count, 0),
  total_accepted = COALESCE(ref.accepted_count, 0)
FROM (
  SELECT inviter_id,
    COUNT(*) AS sent_count,
    COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count
  FROM public.user_referrals
  GROUP BY inviter_id
) ref
WHERE ui.user_id = ref.inviter_id;

-- ============================================================================
-- 2. RECALCULATE AVAILABLE INVITES
-- ============================================================================

UPDATE public.user_invites SET
  available_invites = GREATEST(0, lifetime_invites - total_sent + (total_accepted * 2));

-- ============================================================================
-- 3. CREATE get_invite_dashboard(p_user_id UUID) RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_invite_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSON;
  v_referrals JSON;
  v_invites public.user_invites;
  v_pending INTEGER;
  v_conversion NUMERIC;
BEGIN
  -- Ensure user_invites row exists
  PERFORM get_or_create_user_invites(p_user_id);

  SELECT * INTO v_invites
  FROM public.user_invites
  WHERE user_id = p_user_id;

  -- Count active pending referrals
  SELECT COUNT(*) INTO v_pending
  FROM public.user_referrals
  WHERE inviter_id = p_user_id
    AND status = 'pending'
    AND expires_at > NOW();

  -- Conversion rate
  v_conversion := CASE
    WHEN v_invites.total_sent = 0 THEN 0
    ELSE ROUND(v_invites.total_accepted::NUMERIC / v_invites.total_sent, 2)
  END;

  -- Build stats object
  v_stats := json_build_object(
    'available', v_invites.available_invites,
    'total_sent', v_invites.total_sent,
    'total_accepted', v_invites.total_accepted,
    'pending', v_pending,
    'conversion_rate', v_conversion
  );

  -- Build referrals array with invitee details
  SELECT COALESCE(json_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::json)
  INTO v_referrals
  FROM (
    SELECT json_build_object(
      'id', r.id,
      'invite_code', r.invite_code,
      'invite_token', r.invite_token,
      'status', r.status,
      'created_at', r.created_at,
      'expires_at', r.expires_at,
      'accepted_at', r.accepted_at,
      'xp_awarded', r.xp_awarded,
      'invitee_name', CASE WHEN r.invitee_id IS NOT NULL THEN COALESCE(u.name, 'Convidado') ELSE NULL END,
      'invitee_avatar', CASE WHEN r.invitee_id IS NOT NULL THEN u.avatar_url ELSE NULL END,
      'invitee_last_seen', au.last_sign_in_at,
      'invitee_plan', pp.name,
      'is_active', CASE
        WHEN au.last_sign_in_at IS NOT NULL THEN au.last_sign_in_at > NOW() - INTERVAL '7 days'
        ELSE false
      END
    ) AS row_data
    FROM public.user_referrals r
    LEFT JOIN public.users u ON u.id = r.invitee_id
    LEFT JOIN auth.users au ON au.id = r.invitee_id
    LEFT JOIN LATERAL (
      SELECT pp2.name
      FROM public.user_subscriptions us
      JOIN public.pricing_plans pp2 ON us.plan_id = pp2.id
      WHERE us.user_id = r.invitee_id
        AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    ) pp ON true
    WHERE r.inviter_id = p_user_id
  ) sub;

  RETURN json_build_object(
    'stats', v_stats,
    'referrals', v_referrals
  );
END;
$$;

-- ============================================================================
-- 4. GRANT
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_invite_dashboard(UUID) TO authenticated;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON FUNCTION public.get_invite_dashboard IS 'Returns invite dashboard data: stats (available, sent, accepted, pending, conversion_rate) and referrals array with invitee details.';
