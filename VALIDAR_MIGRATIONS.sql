-- ============================================================================
-- VALIDAÇÃO: Verificar se todas as 6 migrations foram aplicadas
-- ============================================================================

SELECT version, '✅ APLICADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260112000001',  -- Migration 0: Document Processing
  '20260122000003',  -- Migration 1: WhatsApp Document Tracking
  '20260123',        -- Migration 2: Streak Trends
  '20260124',        -- Migration 3: Consciousness Points
  '20260125',        -- Migration 4: RECIPE Badges
  '20260126'         -- Migration 5: Unified Efficiency
)
ORDER BY version;

-- ============================================================================
-- ESPERADO: 6 linhas com ✅ APLICADA
-- ============================================================================
-- Se aparecerem MENOS de 6 linhas, execute o script de registro manual abaixo
-- ============================================================================
