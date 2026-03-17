-- =============================================================================
-- Security Fix: Scope service-role-only policies to service_role instead of public
--
-- These 4 tables had RLS policies using TO {public} (i.e., any role including
-- anon and authenticated), which defeats the purpose of RLS.
-- Fix: restrict to service_role only.
--
-- Issue: https://github.com/lucasblima/aica/issues/873
-- =============================================================================

-- 1. email_import_log
DROP POLICY IF EXISTS "Service role can manage email import logs" ON email_import_log;
CREATE POLICY "Service role can manage email import logs" ON email_import_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. user_email_aliases
DROP POLICY IF EXISTS "Service role full access to aliases" ON user_email_aliases;
CREATE POLICY "Service role full access to aliases" ON user_email_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. user_patterns
DROP POLICY IF EXISTS "Service role manages patterns" ON user_patterns;
CREATE POLICY "Service role manages patterns" ON user_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. whatsapp_media_tracking
DROP POLICY IF EXISTS "Service role can manage media tracking" ON whatsapp_media_tracking;
CREATE POLICY "Service role can manage media tracking" ON whatsapp_media_tracking
  FOR ALL TO service_role USING (true) WITH CHECK (true);
