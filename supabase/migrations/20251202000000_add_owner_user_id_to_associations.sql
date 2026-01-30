-- Migration: Add owner_user_id to associations
-- The associations table existed but was missing this column
-- This needs to run before migrations that reference owner_user_id

-- Add owner_user_id column if it doesn't exist
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_associations_owner_user_id
ON public.associations(owner_user_id);
