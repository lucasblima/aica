-- Fix: revoke SECURITY DEFINER RPCs from authenticated role
-- recalculate_evangelist_tier and generate_referral_code should only be
-- callable by service_role (Edge Functions), not by any authenticated user.

REVOKE EXECUTE ON FUNCTION public.recalculate_evangelist_tier(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(UUID) FROM authenticated;
