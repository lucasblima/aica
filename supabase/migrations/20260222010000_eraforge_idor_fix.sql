-- EraForge IDOR Fix: Verify world_id ownership in RLS policies
-- Fixes: world_members INSERT/UPDATE and turns INSERT policies
-- that only checked child_id but not world_id ownership.

-- ============================================
-- FIX 1: world_members INSERT — verify world ownership
-- ============================================
DROP POLICY IF EXISTS "Parents can insert own world members" ON public.eraforge_world_members;

CREATE POLICY "Parents can insert own world members"
  ON public.eraforge_world_members FOR INSERT
  WITH CHECK (
    child_id IN (SELECT public.get_parent_children_ids())
    AND world_id IN (SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid())
  );

-- ============================================
-- FIX 2: world_members UPDATE — verify world ownership
-- ============================================
DROP POLICY IF EXISTS "Parents can update own world members" ON public.eraforge_world_members;

CREATE POLICY "Parents can update own world members"
  ON public.eraforge_world_members FOR UPDATE
  USING (
    child_id IN (SELECT public.get_parent_children_ids())
    AND world_id IN (SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid())
  )
  WITH CHECK (
    child_id IN (SELECT public.get_parent_children_ids())
    AND world_id IN (SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid())
  );

-- ============================================
-- FIX 3: turns INSERT — verify world ownership
-- ============================================
DROP POLICY IF EXISTS "Parents can insert own turns" ON public.eraforge_turns;

CREATE POLICY "Parents can insert own turns"
  ON public.eraforge_turns FOR INSERT
  WITH CHECK (
    child_id IN (SELECT public.get_parent_children_ids())
    AND world_id IN (SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid())
  );
