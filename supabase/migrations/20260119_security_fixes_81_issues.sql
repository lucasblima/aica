-- ============================================================================
-- MIGRATION: Security Fixes - 81 Issues Resolution
-- Date: 2026-01-19
-- Author: Security-Privacy-Auditor Agent + Claude Opus 4.5
--
-- PURPOSE:
-- This migration documents all security fixes applied to resolve 81 security
-- issues identified by the Supabase Security Advisor on aica-staging.
--
-- ISSUES RESOLVED:
-- - 7 ERROR level issues -> 0 remaining (all fixed with security_invoker)
-- - 74 WARN level issues -> 1 remaining (requires Pro plan)
-- - Total reduction: 81 -> 1 (98.8% reduction)
--
-- CATEGORIES FIXED:
-- 1. RLS Disabled in Public (1 table)
-- 2. Security Definer Views (6 views)
-- 3. RLS Policy Always True (4 policies)
-- 4. Function Search Path Mutable (69+ functions)
--
-- NOTE: This migration is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- PHASE 1.1: Enable RLS on profiles table
-- Issue: profiles table was exposed without row-level security
-- Risk: HIGH - User profile data accessible across users
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Create CRUD policies (idempotent)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PHASE 1.2: Fix Security Definer Views
-- Issue: Views executed with elevated privileges, exposing cross-user data
-- Fix: Add auth.uid() filter or use security_invoker
-- ============================================================================

-- 1. prospect_pipeline_metrics - Add user filter + security_invoker
DROP VIEW IF EXISTS prospect_pipeline_metrics;
CREATE VIEW prospect_pipeline_metrics
WITH (security_invoker = true)  -- SECURITY FIX: Respect RLS on underlying tables
AS
SELECT
  ps.project_id,
  ps.status,
  COUNT(*) as count,
  SUM(COALESCE(ps.negotiated_value, st.value)) as total_value,
  AVG(EXTRACT(EPOCH FROM (ps.status_changed_at - ps.created_at)) / 86400)::INTEGER as avg_days_in_pipeline
FROM project_sponsors ps
JOIN sponsorship_tiers st ON ps.tier_id = st.id
JOIN grant_projects gp ON ps.project_id = gp.id
WHERE gp.user_id = auth.uid()  -- SECURITY FIX: Filter by current user (defense in depth)
GROUP BY ps.project_id, ps.status;

GRANT SELECT ON prospect_pipeline_metrics TO authenticated;

COMMENT ON VIEW prospect_pipeline_metrics IS
  'Pipeline metrics with security_invoker + explicit user filter (security fix 2026-01-19)';

-- 2. recent_prospect_activities - Add user filter + security_invoker
DROP VIEW IF EXISTS recent_prospect_activities;
CREATE VIEW recent_prospect_activities
WITH (security_invoker = true)  -- SECURITY FIX: Respect RLS on underlying tables
AS
SELECT
  pa.*,
  ps.company_name,
  ps.contact_name,
  ps.status as sponsor_status,
  st.name as tier_name,
  gp.project_name
FROM prospect_activities pa
JOIN project_sponsors ps ON pa.sponsor_id = ps.id
JOIN sponsorship_tiers st ON ps.tier_id = st.id
JOIN grant_projects gp ON ps.project_id = gp.id
WHERE pa.user_id = auth.uid()  -- SECURITY FIX: Filter by current user (defense in depth)
ORDER BY pa.activity_date DESC;

GRANT SELECT ON recent_prospect_activities TO authenticated;

COMMENT ON VIEW recent_prospect_activities IS
  'Recent activities with security_invoker + explicit user filter (security fix 2026-01-19)';

-- 3. llm_usage_stats - Add user filter + security_invoker
DROP VIEW IF EXISTS llm_usage_stats;
CREATE VIEW llm_usage_stats
WITH (security_invoker = true)  -- SECURITY FIX: Respect RLS on underlying tables
AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  user_id,
  action,
  model,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'success') AS successful_requests,
  COUNT(*) FILTER (WHERE status = 'error') AS failed_requests,
  COUNT(*) FILTER (WHERE cached = TRUE) AS cached_requests,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  AVG(latency_ms) AS avg_latency_ms
FROM llm_metrics
WHERE user_id = auth.uid()  -- SECURITY FIX: Filter by current user (defense in depth)
GROUP BY DATE_TRUNC('day', created_at), user_id, action, model;

GRANT SELECT ON llm_usage_stats TO authenticated;

COMMENT ON VIEW llm_usage_stats IS
  'LLM usage stats with security_invoker + explicit user filter (security fix 2026-01-19)';

