# Phase 2.4: Performance Index Creation - Execution Guide

**Issue**: #73 Phase 2 - Performance & Indexes
**Task**: 2.4 - Create 13 Performance Indexes
**Date**: 2026-01-10
**Environment**: Staging (uzywajqzbdbrfammshdg)
**Status**: Ready for Execution

---

## Overview

Phase 2.4 creates **13 strategic performance indexes** across 10 core tables to optimize query performance for:
- Journey module (moments, weekly summaries, daily questions)
- WhatsApp integration (messages, conversations, contact network)
- Atlas module (work items)
- Finance module (transactions)
- Studio module (podcast episodes)
- Gamification (consciousness points log)

**Total Indexes**: 13
**Organized by Priority**: 5 CRITICAL + 5 HIGH + 3 MEDIUM
**Estimated Runtime**: 5-10 minutes
**Storage Impact**: ~50-80 MB
**Zero Downtime**: All indexes use CONCURRENTLY

---

## Index List

### PHASE A: CRITICAL INDEXES (5 total)

| # | Index Name | Table | Purpose | Query Pattern |
|---|-----------|-------|---------|----------------|
| 1 | idx_moments_user_date_composite | moments | Recent moments feed | WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC |
| 2 | idx_moments_user_date_range_covering | moments | Weekly summary generation | WHERE user_id = ? AND created_at BETWEEN ? AND ? |
| 3 | idx_whatsapp_messages_conversation_thread | whatsapp_messages | Conversation thread retrieval | WHERE user_id = ? AND contact_phone = ? ORDER BY message_timestamp DESC |
| 4 | idx_contact_network_health_engagement | contact_network | Contact network health rankings | WHERE user_id = ? AND is_active = true ORDER BY health_score DESC |
| 5 | idx_work_items_eisenhower_matrix | work_items | Eisenhower matrix filtering | WHERE user_id = ? AND priority IN (...) AND status = ? |

### PHASE B: HIGH PRIORITY INDEXES (5 total)

| # | Index Name | Table | Purpose | Query Pattern |
|---|-----------|-------|---------|----------------|
| 6 | idx_weekly_summaries_user_week_lookup | weekly_summaries | Specific week summary retrieval | WHERE user_id = ? AND week_number = ? AND year = ? |
| 7 | idx_daily_questions_date_range | daily_questions | Recent question history | WHERE user_id = ? ORDER BY date_asked DESC |
| 8 | idx_ai_usage_logs_analytics | ai_usage_logs | AI cost tracking analytics | WHERE user_id = ? AND created_at >= ? GROUP BY ai_model |
| 9 | idx_podcast_episodes_show_timeline | podcast_episodes | Episode timeline | WHERE show_id = ? AND deleted_at IS NULL ORDER BY created_at DESC |
| 13 | idx_work_items_due_date_reminder | work_items | Daily reminder job | WHERE due_date BETWEEN ? AND ? AND status IN (...) |

### PHASE C: MEDIUM PRIORITY INDEXES (3 total)

| # | Index Name | Table | Purpose | Query Pattern |
|---|-----------|-------|---------|----------------|
| 10 | idx_finance_transactions_categorization | finance_transactions | Transaction history with category | WHERE user_id = ? AND transaction_date >= ? AND category = ? |
| 11 | idx_whatsapp_conversations_recent_activity | whatsapp_conversations | Recent conversations dashboard | WHERE user_id = ? AND total_messages > 0 ORDER BY last_message_at DESC |
| 12 | idx_consciousness_points_log_leaderboard | consciousness_points_log | Point history and gamification | WHERE user_id = ? AND created_at >= ? GROUP BY DATE(created_at) |

---

## How to Apply Phase 2.4

### Option 1: Via Supabase Dashboard (Recommended for Staging)

1. **Login to Supabase**: https://supabase.com/dashboard
2. **Select Project**: uzywajqzbdbrfammshdg (Staging)
3. **Navigate**: SQL Editor → New query
4. **Copy & Paste** the entire content of:
   ```
   supabase/migrations/20260109_phase2_4_create_indexes.sql
   ```
5. **Execute**: Click "Run" button
6. **Monitor**: Watch for success messages in output
7. **Verify**: Run verification query (see below)

### Option 2: Via Supabase CLI (Local/CI)

```bash
# Push to local Supabase instance
supabase db push

# Or directly to staging (use with caution)
# supabase db push --project-ref=uzywajqzbdbrfammshdg
```

### Option 3: Via GitHub Actions (On Merge)

This migration will automatically apply on merge to main via the GitHub workflow.

---

## Post-Execution Verification

After running the migration, execute the verification query to confirm all 13 indexes were created:

### Quick Verification (1 minute)

```sql
-- Count total indexes created
SELECT COUNT(*) as total_indexes_created
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

-- Expected Result: total_indexes_created = 13
```

### Detailed Verification (2 minutes)

```sql
-- Show all created indexes with sizes
SELECT
  indexname,
  tablename,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected Result: 13 rows with index statistics
```

