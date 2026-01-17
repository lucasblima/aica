-- Staging Bootstrap Script
-- Creates core tables missing from staging database

-- ============================================
-- GRANT OPPORTUNITIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.grant_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funding_agency TEXT NOT NULL,
  program_name TEXT,
  edital_number TEXT,
  min_funding NUMERIC,
  max_funding NUMERIC,
  counterpart_percentage NUMERIC,
  submission_start TIMESTAMPTZ,
  submission_deadline TIMESTAMPTZ NOT NULL,
  result_date TIMESTAMPTZ,
  eligible_themes TEXT[] DEFAULT '{}',
  eligibility_requirements JSONB DEFAULT '{}',
  evaluation_criteria JSONB DEFAULT '[]',
  form_fields JSONB DEFAULT '[]',
  external_system_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  edital_pdf_path TEXT,
  edital_text_content TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_opportunities_user_id ON public.grant_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_status ON public.grant_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_deadline ON public.grant_opportunities(submission_deadline);

ALTER TABLE public.grant_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own opportunities" ON public.grant_opportunities;
CREATE POLICY "Users can view own opportunities" ON public.grant_opportunities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own opportunities" ON public.grant_opportunities;
CREATE POLICY "Users can insert own opportunities" ON public.grant_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own opportunities" ON public.grant_opportunities;
CREATE POLICY "Users can update own opportunities" ON public.grant_opportunities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own opportunities" ON public.grant_opportunities;
CREATE POLICY "Users can delete own opportunities" ON public.grant_opportunities
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- GRANT PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.grant_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.grant_opportunities(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'briefing', 'generating', 'review', 'submitted', 'approved', 'rejected')),
  completion_percentage INTEGER DEFAULT 0,
  source_document_path TEXT,
  source_document_type TEXT,
  source_document_content TEXT,
  source_document_uploaded_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_projects_user_id ON public.grant_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_projects_opportunity_id ON public.grant_projects(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_grant_projects_status ON public.grant_projects(status);

ALTER TABLE public.grant_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.grant_projects;
CREATE POLICY "Users can view own projects" ON public.grant_projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.grant_projects;
CREATE POLICY "Users can insert own projects" ON public.grant_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.grant_projects;
CREATE POLICY "Users can update own projects" ON public.grant_projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.grant_projects;
CREATE POLICY "Users can delete own projects" ON public.grant_projects
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- GRANT BRIEFINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.grant_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.grant_projects(id) ON DELETE CASCADE UNIQUE,
  briefing_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_briefings_project_id ON public.grant_briefings(project_id);

ALTER TABLE public.grant_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own briefings" ON public.grant_briefings;
CREATE POLICY "Users can view own briefings" ON public.grant_briefings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = grant_briefings.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own briefings" ON public.grant_briefings;
CREATE POLICY "Users can insert own briefings" ON public.grant_briefings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own briefings" ON public.grant_briefings;
CREATE POLICY "Users can update own briefings" ON public.grant_briefings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = grant_briefings.project_id AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- GRANT RESPONSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.grant_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.grant_projects(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  content TEXT DEFAULT '',
  char_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'generated', 'editing', 'approved')),
  versions JSONB DEFAULT '[]',
  approval_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_grant_responses_project_id ON public.grant_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_grant_responses_field_id ON public.grant_responses(field_id);

ALTER TABLE public.grant_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own responses" ON public.grant_responses;
CREATE POLICY "Users can view own responses" ON public.grant_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = grant_responses.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own responses" ON public.grant_responses;
CREATE POLICY "Users can insert own responses" ON public.grant_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own responses" ON public.grant_responses;
CREATE POLICY "Users can update own responses" ON public.grant_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.grant_projects p
      WHERE p.id = grant_responses.project_id AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- ASSOCIATIONS (for professional module)
-- ============================================
CREATE TABLE IF NOT EXISTS public.associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Associations are viewable by members" ON public.associations;
CREATE POLICY "Associations are viewable by members" ON public.associations
  FOR SELECT USING (true);

-- ============================================
-- ASSOCIATION MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.association_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(association_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_association_members_user_id ON public.association_members(user_id);
CREATE INDEX IF NOT EXISTS idx_association_members_association_id ON public.association_members(association_id);

ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.association_members;
CREATE POLICY "Users can view own memberships" ON public.association_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own memberships" ON public.association_members;
CREATE POLICY "Users can insert own memberships" ON public.association_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PODCAST SHOWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.podcast_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  rss_feed_url TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcast_shows_user_id ON public.podcast_shows(user_id);

ALTER TABLE public.podcast_shows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shows" ON public.podcast_shows;
CREATE POLICY "Users can view own shows" ON public.podcast_shows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shows" ON public.podcast_shows;
CREATE POLICY "Users can insert own shows" ON public.podcast_shows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shows" ON public.podcast_shows;
CREATE POLICY "Users can update own shows" ON public.podcast_shows
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PODCAST EPISODES
-- ============================================
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.podcast_shows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  guest_name TEXT,
  guest_title TEXT,
  guest_contact TEXT,
  guest_bio TEXT,
  episode_theme TEXT,
  scheduled_date TIMESTAMPTZ,
  recording_date TIMESTAMPTZ,
  publish_date TIMESTAMPTZ,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'scheduled', 'recorded', 'editing', 'published', 'archived')),
  duration_minutes INTEGER,
  audio_url TEXT,
  video_url TEXT,
  transcript TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_id ON public.podcast_episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_show_id ON public.podcast_episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_status ON public.podcast_episodes(status);

ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own episodes" ON public.podcast_episodes;
CREATE POLICY "Users can view own episodes" ON public.podcast_episodes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own episodes" ON public.podcast_episodes;
CREATE POLICY "Users can insert own episodes" ON public.podcast_episodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own episodes" ON public.podcast_episodes;
CREATE POLICY "Users can update own episodes" ON public.podcast_episodes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own episodes" ON public.podcast_episodes;
CREATE POLICY "Users can delete own episodes" ON public.podcast_episodes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DAILY REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL,
  report_content TEXT NOT NULL,
  insights_count INTEGER,
  actions_identified INTEGER,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON public.daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON public.daily_reports;
CREATE POLICY "Users can view own reports" ON public.daily_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON public.daily_reports;
CREATE POLICY "Users can insert own reports" ON public.daily_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USERS TABLE (extended)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  birth_date DATE,
  ai_budget_monthly NUMERIC DEFAULT 10.00,
  ai_budget_used NUMERIC DEFAULT 0.00,
  ai_budget_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- HELPER FUNCTION: is_member_of
-- ============================================
CREATE OR REPLACE FUNCTION public.is_member_of(_association_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = _association_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: check_membership
-- ============================================
CREATE OR REPLACE FUNCTION public.check_membership(assoc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_member_of(assoc_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Staging bootstrap completed successfully!' as message;
