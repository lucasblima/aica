-- ============================================================================
-- VERIFICAÇÃO DE MIGRATIONS PENDENTES - Gamification 2.0 + WhatsApp Documents
-- Execute este script no Supabase SQL Editor para verificar quais migrations
-- foram aplicadas no banco staging
-- ============================================================================

SELECT
  'Migration Status' AS categoria,
  version AS migration_version,
  name AS migration_name,
  CASE
    WHEN version IN (
      SELECT version FROM supabase_migrations.schema_migrations
    ) THEN '✅ APLICADA'
    ELSE '❌ NÃO APLICADA'
  END AS status
FROM (
  VALUES
    ('20260122000003', 'WhatsApp Document Tracking (Issue #118 Fase 1)'),
    ('20260123', 'Gamification 2.0 - Streak Trends'),
    ('20260124', 'Gamification 2.0 - Consciousness Points'),
    ('20260125', 'Gamification 2.0 - RECIPE Badges'),
    ('20260126', 'Gamification 2.0 - Unified Efficiency')
) AS migrations(version, name)
ORDER BY version;

-- ============================================================================
-- VERIFICAÇÃO DE TABELAS CRIADAS
-- ============================================================================

SELECT
  'Table Status' AS categoria,
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = checks.table_name
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END AS status
FROM (
  VALUES
    ('whatsapp_media_tracking'),
    ('cp_transactions'),
    ('recipe_badges'),
    ('badge_progress')
) AS checks(table_name);

-- ============================================================================
-- VERIFICAÇÃO DE COLUNAS ADICIONADAS
-- ============================================================================

SELECT
  'Column Status' AS categoria,
  CONCAT(table_name, '.', column_name) AS coluna,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND information_schema.columns.table_name = checks.table_name
        AND information_schema.columns.column_name = checks.column_name
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END AS status
FROM (
  VALUES
    ('user_stats', 'streak_trend'),
    ('user_stats', 'gamification_intensity'),
    ('user_stats', 'consciousness_points'),
    ('user_stats', 'recipe_progress'),
    ('user_stats', 'unified_efficiency')
) AS checks(table_name, column_name);

-- ============================================================================
-- VERIFICAÇÃO DE STORAGE BUCKET
-- ============================================================================

SELECT
  'Storage Bucket' AS categoria,
  id AS bucket_id,
  '✅ EXISTE' AS status
FROM storage.buckets
WHERE id = 'whatsapp-documents'

UNION ALL

SELECT
  'Storage Bucket',
  'whatsapp-documents',
  '❌ NÃO EXISTE'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-documents'
);
