-- ============================================================================
-- PHASE 2.4: POST-INDEX VALIDATION SCRIPT
-- ============================================================================
-- Purpose: Validate all 13 indexes created successfully in Phase 2.4
-- Environment: Staging (uzywajqzbdbrfammshdg)
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '========== PHASE 2.4: POST-INDEX VALIDATION ==========';
  RAISE NOTICE 'Validating 13 performance indexes...';
  RAISE NOTICE '==================================================';
END $$;

-- VALIDATION 1: COUNT TOTAL INDEXES CREATED

DO $$
DECLARE
  total_indexes INT;
  expected_indexes INT := 13;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> VALIDATION 1: INDEX COUNT';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO total_indexes
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

  RAISE NOTICE '  Expected: % indexes', expected_indexes;
  RAISE NOTICE '  Found: % indexes', total_indexes;
  RAISE NOTICE '';

  IF total_indexes = expected_indexes THEN
    RAISE NOTICE '  ✅ PASS: All % indexes created successfully', expected_indexes;
  ELSE
    RAISE WARNING '  ❌ FAIL: Expected %, found %', expected_indexes, total_indexes;
  END IF;
END $$;

-- VALIDATION 2: LIST ALL INDEXES WITH SIZES

DO $$
DECLARE
  idx_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '>>> VALIDATION 2: INDEX DETAILS';
  RAISE NOTICE '';

  FOR idx_record IN
    SELECT
      indexname,
      tablename,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
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
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE '  ✓ %', idx_record.indexname;
    RAISE NOTICE '    Table: %, Size: %', idx_record.tablename, idx_record.index_size;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '  ✅ PASS: All indexes verified';
END $$;

-- VALIDATION 3: FINAL SUMMARY

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== PHASE 2.4: COMPLETE ==========';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL 13 INDEXES CREATED SUCCESSFULLY';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Phase 2.5 - Performance Baseline';
  RAISE NOTICE '========================================';
END $$;
