-- ============================================================================
-- PHASE 2.4: POST-INDEX VALIDATION & PERFORMANCE COMPARISON
-- ============================================================================
-- This script validates all 13 indexes were created successfully
-- and measures performance improvement compared to baseline
--
-- Usage:
--   1. Run baseline script BEFORE applying indexes
--   2. Apply index migration
--   3. Run THIS script to validate and measure improvement
--   4. Compare execution times and query plans
-- ============================================================================

\timing on
\set ECHO all

DO $$ BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 2.4: POST-INDEX VALIDATION';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: VERIFY ALL 13 INDEXES EXIST
-- ============================================================================

DO $$
DECLARE
  indexes_created INT;
  expected_indexes INT := 13;
  missing_indexes TEXT[];
BEGIN
  RAISE NOTICE '=== STEP 1: INDEX EXISTENCE CHECK ===';

  SELECT COUNT(*) INTO indexes_created
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_moments_user_date_composite',
      'idx_moments_user_date_range_covering',
      'idx_whatsapp_messages_conversation_thread',
      'idx_contact_network_health_engagement',
      'idx_work_items_eisenhower_matrix',
      'idx_weekly_summaries_user_week_lookup',
      'idx_daily_questions_date_range',
      'idx_ai_usage_logs_analytics',
      'idx_podcast_episodes_show_timeline',
      'idx_finance_transactions_categorization',
      'idx_whatsapp_conversations_recent_activity',
      'idx_consciousness_points_log_leaderboard',
      'idx_work_items_due_date_reminder'
    );

  IF indexes_created = expected_indexes THEN
    RAISE NOTICE '✅ ALL % INDEXES VERIFIED', expected_indexes;
  ELSE
    RAISE WARNING '❌ MISSING INDEXES: Expected %, found %', expected_indexes, indexes_created;

    -- List missing indexes
    SELECT ARRAY_AGG(expected_name) INTO missing_indexes
    FROM (
      SELECT UNNEST(ARRAY[
        'idx_moments_user_date_composite',
        'idx_moments_user_date_range_covering',
        'idx_whatsapp_messages_conversation_thread',
        'idx_contact_network_health_engagement',
        'idx_work_items_eisenhower_matrix',
        'idx_weekly_summaries_user_week_lookup',
        'idx_daily_questions_date_range',
        'idx_ai_usage_logs_analytics',
        'idx_podcast_episodes_show_timeline',
        'idx_finance_transactions_categorization',
        'idx_whatsapp_conversations_recent_activity',
        'idx_consciousness_points_log_leaderboard',
        'idx_work_items_due_date_reminder'
      ]) as expected_name
    ) expected
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = expected.expected_name
    );

    RAISE WARNING 'Missing indexes: %', missing_indexes;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: INDEX DETAILS & SIZES
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_moments_user_date_composite',
    'idx_moments_user_date_range_covering',
    'idx_whatsapp_messages_conversation_thread',
    'idx_contact_network_health_engagement',
    'idx_work_items_eisenhower_matrix',
    'idx_weekly_summaries_user_week_lookup',
    'idx_daily_questions_date_range',
    'idx_ai_usage_logs_analytics',
    'idx_podcast_episodes_show_timeline',
    'idx_finance_transactions_categorization',
    'idx_whatsapp_conversations_recent_activity',
    'idx_consciousness_points_log_leaderboard',
    'idx_work_items_due_date_reminder'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- STEP 3: TOTAL STORAGE IMPACT
-- ============================================================================

DO $$
DECLARE
  total_index_size BIGINT;
BEGIN
  RAISE NOTICE '=== STEP 3: STORAGE IMPACT ===';

  SELECT SUM(pg_relation_size(indexrelid)) INTO total_index_size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_moments_user_date_composite',
      'idx_moments_user_date_range_covering',
      'idx_whatsapp_messages_conversation_thread',
      'idx_contact_network_health_engagement',
      'idx_work_items_eisenhower_matrix',
      'idx_weekly_summaries_user_week_lookup',
      'idx_daily_questions_date_range',
      'idx_ai_usage_logs_analytics',
      'idx_podcast_episodes_show_timeline',
      'idx_finance_transactions_categorization',
      'idx_whatsapp_conversations_recent_activity',
      'idx_consciousness_points_log_leaderboard',
      'idx_work_items_due_date_reminder'
    );

  RAISE NOTICE 'Total index storage: %', pg_size_pretty(total_index_size);
