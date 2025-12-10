-- =====================================================
-- INSERT TEST DATA: AI Cost Dashboard
-- Purpose: Insert sample data to test AI Cost Dashboard
-- =====================================================

-- Step 1: Find your user_id
-- Execute this first to get your user_id:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Copy your user_id from the result above and paste it below:
-- ⬇️ REPLACE THIS WITH YOUR USER_ID ⬇️
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE';  -- 👈 COLE SEU USER_ID AQUI
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User ID % does not exist. Please check the user_id from auth.users table.', v_user_id;
  END IF;

  RAISE NOTICE 'Inserting test data for user: %', v_user_id;

  -- Insert test data for File Search operations
  INSERT INTO public.ai_usage_analytics (
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
    -- File Search Query 1: Grants
    (
      v_user_id,
      'file_search_query',
      'aqa',
      500,
      200,
      700,
      1.5,
      0.000500,
      0.000200,
      0.000700,
      'grants',
      NULL,
      '{"query": "editais de fomento para pesquisa científica", "corpus_names": ["grants-corpus-123"], "result_count": 5}'::jsonb
    ),

    -- File Search Query 2: Finance
    (
      v_user_id,
      'file_search_query',
      'aqa',
      300,
      150,
      450,
      0.9,
      0.000300,
      0.000150,
      0.000450,
      'finance',
      NULL,
      '{"query": "despesas com AWS cloud computing", "corpus_names": ["finance-corpus-456"], "result_count": 3}'::jsonb
    ),

    -- File Search Query 3: Podcast
    (
      v_user_id,
      'file_search_query',
      'aqa',
      400,
      180,
      580,
      1.2,
      0.000400,
      0.000180,
      0.000580,
      'podcast',
      NULL,
      '{"query": "machine learning e inteligência artificial", "corpus_names": ["podcast-corpus-789"], "result_count": 7}'::jsonb
    ),

    -- File Search Query 4: Journey
    (
      v_user_id,
      'file_search_query',
      'aqa',
      250,
      100,
      350,
      0.7,
      0.000250,
      0.000100,
      0.000350,
      'journey',
      NULL,
      '{"query": "momentos de crescimento pessoal", "corpus_names": ["journey-corpus-101"], "result_count": 4}'::jsonb
    ),

    -- Document Indexing 1: Grants PDF
    (
      v_user_id,
      'embedding',
      'text-embedding-004',
      2000,
      0,
      2000,
      3.5,
      0.000020,
      0.000000,
      0.000020,
      'grants',
      NULL,
      '{"file_name": "edital_pesquisa_cientifica.pdf", "file_size": 524288, "mime_type": "application/pdf", "corpus_id": "grants-corpus-123"}'::jsonb
    ),

    -- Document Indexing 2: Finance CSV
    (
      v_user_id,
      'embedding',
      'text-embedding-004',
      1500,
      0,
      1500,
      2.8,
      0.000015,
      0.000000,
      0.000015,
      'finance',
      NULL,
      '{"file_name": "relatorio_financeiro_q4.csv", "file_size": 102400, "mime_type": "text/csv", "corpus_id": "finance-corpus-456"}'::jsonb
    ),

    -- Document Indexing 3: Podcast Transcript
    (
      v_user_id,
      'embedding',
      'text-embedding-004',
      3500,
      0,
      3500,
      5.2,
      0.000035,
      0.000000,
      0.000035,
      'podcast',
      NULL,
      '{"file_name": "episodio_001_transcript.txt", "file_size": 256000, "mime_type": "text/plain", "corpus_id": "podcast-corpus-789"}'::jsonb
    ),

    -- Text Generation: Grants proposal
    (
      v_user_id,
      'text_generation',
      'gemini-2.0-flash',
      1200,
      800,
      2000,
      4.5,
      0.000000,  -- Free tier
      0.000000,
      0.000000,
      'grants',
      NULL,
      '{"prompt": "Gerar proposta de projeto de pesquisa", "temperature": 0.7}'::jsonb
    ),

    -- Text Generation: Finance report
    (
      v_user_id,
      'text_generation',
      'gemini-1.5-flash',
      800,
      600,
      1400,
      3.2,
      0.000060,  -- 0.075 per 1M input
      0.000180,  -- 0.30 per 1M output
      0.000240,
      'finance',
      NULL,
      '{"prompt": "Analisar despesas e gerar relatório", "temperature": 0.3}'::jsonb
    );

  RAISE NOTICE '✅ Test data inserted successfully!';
  RAISE NOTICE '📊 Total records: 10 (4 searches, 3 indexing, 2 text generation)';
  RAISE NOTICE '💰 Total cost: $0.00265 USD';

  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE '=== SUMMARY ===';
  RAISE NOTICE 'Grants: 3 operations ($0.00072)';
  RAISE NOTICE 'Finance: 3 operations ($0.00069)';
  RAISE NOTICE 'Podcast: 2 operations ($0.00062)';
  RAISE NOTICE 'Journey: 1 operation ($0.00035)';

END $$;

-- Verify data was inserted
SELECT
  COUNT(*) AS total_logs,
  SUM(total_cost_usd) AS total_cost,
  COUNT(DISTINCT module_type) AS modules_used,
  MIN(created_at) AS first_log,
  MAX(created_at) AS last_log
FROM public.ai_usage_analytics
WHERE user_id = 'YOUR_USER_ID_HERE';  -- 👈 COLE SEU USER_ID AQUI TAMBÉM

-- Show breakdown by module
SELECT
  module_type,
  COUNT(*) AS operations,
  SUM(total_cost_usd) AS total_cost,
  AVG(duration_seconds) AS avg_duration
FROM public.ai_usage_analytics
WHERE user_id = 'YOUR_USER_ID_HERE'  -- 👈 COLE SEU USER_ID AQUI TAMBÉM
GROUP BY module_type
ORDER BY total_cost DESC;
