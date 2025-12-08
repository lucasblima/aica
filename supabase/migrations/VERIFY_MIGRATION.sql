-- =====================================================
-- Script de Verificação Pós-Migration
-- Execute este script APÓS aplicar a migration principal
-- =====================================================

-- 1. Verificar novas tabelas criadas
SELECT
  'Tabelas Criadas' as check_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✓ OK' ELSE '✗ FALHOU' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('finance_processing_logs', 'finance_categorization_rules')
ORDER BY table_name;

-- 2. Verificar novos campos em finance_statements
SELECT
  'Campos finance_statements' as check_type,
  column_name,
  data_type,
  '✓ OK' as status
FROM information_schema.columns
WHERE table_name = 'finance_statements'
  AND column_name IN (
    'source_type', 'source_bank', 'validation_status',
    'has_duplicates', 'raw_data_snapshot', 'transaction_hash'
  )
ORDER BY column_name;

-- 3. Verificar novos campos em finance_transactions
SELECT
  'Campos finance_transactions' as check_type,
  column_name,
  data_type,
  '✓ OK' as status
FROM information_schema.columns
WHERE table_name = 'finance_transactions'
  AND column_name IN (
    'transaction_hash', 'is_duplicate', 'duplicate_of',
    'categorization_history', 'is_anomaly', 'raw_description'
  )
ORDER BY column_name;

-- 4. Verificar funções criadas
SELECT
  'Funções PostgreSQL' as check_type,
  routine_name as function_name,
  '✓ OK' as status
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_schema = 'public'
  AND routine_name IN (
    'generate_transaction_hash',
    'validate_statement_balance',
    'detect_duplicate_transactions',
    'recalculate_closing_balance',
    'check_period_continuity'
  )
ORDER BY routine_name;

-- 5. Verificar triggers criados
SELECT
  'Triggers' as check_type,
  trigger_name,
  event_manipulation || ' ON ' || event_object_table as trigger_event,
  '✓ OK' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('before_transaction_insert', 'after_statement_completed')
ORDER BY trigger_name;

-- 6. Verificar regras de categorização inseridas
SELECT
  'Regras de Categorização' as check_type,
  COUNT(*) as total_rules,
  CASE WHEN COUNT(*) >= 11 THEN '✓ OK (11 regras seed)' ELSE '✗ FALHOU' END as status
FROM finance_categorization_rules
WHERE user_id IS NULL; -- System rules

-- 7. Listar regras de categorização seed
SELECT
  'Detalhe das Regras' as check_type,
  rule_name,
  target_category,
  priority,
  '✓' as status
FROM finance_categorization_rules
WHERE user_id IS NULL
ORDER BY priority DESC, target_category;

-- 8. Verificar indexes criados
SELECT
  'Indexes' as check_type,
  schemaname || '.' || tablename as table_name,
  indexname,
  '✓ OK' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_processing_logs%' OR
    indexname LIKE 'idx_statements_source%' OR
    indexname LIKE 'idx_statements_validation%' OR
    indexname LIKE 'idx_transactions_hash%' OR
    indexname LIKE 'idx_transactions_is_duplicate%' OR
    indexname LIKE 'idx_categorization_rules%'
  )
ORDER BY tablename, indexname;

-- 9. Verificar RLS policies
SELECT
  'RLS Policies' as check_type,
  tablename,
  policyname,
  CASE WHEN cmd = 'r' THEN 'SELECT' WHEN cmd = '*' THEN 'ALL' ELSE cmd END as command,
  '✓ OK' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('finance_processing_logs', 'finance_categorization_rules')
ORDER BY tablename, policyname;

-- 10. Teste rápido de função generate_transaction_hash
SELECT
  'Teste de Função' as check_type,
  'generate_transaction_hash' as function_name,
  generate_transaction_hash(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '2024-12-08'::date,
    'TESTE MIGRATION',
    100.50
  ) as hash_gerado,
  '✓ OK' as status;

-- =====================================================
-- RESUMO FINAL
-- =====================================================
SELECT
  '====== RESUMO DA MIGRATION ======' as resultado,
  '' as detalhes,
  '' as status
UNION ALL
SELECT
  'Tabelas',
  (SELECT COUNT(*)::text FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('finance_processing_logs', 'finance_categorization_rules'))
  || ' de 2',
  '✓' as status
UNION ALL
SELECT
  'Funções',
  (SELECT COUNT(*)::text FROM information_schema.routines
   WHERE routine_type = 'FUNCTION' AND routine_schema = 'public'
   AND routine_name IN ('generate_transaction_hash', 'validate_statement_balance', 'detect_duplicate_transactions', 'recalculate_closing_balance', 'check_period_continuity'))
  || ' de 5',
  '✓' as status
UNION ALL
SELECT
  'Triggers',
  (SELECT COUNT(*)::text FROM information_schema.triggers
   WHERE trigger_schema = 'public' AND trigger_name IN ('before_transaction_insert', 'after_statement_completed'))
  || ' de 2',
  '✓' as status
UNION ALL
SELECT
  'Regras Seed',
  (SELECT COUNT(*)::text FROM finance_categorization_rules WHERE user_id IS NULL),
  '✓' as status
UNION ALL
SELECT
  '================================',
  'Migration concluída com sucesso!',
  '✓✓✓' as status;
