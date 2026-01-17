-- Migration: LLM Infrastructure
-- Cria tabelas para cache, métricas e rate limiting das chamadas ao Gemini API
-- Created: 2025-12-06

-- =====================================================
-- 1. TABELA: llm_cache
-- Armazena respostas do LLM para evitar chamadas duplicadas
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  action TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  hits INT DEFAULT 0,  -- Contador de cache hits
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE llm_cache IS 'Cache de respostas do Gemini API para otimizar custos e latência';
COMMENT ON COLUMN llm_cache.cache_key IS 'Hash MD5 de action + payload para lookup rápido';
COMMENT ON COLUMN llm_cache.hits IS 'Quantidade de vezes que este cache foi utilizado';

CREATE INDEX idx_llm_cache_key ON llm_cache(cache_key);
CREATE INDEX idx_llm_cache_expires_at ON llm_cache(expires_at);
CREATE INDEX idx_llm_cache_action ON llm_cache(action);

-- Trigger para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_llm_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_llm_cache_updated_at
  BEFORE UPDATE ON llm_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_cache_updated_at();

-- =====================================================
-- 2. TABELA: llm_metrics
-- Registra todas as chamadas ao LLM para auditoria e análise
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  status TEXT CHECK (status IN ('success', 'error', 'rate_limited', 'cached')) NOT NULL,
  error_message TEXT,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE llm_metrics IS 'Métricas de uso do Gemini API para monitoramento e billing';
COMMENT ON COLUMN llm_metrics.cached IS 'Se a resposta veio do cache (não consumiu API)';

CREATE INDEX idx_llm_metrics_user_created ON llm_metrics(user_id, created_at DESC);
CREATE INDEX idx_llm_metrics_action ON llm_metrics(action, created_at DESC);
CREATE INDEX idx_llm_metrics_status ON llm_metrics(status, created_at DESC);
CREATE INDEX idx_llm_metrics_created_at ON llm_metrics(created_at DESC);

-- =====================================================
-- 3. TABELA: rate_limits
-- Controla taxa de uso por usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_count INT DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT now(),
  daily_count INT DEFAULT 0,
  last_daily_reset TIMESTAMPTZ DEFAULT now(),
  total_requests INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE rate_limits IS 'Rate limiting por usuário para prevenir abuso da API';

CREATE INDEX idx_rate_limits_last_reset ON rate_limits(last_reset);
CREATE INDEX idx_rate_limits_last_daily_reset ON rate_limits(last_daily_reset);

-- Trigger para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();

-- =====================================================
-- 4. FUNCTION: check_and_increment_rate_limit
-- Verifica e incrementa rate limit atomicamente
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id UUID,
  p_hourly_limit INT DEFAULT 100,
  p_daily_limit INT DEFAULT 1000
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := now();
  v_hours_since_reset FLOAT;
  v_days_since_reset FLOAT;
  v_allowed BOOLEAN := TRUE;
  v_reason TEXT := NULL;
