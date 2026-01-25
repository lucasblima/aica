-- ============================================================================
-- REGISTRO MANUAL: Registrar migrations na tabela schema_migrations
-- Execute APENAS se a validação mostrar MENOS de 6 migrations
-- ============================================================================

-- Migration 0: Document Processing Pipeline
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260112000001',
  'document_processing_pipeline',
  ARRAY[
    'CREATE EXTENSION vector',
    'CREATE TABLE processed_documents',
    'CREATE TABLE document_chunks',
    'CREATE TABLE document_embeddings',
    'CREATE TABLE document_link_suggestions',
    'CREATE POLICIES AND TRIGGERS'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- Migration 1: WhatsApp Document Tracking
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260122000003',
  'whatsapp_document_tracking',
  ARRAY[
    'ALTER TABLE processed_documents ADD whatsapp columns',
    'CREATE whatsapp indexes',
    'CREATE document tracking functions'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- Migration 2: Streak Trends
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260123',
  'streak_trends',
  ARRAY[
    'CREATE TABLE streak_trends',
    'CREATE streak analytics functions'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- Migration 3: Consciousness Points
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260124',
  'consciousness_points',
  ARRAY[
    'ALTER TABLE user_stats ADD consciousness_points',
    'CREATE TABLE cp_transactions',
    'CREATE cp reset functions',
    'CREATE cp leaderboard function'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- Migration 4: RECIPE Badges
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260125',
  'recipe_badges',
  ARRAY[
    'CREATE recipe badge system',
    'CREATE badge leaderboard view'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- Migration 5: Unified Efficiency
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260126',
  'unified_efficiency',
  ARRAY[
    'CREATE TABLE efficiency_history',
    'CREATE efficiency scoring functions',
    'CREATE efficiency leaderboard view'
  ]
)
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- Validar novamente após registro
-- ============================================================================

SELECT version, '✅ REGISTRADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260112000001',
  '20260122000003',
  '20260123',
  '20260124',
  '20260125',
  '20260126'
)
ORDER BY version;

-- ============================================================================
-- ESPERADO: 6 linhas com ✅ REGISTRADA
-- ============================================================================
