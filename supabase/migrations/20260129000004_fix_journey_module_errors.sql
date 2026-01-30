-- Migration: Fix Journey Module Errors (#167, #168, #169)
-- Date: 2026-01-29
-- Description: Fix missing RPC function and tables for Journey module
-- Issues: Fixes "ensure_user_profile_exists 400" and auth issues
-- Execute: Run this migration to fix Journey page errors

-- ============================================
-- PART 1: CREATE user_profiles TABLE
-- ============================================
-- This table tracks onboarding status and user profile data

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_version INTEGER DEFAULT 0,
  onboarding_step TEXT,
  onboarding_data JSONB DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,
  profile_picture_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON public.user_profiles(user_id);

-- Enable Row-Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own profile
DROP POLICY IF EXISTS "Users can view own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;

CREATE POLICY "Users can view own user_profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger: Update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ============================================
-- PART 2: CREATE RPC FUNCTION
-- ============================================
-- This function ensures a user_profile record exists
-- Called by frontend before querying user_profiles table

CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert if not exists (ON CONFLICT does nothing if already exists)
  INSERT INTO public.user_profiles (user_id, onboarding_completed, onboarding_version)
  VALUES (p_user_id, false, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.ensure_user_profile_exists(UUID) IS
  'Ensures a user_profile record exists for the given user_id. Idempotent.';

-- ============================================
-- PART 3: ADD MISSING COLUMNS TO profiles TABLE
-- ============================================
-- Some components query profiles table for birthdate

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  birthdate DATE,
  birth_date DATE,
  country TEXT DEFAULT 'BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birthdate DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN country TEXT DEFAULT 'BR';
  END IF;
END $$;

-- Sync user_id with id for existing rows
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_birthdate ON public.profiles(birthdate);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

-- ============================================
-- PART 4: VERIFY DEPLOYMENT
-- ============================================

-- Test the RPC function (should not error)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- This should succeed without errors
  PERFORM public.ensure_user_profile_exists(test_user_id);

  -- Verify record was created
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = test_user_id
  ) THEN
    RAISE EXCEPTION 'ensure_user_profile_exists failed to create record';
  END IF;

  -- Clean up test data
  DELETE FROM public.user_profiles WHERE user_id = test_user_id;

  RAISE NOTICE 'Migration verified successfully';
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT
  'Migration completed successfully!' as status,
  'RPC function ensure_user_profile_exists is now available' as rpc_status,
  'Tables user_profiles and profiles are ready' as table_status;
