-- ============================================================================
-- Active Domains — Life Score Domain Filtering
-- Persist which domains are active per user for Life Score computation.
-- Default: 5 domains active (atlas, journey, connections, finance, flux).
-- Grants and Studio start inactive.
-- ============================================================================

-- 1. Add active_domains column to user_domain_weights
ALTER TABLE user_domain_weights
  ADD COLUMN IF NOT EXISTS active_domains JSONB
    NOT NULL DEFAULT '["atlas","journey","connections","finance","flux"]';

COMMENT ON COLUMN user_domain_weights.active_domains IS 'Array of active domain names for Life Score computation. Only active domains are included in the weighted geometric mean.';

-- Prevent empty active_domains (at least 1 domain must be active)
ALTER TABLE user_domain_weights
  DROP CONSTRAINT IF EXISTS active_domains_not_empty;
ALTER TABLE user_domain_weights
  ADD CONSTRAINT active_domains_not_empty
  CHECK (jsonb_array_length(active_domains) > 0);

-- 2. Add active_domains column to life_scores for historical tracking
ALTER TABLE life_scores
  ADD COLUMN IF NOT EXISTS active_domains JSONB;

COMMENT ON COLUMN life_scores.active_domains IS 'Snapshot of active domains at computation time. Null for scores computed before this feature.';

-- 3. Drop + recreate get_user_domain_weights (return type changed)
DROP FUNCTION IF EXISTS get_user_domain_weights();

CREATE OR REPLACE FUNCTION get_user_domain_weights()
RETURNS TABLE (
  weights JSONB,
  method TEXT,
  ahp_comparisons JSONB,
  active_domains JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT weights, method, ahp_comparisons, active_domains, updated_at
  FROM user_domain_weights
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_domain_weights TO authenticated;

-- 4. Drop + recreate upsert_user_domain_weights (signature changed)
DROP FUNCTION IF EXISTS upsert_user_domain_weights(JSONB, TEXT, JSONB);

CREATE OR REPLACE FUNCTION upsert_user_domain_weights(
  p_weights JSONB,
  p_method TEXT DEFAULT 'slider',
  p_ahp_comparisons JSONB DEFAULT NULL,
  p_active_domains JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_domain_weights (user_id, weights, method, ahp_comparisons, active_domains)
  VALUES (
    auth.uid(),
    p_weights,
    p_method,
    p_ahp_comparisons,
    COALESCE(p_active_domains, '["atlas","journey","connections","finance","flux"]'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    weights = EXCLUDED.weights,
    method = EXCLUDED.method,
    ahp_comparisons = EXCLUDED.ahp_comparisons,
    active_domains = COALESCE(p_active_domains, user_domain_weights.active_domains);
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_user_domain_weights TO authenticated;

-- 5. Drop + recreate get_latest_life_score (return type changed)
DROP FUNCTION IF EXISTS get_latest_life_score();

CREATE OR REPLACE FUNCTION get_latest_life_score()
RETURNS TABLE (
  id UUID,
  domain_scores JSONB,
  domain_weights JSONB,
  active_domains JSONB,
  composite_score REAL,
  trend TEXT,
  spiral_detected BOOLEAN,
  spiral_domains TEXT[],
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, domain_scores, domain_weights, active_domains, composite_score, trend,
         spiral_detected, spiral_domains, computed_at
  FROM life_scores
  WHERE user_id = auth.uid()
  ORDER BY computed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_latest_life_score TO authenticated;
