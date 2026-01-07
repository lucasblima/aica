-- Migration: Mark all existing users as completed onboarding
--
-- Context: Organic onboarding system (Phase 4) removes blocking onboarding flows.
-- All existing users and new users bypass the onboarding completely.
-- Onboarding is now 100% optional - accessed from /profile/trails
--
-- This migration ensures that:
-- 1. All existing users are marked as completed (they already saw the app)
-- 2. New users don't need to complete onboarding
-- 3. The onboarding completion check can be removed from AppRouter

-- Mark all existing users as completed onboarding
UPDATE profiles
SET onboarding_completed = true,
    onboarding_completed_at = NOW()
WHERE onboarding_completed = false OR onboarding_completed IS NULL;

-- Add comment explaining the change
COMMENT ON COLUMN profiles.onboarding_completed IS
'Deprecated: Onboarding is now optional. All users have this set to true.
New users bypass onboarding and go directly to the app.
Contextual learning trails are available at /profile/trails.';

-- Log migration execution
INSERT INTO migration_log (migration_name, executed_at, status)
VALUES ('20260107_mark_all_users_completed_onboarding', NOW(), 'success')
ON CONFLICT DO NOTHING;
