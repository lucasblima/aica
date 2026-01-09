# Phase 2.4: Index Quick Reference
## 13 Performance Indexes - At a Glance

**Issue**: #73 Phase 2.4
**Date**: 2026-01-09
**Total Indexes**: 13
**Estimated Storage**: 50-80 MB

---

## Index Summary Table

| # | Index Name | Table | Columns | Type | Priority | Use Case |
|---|------------|-------|---------|------|----------|----------|
| 1 | idx_moments_user_date_composite | moments | user_id, created_at DESC | BTREE + Partial | 🔴 CRITICAL | Recent moments feed |
| 2 | idx_moments_user_date_range_covering | moments | user_id, created_at + INCLUDE | BTREE + Covering | 🔴 CRITICAL | Weekly summary generation |
| 3 | idx_whatsapp_messages_conversation_thread | whatsapp_messages | user_id, contact_phone, message_timestamp DESC | BTREE + Partial | 🔴 CRITICAL | Conversation threads |
| 4 | idx_contact_network_health_engagement | contact_network | user_id, health_score DESC, engagement_level | BTREE + Partial | 🔴 CRITICAL | Contact dashboard |
| 5 | idx_work_items_eisenhower_matrix | work_items | user_id, priority, status, due_date | BTREE 4-col | 🔴 CRITICAL | Eisenhower matrix |
| 6 | idx_weekly_summaries_user_week_lookup | weekly_summaries | user_id, week_number, year | BTREE 3-col | 🟡 HIGH | Week navigation |
| 7 | idx_daily_questions_date_range | daily_questions | user_id, date_asked DESC | BTREE + Partial | 🟡 HIGH | Question history |
| 8 | idx_ai_usage_logs_analytics | ai_usage_logs | user_id, created_at DESC + INCLUDE | BTREE + Covering | 🟡 HIGH | Cost analytics |
| 9 | idx_podcast_episodes_show_timeline | podcast_episodes | show_id, created_at DESC, status | BTREE + Partial | 🟡 HIGH | Episode timeline |
| 13 | idx_work_items_due_date_reminder | work_items | due_date, user_id | BTREE + Partial | 🟡 HIGH | Daily reminders |
| 10 | idx_finance_transactions_categorization | finance_transactions | user_id, transaction_date DESC, category | BTREE 3-col | 🟠 MEDIUM | Transaction history |
| 11 | idx_whatsapp_conversations_recent_activity | whatsapp_conversations | user_id, last_message_at DESC, average_sentiment | BTREE + Partial | 🟠 MEDIUM | Conversation list |
| 12 | idx_consciousness_points_log_leaderboard | consciousness_points_log | user_id, created_at DESC + INCLUDE | BTREE + Covering | 🟠 MEDIUM | Point history |

---

## By Module

### Journey Module (4 indexes)
```sql
-- #1: Recent moments feed (CRITICAL)
idx_moments_user_date_composite
  ON moments(user_id, created_at DESC) WHERE deleted_at IS NULL

-- #2: Weekly summary generation (CRITICAL)
idx_moments_user_date_range_covering
  ON moments(user_id, created_at) INCLUDE (emotion, tags, content) WHERE deleted_at IS NULL

-- #6: Week navigation (HIGH)
idx_weekly_summaries_user_week_lookup
  ON weekly_summaries(user_id, week_number, year) WHERE deleted_at IS NULL

-- #7: Question history (HIGH)
idx_daily_questions_date_range
  ON daily_questions(user_id, date_asked DESC) WHERE deleted_at IS NULL
```

### WhatsApp Module (2 indexes)
```sql
-- #3: Conversation threads (CRITICAL)
idx_whatsapp_messages_conversation_thread
  ON whatsapp_messages(user_id, contact_phone, message_timestamp DESC)
  WHERE deleted_at IS NULL AND processing_status = 'completed'

-- #11: Conversation list (MEDIUM)
idx_whatsapp_conversations_recent_activity
  ON whatsapp_conversations(user_id, last_message_at DESC, average_sentiment)
  WHERE total_messages > 0
```

### People Network (1 index)
```sql
-- #4: Contact dashboard (CRITICAL)
idx_contact_network_health_engagement
  ON contact_network(user_id, health_score DESC NULLS LAST, engagement_level)
  WHERE is_active = true AND is_archived = false
```

### Atlas Module (2 indexes)
```sql
-- #5: Eisenhower matrix (CRITICAL)
idx_work_items_eisenhower_matrix
  ON work_items(user_id, priority, status, due_date) WHERE deleted_at IS NULL

-- #13: Daily reminders (HIGH)
idx_work_items_due_date_reminder
  ON work_items(due_date, user_id)
  WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL
```

### Studio Module (1 index)
```sql
-- #9: Episode timeline (HIGH)
idx_podcast_episodes_show_timeline
  ON podcast_episodes(show_id, created_at DESC, status) WHERE deleted_at IS NULL
```

### Finance Module (1 index)
```sql
-- #10: Transaction history (MEDIUM)
idx_finance_transactions_categorization
  ON finance_transactions(user_id, transaction_date DESC, category)
  WHERE deleted_at IS NULL
```

