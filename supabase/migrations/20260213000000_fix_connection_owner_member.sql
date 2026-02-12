-- ============================================================================
-- MIGRATION: Fix Connection Owner Member Bug
-- Date: 2026-02-13
--
-- PURPOSE:
-- Space owners are never added to connection_members, causing all RLS checks
-- and member queries to fail. This migration:
-- 1. Creates a unique index on connection_members(space_id, user_id)
-- 2. Creates a trigger to auto-add space owner as member on INSERT
-- 3. Backfills existing spaces that are missing their owner as member
-- ============================================================================

-- 1. Unique index for ON CONFLICT (prevents duplicate members)
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_members_space_user_unique
  ON public.connection_members (space_id, user_id)
  WHERE user_id IS NOT NULL AND is_active = true;

-- 2. Trigger function: auto-add owner as member after space creation
CREATE OR REPLACE FUNCTION public.auto_add_space_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.connection_members (
    space_id,
    user_id,
    role,
    permissions,
    context_data,
    is_active,
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on connection_spaces
DROP TRIGGER IF EXISTS trg_auto_add_space_owner ON public.connection_spaces;
CREATE TRIGGER trg_auto_add_space_owner
  AFTER INSERT ON public.connection_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_space_owner_as_member();

-- 4. Backfill: add owner as member for existing spaces missing it
INSERT INTO public.connection_members (
  space_id,
  user_id,
  role,
  permissions,
  context_data,
  is_active,
  joined_at,
  created_at,
  updated_at
)
SELECT
  cs.id,
  cs.owner_id,
  'owner',
  '{}'::jsonb,
  '{}'::jsonb,
  true,
  cs.created_at,
  NOW(),
  NOW()
FROM public.connection_spaces cs
WHERE cs.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.connection_members cm
    WHERE cm.space_id = cs.id
      AND cm.user_id = cs.owner_id
      AND cm.is_active = true
  );
