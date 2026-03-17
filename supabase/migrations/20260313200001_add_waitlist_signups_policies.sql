-- =============================================================================
-- Security Fix: Add RLS policies for waitlist_signups
--
-- This table has RLS enabled but ZERO policies after migration
-- 20260220130000 removed the original anon INSERT policy.
-- The add_to_waitlist RPC (SECURITY DEFINER) is the correct entry point
-- for inserts — it handles validation and dedup. Direct INSERT is NOT needed.
--
-- We only add:
--   - authenticated SELECT (view own signup by email match)
--   - service_role full access (admin operations)
--
-- Rollback: DROP POLICY IF EXISTS on both policies below.
-- Issue: https://github.com/lucasblima/aica/issues/874
-- =============================================================================

-- Authenticated users can view their own signup entry
DROP POLICY IF EXISTS "Authenticated users can view own signup" ON waitlist_signups;
CREATE POLICY "Authenticated users can view own signup" ON waitlist_signups
  FOR SELECT TO authenticated USING (email = auth.email());

-- Service role has full access for admin management
DROP POLICY IF EXISTS "Service role full access" ON waitlist_signups;
CREATE POLICY "Service role full access" ON waitlist_signups
  FOR ALL TO service_role USING (true) WITH CHECK (true);
