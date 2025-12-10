-- =====================================================
-- TEST SCRIPT: AI Cost Dashboard Data Verification
-- Purpose: Check if AI cost tracking is working correctly
-- =====================================================

-- Step 1: Verify tables exist
SELECT 'Checking if tables exist...' AS status;

SELECT
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_analytics') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS ai_usage_analytics_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_model_pricing') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS ai_model_pricing_status
FROM (SELECT 1) AS dummy;

-- Step 2: Verify RPC functions exist
SELECT 'Checking if RPC functions exist...' AS status;

SELECT
  proname AS function_name,
  '✅ EXISTS' AS status
FROM pg_proc
WHERE proname IN ('log_ai_usage', 'get_current_model_pricing', 'calculate_token_cost')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 3: Check current user
SELECT 'Current authenticated user:' AS status;
SELECT auth.uid() AS current_user_id, auth.email() AS current_email;

-- Step 4: Count existing AI usage logs for current user
SELECT 'Existing AI usage logs for current user:' AS status;

SELECT
  COUNT(*) AS total_logs,
  COUNT(DISTINCT operation_type) AS unique_operations,
  SUM(total_cost_usd) AS total_cost_spent,
  MIN(created_at) AS first_log,
  MAX(created_at) AS last_log
FROM ai_usage_analytics
WHERE user_id = auth.uid();

-- Step 5: Recent logs by operation type
SELECT 'Recent logs by operation (last 10):' AS status;

SELECT
  created_at,
  operation_type,
  ai_model,
  module_type,
  total_cost_usd,
  input_tokens,
  output_tokens
FROM ai_usage_analytics
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Check if File Search operations are being tracked
SELECT 'File Search operations tracked:' AS status;

SELECT
  COUNT(*) AS file_search_logs,
  COUNT(CASE WHEN operation_type = 'file_search' THEN 1 END) AS search_queries,
  COUNT(CASE WHEN operation_type = 'embedding' THEN 1 END) AS indexing_operations
FROM ai_usage_analytics
WHERE user_id = auth.uid()
  AND (operation_type = 'file_search' OR operation_type = 'embedding');

-- =====================================================
-- OPTIONAL: Insert test data for File Search
-- Run this if you want to see sample data in the dashboard
-- =====================================================

-- Uncomment to insert test data:
/*
DO $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Insert sample File Search query
  INSERT INTO ai_usage_analytics (
    user_id,
    operation_type,
    ai_model,
    input_tokens,
    output_tokens,
    total_tokens,
    duration_seconds,
    input_cost_usd,
    output_cost_usd,
    total_cost_usd,
    module_type,
    module_id,
    request_metadata
  ) VALUES
    -- File Search queries
    (v_user_id, 'file_search', 'aqa', 500, 200, 700, 1.5, 0.0005, 0.0002, 0.0007, 'grants', NULL, '{"query": "editais de fomento", "results": 5}'::jsonb),
    (v_user_id, 'file_search', 'aqa', 300, 150, 450, 0.9, 0.0003, 0.00015, 0.00045, 'finance', NULL, '{"query": "despesas AWS", "results": 3}'::jsonb),
    (v_user_id, 'file_search', 'aqa', 400, 180, 580, 1.2, 0.0004, 0.00018, 0.00058, 'podcast', NULL, '{"query": "machine learning", "results": 7}'::jsonb),

    -- Document indexing
    (v_user_id, 'embedding', 'text-embedding-004', 2000, 0, 2000, 3.5, 0.00002, 0.0, 0.00002, 'grants', NULL, '{"file_name": "edital_pesquisa.pdf", "file_size": 524288}'::jsonb),
    (v_user_id, 'embedding', 'text-embedding-004', 1500, 0, 1500, 2.8, 0.000015, 0.0, 0.000015, 'finance', NULL, '{"file_name": "relatorio_q4.csv", "file_size": 102400}'::jsonb);

  RAISE NOTICE 'Test data inserted successfully!';
END $$;
*/

-- =====================================================
-- TROUBLESHOOTING GUIDE
-- =====================================================

/*
IF NO DATA APPEARS IN AI COST DASHBOARD:

1. Check if migrations were applied:
   - Run: SELECT * FROM public.ai_usage_analytics LIMIT 1;
   - If error "relation does not exist", apply migration:
     - supabase/migrations/20251208180300_multimodal_analytics.sql
     - supabase/migrations/20251209000000_ai_cost_tracking_enhancements.sql

2. Check RLS policies:
   - Run: SELECT * FROM pg_policies WHERE tablename = 'ai_usage_analytics';
   - Should see policy: "Users can only view their own AI usage"

3. Verify tracking is being called:
   - Open browser DevTools → Console
   - Perform a File Search operation
   - Look for: "[aiUsageTracking] Successfully logged usage"
   - If not found, check if trackAIUsage() is being called in fileSearchApiClient.ts

4. Check for tracking errors:
   - Run: SELECT * FROM ai_usage_tracking_errors WHERE user_id = auth.uid();
   - If errors exist, check error_message and error_context

5. Manual test - Insert a log directly:
   - Run the INSERT statement above (uncomment the DO block)
   - Refresh AI Cost Dashboard
   - If data appears now, the problem is with tracking service

6. Check Supabase logs:
   - Go to Supabase Dashboard → Logs → Postgres Logs
   - Filter for "log_ai_usage"
   - Look for errors or warnings
*/
