-- =====================================================
-- MIGRATION: 20251209200000_production_optimizations
-- Description: Production optimizations for File Search and AI Cost Tracking
-- Author: Aica Backend Architect
-- Date: 2025-12-09
-- Features:
--   - Budget limits and alerts
--   - Performance indexes
--   - Cost monitoring views
--   - Rate limiting
-- =====================================================

-- =====================================================
-- 1. USER BUDGET LIMITS
-- =====================================================

-- Add budget fields to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users'
                 AND column_name = 'ai_budget_monthly_usd') THEN
    ALTER TABLE auth.users
    ADD COLUMN ai_budget_monthly_usd NUMERIC(10, 2) DEFAULT 10.00,
    ADD COLUMN ai_budget_alert_threshold NUMERIC(3, 2) DEFAULT 0.80, -- 80%
    ADD COLUMN ai_budget_hard_limit BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN auth.users.ai_budget_monthly_usd IS 'Monthly AI usage budget in USD (default: $10)';
COMMENT ON COLUMN auth.users.ai_budget_alert_threshold IS 'Alert when reaching this % of budget (default: 80%)';
COMMENT ON COLUMN auth.users.ai_budget_hard_limit IS 'Block operations when budget exceeded';

-- =====================================================
-- 2. COST ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('budget_warning', 'budget_exceeded', 'anomaly', 'quota_warning')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  -- Metrics at time of alert
  current_spend_usd NUMERIC(10, 6) NOT NULL,
  budget_limit_usd NUMERIC(10, 2) NOT NULL,
  percentage_used NUMERIC(5, 2) NOT NULL,

  -- Context
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  module_type TEXT, -- Which module triggered the alert

  -- Alert state
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  message TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_cost_alerts_user_created ON public.ai_cost_alerts(user_id, created_at DESC);
CREATE INDEX idx_ai_cost_alerts_unacknowledged ON public.ai_cost_alerts(user_id, is_acknowledged) WHERE is_acknowledged = false;

COMMENT ON TABLE public.ai_cost_alerts IS 'Budget alerts and warnings for AI usage';

-- RLS
ALTER TABLE public.ai_cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON public.ai_cost_alerts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge their own alerts"
  ON public.ai_cost_alerts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 3. PERFORMANCE INDEXES
-- =====================================================

-- ai_usage_analytics indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_module_created
  ON public.ai_usage_analytics(user_id, module_type, created_at DESC)
  WHERE module_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_operation_model
  ON public.ai_usage_analytics(operation_type, ai_model);

CREATE INDEX IF NOT EXISTS idx_ai_usage_cost_range
  ON public.ai_usage_analytics(user_id, total_cost_usd, created_at DESC)
  WHERE total_cost_usd > 0;

-- file_search_corpora indexes
CREATE INDEX IF NOT EXISTS idx_file_search_corpora_user_module
  ON public.file_search_corpora(user_id, module_type, module_id)
  WHERE module_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_search_corpora_active
  ON public.file_search_corpora(user_id, is_active, created_at DESC)
  WHERE is_active = true;