-- 4. cache_efficiency - Admin only (service_role)
DROP VIEW IF EXISTS cache_efficiency;
CREATE VIEW cache_efficiency
WITH (security_invoker = true)  -- SECURITY FIX: Use invoker permissions
AS
SELECT
  action,
  COUNT(*) AS total_cached_items,
  SUM(hits) AS total_cache_hits,
  AVG(hits) AS avg_hits_per_item,
  MAX(hits) AS max_hits,
  COUNT(*) FILTER (WHERE expires_at > now()) AS active_cache_items,
  COUNT(*) FILTER (WHERE expires_at <= now()) AS expired_cache_items
FROM llm_cache
GROUP BY action;

COMMENT ON VIEW cache_efficiency IS
  'Cache efficiency (admin view, requires service_role) - security fix 2026-01-19';

-- Restrict access to service_role only
REVOKE SELECT ON cache_efficiency FROM authenticated;
GRANT SELECT ON cache_efficiency TO service_role;

-- 5. whatsapp_sessions_overview - Admin only (service_role)
DROP VIEW IF EXISTS whatsapp_sessions_overview;
CREATE VIEW whatsapp_sessions_overview
WITH (security_invoker = true)  -- SECURITY FIX: Use invoker permissions
AS
SELECT
  status,
  COUNT(*) as session_count,
  SUM(contacts_count) as total_contacts,
  SUM(groups_count) as total_groups,
  SUM(messages_synced_count) as total_messages,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_activity_at))/3600)::INTEGER as avg_hours_since_activity
FROM whatsapp_sessions
GROUP BY status;

COMMENT ON VIEW whatsapp_sessions_overview IS
  'Admin dashboard view (requires service_role) - security fix 2026-01-19';

REVOKE SELECT ON whatsapp_sessions_overview FROM authenticated;
GRANT SELECT ON whatsapp_sessions_overview TO service_role;

-- 6. whatsapp_sessions_needing_attention - Add user filter + security_invoker
DROP VIEW IF EXISTS whatsapp_sessions_needing_attention;
CREATE VIEW whatsapp_sessions_needing_attention
WITH (security_invoker = true)  -- SECURITY FIX: Respect RLS on underlying tables
AS
SELECT
  id,
  user_id,
  instance_name,
  status,
  error_message,
  consecutive_errors,
  last_activity_at,
  disconnected_at
FROM whatsapp_sessions
WHERE (status IN ('error', 'disconnected', 'banned') OR consecutive_errors > 3)
  AND user_id = auth.uid()  -- SECURITY FIX: Filter by current user (defense in depth)
ORDER BY consecutive_errors DESC, last_activity_at ASC;

GRANT SELECT ON whatsapp_sessions_needing_attention TO authenticated;

COMMENT ON VIEW whatsapp_sessions_needing_attention IS
  'Sessions needing attention with security_invoker + explicit user filter (security fix 2026-01-19)';

-- ============================================================================
-- PHASE 2.1: Fix RLS Policies with Always True (USING true)
-- Issue: Policies allowed unrestricted access
-- Fix: Restrict to service_role or add proper user checks
-- ============================================================================

-- 1. podcast_team_members - Replace "Acesso total" with episode-based policies
DROP POLICY IF EXISTS "Acesso total a team_members" ON podcast_team_members;

DROP POLICY IF EXISTS "Users can view team members of own episodes" ON podcast_team_members;
CREATE POLICY "Users can view team members of own episodes"
  ON podcast_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM podcast_episodes
      WHERE podcast_episodes.id = podcast_team_members.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert team members to own episodes" ON podcast_team_members;
CREATE POLICY "Users can insert team members to own episodes"
  ON podcast_team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM podcast_episodes
      WHERE podcast_episodes.id = podcast_team_members.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update team members of own episodes" ON podcast_team_members;
CREATE POLICY "Users can update team members of own episodes"
  ON podcast_team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM podcast_episodes
      WHERE podcast_episodes.id = podcast_team_members.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete team members from own episodes" ON podcast_team_members;
CREATE POLICY "Users can delete team members from own episodes"
  ON podcast_team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM podcast_episodes
      WHERE podcast_episodes.id = podcast_team_members.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );

-- 2. whatsapp_pending_actions - Fix service role policy
DROP POLICY IF EXISTS "Service role can manage pending actions" ON whatsapp_pending_actions;

