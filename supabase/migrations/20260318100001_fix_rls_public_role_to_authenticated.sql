-- Fix RLS policies using {public} role → {authenticated}
-- Issue #873: User-facing policies should require authentication
-- Tables: email_import_log, user_email_aliases, user_patterns, whatsapp_media_tracking

-- ============================================================
-- 1. email_import_log — SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view own email import logs" ON email_import_log;
CREATE POLICY "Users can view own email import logs" ON email_import_log
  FOR SELECT TO authenticated
  USING (resolved_user_id = auth.uid());

-- ============================================================
-- 2. user_email_aliases — SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view own aliases" ON user_email_aliases;
CREATE POLICY "Users can view own aliases" ON user_email_aliases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. user_patterns — SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users view own patterns" ON user_patterns;
CREATE POLICY "Users view own patterns" ON user_patterns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. whatsapp_media_tracking — SELECT, INSERT, UPDATE, DELETE
-- ============================================================
DROP POLICY IF EXISTS "Users can view own media tracking" ON whatsapp_media_tracking;
CREATE POLICY "Users can view own media tracking" ON whatsapp_media_tracking
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own media tracking" ON whatsapp_media_tracking;
CREATE POLICY "Users can insert own media tracking" ON whatsapp_media_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own media tracking" ON whatsapp_media_tracking;
CREATE POLICY "Users can update own media tracking" ON whatsapp_media_tracking
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own media tracking" ON whatsapp_media_tracking;
CREATE POLICY "Users can delete own media tracking" ON whatsapp_media_tracking
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
