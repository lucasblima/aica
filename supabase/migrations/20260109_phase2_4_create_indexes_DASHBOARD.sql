-- ============================================================================
-- MIGRATION: Phase 2.4 - Performance Index Creation
-- ============================================================================
-- For use in Supabase Dashboard SQL Editor
-- All DO blocks removed to avoid transaction conflicts
-- ============================================================================

-- INDEX #1: moments_user_date_composite
-- Purpose: Recent moments feed (Journey Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_composite
  ON moments(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- INDEX #2: moments_user_date_range_covering
-- Purpose: Weekly summary generation (Journey Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_range_covering
  ON moments(user_id, created_at)
  INCLUDE (emotion, tags, content)
  WHERE deleted_at IS NULL;

-- INDEX #3: whatsapp_messages_conversation_thread
-- Purpose: Conversation thread retrieval (WhatsApp Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_conversation_thread
  ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
  WHERE deleted_at IS NULL AND processing_status = 'completed';

-- INDEX #4: contact_network_health_engagement
-- Purpose: Contact network health rankings (People Unified Network)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_network_health_engagement
  ON contact_network(user_id, health_score DESC NULLS LAST, engagement_level)
  WHERE is_active = true AND is_archived = false;

-- INDEX #5: work_items_eisenhower_matrix
-- Purpose: Eisenhower matrix filtering (Atlas Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_eisenhower_matrix
  ON work_items(user_id, priority, status, due_date)
  WHERE deleted_at IS NULL;

-- INDEX #6: weekly_summaries_user_week_lookup
-- Purpose: Specific week summary retrieval (Journey Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_summaries_user_week_lookup
  ON weekly_summaries(user_id, week_number, year)
  WHERE deleted_at IS NULL;

-- INDEX #7: daily_questions_date_range
-- Purpose: Recent question history (Journey Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_questions_date_range
  ON daily_questions(user_id, date_asked DESC)
  WHERE deleted_at IS NULL;

-- INDEX #8: ai_usage_logs_analytics
-- Purpose: AI cost tracking analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_analytics
  ON ai_usage_logs(user_id, created_at DESC)
  INCLUDE (ai_model, operation_type, total_cost_usd, input_tokens, output_tokens);

-- INDEX #9: podcast_episodes_show_timeline
-- Purpose: Episode timeline (Studio Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_podcast_episodes_show_timeline
  ON podcast_episodes(show_id, created_at DESC, status)
  WHERE deleted_at IS NULL;

-- INDEX #10: finance_transactions_categorization
-- Purpose: Transaction history with category filter (Finance Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_transactions_categorization
  ON finance_transactions(user_id, transaction_date DESC, category)
  WHERE deleted_at IS NULL;

-- INDEX #11: whatsapp_conversations_recent_activity
-- Purpose: Recent conversations dashboard (WhatsApp Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_recent_activity
  ON whatsapp_conversations(user_id, last_message_at DESC, average_sentiment)
  WHERE total_messages > 0;

-- INDEX #12: consciousness_points_log_leaderboard
-- Purpose: Point history and gamification analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consciousness_points_log_leaderboard
  ON consciousness_points_log(user_id, created_at DESC)
  INCLUDE (points, module_type, activity_type);

-- INDEX #13: work_items_due_date_reminder
-- Purpose: Daily reminder job (Atlas Module)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_due_date_reminder
  ON work_items(due_date, user_id)
  WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL;
