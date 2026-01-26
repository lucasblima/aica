-- =============================================================================
-- Migration: Add missing columns to associations table
-- Issue #161: Error fetching associations / Error creating association
-- =============================================================================

-- Add 'type' column (personal, association, company, network)
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal'
CHECK (type IN ('personal', 'association', 'company', 'network'));

-- Add 'cnpj' column for Brazilian legal entities
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Add 'is_active' column
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add 'workspace_id' column (for multi-workspace support)
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Add 'synced_at' column for sync status
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS idx_associations_type
ON public.associations(type);

-- Create index for active filtering
CREATE INDEX IF NOT EXISTS idx_associations_is_active
ON public.associations(is_active) WHERE is_active = true;

-- Ensure RLS is enabled
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to include all CRUD operations
DROP POLICY IF EXISTS "Users can view own associations" ON public.associations;
CREATE POLICY "Users can view own associations" ON public.associations
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can insert own associations" ON public.associations;
CREATE POLICY "Users can insert own associations" ON public.associations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can update own associations" ON public.associations;
CREATE POLICY "Users can update own associations" ON public.associations
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can delete own associations" ON public.associations;
CREATE POLICY "Users can delete own associations" ON public.associations
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
