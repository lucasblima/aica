-- ============================================================================
-- Fix: Add missing columns to public.users table
-- Issue: #1 - Table users does not exist (406 Error)
-- Problem: Users table is missing columns that the application code expects
-- Date: 2026-01-21
-- ============================================================================

-- 1. Add missing columns to public.users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Migrate data from full_name to name if name is null
UPDATE public.users
SET name = full_name
WHERE name IS NULL AND full_name IS NOT NULL;

-- 3. Set default name from email if still null
UPDATE public.users
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL AND email IS NOT NULL;

-- 4. Add NOT NULL constraint to name column (after ensuring all rows have values)
-- We'll make it nullable for now to allow auth trigger to populate it
ALTER TABLE public.users
  ALTER COLUMN name DROP NOT NULL;

-- 5. Create or replace updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Add updated_at trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Create SECURITY DEFINER function to auto-create user profile on first query
-- This prevents 406 errors when getUserProfile is called for new users
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
  v_auth_user auth.users;
BEGIN
  -- Try to get existing user
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  -- If user doesn't exist, create from auth.users
  IF v_user IS NULL THEN
    -- Get auth user details
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = p_user_id;

    IF v_auth_user IS NULL THEN
      RAISE EXCEPTION 'Auth user not found: %', p_user_id;
    END IF;

    -- Create user profile with data from auth
    INSERT INTO public.users (
      id,
      email,
      full_name,
      name,
      avatar_url,
      active,
      onboarding_completed,
      onboarding_version,
      created_at,
      updated_at
    )
    VALUES (
      v_auth_user.id,
      v_auth_user.email,
      v_auth_user.raw_user_meta_data->>'full_name',
      COALESCE(
        v_auth_user.raw_user_meta_data->>'name',
        v_auth_user.raw_user_meta_data->>'full_name',
        SPLIT_PART(v_auth_user.email, '@', 1),
        'User'
      ),
      v_auth_user.raw_user_meta_data->>'avatar_url',
      TRUE,
      FALSE,
      0,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_user;

    RAISE NOTICE 'Created user profile for: %', p_user_id;
  END IF;

  RETURN v_user;
END;
$$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO service_role;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(active);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON public.users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- 10. Add comments for documentation
COMMENT ON COLUMN public.users.name IS 'User display name (required, derived from full_name or email if not set)';
COMMENT ON COLUMN public.users.active IS 'Whether user account is active';
COMMENT ON COLUMN public.users.onboarding_completed IS 'Whether user has completed onboarding wizard';
COMMENT ON COLUMN public.users.onboarding_version IS 'Version of onboarding completed (increments when new features added)';
COMMENT ON COLUMN public.users.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON FUNCTION public.ensure_user_profile_exists IS 'Auto-creates user profile from auth.users if not exists (SECURITY DEFINER)';

-- 11. Create trigger to auto-create user profile on auth.users insert
-- This ensures public.users is always in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    name,
    avatar_url,
    active,
    onboarding_completed,
    onboarding_version,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    TRUE,
    FALSE,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 12. Backfill any existing auth.users that don't have public.users records
INSERT INTO public.users (
  id,
  email,
  full_name,
  name,
  avatar_url,
  active,
  onboarding_completed,
  onboarding_version,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ),
  au.raw_user_meta_data->>'avatar_url',
  TRUE,
  FALSE,
  0,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Success message
DO $$
DECLARE
  v_users_count INTEGER;
  v_backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_count FROM public.users;
  SELECT COUNT(*) INTO v_backfilled_count FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NOT NULL;

  RAISE NOTICE 'Migration complete! Total users: %, Backfilled: %', v_users_count, v_backfilled_count;
END $$;