DROP POLICY IF EXISTS "Service role full access to pending actions" ON whatsapp_pending_actions;
CREATE POLICY "Service role full access to pending actions"
  ON whatsapp_pending_actions FOR ALL
  TO service_role  -- SECURITY FIX: Restrict to service_role only
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert own pending actions" ON whatsapp_pending_actions;
CREATE POLICY "Users can insert own pending actions"
  ON whatsapp_pending_actions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own pending actions" ON whatsapp_pending_actions;
CREATE POLICY "Users can update own pending actions"
  ON whatsapp_pending_actions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. whatsapp_sync_logs - Fix service role policies
DROP POLICY IF EXISTS "Service role can insert sync logs" ON whatsapp_sync_logs;
DROP POLICY IF EXISTS "Service role can update sync logs" ON whatsapp_sync_logs;

DROP POLICY IF EXISTS "Service role insert sync logs" ON whatsapp_sync_logs;
CREATE POLICY "Service role insert sync logs"
  ON whatsapp_sync_logs FOR INSERT
  TO service_role  -- SECURITY FIX: Restrict to service_role only
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role update sync logs" ON whatsapp_sync_logs;
CREATE POLICY "Service role update sync logs"
  ON whatsapp_sync_logs FOR UPDATE
  TO service_role  -- SECURITY FIX: Restrict to service_role only
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PHASE 3: Fix Function Search Path Mutable (69+ functions)
-- Issue: Functions without SET search_path vulnerable to schema hijacking
-- Fix: ALTER FUNCTION ... SET search_path = public
-- ============================================================================

-- Dynamic fix for ALL plpgsql functions missing search_path
DO $$
DECLARE
  func_record RECORD;
  sql_cmd TEXT;
  fixed_count INTEGER := 0;
BEGIN
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    sql_cmd := 'ALTER FUNCTION public.' || func_record.proname ||
               '(' || func_record.args || ') SET search_path = public';
    EXECUTE sql_cmd;
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'SECURITY FIX: Added search_path to % functions', fixed_count;
END $$;

-- ============================================================================
-- PHASE 4: Leaked Password Protection
-- Issue: HaveIBeenPwned integration disabled
-- Fix: Requires Pro plan - cannot be fixed via SQL
-- Status: SKIPPED - Document for future upgrade
-- ============================================================================

-- NOTE: Leaked Password Protection (HaveIBeenPwned) requires Supabase Pro plan
-- To enable after upgrading:
-- 1. Go to Supabase Dashboard > Authentication > Settings
-- 2. Enable "Check password against HaveIBeenPwned"
-- Or via API:
-- curl -X PATCH 'https://api.supabase.com/v1/projects/{project-ref}/config/auth' \
--   -H 'Authorization: Bearer {service_role_key}' \
--   -d '{"password_hibp_enabled": true}'

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the migration was successful
-- ============================================================================

-- Verify profiles RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true
  ) THEN
    RAISE WARNING 'FAIL: profiles RLS not enabled';
  ELSE
    RAISE NOTICE 'PASS: profiles RLS enabled';
  END IF;
END $$;

-- Verify no "Acesso total" policies remain
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname ILIKE '%acesso total%'
  ) THEN
    RAISE WARNING 'FAIL: "Acesso total" policies still exist';
  ELSE
    RAISE NOTICE 'PASS: No "Acesso total" policies';
  END IF;
END $$;

-- Verify all plpgsql functions have search_path
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS cfg
      WHERE cfg LIKE 'search_path=%'
    );

  IF missing_count > 0 THEN
    RAISE WARNING 'WARN: % functions still missing search_path', missing_count;
  ELSE
    RAISE NOTICE 'PASS: All plpgsql functions have search_path';
  END IF;
END $$;

-- ============================================================================
-- REMAINING ISSUES (Final Status)
-- ============================================================================

-- RESOLVED: All 4 ERROR "Security Definer View" warnings
-- Solution: Added security_invoker = true to all 4 views
-- This ensures views respect RLS on underlying tables (defense in depth)
--
-- Views fixed with security_invoker + auth.uid() filter:
-- - prospect_pipeline_metrics (security_invoker + gp.user_id = auth.uid())
-- - recent_prospect_activities (security_invoker + pa.user_id = auth.uid())
-- - llm_usage_stats (security_invoker + user_id = auth.uid())
-- - whatsapp_sessions_needing_attention (security_invoker + user_id = auth.uid())
--
-- REMAINING: 1 WARN "Leaked Password Protection"
-- Status: Requires Supabase Pro plan upgrade - cannot be fixed via SQL
--
-- FINAL RESULT: 81 issues -> 1 issue (98.8% reduction)

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