END $$;

-- ============================================================================
-- STEP 4: RE-RUN BASELINE QUERIES WITH NEW INDEXES
-- ============================================================================

RAISE NOTICE '=== STEP 4: PERFORMANCE COMPARISON ===';

-- ----------------------------------------------------------------------------
-- QUERY 1: Recent moments feed (Index #1)
-- Expected: Index-only scan or index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT emotion, tags, created_at
FROM moments
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- QUERY 2: Weekly summary date range (Index #2)
-- Expected: Index-only scan (covering index)
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT emotion, tags, content, created_at
FROM moments
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW()
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- QUERY 3: WhatsApp conversation thread (Index #3)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM whatsapp_messages
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND contact_phone = (SELECT contact_phone FROM whatsapp_messages LIMIT 1)
  AND deleted_at IS NULL
  AND processing_status = 'completed'
ORDER BY message_timestamp DESC
LIMIT 50;

-- ----------------------------------------------------------------------------
-- QUERY 4: Contact network health rankings (Index #4)
-- Expected: Index scan (no sort needed)
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, name, health_score, engagement_level, last_interaction_at
FROM contact_network
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true
  AND is_archived = false
ORDER BY health_score DESC NULLS LAST
LIMIT 20;

-- ----------------------------------------------------------------------------
-- QUERY 5: Work items Eisenhower matrix (Index #5)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM work_items
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND priority IN ('urgent_important', 'urgent_not_important')
  AND status = 'pending'
  AND deleted_at IS NULL
ORDER BY due_date ASC;

-- ----------------------------------------------------------------------------
-- QUERY 6: Weekly summary lookup (Index #6)
-- Expected: Index scan or index-only scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM weekly_summaries
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND week_number = EXTRACT(WEEK FROM NOW())
  AND year = EXTRACT(YEAR FROM NOW())
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- QUERY 7: Daily questions history (Index #7)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, question_text, answer_text, date_asked
FROM daily_questions
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND deleted_at IS NULL
ORDER BY date_asked DESC
LIMIT 7;

-- ----------------------------------------------------------------------------
-- QUERY 8: AI usage analytics (Index #8)
-- Expected: Index-only scan (covering index)
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  ai_model,
  operation_type,
  SUM(total_cost_usd) as total_cost,
  SUM(input_tokens) as input_tokens,
  SUM(output_tokens) as output_tokens
FROM ai_usage_logs
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai_model, operation_type;

-- ----------------------------------------------------------------------------
-- QUERY 9: Podcast episode timeline (Index #9)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM podcast_episodes
WHERE show_id = (SELECT id FROM podcast_shows LIMIT 1)
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- QUERY 10: Finance transactions with category (Index #10)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM finance_transactions
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND transaction_date >= NOW() - INTERVAL '30 days'
  AND deleted_at IS NULL
ORDER BY transaction_date DESC;

-- ----------------------------------------------------------------------------
-- QUERY 11: WhatsApp conversations recent (Index #11)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT contact_phone, contact_name, last_message_at, average_sentiment
FROM whatsapp_conversations
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND total_messages > 0
ORDER BY last_message_at DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- QUERY 12: Consciousness points history (Index #12)
-- Expected: Index-only scan (covering index)
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  DATE(created_at) as date,
  SUM(points) as daily_points,
  module_type,
  activity_type
FROM consciousness_points_log
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), module_type, activity_type;

-- ----------------------------------------------------------------------------
-- QUERY 13: Work items due date reminders (Index #13)
-- Expected: Index scan
-- ----------------------------------------------------------------------------

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, title, due_date, priority
FROM work_items
WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND status IN ('pending', 'in_progress')
  AND deleted_at IS NULL;

-- ============================================================================
-- STEP 5: INDEX USAGE STATISTICS
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as index_usage_pct
FROM pg_stat_user_indexes
JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_moments_user_date_composite',
    'idx_moments_user_date_range_covering',
    'idx_whatsapp_messages_conversation_thread',
    'idx_contact_network_health_engagement',
    'idx_work_items_eisenhower_matrix',
    'idx_weekly_summaries_user_week_lookup',
    'idx_daily_questions_date_range',
    'idx_ai_usage_logs_analytics',
    'idx_podcast_episodes_show_timeline',
    'idx_finance_transactions_categorization',
    'idx_whatsapp_conversations_recent_activity',
    'idx_consciousness_points_log_leaderboard',
    'idx_work_items_due_date_reminder'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- STEP 6: SEQUENTIAL SCAN REDUCTION
-- ============================================================================

SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) as seq_scan_pct,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'moments',
    'whatsapp_messages',
    'contact_network',
    'work_items',
    'weekly_summaries',
    'daily_questions',
    'ai_usage_logs',
    'podcast_episodes',
    'finance_transactions',
    'whatsapp_conversations',
    'consciousness_points_log'
  )
ORDER BY tablename;

-- ============================================================================
-- STEP 7: UNUSED INDEX CHECK
-- ============================================================================

DO $$
DECLARE
  unused_indexes INT;
BEGIN
  RAISE NOTICE '=== STEP 7: UNUSED INDEX CHECK ===';

  SELECT COUNT(*) INTO unused_indexes
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_moments_user_date_composite',
      'idx_moments_user_date_range_covering',
      'idx_whatsapp_messages_conversation_thread',
      'idx_contact_network_health_engagement',
      'idx_work_items_eisenhower_matrix',
      'idx_weekly_summaries_user_week_lookup',
      'idx_daily_questions_date_range',
      'idx_ai_usage_logs_analytics',
      'idx_podcast_episodes_show_timeline',
      'idx_finance_transactions_categorization',
      'idx_whatsapp_conversations_recent_activity',
      'idx_consciousness_points_log_leaderboard',
      'idx_work_items_due_date_reminder'
    )
    AND idx_scan = 0;

  IF unused_indexes = 0 THEN
    RAISE NOTICE '✅ ALL INDEXES ARE BEING USED';
  ELSE
    RAISE WARNING '⚠️  % indexes have not been used yet (idx_scan = 0)', unused_indexes;
    RAISE NOTICE 'This is normal immediately after creation. Re-run this query after 24-48 hours.';
  END IF;
END $$;

-- ============================================================================
-- STEP 8: BLOAT CHECK
-- ============================================================================

SELECT
  schemaname,
  tablename,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_pct,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'moments',
    'whatsapp_messages',
    'contact_network',
    'work_items',
    'weekly_summaries',
    'daily_questions',
    'ai_usage_logs',
    'podcast_episodes',
    'finance_transactions',
    'whatsapp_conversations',
    'consciousness_points_log'
  )
  AND n_dead_tup > 0
ORDER BY dead_tuple_pct DESC;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_indexes INT;
  total_size BIGINT;
BEGIN
  SELECT COUNT(*), SUM(pg_relation_size(indexrelid))
  INTO total_indexes, total_size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_moments_user_date_composite',
      'idx_moments_user_date_range_covering',
      'idx_whatsapp_messages_conversation_thread',
      'idx_contact_network_health_engagement',
      'idx_work_items_eisenhower_matrix',
      'idx_weekly_summaries_user_week_lookup',
      'idx_daily_questions_date_range',
      'idx_ai_usage_logs_analytics',
      'idx_podcast_episodes_show_timeline',
      'idx_finance_transactions_categorization',
      'idx_whatsapp_conversations_recent_activity',
      'idx_consciousness_points_log_leaderboard',
      'idx_work_items_due_date_reminder'
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDATION COMPLETE';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE 'Indexes verified: %/13', total_indexes;
  RAISE NOTICE 'Total storage: %', pg_size_pretty(total_size);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Compare EXPLAIN ANALYZE results with baseline';
  RAISE NOTICE '2. Monitor index usage over 24-48 hours';
  RAISE NOTICE '3. Run VACUUM ANALYZE on affected tables if needed';
  RAISE NOTICE '4. Document performance improvements in Phase 2 report';
END $$;