BEGIN
  -- Buscar ou criar registro
  SELECT * INTO v_record
  FROM rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, hourly_count, daily_count, total_requests)
    VALUES (p_user_id, 1, 1, 1)
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
      'allowed', TRUE,
      'hourly_remaining', p_hourly_limit - 1,
      'daily_remaining', p_daily_limit - 1
    );
  END IF;

  -- Calcular tempo desde último reset
  v_hours_since_reset := EXTRACT(EPOCH FROM (v_now - v_record.last_reset)) / 3600;
  v_days_since_reset := EXTRACT(EPOCH FROM (v_now - v_record.last_daily_reset)) / 86400;

  -- Reset hourly se passou 1 hora
  IF v_hours_since_reset >= 1 THEN
    UPDATE rate_limits
    SET hourly_count = 1,
        last_reset = v_now,
        total_requests = total_requests + 1
    WHERE user_id = p_user_id;

    v_record.hourly_count := 1;
  -- Reset daily se passou 1 dia
  ELSIF v_days_since_reset >= 1 THEN
    UPDATE rate_limits
    SET daily_count = 1,
        last_daily_reset = v_now,
        hourly_count = hourly_count + 1,
        total_requests = total_requests + 1
    WHERE user_id = p_user_id;

    v_record.daily_count := 1;
    v_record.hourly_count := v_record.hourly_count + 1;
  ELSE
    -- Verificar limites
    IF v_record.hourly_count >= p_hourly_limit THEN
      v_allowed := FALSE;
      v_reason := 'Hourly rate limit exceeded';
    ELSIF v_record.daily_count >= p_daily_limit THEN
      v_allowed := FALSE;
      v_reason := 'Daily rate limit exceeded';
    ELSE
      -- Incrementar contadores
      UPDATE rate_limits
      SET hourly_count = hourly_count + 1,
          daily_count = daily_count + 1,
          total_requests = total_requests + 1
      WHERE user_id = p_user_id;

      v_record.hourly_count := v_record.hourly_count + 1;
      v_record.daily_count := v_record.daily_count + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'hourly_remaining', p_hourly_limit - v_record.hourly_count,
    'daily_remaining', p_daily_limit - v_record.daily_count,
    'reset_at', v_record.last_reset + interval '1 hour'
  );
END;
$$;

COMMENT ON FUNCTION check_and_increment_rate_limit IS 'Verifica e incrementa rate limit atomicamente. Retorna se a request é permitida.';

-- =====================================================
-- 5. VIEW: llm_usage_stats
-- Estatísticas agregadas de uso
-- =====================================================

CREATE OR REPLACE VIEW llm_usage_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  user_id,
  action,
  model,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'success') AS successful_requests,
  COUNT(*) FILTER (WHERE status = 'error') AS failed_requests,
  COUNT(*) FILTER (WHERE cached = TRUE) AS cached_requests,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  AVG(latency_ms) AS avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms
FROM llm_metrics
GROUP BY DATE_TRUNC('day', created_at), user_id, action, model;

COMMENT ON VIEW llm_usage_stats IS 'Estatísticas diárias de uso do Gemini API por usuário, action e modelo';

-- =====================================================
-- 6. VIEW: cache_efficiency
-- Métricas de eficiência do cache
-- =====================================================

CREATE OR REPLACE VIEW cache_efficiency AS
SELECT
  action,
  COUNT(*) AS total_cached_items,
  SUM(hits) AS total_cache_hits,
  AVG(hits) AS avg_hits_per_item,
  MAX(hits) AS max_hits,
  COUNT(*) FILTER (WHERE expires_at > now()) AS active_cache_items,
  COUNT(*) FILTER (WHERE expires_at <= now()) AS expired_cache_items
FROM llm_cache
GROUP BY action;

COMMENT ON VIEW cache_efficiency IS 'Métricas de eficiência do cache por action';

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies para llm_cache (service role apenas)
CREATE POLICY "Service role full access to llm_cache"
  ON llm_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies para llm_metrics
CREATE POLICY "Users can view their own metrics"
  ON llm_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to llm_metrics"
  ON llm_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies para rate_limits
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to rate_limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. FUNCTION: cleanup_expired_cache
-- Remove entradas de cache expiradas (run via cron)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM llm_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Remove entradas de cache expiradas. Executar via pg_cron diariamente.';

-- =====================================================
-- 9. INDEXES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índice para queries de análise de custo
CREATE INDEX idx_llm_metrics_tokens ON llm_metrics(user_id, created_at DESC)
  WHERE input_tokens IS NOT NULL OR output_tokens IS NOT NULL;

-- Índice para queries de erro
CREATE INDEX idx_llm_metrics_errors ON llm_metrics(created_at DESC)
  WHERE status = 'error';

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT SELECT ON llm_usage_stats TO authenticated;
GRANT SELECT ON cache_efficiency TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache TO service_role;
