-- ============================================================================
-- MIGRATION: Execution Plans — Planner Agent Infrastructure
-- Phase 2 of Agent Orchestra Roadmap
-- Date: 2026-02-15
--
-- PURPOSE:
-- Enable the Planner Agent to decompose cross-module goals into step-by-step
-- execution plans. Each plan contains ordered steps that target specific
-- AICA module agents.
--
-- TABLES:
-- 1. execution_plans     — Top-level plan with goal, status, module routing
-- 2. execution_plan_steps — Individual steps within a plan
-- ============================================================================

-- ============================================================================
-- 1. EXECUTION PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal description (what the user wants to achieve)
  goal TEXT NOT NULL,

  -- Plan status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Modules involved in this plan (for routing and display)
  modules_involved TEXT[] NOT NULL DEFAULT '{}',

  -- Additional context for the planner (user preferences, constraints, etc.)
  context JSONB DEFAULT '{}'::jsonb,

  -- Error info (populated on failure)
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE execution_plans IS
  'Cross-module execution plans created by the Planner Agent (Phase 2 Agent Orchestra)';
COMMENT ON COLUMN execution_plans.goal IS
  'Natural language description of what the user wants to achieve';
COMMENT ON COLUMN execution_plans.modules_involved IS
  'Array of AgentModule values: atlas, captacao, studio, journey, finance, connections, flux, agenda, coordinator';
COMMENT ON COLUMN execution_plans.context IS
  'Additional context: user preferences, constraints, conversation history reference';

-- ============================================================================
-- 2. EXECUTION PLAN STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.execution_plan_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,

  -- Step ordering
  step_order INTEGER NOT NULL,

  -- Target module agent
  module TEXT NOT NULL
    CHECK (module IN (
      'atlas', 'captacao', 'studio', 'journey',
      'finance', 'connections', 'flux', 'agenda', 'coordinator'
    )),

  -- Action description (what this step does)
  action TEXT NOT NULL,

  -- Step status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Result from execution (populated after completion)
  result JSONB,

  -- Error info (populated on failure)
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique step ordering within a plan
  UNIQUE(plan_id, step_order)
);

COMMENT ON TABLE execution_plan_steps IS
  'Individual steps within an execution plan, each targeting a specific module agent';
COMMENT ON COLUMN execution_plan_steps.module IS
  'Target AgentModule for this step';
COMMENT ON COLUMN execution_plan_steps.action IS
  'Description of the action this step performs';
COMMENT ON COLUMN execution_plan_steps.result IS
  'JSON result from step execution (output data, created IDs, etc.)';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_execution_plans_user_id
  ON execution_plans(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_plans_status
  ON execution_plans(status)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_execution_plan_steps_plan_id
  ON execution_plan_steps(plan_id, step_order);

CREATE INDEX IF NOT EXISTS idx_execution_plan_steps_status
  ON execution_plan_steps(status)
  WHERE status IN ('pending', 'running');

-- ============================================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_plan_steps ENABLE ROW LEVEL SECURITY;

-- execution_plans: users can read and write their own plans
CREATE POLICY "Users can view own execution plans"
  ON execution_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own execution plans"
  ON execution_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution plans"
  ON execution_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own execution plans"
  ON execution_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access on execution plans"
  ON execution_plans FOR ALL
  TO service_role
  USING (true);

-- execution_plan_steps: users can read/write steps for their own plans
CREATE POLICY "Users can view own plan steps"
  ON execution_plan_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM execution_plans
      WHERE execution_plans.id = execution_plan_steps.plan_id
        AND execution_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create steps for own plans"
  ON execution_plan_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM execution_plans
      WHERE execution_plans.id = execution_plan_steps.plan_id
        AND execution_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps for own plans"
  ON execution_plan_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM execution_plans
      WHERE execution_plans.id = execution_plan_steps.plan_id
        AND execution_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps for own plans"
  ON execution_plan_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM execution_plans
      WHERE execution_plans.id = execution_plan_steps.plan_id
        AND execution_plans.user_id = auth.uid()
    )
  );

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access on plan steps"
  ON execution_plan_steps FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_execution_plans_updated_at
  BEFORE UPDATE ON execution_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON execution_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON execution_plan_steps TO authenticated;
GRANT ALL ON execution_plans TO service_role;
GRANT ALL ON execution_plan_steps TO service_role;
