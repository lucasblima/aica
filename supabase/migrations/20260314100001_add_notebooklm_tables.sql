-- NotebookLM auth sessions (per user)
CREATE TABLE IF NOT EXISTS public.notebooklm_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_cookies TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notebooklm_auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own auth"
  ON public.notebooklm_auth_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NotebookLM async job tracking
CREATE TABLE IF NOT EXISTS public.notebooklm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('audio', 'video', 'slides', 'report', 'quiz', 'flashcards', 'mind_map', 'infographic', 'data_table', 'research')),
  module TEXT NOT NULL CHECK (module IN ('studio', 'journey', 'finance', 'grants', 'connections', 'flux', 'atlas', 'agenda', 'cross')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB DEFAULT '{}',
  result_url TEXT,
  result_metadata JSONB DEFAULT '{}',
  error_message TEXT,
  notebook_id TEXT,
  artifact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.notebooklm_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jobs"
  ON public.notebooklm_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.notebooklm_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update jobs"
  ON public.notebooklm_jobs FOR UPDATE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notebooklm_jobs;

CREATE INDEX idx_notebooklm_jobs_user_status ON public.notebooklm_jobs(user_id, status);
CREATE INDEX idx_notebooklm_jobs_created ON public.notebooklm_jobs(created_at DESC);
