-- ReACT Agent Runs — persistent state for agent executions
-- Tracks each run of the ReACT loop including steps, metrics, and errors.

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Run metadata
  agent_type TEXT NOT NULL DEFAULT 'react',
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'timeout')),

  -- Input
  user_message TEXT NOT NULL,
  system_prompt TEXT,

  -- Steps (JSONB array of ReactStep objects)
  steps JSONB DEFAULT '[]'::jsonb,

  -- Output
  final_answer TEXT,
  confidence NUMERIC(3,2),
  was_escalated BOOLEAN DEFAULT false,

  -- Metrics
  total_tokens INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  model_used TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error tracking
  error_message TEXT,
  error_context JSONB
);

-- RLS (Edge Functions use service_role key which bypasses RLS)
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own runs
CREATE POLICY "Users can read own runs" ON agent_runs
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for regular users.
-- Edge Functions use service_role client (bypasses RLS) for writes.

-- Indexes
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status = 'running';
