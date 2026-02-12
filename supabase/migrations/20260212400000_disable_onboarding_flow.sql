-- Migration: Disable Onboarding Flow for All Users
-- Date: 2026-02-12
-- Context: Onboarding flow is now completely optional.
-- Users should go directly to the main app without being forced through onboarding.
--
-- This migration:
-- 1. Marks all existing users in user_profiles as having completed onboarding
-- 2. Ensures new users don't trigger onboarding flow
--

-- Mark all existing users in user_profiles as completed
UPDATE user_profiles
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
  updated_at = NOW()
WHERE onboarding_completed = false OR onboarding_completed IS NULL;

-- Also update users table if it exists (for backward compatibility)
UPDATE users
SET
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
  updated_at = NOW()
WHERE onboarding_completed = false OR onboarding_completed IS NULL;

-- Add comment explaining the change
COMMENT ON COLUMN user_profiles.onboarding_completed IS
'Onboarding is now optional and disabled by default. All users bypass onboarding and go directly to the app.
Users can optionally access onboarding tutorials from settings if needed.';

-- Add comment to users table as well (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN users.onboarding_completed IS ''Onboarding is now optional and disabled. All users bypass onboarding.''';
  END IF;
END $$;