-- file_search_documents indexes
CREATE INDEX IF NOT EXISTS idx_file_search_docs_corpus
  ON public.file_search_documents(corpus_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_search_docs_module
  ON public.file_search_documents(corpus_id, module_type, module_id)
  WHERE module_type IS NOT NULL;

-- =====================================================
-- 4. MATERIALIZED VIEW: Monthly Cost Summary
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.ai_monthly_cost_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_operations,
  SUM(total_cost_usd) AS total_cost_usd,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  AVG(duration_seconds) AS avg_duration_seconds,

  -- Breakdown by operation type
  COUNT(*) FILTER (WHERE operation_type = 'file_search_query') AS file_search_count,
  SUM(total_cost_usd) FILTER (WHERE operation_type = 'file_search_query') AS file_search_cost,

  COUNT(*) FILTER (WHERE operation_type = 'embedding') AS embedding_count,
  SUM(total_cost_usd) FILTER (WHERE operation_type = 'embedding') AS embedding_cost,

  COUNT(*) FILTER (WHERE operation_type = 'text_generation') AS text_gen_count,
  SUM(total_cost_usd) FILTER (WHERE operation_type = 'text_generation') AS text_gen_cost,

  -- Breakdown by module
  COUNT(*) FILTER (WHERE module_type = 'grants') AS grants_count,
  SUM(total_cost_usd) FILTER (WHERE module_type = 'grants') AS grants_cost,

  COUNT(*) FILTER (WHERE module_type = 'finance') AS finance_count,
  SUM(total_cost_usd) FILTER (WHERE module_type = 'finance') AS finance_cost,

  COUNT(*) FILTER (WHERE module_type = 'podcast') AS podcast_count,
  SUM(total_cost_usd) FILTER (WHERE module_type = 'podcast') AS podcast_cost,

  COUNT(*) FILTER (WHERE module_type = 'journey') AS journey_count,
  SUM(total_cost_usd) FILTER (WHERE module_type = 'journey') AS journey_cost

FROM public.ai_usage_analytics
GROUP BY user_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_cost_summary_user_month
  ON public.ai_monthly_cost_summary(user_id, month);

COMMENT ON MATERIALIZED VIEW public.ai_monthly_cost_summary IS 'Pre-aggregated monthly cost data for fast dashboard queries';

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_monthly_cost_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ai_monthly_cost_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. BUDGET MONITORING FUNCTIONS
-- =====================================================

-- Function: Get current month spend for user
CREATE OR REPLACE FUNCTION public.get_current_month_spend(p_user_id UUID)
RETURNS TABLE (
  total_spend_usd NUMERIC,
  budget_limit_usd NUMERIC,
  percentage_used NUMERIC,
  alert_threshold NUMERIC,
  should_alert BOOLEAN,
  should_block BOOLEAN
) AS $$
DECLARE
  v_budget NUMERIC;
  v_threshold NUMERIC;
  v_hard_limit BOOLEAN;
  v_spend NUMERIC;
BEGIN
  -- Get user budget settings
  SELECT ai_budget_monthly_usd, ai_budget_alert_threshold, ai_budget_hard_limit
  INTO v_budget, v_threshold, v_hard_limit
  FROM auth.users
  WHERE id = p_user_id;

  -- Default values if not set
  v_budget := COALESCE(v_budget, 10.00);
  v_threshold := COALESCE(v_threshold, 0.80);
  v_hard_limit := COALESCE(v_hard_limit, false);

  -- Calculate current month spend
  SELECT COALESCE(SUM(total_cost_usd), 0)
  INTO v_spend
  FROM ai_usage_analytics
  WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);

  -- Return results
  RETURN QUERY SELECT
    v_spend,
    v_budget,
    ROUND((v_spend / NULLIF(v_budget, 0)) * 100, 2),
    v_threshold,
    (v_spend / NULLIF(v_budget, 0)) >= v_threshold,
    v_hard_limit AND (v_spend >= v_budget);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_month_spend IS 'Returns current month spend and budget status for a user';

