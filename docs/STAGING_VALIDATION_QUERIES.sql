-- ============================================================================
-- STAGING VALIDATION QUERIES - PR #79 Deploy Verification
-- ============================================================================
-- Execute estas queries no Supabase SQL Editor (staging database)
-- Para verificar se o deploy do PR #79 foi bem-sucedido
--
-- Deploy: 2026-01-09 ~11:36 UTC
-- PR: #79 - AI Cost Tracking, WhatsApp Integration, Database Security
-- ============================================================================

-- ============================================================================
-- SECTION 1: AI COST TRACKING VALIDATION
-- ============================================================================

-- Query 1.1: Verificar se tabela ai_usage_analytics existe e tem dados
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT module_type) as modules_tracked,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM ai_usage_analytics;

-- Query 1.2: Breakdown por módulo (deve incluir Journey, Finance, Grants)
SELECT
  module_type,
  COUNT(*) as total_operations,
  COUNT(DISTINCT request_metadata->>'use_case') as unique_operations,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(
    SUM(input_tokens * 0.000001 + output_tokens * 0.000002)::numeric,
    4
  ) as estimated_cost_usd
FROM ai_usage_analytics
GROUP BY module_type
ORDER BY total_operations DESC;

-- Query 1.3: Verificar Grants module tracking (7 operações esperadas)
SELECT
  request_metadata->>'use_case' as use_case,
  COUNT(*) as usage_count,
  AVG(duration_seconds)::numeric(10,2) as avg_duration_sec,
  AVG(input_tokens)::numeric(10,0) as avg_input_tokens,
  AVG(output_tokens)::numeric(10,0) as avg_output_tokens
FROM ai_usage_analytics
WHERE module_type = 'grants'
GROUP BY request_metadata->>'use_case'
ORDER BY usage_count DESC;

-- Query 1.4: Verificar Journey module tracking (7 operações esperadas)
SELECT
  request_metadata->>'use_case' as use_case,
  COUNT(*) as usage_count,
  AVG(duration_seconds)::numeric(10,2) as avg_duration_sec,
  AVG(input_tokens)::numeric(10,0) as avg_input_tokens,
  AVG(output_tokens)::numeric(10,0) as avg_output_tokens
FROM ai_usage_analytics
WHERE module_type = 'journey'
GROUP BY request_metadata->>'use_case'
ORDER BY usage_count DESC;

-- Query 1.5: Verificar Finance module tracking (5 operações esperadas)
SELECT
  request_metadata->>'use_case' as use_case,
  COUNT(*) as usage_count,
  AVG(duration_seconds)::numeric(10,2) as avg_duration_sec,
  AVG(input_tokens)::numeric(10,0) as avg_input_tokens,
  AVG(output_tokens)::numeric(10,0) as avg_output_tokens
FROM ai_usage_analytics
WHERE module_type = 'finance'
GROUP BY request_metadata->>'use_case'
ORDER BY usage_count DESC;

-- Query 1.6: Verificar tracking das últimas 24 horas (deve ter atividade recente)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  module_type,
  COUNT(*) as operations,
  SUM(input_tokens + output_tokens) as total_tokens
FROM ai_usage_analytics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), module_type
ORDER BY hour DESC, operations DESC;

-- ============================================================================
-- SECTION 2: RLS POLICIES VALIDATION (Phase 1)
-- ============================================================================

-- Query 2.1: Verificar RLS policies na tabela ai_usage_tracking_errors
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'ai_usage_tracking_errors'
ORDER BY cmd;

-- Query 2.2: Verificar RLS policies na tabela daily_questions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'daily_questions'
ORDER BY cmd;

-- Query 2.3: Verificar RLS policies na tabela whatsapp_sync_logs
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'whatsapp_sync_logs'
ORDER BY cmd;

-- Query 2.4: Verificar RLS policies na tabela data_deletion_requests
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'data_deletion_requests'
ORDER BY cmd;

