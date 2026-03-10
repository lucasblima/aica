-- Fix: Allow team members to insert comments on projects they have access to.
-- The previous policy required auth.uid() = user_id in both branches of the OR,
-- making the team member check redundant.

DROP POLICY IF EXISTS "studio_comments_insert" ON public.studio_comments;

CREATE POLICY "studio_comments_insert" ON public.studio_comments
  FOR INSERT
  WITH CHECK (
    -- Owner can always insert (they set user_id to themselves)
    auth.uid() = user_id
    OR
    -- Team members can insert comments on projects where they are active members
    EXISTS (
      SELECT 1 FROM public.studio_team_members tm
      JOIN public.podcast_episodes pe ON pe.id = studio_comments.project_id
      WHERE tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND tm.user_id = pe.user_id
        AND tm.status = 'active'
    )
  );
