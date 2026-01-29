-- Migration: Fix Schema Issues #167, #168, #169
-- Date: 2026-01-29
-- Description: Comprehensive fix for missing/misconfigured tables
--
-- Issue #167: profiles table RLS policy issue
-- Issue #168: daily_agenda table missing (not needed - using work_items)
-- Issue #169: life_areas table missing (should reference modules)
-- Additional: user_profiles table missing (used by onboarding)

BEGIN;

-- ============================================
-- ISSUE #167: PROFILES TABLE - ENSURE EXISTS WITH PROPER RLS
-- ============================================
-- This table is queried by supabaseService.ts lines 468, 498
-- Used for getUserBirthdate and life weeks visualization

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Alias for consistency
  full_name TEXT,
  avatar_url TEXT,
  birthdate DATE, -- Note: code uses 'birthdate' not 'birth_date'
  birth_date DATE, -- Keep both for compatibility
  country TEXT DEFAULT 'BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists
DO $$
BEGIN
  -- Add user_id if missing (some code expects this)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
  END IF;

  -- Add birthdate if missing (primary column name used in code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birthdate DATE;
    -- Copy from birth_date if exists
    UPDATE public.profiles SET birthdate = birth_date WHERE birthdate IS NULL AND birth_date IS NOT NULL;
  END IF;

  -- Add birth_date if missing (legacy compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;

  -- Add country if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN country TEXT DEFAULT 'BR';
  END IF;

  -- Add timestamps if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_birthdate ON public.profiles(birthdate);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create RLS policies using standard pattern
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id OR auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Add table comment
COMMENT ON TABLE public.profiles IS 'User profile information including birthdate for life weeks visualization';

-- ============================================
-- USER_PROFILES TABLE - FOR ONBOARDING
-- ============================================
-- This table is queried by onboardingService.ts
-- Stores onboarding progress and completion status

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_version INTEGER DEFAULT 0,
  onboarding_step TEXT,
  onboarding_data JSONB DEFAULT '{}',
  profile_picture_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON public.user_profiles(onboarding_completed);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
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

-- RPC function to ensure user_profile exists (called by getUserProfile)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, onboarding_completed, onboarding_version)
  VALUES (p_user_id, false, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO authenticated;

-- Add table comment
COMMENT ON TABLE public.user_profiles IS 'User onboarding progress and profile metadata';

-- ============================================
-- ISSUE #169: LIFE_AREAS vs MODULES CLARIFICATION
-- ============================================
-- Code incorrectly queries 'life_areas' table which doesn't exist
-- Should query 'modules' table instead
-- This is a CODE FIX, not a migration fix
-- The getLifeAreas() function already queries modules table (line 172 supabaseService.ts)
-- But some other code (grantTaskSync.ts, efficiencyService.ts) queries 'life_areas'
--
-- Solution: Create a VIEW to alias modules as life_areas for backward compatibility

CREATE OR REPLACE VIEW public.life_areas AS
SELECT
  id,
  association_id,
  user_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  false as archived, -- Add this for compatibility
  created_at,
  updated_at
FROM public.modules
WHERE is_active = true;

-- Grant select permission on view
GRANT SELECT ON public.life_areas TO authenticated;

-- Add view comment
COMMENT ON VIEW public.life_areas IS 'Backward compatibility view - aliases modules table as life_areas';

-- ============================================
-- ISSUE #168: DAILY_AGENDA
-- ============================================
-- There is NO daily_agenda table - this is a MISUNDERSTANDING
-- The getDailyAgenda() function (line 147-167 supabaseService.ts) queries work_items
-- NOT a dedicated daily_agenda table
-- The error "[SupabaseService] Error fetching daily agenda" is likely from:
-- 1. work_items table missing
-- 2. RLS policy blocking work_items
-- 3. Missing association join
--
-- Verify work_items table exists and has proper structure
-- (This should already exist from previous migrations)

-- No action needed for daily_agenda - it's not a table, it's a query result

-- ============================================
-- ADDITIONAL: ENSURE USERS TABLE CONSISTENCY
-- ============================================
-- The 'users' table in public schema should mirror auth.users with additional fields
-- Some code updates 'users' table (line 843 supabaseService.ts)

DO $$
BEGIN
  -- Ensure users table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    CREATE TABLE public.users (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_url TEXT,
      birth_date DATE,
      country TEXT DEFAULT 'BR',
      active BOOLEAN DEFAULT true,
      onboarding_completed BOOLEAN DEFAULT false,
      onboarding_version INTEGER DEFAULT 0,
      onboarding_completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view own record" ON public.users
      FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can insert own record" ON public.users
      FOR INSERT WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can update own record" ON public.users
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    -- Create indexes
    CREATE INDEX idx_users_email ON public.users(email);
    CREATE INDEX idx_users_active ON public.users(active);
    CREATE INDEX idx_users_onboarding_completed ON public.users(onboarding_completed);

    -- Create updated_at trigger
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Created users table with full schema';
  ELSE
    -- Ensure all required columns exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
    ) THEN
      ALTER TABLE public.users ADD COLUMN name TEXT NOT NULL DEFAULT 'User';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'active'
    ) THEN
      ALTER TABLE public.users ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed'
    ) THEN
      ALTER TABLE public.users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_version'
    ) THEN
      ALTER TABLE public.users ADD COLUMN onboarding_version INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed_at'
    ) THEN
      ALTER TABLE public.users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
    END IF;

    RAISE NOTICE 'Ensured users table has all required columns';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after applying migration to verify:
--
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_profiles', 'users', 'modules');
-- SELECT * FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;
-- SELECT * FROM information_schema.columns WHERE table_name = 'user_profiles' ORDER BY ordinal_position;
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'life_areas';
-- SELECT proname FROM pg_proc WHERE proname = 'ensure_user_profile_exists';