-- Function: Check if user can perform AI operation
CREATE OR REPLACE FUNCTION public.can_perform_ai_operation(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_should_block BOOLEAN;
BEGIN
  SELECT should_block
  INTO v_should_block
  FROM public.get_current_month_spend(p_user_id);

  RETURN NOT COALESCE(v_should_block, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Create budget alert
CREATE OR REPLACE FUNCTION public.create_budget_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_current_spend NUMERIC,
  p_budget_limit NUMERIC,
  p_percentage_used NUMERIC,
  p_module_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_message TEXT;
BEGIN
  -- Generate message based on alert type
  v_message := CASE p_alert_type
    WHEN 'budget_warning' THEN
      FORMAT('Você atingiu %s%% do seu orçamento mensal de IA ($%s de $%s)',
             p_percentage_used, p_current_spend, p_budget_limit)
    WHEN 'budget_exceeded' THEN
      FORMAT('Orçamento mensal excedido! Gasto: $%s / Limite: $%s',
             p_current_spend, p_budget_limit)
    WHEN 'anomaly' THEN
      FORMAT('Detectado uso anômalo de IA. Gasto atual: $%s', p_current_spend)
    WHEN 'quota_warning' THEN
      'Aproximando-se do limite de quota da API'
    ELSE 'Alerta de custo de IA'
  END;

  -- Check if similar alert already exists (avoid duplicates)
  SELECT id INTO v_alert_id
  FROM ai_cost_alerts
  WHERE user_id = p_user_id
    AND alert_type = p_alert_type
    AND is_acknowledged = false
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
  LIMIT 1;

  IF v_alert_id IS NOT NULL THEN
    RETURN v_alert_id; -- Don't create duplicate
  END IF;

  -- Create new alert
  INSERT INTO ai_cost_alerts (
    user_id,
    alert_type,
    severity,
    current_spend_usd,
    budget_limit_usd,
    percentage_used,
    period_start,
    period_end,
    module_type,
    message
  ) VALUES (
    p_user_id,
    p_alert_type,
    p_severity,
    p_current_spend,
    p_budget_limit,
    p_percentage_used,
    DATE_TRUNC('month', CURRENT_TIMESTAMP),
    (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month') - INTERVAL '1 second',
    p_module_type,
    v_message
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGER: Auto-check budget after insert
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_budget_after_ai_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_status RECORD;
BEGIN
  -- Get current budget status
  SELECT * INTO v_budget_status
  FROM public.get_current_month_spend(NEW.user_id);

  -- Create alert if threshold exceeded
  IF v_budget_status.should_alert AND v_budget_status.percentage_used >= (v_budget_status.alert_threshold * 100) THEN
    PERFORM public.create_budget_alert(
      NEW.user_id,
      CASE
        WHEN v_budget_status.percentage_used >= 100 THEN 'budget_exceeded'
        ELSE 'budget_warning'
      END,
      CASE
        WHEN v_budget_status.percentage_used >= 100 THEN 'critical'
        WHEN v_budget_status.percentage_used >= 90 THEN 'warning'
        ELSE 'info'
      END,
      v_budget_status.total_spend_usd,
      v_budget_status.budget_limit_usd,
      v_budget_status.percentage_used,
      NEW.module_type
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_budget_after_ai_usage ON public.ai_usage_analytics;
CREATE TRIGGER trigger_check_budget_after_ai_usage
  AFTER INSERT ON public.ai_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.check_budget_after_ai_usage();

COMMENT ON TRIGGER trigger_check_budget_after_ai_usage ON public.ai_usage_analytics IS 'Auto-creates budget alerts when thresholds are exceeded';

-- =====================================================
-- 7. RATE LIMITING VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.ai_usage_rate_limits AS
SELECT
  user_id,
  COUNT(*) AS operations_last_hour,
  COUNT(*) FILTER (WHERE operation_type = 'file_search_query') AS searches_last_hour,
  COUNT(*) FILTER (WHERE operation_type = 'embedding') AS embeddings_last_hour,
  MAX(created_at) AS last_operation_at
FROM ai_usage_analytics
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY user_id;

COMMENT ON VIEW public.ai_usage_rate_limits IS 'Rate limiting metrics for the last hour';

-- =====================================================
-- 8. ADMIN MONITORING VIEWS
-- =====================================================

-- Top spenders
CREATE OR REPLACE VIEW public.ai_top_spenders_current_month AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(a.*) AS operations,
  SUM(a.total_cost_usd) AS total_spend,
  u.ai_budget_monthly_usd AS budget,
  ROUND((SUM(a.total_cost_usd) / NULLIF(u.ai_budget_monthly_usd, 0)) * 100, 2) AS budget_used_pct
FROM auth.users u
LEFT JOIN ai_usage_analytics a ON a.user_id = u.id
  AND a.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY u.id, u.email, u.ai_budget_monthly_usd
HAVING SUM(a.total_cost_usd) > 0
ORDER BY total_spend DESC;

-- Cost trends (daily)
CREATE OR REPLACE VIEW public.ai_daily_cost_trends AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS operations,
  SUM(total_cost_usd) AS total_cost,
  AVG(total_cost_usd) AS avg_cost_per_op,
  COUNT(DISTINCT user_id) AS active_users
FROM ai_usage_analytics
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute on monitoring functions
GRANT EXECUTE ON FUNCTION public.get_current_month_spend TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_perform_ai_operation TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_monthly_cost_summary TO service_role;

-- Grant select on views
GRANT SELECT ON public.ai_usage_rate_limits TO authenticated;
GRANT SELECT ON public.ai_top_spenders_current_month TO service_role; -- Admin only
GRANT SELECT ON public.ai_daily_cost_trends TO service_role; -- Admin only

-- =====================================================
-- DONE: Production Optimizations Applied
-- =====================================================

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Production optimizations applied successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Features added:';
  RAISE NOTICE '  - Budget limits and alerts';
  RAISE NOTICE '  - 10 performance indexes';
  RAISE NOTICE '  - Materialized view for fast queries';
  RAISE NOTICE '  - Automatic budget monitoring';
  RAISE NOTICE '  - Rate limiting tracking';
  RAISE NOTICE '  - Admin monitoring views';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '  1. Set user budgets: UPDATE auth.users SET ai_budget_monthly_usd = 20.00 WHERE email = ''your@email.com''';
  RAISE NOTICE '  2. Refresh materialized view: SELECT refresh_monthly_cost_summary()';
  RAISE NOTICE '  3. Check budget status: SELECT * FROM get_current_month_spend(auth.uid())';
  RAISE NOTICE '';
END $$;