-- Query 2.5: Verificar RLS policies na tabela whatsapp_messages
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'whatsapp_messages'
ORDER BY cmd;

-- Query 2.6: Contar todas as policies RLS por tabela (overview geral)
SELECT
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(DISTINCT cmd ORDER BY cmd) as commands_covered
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 0
ORDER BY policy_count DESC;

-- ============================================================================
-- SECTION 3: PERFORMANCE INDEXES VALIDATION (Phase 2.4)
-- ============================================================================

-- Query 3.1: Verificar índices na tabela ai_usage_analytics
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ai_usage_analytics'
  AND schemaname = 'public'
ORDER BY indexname;

-- Query 3.2: Verificar índices na tabela whatsapp_sync_logs
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_sync_logs'
  AND schemaname = 'public'
ORDER BY indexname;

-- Query 3.3: Verificar índices na tabela daily_questions
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'daily_questions'
  AND schemaname = 'public'
ORDER BY indexname;

-- Query 3.4: Listar todos os índices criados nas últimas 48 horas
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 4: WHATSAPP INTEGRATION VALIDATION (Sprint 1 & 2)
-- ============================================================================

-- Query 4.1: Verificar tabela contact_network tem colunas WhatsApp
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contact_network'
  AND column_name LIKE 'whatsapp%'
ORDER BY ordinal_position;

-- Query 4.2: Verificar contatos com dados WhatsApp
SELECT
  COUNT(*) as total_contacts,
  COUNT(whatsapp_id) as contacts_with_whatsapp_id,
  COUNT(whatsapp_phone) as contacts_with_phone,
  COUNT(whatsapp_name) as contacts_with_name,
  COUNT(whatsapp_profile_pic_url) as contacts_with_photo
FROM contact_network;

-- Query 4.3: Verificar últimos syncs do WhatsApp
SELECT
  id,
  user_id,
  status,
  sync_type,
  contacts_synced,
  contacts_skipped,
  error_count,
  created_at
FROM whatsapp_sync_logs
ORDER BY created_at DESC
LIMIT 10;

-- Query 4.4: Verificar se função get_user_whatsapp_messages existe
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%whatsapp%'
ORDER BY routine_name;

-- Query 4.5: Verificar se função get_user_daily_questions existe
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%daily_question%'
ORDER BY routine_name;

-- ============================================================================
-- SECTION 5: EDGE FUNCTIONS VALIDATION
-- ============================================================================

-- Query 5.1: Verificar se tabela ai_usage_analytics recebe dados de Edge Functions
-- (Verifica se o campo usageMetadata está sendo propagado corretamente)
SELECT
  ai_model,
  COUNT(*) as operations,
  AVG(input_tokens)::numeric(10,0) as avg_input,
  AVG(output_tokens)::numeric(10,0) as avg_output,
  MIN(created_at) as first_tracked,
  MAX(created_at) as last_tracked
FROM ai_usage_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ai_model
ORDER BY operations DESC;

-- Query 5.2: Verificar tracking de operações do gemini-chat Edge Function
SELECT
  request_metadata->>'use_case' as operation,
  COUNT(*) as count,
  AVG(duration_seconds)::numeric(10,2) as avg_duration
FROM ai_usage_analytics
WHERE ai_model LIKE 'gemini%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY request_metadata->>'use_case'
ORDER BY count DESC
LIMIT 20;

-- ============================================================================
-- SECTION 6: DATA QUALITY CHECKS
-- ============================================================================

-- Query 6.1: Verificar se há registros com tokens nulos ou zero
SELECT
  COUNT(*) as records_with_zero_tokens,
  module_type,
  request_metadata->>'use_case' as use_case
FROM ai_usage_analytics
WHERE (input_tokens = 0 OR input_tokens IS NULL)
  OR (output_tokens = 0 OR output_tokens IS NULL)
