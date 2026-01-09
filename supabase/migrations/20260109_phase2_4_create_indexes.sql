-- ============================================================================
-- MIGRATION: Phase 2.4 - Performance Index Creation
-- ============================================================================
-- Issue: #73 Phase 2 - Performance & Indexes
-- Description: Creates 13 strategic performance indexes for core query patterns
-- Author: Backend Architect (Supabase)
-- Date: 2026-01-09
--
-- IMPORTANT: All indexes use CONCURRENTLY to avoid table locks
-- This migration can run on production without downtime
--
-- Execution Time: 5-10 minutes (depends on data volume)
-- Storage Impact: ~50-80 MB (estimated)
--
-- Reference: docs/PHASE2_4_INDEX_DESIGN_REPORT.md
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 2.4: INDEX CREATION STARTED';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PHASE A: CRITICAL INDEXES (5 total)
-- ============================================================================
-- These indexes optimize the most frequent queries across all modules
-- Estimated time: 3-5 minutes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDEX #1: moments_user_date_composite
-- Purpose: Recent moments feed (Journey Module)
-- Query Pattern: WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[1/13] Creating idx_moments_user_date_composite...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_composite
  ON moments(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_moments_user_date_composite IS
'Composite index for recent moments feed. Covers user_id filtering + created_at sorting. Partial index excludes deleted records.';

-- ----------------------------------------------------------------------------
-- INDEX #2: moments_user_date_range_covering
-- Purpose: Weekly summary generation (Journey Module)
-- Query Pattern: WHERE user_id = ? AND created_at BETWEEN ? AND ? (with emotion, tags, content access)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[2/13] Creating idx_moments_user_date_range_covering...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_range_covering
  ON moments(user_id, created_at)
  INCLUDE (emotion, tags, content)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_moments_user_date_range_covering IS
'Covering index for date range queries. INCLUDE clause enables index-only scans for weekly summary generation.';

-- ----------------------------------------------------------------------------
-- INDEX #3: whatsapp_messages_conversation_thread
-- Purpose: Conversation thread retrieval (WhatsApp Module)
-- Query Pattern: WHERE user_id = ? AND contact_phone = ? AND deleted_at IS NULL ORDER BY message_timestamp DESC
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[3/13] Creating idx_whatsapp_messages_conversation_thread...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_conversation_thread
  ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
  WHERE deleted_at IS NULL AND processing_status = 'completed';

COMMENT ON INDEX idx_whatsapp_messages_conversation_thread IS
'3-column composite for conversation thread queries. Partial index includes only completed, non-deleted messages.';

-- ----------------------------------------------------------------------------
-- INDEX #4: contact_network_health_engagement
-- Purpose: Contact network health rankings (People Unified Network)
-- Query Pattern: WHERE user_id = ? AND is_active = true ORDER BY health_score DESC NULLS LAST
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[4/13] Creating idx_contact_network_health_engagement...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_network_health_engagement
  ON contact_network(user_id, health_score DESC NULLS LAST, engagement_level)
  WHERE is_active = true AND is_archived = false;

COMMENT ON INDEX idx_contact_network_health_engagement IS
'Composite index for contact dashboard. NULLS LAST matches application logic for unscored contacts.';

-- ----------------------------------------------------------------------------
-- INDEX #5: work_items_eisenhower_matrix
-- Purpose: Eisenhower matrix filtering (Atlas Module)
-- Query Pattern: WHERE user_id = ? AND priority IN (...) AND status = ? ORDER BY due_date
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[5/13] Creating idx_work_items_eisenhower_matrix...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_eisenhower_matrix
  ON work_items(user_id, priority, status, due_date)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_work_items_eisenhower_matrix IS
'4-column composite for Atlas module Eisenhower matrix. Column order optimized for query selectivity.';

DO $$ BEGIN
  RAISE NOTICE '✅ PHASE A COMPLETE (5/13 indexes created)';
END $$;

-- ============================================================================
-- PHASE B: HIGH PRIORITY INDEXES (5 total)
-- ============================================================================
-- These indexes optimize frequent queries and core features
-- Estimated time: 2-3 minutes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDEX #6: weekly_summaries_user_week_lookup
-- Purpose: Specific week summary retrieval (Journey Module)
-- Query Pattern: WHERE user_id = ? AND week_number = ? AND year = ?
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[6/13] Creating idx_weekly_summaries_user_week_lookup...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_summaries_user_week_lookup
  ON weekly_summaries(user_id, week_number, year)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_weekly_summaries_user_week_lookup IS
'Composite index for unique week identification. Supports calendar-based navigation.';

-- ----------------------------------------------------------------------------
-- INDEX #7: daily_questions_date_range
-- Purpose: Recent question history (Journey Module)
-- Query Pattern: WHERE user_id = ? ORDER BY date_asked DESC LIMIT N
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[7/13] Creating idx_daily_questions_date_range...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_questions_date_range
  ON daily_questions(user_id, date_asked DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_daily_questions_date_range IS
'Composite index for question history queries. DESC order matches UI pagination.';

-- ----------------------------------------------------------------------------
-- INDEX #8: ai_usage_logs_analytics
-- Purpose: AI cost tracking analytics
-- Query Pattern: WHERE user_id = ? AND created_at >= ? GROUP BY ai_model, operation_type
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[8/13] Creating idx_ai_usage_logs_analytics...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_analytics
  ON ai_usage_logs(user_id, created_at DESC)
  INCLUDE (ai_model, operation_type, total_cost_usd, input_tokens, output_tokens);

COMMENT ON INDEX idx_ai_usage_logs_analytics IS
'Covering index for cost analytics. INCLUDE enables index-only scans for aggregations.';

-- ----------------------------------------------------------------------------
-- INDEX #9: podcast_episodes_show_timeline
-- Purpose: Episode timeline (Studio Module)
-- Query Pattern: WHERE show_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[9/13] Creating idx_podcast_episodes_show_timeline...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_podcast_episodes_show_timeline
  ON podcast_episodes(show_id, created_at DESC, status)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_podcast_episodes_show_timeline IS
'Composite index for podcast production workflow. Status column enables filtered queries (draft, published).';

-- ----------------------------------------------------------------------------
-- INDEX #13: work_items_due_date_reminder (moved to Phase B due to importance)
-- Purpose: Daily reminder job (Atlas Module)
-- Query Pattern: WHERE due_date BETWEEN ? AND ? AND status IN (...)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[13/13] Creating idx_work_items_due_date_reminder...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_due_date_reminder
  ON work_items(due_date, user_id)
  WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL;

COMMENT ON INDEX idx_work_items_due_date_reminder IS
'Composite index for reminder notifications. Due date as leading column for range queries.';

DO $$ BEGIN
  RAISE NOTICE '✅ PHASE B COMPLETE (10/13 indexes created)';
END $$;

-- ============================================================================
-- PHASE C: MEDIUM PRIORITY INDEXES (3 total)
-- ============================================================================
-- These indexes optimize less frequent but still important queries
-- Estimated time: 1-2 minutes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDEX #10: finance_transactions_categorization
-- Purpose: Transaction history with category filter (Finance Module)
-- Query Pattern: WHERE user_id = ? AND transaction_date >= ? AND category = ?
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[10/13] Creating idx_finance_transactions_categorization...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_transactions_categorization
  ON finance_transactions(user_id, transaction_date DESC, category)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_finance_transactions_categorization IS
'Composite index for financial reports. Supports date range + category filtering.';

-- ----------------------------------------------------------------------------
-- INDEX #11: whatsapp_conversations_recent_activity
-- Purpose: Recent conversations dashboard (WhatsApp Module)
-- Query Pattern: WHERE user_id = ? AND total_messages > 0 ORDER BY last_message_at DESC
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[11/13] Creating idx_whatsapp_conversations_recent_activity...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_recent_activity
  ON whatsapp_conversations(user_id, last_message_at DESC, average_sentiment)
  WHERE total_messages > 0;

COMMENT ON INDEX idx_whatsapp_conversations_recent_activity IS
'Composite index for conversation inbox. Partial index excludes empty conversations.';

-- ----------------------------------------------------------------------------
-- INDEX #12: consciousness_points_log_leaderboard
-- Purpose: Point history and gamification analytics
-- Query Pattern: WHERE user_id = ? AND created_at >= ? GROUP BY DATE(created_at), module_type
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE '[12/13] Creating idx_consciousness_points_log_leaderboard...';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consciousness_points_log_leaderboard
  ON consciousness_points_log(user_id, created_at DESC)
  INCLUDE (points, module_type, activity_type);

COMMENT ON INDEX idx_consciousness_points_log_leaderboard IS
'Covering index for gamification queries. Enables index-only scans for point aggregations.';

DO $$ BEGIN
  RAISE NOTICE '✅ PHASE C COMPLETE (13/13 indexes created)';
END $$;

-- ============================================================================
-- POST-CREATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  indexes_created INT;
  expected_indexes INT := 13;
BEGIN
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

  RAISE NOTICE '========================================';
  RAISE NOTICE 'INDEX CREATION SUMMARY';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE 'Expected indexes: %', expected_indexes;
  RAISE NOTICE 'Created indexes: %', indexes_created;

  IF indexes_created = expected_indexes THEN
    RAISE NOTICE '✅ ALL INDEXES CREATED SUCCESSFULLY';
  ELSE
    RAISE WARNING '⚠️  Some indexes missing. Expected %, found %', expected_indexes, indexes_created;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEP: Run post-index validation';
  RAISE NOTICE 'File: supabase/audit-queries/phase2-4-post-index-validation.sql';
END $$;

-- ============================================================================
-- INDEX SIZE REPORT
-- ============================================================================

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
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- GRANT PERMISSIONS (if needed)
-- ============================================================================
-- Indexes inherit table permissions, no explicit grants needed

-- ============================================================================
-- VACUUM ANALYZE (optional, recommended after index creation)
-- ============================================================================
-- Run this separately if needed:
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
