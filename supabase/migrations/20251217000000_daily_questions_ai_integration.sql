/**
 * Migration: Daily Questions AI Integration (GAP 3)
 * Date: 2025-12-17
 *
 * Adds support for AI-driven daily question generation with Gemini integration
 * and 3-level fallback system (AI → Journey → Pool)
 */

-- Create table for storing gemini_api_logs if not exists
CREATE TABLE IF NOT EXISTS public.gemini_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- e.g., 'daily_question', 'analyze_moment', 'generate_summary'
  model TEXT NOT NULL, -- e.g., 'gemini-2.0-flash', 'text-embedding-004'
  tokens_used INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  status TEXT NOT NULL, -- 'success', 'error', 'rate_limited'
  error_message TEXT,
  cache_hit BOOLEAN DEFAULT FALSE,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes for efficient querying
  CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'rate_limited', 'timeout')),
  INDEX idx_gemini_user_date (user_id, created_at DESC),
  INDEX idx_gemini_action_date (action, created_at DESC),
  INDEX idx_gemini_status_date (status, created_at DESC)
);

-- Enable RLS for gemini_api_logs
ALTER TABLE public.gemini_api_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for gemini_api_logs
CREATE POLICY "Users can view their own API logs"
  ON public.gemini_api_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert logs"
  ON public.gemini_api_logs FOR INSERT
  WITH CHECK (TRUE);

-- Extend daily_questions table if it exists (add fields for AI integration)
ALTER TABLE public.daily_questions
  ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES public.user_journeys(id),
  ADD COLUMN IF NOT EXISTS context_tags JSONB DEFAULT '[]'::jsonb, -- Tags for AI context matching
  ADD COLUMN IF NOT EXISTS min_user_burnout_count INTEGER DEFAULT 0, -- Min burnout count to show
  ADD COLUMN IF NOT EXISTS relevant_emotions TEXT[] DEFAULT ARRAY[]::text[], -- Emotions when question is relevant
  ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE, -- Flag for AI-generated questions
  ADD COLUMN IF NOT EXISTS gemini_prompt_hash TEXT; -- Hash of prompt used to generate

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_daily_questions_journey_id ON public.daily_questions(journey_id);
CREATE INDEX IF NOT EXISTS idx_daily_questions_ai_generated ON public.daily_questions(created_by_ai);

-- Extend question_responses table if exists (add metadata)
ALTER TABLE public.question_responses
  ADD COLUMN IF NOT EXISTS question_source TEXT DEFAULT 'pool', -- 'ai', 'journey', 'pool'
  ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS is_ai_generated_question BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_context_snapshot JSONB; -- JSON of user context when question was asked

-- Create indexes on response metadata
CREATE INDEX IF NOT EXISTS idx_question_responses_source ON public.question_responses(question_source);
CREATE INDEX IF NOT EXISTS idx_question_responses_date ON public.question_responses(user_id, responded_at DESC);

-- Create view for daily question analytics
CREATE OR REPLACE VIEW public.v_daily_question_analytics AS
SELECT
  qr.user_id,
  COUNT(*) as total_responses,
  COUNT(DISTINCT qr.question_id) as unique_questions_answered,
  COUNT(CASE WHEN qr.question_source = 'ai' THEN 1 END) as ai_responses,
  COUNT(CASE WHEN qr.question_source = 'journey' THEN 1 END) as journey_responses,
  COUNT(CASE WHEN qr.question_source = 'pool' THEN 1 END) as pool_responses,
  AVG(EXTRACT(EPOCH FROM (qr.responded_at - qr.created_at))) as avg_response_time_seconds,
  MAX(qr.responded_at) as last_response_at,
  MIN(qr.responded_at) as first_response_at,
  (MAX(qr.responded_at)::date - MIN(qr.responded_at)::date) as engagement_span_days
FROM public.question_responses qr
GROUP BY qr.user_id;