### AI & Gamification (2 indexes)
```sql
-- #8: Cost analytics (HIGH)
idx_ai_usage_logs_analytics
  ON ai_usage_logs(user_id, created_at DESC)
  INCLUDE (ai_model, operation_type, total_cost_usd, input_tokens, output_tokens)

-- #12: Point history (MEDIUM)
idx_consciousness_points_log_leaderboard
  ON consciousness_points_log(user_id, created_at DESC)
  INCLUDE (points, module_type, activity_type)
```

---

## Index Types Used

### Standard Composite (7 indexes)
Simple multi-column BTREE indexes for filtering + sorting.
```
#1, #3, #4, #5, #6, #7, #9
```

### Covering Index with INCLUDE (3 indexes)
Index contains all query columns → index-only scans.
```
#2, #8, #12
```

### Partial Index (9 indexes)
Filtered index (WHERE clause) → reduced size.
```
#1, #2, #3, #4, #5, #6, #7, #9, #11, #13
```

---

## Query Pattern Matrix

| Query Pattern | Frequency | Index | Expected Speedup |
|--------------|-----------|-------|------------------|
| Recent moments feed | VERY HIGH | #1 | 90-95% |
| Weekly summary generation | HIGH | #2 | 70-80% |
| Conversation thread | VERY HIGH | #3 | 80-85% |
| Contact dashboard | HIGH | #4 | 80-85% |
| Eisenhower matrix | VERY HIGH | #5 | 80% |
| Week navigation | HIGH | #6 | 75-85% |
| Question history | HIGH | #7 | 80% |
| AI cost analytics | MEDIUM | #8 | 70-75% |
| Episode timeline | HIGH | #9 | 70-75% |
| Transaction history | MEDIUM | #10 | 65-70% |
| Conversation list | MEDIUM | #11 | 65-70% |
| Point history | MEDIUM | #12 | 65-70% |
| Due date reminders | HIGH | #13 | 75-80% |

---

## Common Query Patterns Covered

### 1. User-Scoped Feed Queries
**Pattern**: `WHERE user_id = ? ORDER BY created_at DESC LIMIT N`
**Indexes**: #1, #7, #9, #11

### 2. Date Range Queries
**Pattern**: `WHERE user_id = ? AND date BETWEEN ? AND ?`
**Indexes**: #2, #8, #10, #12

### 3. Multi-Column Filtering
**Pattern**: `WHERE user_id = ? AND col1 = ? AND col2 = ?`
**Indexes**: #3, #5, #6

### 4. Sorted Dashboard Queries
**Pattern**: `WHERE user_id = ? ORDER BY score DESC NULLS LAST`
**Indexes**: #4, #11

### 5. Reminder/Notification Queries
**Pattern**: `WHERE date BETWEEN ? AND ? AND status IN (...)`
**Indexes**: #13

---

## Storage Breakdown (Estimated)

| Index Type | Count | Avg Size | Total |
|------------|-------|----------|-------|
| Standard | 7 | 4 MB | ~28 MB |
| Covering | 3 | 8 MB | ~24 MB |
| Partial | 9 | 3 MB | ~27 MB |
| **TOTAL** | **13** | - | **~50-80 MB** |

*Note: Actual sizes depend on table row counts and data characteristics.*

---

## Implementation Order

### Phase A: CRITICAL (Run First)
1. idx_moments_user_date_composite
2. idx_moments_user_date_range_covering
3. idx_whatsapp_messages_conversation_thread
4. idx_contact_network_health_engagement
5. idx_work_items_eisenhower_matrix

### Phase B: HIGH (Run Second)
6. idx_weekly_summaries_user_week_lookup
7. idx_daily_questions_date_range
8. idx_ai_usage_logs_analytics
9. idx_podcast_episodes_show_timeline
13. idx_work_items_due_date_reminder

### Phase C: MEDIUM (Run Last)
10. idx_finance_transactions_categorization
11. idx_whatsapp_conversations_recent_activity
12. idx_consciousness_points_log_leaderboard

---

## Validation Commands

### Check if index exists
```sql
SELECT indexname, tablename, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE indexname = 'idx_name_here';
```

### Check index usage
```sql
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan;
```

### Drop specific index (if needed)
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_name_here;
```

### Verify query uses index
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM table_name WHERE ...;
-- Look for "Index Scan" or "Index Only Scan"
```

---

## Key Design Principles

1. **Composite Over Single**: Multi-column indexes are more efficient than multiple single-column indexes
2. **Covering Indexes**: Use INCLUDE for frequently accessed columns → index-only scans
3. **Partial Indexes**: Filter out irrelevant rows (deleted_at IS NULL) → smaller, faster
4. **Column Order**: Most selective columns first (user_id > priority > status)
5. **DESC Matching**: Index order matches query ORDER BY direction

---

## Files
- **Design**: `docs/PHASE2_4_INDEX_DESIGN_REPORT.md`
- **Checklist**: `docs/PHASE2_4_EXECUTION_CHECKLIST.md`
- **Quick Reference**: `docs/PHASE2_4_INDEX_QUICK_REFERENCE.md` (this file)
- **Migration**: `supabase/migrations/20260109_phase2_4_create_indexes.sql`
- **Validation**: `supabase/audit-queries/phase2-4-post-index-validation.sql`

---

**Last Updated**: 2026-01-09
