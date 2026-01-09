# Phase 2.4: Dashboard Execution (One Index at a Time)

## Why This Works

When you execute **a single statement** in the Supabase Dashboard, PostgreSQL treats it without an explicit transaction block, allowing `CREATE INDEX CONCURRENTLY` to run.

**The Key**: Copy ONE index statement, paste, run, wait for completion. Then repeat.

---

## Execute These 13 Indexes

### Index 1: moments_user_date_composite
**Estimated time**: 1-2 minutes

Copy and paste this entire block into a NEW query in Supabase Dashboard:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_composite
ON moments(user_id, created_at DESC)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete. You should see: `Success` with no errors.

---

### Index 2: moments_user_date_range_covering
**Estimated time**: 1-2 minutes

Copy and paste into a NEW query:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_user_date_range_covering
ON moments(user_id, created_at)
INCLUDE (emotion, tags, content)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 3: whatsapp_messages_conversation_thread
**Estimated time**: 1-2 minutes

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_conversation_thread
ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
WHERE deleted_at IS NULL AND processing_status = 'completed';
```

✅ Wait for it to complete.

---

### Index 4: contact_network_health_engagement
**Estimated time**: 1-2 minutes

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_network_health_engagement
ON contact_network(user_id, health_score DESC NULLS LAST, engagement_level)
WHERE is_active = true AND is_archived = false;
```

✅ Wait for it to complete.

---

### Index 5: work_items_eisenhower_matrix
**Estimated time**: 1-2 minutes

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_eisenhower_matrix
ON work_items(user_id, priority, status, due_date)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 6: weekly_summaries_user_week_lookup
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_summaries_user_week_lookup
ON weekly_summaries(user_id, week_number, year)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 7: daily_questions_date_range
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_questions_date_range
ON daily_questions(user_id, date_asked DESC)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 8: ai_usage_logs_analytics
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_analytics
ON ai_usage_logs(user_id, created_at DESC)
INCLUDE (ai_model, operation_type, total_cost_usd, input_tokens, output_tokens);
```

✅ Wait for it to complete.

---

### Index 9: podcast_episodes_show_timeline
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_podcast_episodes_show_timeline
ON podcast_episodes(show_id, created_at DESC, status)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 10: finance_transactions_categorization
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_transactions_categorization
ON finance_transactions(user_id, transaction_date DESC, category)
WHERE deleted_at IS NULL;
```

✅ Wait for it to complete.

---

### Index 11: whatsapp_conversations_recent_activity
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_recent_activity
ON whatsapp_conversations(user_id, last_message_at DESC, average_sentiment)
WHERE total_messages > 0;
```

✅ Wait for it to complete.

---

### Index 12: consciousness_points_log_leaderboard
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consciousness_points_log_leaderboard
ON consciousness_points_log(user_id, created_at DESC)
INCLUDE (points, module_type, activity_type);
```

✅ Wait for it to complete.

---

### Index 13: work_items_due_date_reminder
**Estimated time**: 1 minute

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_items_due_date_reminder
ON work_items(due_date, user_id)
WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL;
```

✅ Wait for it to complete.

---

## Total Time

- 13 indexes × 1-2 minutes each = **15-25 minutes total**

---

## After All 13 Are Complete

Run this verification query:

```sql
SELECT COUNT(*) as indexes_created
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
```

**Expected result**: `13`

---

## Steps to Execute

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Select Project**: uzywajqzbdbrfammshdg (Staging)
3. **SQL Editor** → **New Query**
4. **Copy Index 1** code (from above)
5. **Paste** into the editor
6. **Click Run**
7. **Wait** for success (should see "Success" message)
8. **Repeat** for Index 2-13

---

## If You Get an Error

If you get the transaction error again, that means the dashboard is still wrapping it. Try this workaround:

1. Add a semicolon at the end: `;`
2. Run just the CREATE INDEX statement without any other SQL

If that still doesn't work, the indexes can also be created manually during your next git push (they'll be applied automatically via migrations).

---

**Let me know when all 13 indexes are created and I'll verify!**
