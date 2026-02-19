-- Migration: Security Fixes — v_badge_leaderboard + data_retention_policies
-- Date: 2026-02-19
--
-- Fixes two P0 security issues from Supabase advisors:
-- 1. v_badge_leaderboard view exposes auth.users to anon role
-- 2. data_retention_policies table has no RLS
--
-- Rollback:
-- DROP VIEW IF EXISTS public.v_badge_leaderboard;
-- (recreate original view with auth.users join)
-- ALTER TABLE data_retention_policies DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX 1: v_badge_leaderboard — Remove auth.users reference
-- ============================================================================
-- The view currently joins auth.users to get email as fallback display name.
-- This exposes auth.users to the anon role, which is a security vulnerability.
-- Fix: Use public.users table (which has email) instead of auth.users.

DROP VIEW IF EXISTS public.v_badge_leaderboard;

CREATE VIEW public.v_badge_leaderboard AS
SELECT
  us.user_id,
  COALESCE(p.full_name, pu.email, 'Anonymous') as user_name,
  COUNT(ua.id) as badges_earned,
  COALESCE(SUM((ua.metadata->>'xp_reward')::int), 0) as total_xp_from_badges,
  COALESCE(SUM((ua.metadata->>'cp_reward')::int), 0) as total_cp_from_badges,
  MAX(ua.unlocked_at) as last_badge_at
FROM user_stats us
LEFT JOIN user_achievements ua ON ua.user_id = us.user_id
LEFT JOIN profiles p ON p.id = us.user_id
LEFT JOIN public.users pu ON pu.id = us.user_id
GROUP BY us.user_id, p.full_name, pu.email
ORDER BY badges_earned DESC, total_cp_from_badges DESC;

-- Restrict view access to authenticated users only (no anon access)
REVOKE ALL ON public.v_badge_leaderboard FROM anon;
GRANT SELECT ON public.v_badge_leaderboard TO authenticated;

COMMENT ON VIEW public.v_badge_leaderboard IS 'Badge leaderboard — authenticated users only, no auth.users exposure';

-- ============================================================================
-- FIX 2: data_retention_policies — Enable RLS
-- ============================================================================
-- This is an admin-managed table (retention configs for LGPD compliance).
-- Only service_role should write; authenticated users can read policies.

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read retention policies (transparency per LGPD)
CREATE POLICY "Authenticated users can view retention policies"
  ON data_retention_policies
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE for regular users — only service_role can manage
-- (service_role bypasses RLS by default)

-- Also revoke anon access to be safe
REVOKE ALL ON data_retention_policies FROM anon;
GRANT SELECT ON data_retention_policies TO authenticated;

COMMENT ON TABLE data_retention_policies IS 'LGPD Article 16 - Configurable data retention periods. RLS enabled: read-only for authenticated, managed by service_role.';
