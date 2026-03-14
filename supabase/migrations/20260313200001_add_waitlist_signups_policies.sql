-- =============================================================================
-- Security Fix: Add RLS policies for waitlist_signups
--
-- This table has RLS enabled but ZERO policies, which means nobody can
-- read or write — effectively a dead table. Add appropriate policies:
--   - anon/authenticated can INSERT (public signup form)
--   - authenticated can SELECT their own signup (by email match)
--   - service_role has full access (admin operations)
--
-- Issue: https://github.com/lucasblima/aica/issues/874
-- =============================================================================

-- Allow anyone (including unauthenticated visitors) to sign up for the waitlist
CREATE POLICY "Anyone can sign up for waitlist" ON waitlist_signups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Authenticated users can view their own signup entry
CREATE POLICY "Authenticated users can view own signup" ON waitlist_signups
  FOR SELECT TO authenticated USING (email = auth.email());

-- Service role has full access for admin management
CREATE POLICY "Service role full access" ON waitlist_signups
  FOR ALL TO service_role USING (true) WITH CHECK (true);