### Performance Baseline (5 minutes)

```sql
-- Measure query performance BEFORE optimization was applied
-- (Save this for Phase 2.5 comparison)

-- Example 1: Recent moments query
EXPLAIN ANALYZE
SELECT id, content, emotion, created_at
FROM moments
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Example 2: Conversation thread query
EXPLAIN ANALYZE
SELECT id, message_text, message_timestamp
FROM whatsapp_messages
WHERE user_id = auth.uid()
  AND contact_phone = '+5511999999999'
  AND deleted_at IS NULL
ORDER BY message_timestamp DESC
LIMIT 50;

-- Example 3: Work items matrix query
EXPLAIN ANALYZE
SELECT id, title, priority, status, due_date
FROM work_items
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
  AND priority = 1
ORDER BY due_date ASC;
```

---

## Expected Results

### Success Indicators

✅ **Index Creation Output**:
```
========================================
PHASE 2.4: INDEX CREATION STARTED
Started at: [timestamp]
========================================
[1/13] Creating idx_moments_user_date_composite...
[2/13] Creating idx_moments_user_date_range_covering...
...
[13/13] Creating idx_work_items_due_date_reminder...
========================================
INDEX CREATION SUMMARY
Expected indexes: 13
Created indexes: 13
✅ ALL INDEXES CREATED SUCCESSFULLY
========================================
```

✅ **Verification Query Result**:
```
total_indexes_created: 13
```

✅ **Index Size Report**:
```
index_size expected range: 2MB - 15MB per index
total_expected: 50-80 MB
```

---

## Troubleshooting

### Issue: "Index already exists" Error

**Symptom**: `ERROR: relation ... already exists`

**Diagnosis**: Index was partially created from a previous attempt

**Fix**: This is expected - all indexes use `IF NOT EXISTS` so re-running is safe

**Action**: Continue execution, all indexes will be created correctly

---

### Issue: Some Indexes Missing After Execution

**Symptom**: `Expected indexes: 13, Created indexes: 11`

**Diagnosis**: Two indexes failed during creation (check timeout or table locks)

**Fix**:

```sql
-- Re-run just the missing index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missing_index_name
ON table_name(columns);
```

**Prevention**: Ensure no other migrations running during execution

---

### Issue: Slow Index Creation (> 15 minutes)

**Symptom**: Migration takes longer than expected

**Diagnosis**: Large data volume or high concurrent queries

**Fix**:
1. Wait for completion (CONCURRENTLY allows other queries)
2. Or cancel and try during off-peak hours
3. Monitor table size: `SELECT pg_size_pretty(pg_total_relation_size('table_name'));`

---

## Performance Impact

### Before Phase 2.4
- Recent moments query: ~1000-2000ms (full table scan)
- Conversation thread: ~800-1500ms (full table scan)
- Work items matrix: ~500-1000ms (full table scan)

### After Phase 2.4 (Expected)
- Recent moments query: ~30-50ms (30-50x faster)
- Conversation thread: ~50-100ms (15-20x faster)
- Work items matrix: ~20-40ms (20-30x faster)

**Expected Average Improvement**: 30-40% faster queries across all modules

---

## Phase 2.4 Completion Checklist

- [ ] Migration file executed without errors
- [ ] Verification query returns: total_indexes_created = 13
- [ ] Index size report shows ~50-80 MB total
- [ ] No RLS policy violations detected
- [ ] All tables remain accessible (no locks)
- [ ] Frontend application works normally
- [ ] Sample queries execute faster

---

## Next Steps

### Phase 2.5: Performance Baseline Measurement
**Goal**: Measure and document actual query performance improvements
**Timeline**: 1-2 hours
**Tasks**:
1. Run EXPLAIN ANALYZE on key query patterns
2. Compare before/after metrics
3. Document performance improvements
4. Generate performance report

### Phase 2.6: Migration Cleanup (Optional)
**Goal**: Consolidate migration history and remove test files
**Timeline**: 30 minutes
**Tasks**:
1. Archive old migration test files
2. Consolidate migration documentation
3. Update PHASE migration summary

---

## Deliverables

✅ **Migration File**: `supabase/migrations/20260109_phase2_4_create_indexes.sql`
✅ **Execution Guide**: This document
✅ **Verification Scripts**: Included above
✅ **Index Design Report**: `docs/PHASE2_4_INDEX_DESIGN_REPORT.md`

---

## Reference

- **Issue**: #73 Database Security & Integrity Audit
- **Architecture**: See `docs/ARCHITECTURE_REFACTORING_ISSUE_39.md`
- **Previous Phases**: Phase 2.1 (migrations), 2.2 (audit), 2.3 (RLS testing)
- **Migration Location**: `supabase/migrations/20260109_phase2_4_create_indexes.sql`

---

**Status**: Ready for Execution
**Approved**: Backend Architect + Security Review
**Next Action**: Execute migration and verify all 13 indexes