GROUP BY module_type, request_metadata->>'use_case'
ORDER BY records_with_zero_tokens DESC;

-- Query 6.2: Verificar se há erros de tracking (tabela ai_usage_tracking_errors)
SELECT
  COUNT(*) as total_errors,
  error_type,
  operation_type,
  COUNT(DISTINCT user_id) as affected_users
FROM ai_usage_tracking_errors
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, operation_type
ORDER BY total_errors DESC;

-- Query 6.3: Verificar integridade de foreign keys
SELECT
  COUNT(*) as orphaned_records
FROM ai_usage_analytics a
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = a.user_id
);

-- ============================================================================
-- SECTION 7: MIGRATION VERIFICATION
-- ============================================================================

-- Query 7.1: Verificar últimas migrations aplicadas
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- Query 7.2: Verificar se migrations específicas do PR #79 foram aplicadas
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version >= '20260109'
  OR name LIKE '%rls%'
  OR name LIKE '%whatsapp%'
  OR name LIKE '%index%'
ORDER BY version DESC;

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================
/*
✅ Section 1 (AI Tracking):
   - Query 1.1: Deve ter registros (total_records > 0)
   - Query 1.2: Deve ter 3 módulos (journey, finance, grants)
   - Query 1.3: Deve ter 7 use_cases diferentes para grants
   - Query 1.4: Deve ter 7 use_cases diferentes para journey
   - Query 1.5: Deve ter 5 use_cases diferentes para finance

✅ Section 2 (RLS Policies):
   - Query 2.1-2.5: Cada tabela deve ter 4 policies (SELECT, INSERT, UPDATE, DELETE)
   - Query 2.6: Deve listar 5 tabelas com policies novas

✅ Section 3 (Indexes):
   - Query 3.1: Deve ter índices em user_id, module_type, created_at
   - Query 3.2: Deve ter índices em user_id, status, created_at
   - Query 3.3: Deve ter índices em user_id, created_at

✅ Section 4 (WhatsApp):
   - Query 4.1: Deve ter 8 colunas whatsapp_*
   - Query 4.3: Pode estar vazio se nenhum sync foi feito ainda
   - Query 4.4-4.5: Deve ter 2 funções SECURITY DEFINER

✅ Section 5 (Edge Functions):
   - Query 5.1: Deve ter modelo 'gemini-2.0-flash-exp'
   - Query 5.2: Deve listar operações dos 3 módulos

✅ Section 6 (Data Quality):
   - Query 6.1: Deve ser 0 (sem registros com tokens nulos)
   - Query 6.2: Pode ter alguns erros, mas não deve ser crítico
   - Query 6.3: Deve ser 0 (sem registros órfãos)

✅ Section 7 (Migrations):
   - Query 7.1: Deve mostrar migrations recentes
   - Query 7.2: Deve ter migrations de 2026-01-09 e 2026-01-10
*/

-- ============================================================================
-- QUICK HEALTH CHECK (Execute primeiro)
-- ============================================================================
SELECT
  '✅ AI Tracking' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' records found'
    ELSE '❌ FAIL - No records'
  END as status
FROM ai_usage_analytics
UNION ALL
SELECT
  '✅ RLS Policies',
  CASE
    WHEN COUNT(*) >= 20 THEN '✅ PASS - ' || COUNT(*) || ' policies found'
    ELSE '⚠️ WARNING - Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  '✅ WhatsApp Columns',
  CASE
    WHEN COUNT(*) >= 8 THEN '✅ PASS - ' || COUNT(*) || ' columns found'
    ELSE '❌ FAIL - Missing columns'
  END
FROM information_schema.columns
WHERE table_name = 'contact_network'
  AND column_name LIKE 'whatsapp%'
UNION ALL
SELECT
  '✅ Recent Migrations',
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' recent migrations'
    ELSE '⚠️ WARNING - No recent migrations'
  END
FROM supabase_migrations.schema_migrations
WHERE version >= '20260109';
