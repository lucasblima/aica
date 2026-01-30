-- =====================================================
-- APPLY SCHEMA FIX - Execute in Supabase SQL Editor
-- =====================================================
-- Date: 2026-01-30
-- Fixes: ensure_user_profile_exists 400 + generate-questions 401
-- Execute: Copy this entire file and run in SQL Editor
-- =====================================================

-- PART 1: Create user_profiles table if not exists
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- PART 2: RLS Policies for user_profiles
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

-- PART 3: Create the RPC function (this fixes the 400 error)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, onboarding_completed, onboarding_version)
  VALUES (p_user_id, false, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO anon;

COMMENT ON FUNCTION public.ensure_user_profile_exists(UUID) IS
  'Ensures a user_profile record exists for the given user_id. Idempotent.';

-- PART 4: Add missing columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birthdate') THEN
    ALTER TABLE public.profiles ADD COLUMN birthdate DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'country') THEN
    ALTER TABLE public.profiles ADD COLUMN country TEXT DEFAULT 'BR';
  END IF;
END $$;

UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- PART 5: Verify deployment
SELECT
  'SUCCESS' as status,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_user_profile_exists') as rpc_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as table_exists;
