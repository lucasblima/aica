-- ============================================================================
-- ROLLBACK SCRIPT: Phase 2.4 - Performance Index Removal
-- ============================================================================
-- Issue: #73 Phase 2 - Performance & Indexes
-- Description: Removes all 13 indexes created in phase2_4_create_indexes.sql
-- Author: Backend Architect (Supabase)
-- Date: 2026-01-09
--
-- IMPORTANT: Only run this if indexes are causing issues
-- Use CONCURRENTLY to avoid table locks
--
-- Execution Time: 2-3 minutes
-- Storage Freed: ~50-80 MB
--
-- BEFORE RUNNING: Verify that removing these indexes won't cause
-- performance degradation in production!
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 2.4: INDEX REMOVAL (ROLLBACK)';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '⚠️  WARNING: This will remove all 13 performance indexes';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFY INDEXES EXIST BEFORE REMOVAL
-- ============================================================================

DO $$
DECLARE
  indexes_found INT;
BEGIN
  SELECT COUNT(*) INTO indexes_found
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

  RAISE NOTICE 'Found % indexes to remove (expected: 13)', indexes_found;

  IF indexes_found = 0 THEN
    RAISE NOTICE '✅ No indexes found. Rollback not needed.';
  ELSE
    RAISE NOTICE '⚠️  Proceeding with removal of % indexes...', indexes_found;
  END IF;
END $$;

-- ============================================================================
-- DROP INDEXES (in reverse order of creation)
-- ============================================================================

-- Phase C indexes
DO $$ BEGIN
  RAISE NOTICE '[1/13] Dropping idx_consciousness_points_log_leaderboard...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_consciousness_points_log_leaderboard;

DO $$ BEGIN
  RAISE NOTICE '[2/13] Dropping idx_whatsapp_conversations_recent_activity...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_whatsapp_conversations_recent_activity;

DO $$ BEGIN
  RAISE NOTICE '[3/13] Dropping idx_finance_transactions_categorization...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_finance_transactions_categorization;

-- Phase B indexes
DO $$ BEGIN
  RAISE NOTICE '[4/13] Dropping idx_work_items_due_date_reminder...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_work_items_due_date_reminder;

DO $$ BEGIN
  RAISE NOTICE '[5/13] Dropping idx_podcast_episodes_show_timeline...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_podcast_episodes_show_timeline;

DO $$ BEGIN
  RAISE NOTICE '[6/13] Dropping idx_ai_usage_logs_analytics...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_ai_usage_logs_analytics;

DO $$ BEGIN
  RAISE NOTICE '[7/13] Dropping idx_daily_questions_date_range...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_daily_questions_date_range;

DO $$ BEGIN
  RAISE NOTICE '[8/13] Dropping idx_weekly_summaries_user_week_lookup...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_weekly_summaries_user_week_lookup;

-- Phase A indexes
DO $$ BEGIN
  RAISE NOTICE '[9/13] Dropping idx_work_items_eisenhower_matrix...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_work_items_eisenhower_matrix;

DO $$ BEGIN
  RAISE NOTICE '[10/13] Dropping idx_contact_network_health_engagement...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_contact_network_health_engagement;

DO $$ BEGIN
  RAISE NOTICE '[11/13] Dropping idx_whatsapp_messages_conversation_thread...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_whatsapp_messages_conversation_thread;

DO $$ BEGIN
  RAISE NOTICE '[12/13] Dropping idx_moments_user_date_range_covering...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_moments_user_date_range_covering;

DO $$ BEGIN
  RAISE NOTICE '[13/13] Dropping idx_moments_user_date_composite...';
END $$;

DROP INDEX CONCURRENTLY IF EXISTS idx_moments_user_date_composite;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  remaining_indexes INT;
BEGIN
  SELECT COUNT(*) INTO remaining_indexes
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

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLLBACK SUMMARY';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE 'Remaining indexes: % (expected: 0)', remaining_indexes;

  IF remaining_indexes = 0 THEN
    RAISE NOTICE '✅ ALL INDEXES REMOVED SUCCESSFULLY';
  ELSE
    RAISE WARNING '⚠️  Some indexes still exist: %', remaining_indexes;
    RAISE NOTICE 'You may need to retry DROP INDEX CONCURRENTLY';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- POST-ROLLBACK CLEANUP (optional)
-- ============================================================================

-- Run VACUUM to reclaim space (optional, can run separately)
-- VACUUM ANALYZE moments;
-- VACUUM ANALYZE whatsapp_messages;
-- VACUUM ANALYZE contact_network;
-- VACUUM ANALYZE work_items;
-- VACUUM ANALYZE weekly_summaries;
-- VACUUM ANALYZE daily_questions;
-- VACUUM ANALYZE ai_usage_logs;
-- VACUUM ANALYZE podcast_episodes;
-- VACUUM ANALYZE finance_transactions;
-- VACUUM ANALYZE whatsapp_conversations;
-- VACUUM ANALYZE consciousness_points_log;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After rollback:
-- 1. Query performance will return to baseline (pre-index) levels
-- 2. Storage space will be freed (~50-80 MB)
-- 3. Write performance may improve slightly (fewer indexes to maintain)
-- 4. Consider re-applying indexes selectively if only some were problematic
-- ============================================================================
