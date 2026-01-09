# Phase 2.4: Index Creation via Supabase CLI

**Issue**: Supabase Dashboard wraps all queries in transactions
**Solution**: Use Supabase CLI which executes migrations outside transactions

---

## Quick Fix: Use CLI instead of Dashboard

### Option 1: Push Migrations to Staging (Recommended)

```bash
# Navigate to project directory
cd ~/repos/Aica_frontend/Aica_frontend

# Verify migration file exists
ls -la supabase/migrations/ | grep 20260109_phase2_4

# Push migrations to staging
npx supabase db push --project-ref=uzywajqzbdbrfammshdg
```

**Expected Output**:
```
Pushing migrations...
✓ Applied migration 20260109_phase2_4_create_indexes.sql
✓ All migrations applied
```

---

### Option 2: Execute Individual Indexes via API

If CLI doesn't work, execute each index individually in separate Dashboard queries:

**Don't copy all at once** - copy and execute ONE index at a time:

#### Index 1 (Copy this, execute, wait for success, then next)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_composite
ON moments(user_id, created_at DESC)
WHERE deleted_at IS NULL;
```

Wait for this to complete before running the next.

---

## Why CLI Works

- Dashboard: Wraps queries in `BEGIN...COMMIT` transactions ❌
- CLI: Executes migrations directly without transaction blocks ✅
- Result: `CREATE INDEX CONCURRENTLY` works properly

---

## Full Index List (If Running Individually)

Copy and execute each one separately, waiting for completion:

```sql
-- 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_composite
ON moments(user_id, created_at DESC)
WHERE deleted_at IS NULL;

-- 2
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_range_covering
ON moments(user_id, created_at)
INCLUDE (emotion, tags, content)
WHERE deleted_at IS NULL;

-- 3
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_conversation_thread
ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
WHERE deleted_at IS NULL AND processing_status = 'completed';

-- 4
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_network_health_engagement
ON contact_network(user_id, health_score DESC NULLS LAST, engagement_level)
WHERE is_active = true AND is_archived = false;

-- 5
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_eisenhower_matrix
ON work_items(user_id, priority, status, due_date)
WHERE deleted_at IS NULL;

-- 6
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_summaries_user_week_lookup
ON weekly_summaries(user_id, week_number, year)
WHERE deleted_at IS NULL;

-- 7
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_questions_date_range
ON daily_questions(user_id, date_asked DESC)
WHERE deleted_at IS NULL;

-- 8
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_analytics
ON ai_usage_logs(user_id, created_at DESC)
INCLUDE (ai_model, operation_type, total_cost_usd, input_tokens, output_tokens);

-- 9
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_podcast_episodes_show_timeline
ON podcast_episodes(show_id, created_at DESC, status)
WHERE deleted_at IS NULL;

-- 10
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_transactions_categorization
ON finance_transactions(user_id, transaction_date DESC, category)
WHERE deleted_at IS NULL;

-- 11
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_recent_activity
ON whatsapp_conversations(user_id, last_message_at DESC, average_sentiment)
WHERE total_messages > 0;

-- 12
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consciousness_points_log_leaderboard
ON consciousness_points_log(user_id, created_at DESC)
INCLUDE (points, module_type, activity_type);

-- 13
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_due_date_reminder
ON work_items(due_date, user_id)
WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL;
```

---

## Verification

After execution (via CLI or individual queries):

```sql
SELECT COUNT(*) as total_indexes_created
FROM pg_indexes
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
  );
```

**Expected Result**: 13

---

## Recommended: Use CLI

**Command**:
```bash
cd ~/repos/Aica_frontend/Aica_frontend
npx supabase db push --project-ref=uzywajqzbdbrfammshdg
```

This is the cleanest and fastest approach!
