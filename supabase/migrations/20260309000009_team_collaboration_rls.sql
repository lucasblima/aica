-- Migration: Team Collaboration RLS Policies for studio_comments and studio_team_members
-- Created: 2026-03-09
-- Purpose: Replace owner-only RLS policies on studio_comments with team-aware policies
--   that allow active team members to read/write comments on projects they collaborate on.
--   Also adds member_name column to studio_team_members.
--
-- Design:
--   - Project owner (user_id) has full CRUD on comments
--   - Active team members can SELECT and INSERT comments on owner's projects
--   - Users can only UPDATE/DELETE their own comments (resolve, edit, delete)
--   - studio_team_members policies remain owner-only (only project owner manages team)
--
-- All operations are idempotent (DROP IF EXISTS before CREATE).
-- ============================================================================


-- ============================================================================
-- 1. Add member_name column to studio_team_members (optional display name)
-- ============================================================================

ALTER TABLE public.studio_team_members
  ADD COLUMN IF NOT EXISTS member_name TEXT;

COMMENT ON COLUMN public.studio_team_members.member_name IS
  'Display name of the invited team member (optional, defaults to email)';


-- ============================================================================
-- 2. Replace studio_comments RLS policies with team-aware versions
-- ============================================================================

-- Drop existing owner-only policies
DROP POLICY IF EXISTS "studio_comments_select" ON public.studio_comments;
DROP POLICY IF EXISTS "studio_comments_insert" ON public.studio_comments;
DROP POLICY IF EXISTS "studio_comments_update" ON public.studio_comments;
DROP POLICY IF EXISTS "studio_comments_delete" ON public.studio_comments;

-- SELECT: Owner can read own comments + team members can read comments on projects
-- where they are active members
CREATE POLICY "studio_comments_select" ON public.studio_comments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.studio_team_members tm
      WHERE tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND tm.user_id = studio_comments.user_id
        AND tm.status = 'active'
    )
  );

-- INSERT: Owner can insert own comments + active team members can insert comments
-- on owner's projects (the comment's user_id will be the commenter's auth.uid())
CREATE POLICY "studio_comments_insert" ON public.studio_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.studio_team_members tm
      JOIN public.podcast_episodes pe ON pe.id = studio_comments.project_id
      WHERE tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND tm.user_id = pe.user_id
        AND tm.status = 'active'
        AND auth.uid() = studio_comments.user_id
    )
  );

-- UPDATE: Users can only update their own comments (e.g., resolve)
CREATE POLICY "studio_comments_update" ON public.studio_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own comments
CREATE POLICY "studio_comments_delete" ON public.studio_comments
  FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 3. Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000009: Team collaboration RLS policies';
  RAISE NOTICE '  - Added member_name column to studio_team_members';
  RAISE NOTICE '  - Replaced studio_comments SELECT policy with team-aware version';
  RAISE NOTICE '  - Replaced studio_comments INSERT policy with team-aware version';
  RAISE NOTICE '  - UPDATE/DELETE policies remain user_id-only (own comments)';
END $$;
