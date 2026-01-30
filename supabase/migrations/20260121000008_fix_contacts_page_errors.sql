-- Migration: Fix /contacts page errors
-- Issues:
-- 1. Missing `modules` table
-- 2. Missing `is_active` and `type` columns in `associations` table
-- 3. Missing `ensure_user_profile_exists` function
-- 4. Ensure `user_tour_progress` table exists

-- ============================================
-- 1. MODULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Allow module to belong to either an association or a user
  CONSTRAINT modules_owner_check CHECK (
    (association_id IS NOT NULL AND user_id IS NULL) OR
    (association_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_modules_association_id ON public.modules(association_id);
CREATE INDEX IF NOT EXISTS idx_modules_user_id ON public.modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_slug ON public.modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON public.modules(is_active);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view modules for their associations or their own modules
DROP POLICY IF EXISTS "Users can view accessible modules" ON public.modules;
CREATE POLICY "Users can view accessible modules" ON public.modules
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.association_members am
      WHERE am.association_id = modules.association_id
      AND am.user_id = auth.uid()
    )
  );

-- RLS: Users can insert modules for their associations or themselves
DROP POLICY IF EXISTS "Users can insert own modules" ON public.modules;
CREATE POLICY "Users can insert own modules" ON public.modules
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.association_members am
      WHERE am.association_id = modules.association_id
      AND am.user_id = auth.uid()
      AND am.role IN ('admin', 'owner')
    )
  );

-- RLS: Users can update modules they own or admin
DROP POLICY IF EXISTS "Users can update own modules" ON public.modules;
CREATE POLICY "Users can update own modules" ON public.modules
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.association_members am
      WHERE am.association_id = modules.association_id
      AND am.user_id = auth.uid()
      AND am.role IN ('admin', 'owner')
    )
  );

-- RLS: Users can delete modules they own or admin
DROP POLICY IF EXISTS "Users can delete own modules" ON public.modules;
CREATE POLICY "Users can delete own modules" ON public.modules
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.association_members am
      WHERE am.association_id = modules.association_id
      AND am.user_id = auth.uid()
      AND am.role IN ('admin', 'owner')
    )
  );

COMMENT ON TABLE public.modules IS 'System modules that can be enabled per association or user';

-- ============================================
-- 2. ADD MISSING COLUMNS TO ASSOCIATIONS
-- ============================================
DO $$
BEGIN
  -- Add is_active column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add type column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'associations'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.associations ADD COLUMN type TEXT DEFAULT 'organization';
  END IF;
END $$;

-- ============================================
-- 3. ENSURE USER PROFILE EXISTS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert user profile if it doesn't exist
  INSERT INTO public.users (id, email, created_at, updated_at)
  SELECT
    p_user_id,
    (SELECT email FROM auth.users WHERE id = p_user_id),
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore if user already exists or other issues
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ensure_user_profile_exists IS 'Ensures a user profile exists in public.users table';

-- ============================================
-- 4. USER TOUR PROGRESS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tour_key)
);

-- Enable RLS if not already
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_tour_progress'
    AND policyname = 'Users can view their own tour progress'
  ) THEN
    CREATE POLICY "Users can view their own tour progress"
      ON public.user_tour_progress
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_tour_progress'
    AND policyname = 'Users can insert their own tour progress'
  ) THEN
    CREATE POLICY "Users can insert their own tour progress"
      ON public.user_tour_progress
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_tour_progress'
    AND policyname = 'Users can update their own tour progress'
  ) THEN
    CREATE POLICY "Users can update their own tour progress"
      ON public.user_tour_progress
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user_id_tour_key
  ON public.user_tour_progress(user_id, tour_key);

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_tour_key
  ON public.user_tour_progress(tour_key);

COMMENT ON TABLE public.user_tour_progress IS 'Tracks which onboarding tours each user has completed';

-- ============================================
-- SUCCESS
-- ============================================
SELECT 'Migration 20260121_fix_contacts_page_errors completed successfully!' as message;