-- Create function to award CP for answering questions
CREATE OR REPLACE FUNCTION public.award_cp_for_question_response(
  p_user_id UUID,
  p_question_source TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cp_points INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Award different CP based on question source
  -- AI questions: 5 CP (lower because generated frequently)
  -- Journey questions: 10 CP (specific and helpful)
  -- Pool questions: 10 CP (standard reward)
  v_cp_points := CASE
    WHEN p_question_source = 'ai' THEN 5
    WHEN p_question_source = 'journey' THEN 10
    WHEN p_question_source = 'pool' THEN 10
    ELSE 10
  END;

  -- Award consciousness points
  INSERT INTO public.consciousness_point_transactions (
    user_id,
    points,
    reason,
    category,
    created_at
  ) VALUES (
    p_user_id,
    v_cp_points,
    'answered_question_' || p_question_source,
    'engagement',
    now()
  );

  -- Get new total (if tracking table exists)
  SELECT COALESCE(SUM(points), 0) INTO v_new_total
  FROM public.consciousness_point_transactions
  WHERE user_id = p_user_id;

  RETURN v_cp_points;
END;
$$;

-- Create function to log Gemini API usage
CREATE OR REPLACE FUNCTION public.log_gemini_api_call(
  p_user_id UUID,
  p_action TEXT,
  p_model TEXT,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_response_time_ms INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'success',
  p_cache_hit BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_cost_usd DECIMAL(10, 6);
BEGIN
  -- Calculate cost based on model and tokens
  -- Costs (as of 2025-12):
  -- gemini-2.0-flash: $0.075/M input, $0.3/M output
  -- gemini-2.5-flash: $0.1/M input, $0.4/M output
  -- text-embedding-004: $0.025/M tokens

  v_cost_usd := CASE
    WHEN p_model = 'gemini-2.0-flash' THEN
      (p_input_tokens::DECIMAL(15,2) / 1000000) * 0.075 +
      (p_output_tokens::DECIMAL(15,2) / 1000000) * 0.3
    WHEN p_model = 'gemini-2.5-flash' THEN
      (p_input_tokens::DECIMAL(15,2) / 1000000) * 0.1 +
      (p_output_tokens::DECIMAL(15,2) / 1000000) * 0.4
    WHEN p_model = 'text-embedding-004' THEN
      ((p_input_tokens + p_output_tokens)::DECIMAL(15,2) / 1000000) * 0.025
    ELSE 0
  END;

  INSERT INTO public.gemini_api_logs (
    user_id,
    action,
    model,
    input_tokens,
    output_tokens,
    response_time_ms,
    status,
    cache_hit,
    cost_usd
  ) VALUES (
    p_user_id,
    p_action,
    p_model,
    p_input_tokens,
    p_output_tokens,
    p_response_time_ms,
    p_status,
    p_cache_hit,
    v_cost_usd
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Create view for Gemini cost analytics
CREATE OR REPLACE VIEW public.v_gemini_cost_analytics AS
SELECT
  user_id,
  action,
  model,
  COUNT(*) as call_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(response_time_ms) as avg_response_time_ms,
  COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hit_count,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
  MAX(created_at) as last_call_at
FROM public.gemini_api_logs
GROUP BY user_id, action, model;

-- Grant permissions
GRANT SELECT ON public.v_daily_question_analytics TO anon, authenticated;
GRANT SELECT ON public.v_gemini_cost_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_cp_for_question_response TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_gemini_api_call TO authenticated, service_role;

-- Insert seed data for fallback questions if table is empty
INSERT INTO public.daily_questions (question_text, category, active)
SELECT * FROM (VALUES
  ('O que você quer conquistar hoje?', 'change', true),
  ('Como você está se sentindo neste momento?', 'reflection', true),
  ('Qual área da sua vida precisa de mais atenção?', 'reflection', true),
  ('O que te deixaria orgulhoso hoje?', 'gratitude', true),
  ('Como você pode se cuidar melhor agora?', 'energy', true),
  ('Qual foi a melhor parte do seu dia?', 'gratitude', true),
  ('O que você aprendeu recentemente que mudou sua perspectiva?', 'learning', true),
  ('Como você quer se sentir nesta semana?', 'energy', true)
) AS t(question_text, category, active)
WHERE NOT EXISTS (SELECT 1 FROM public.daily_questions LIMIT 1);

-- Create comment for documentation
COMMENT ON TABLE public.gemini_api_logs IS 'Tracks all Gemini API calls for cost analysis and performance monitoring';
COMMENT ON TABLE public.daily_questions IS 'Daily reflection questions for user engagement (supports AI, journey, and pool-based questions)';
COMMENT ON FUNCTION public.award_cp_for_question_response IS 'Awards consciousness points based on question source (AI=5, Journey=10, Pool=10)';
COMMENT ON FUNCTION public.log_gemini_api_call IS 'Logs Gemini API calls and calculates cost based on model and token usage';
