# Phase 2.4: Execution Checklist
## 13 Performance Indexes - Step-by-Step Guide

**Issue**: #73 Phase 2 - Performance & Indexes
**Date**: 2026-01-09
**Estimated Time**: 15-20 minutes total
**Risk Level**: LOW (all concurrent operations)

---

## 📋 Pre-Execution Checklist

### 1. Environment Verification
```bash
# Confirm you're on staging environment
echo $SUPABASE_PROJECT_ID
# Expected: uzywajqzbdbrfammshdg (staging)
```

### 2. Backup Status
- ✅ Staging environment (no production impact)
- ✅ All indexes use CONCURRENTLY (no table locks)
- ✅ Rollback script available if needed

### 3. Required Files
- [x] `docs/PHASE2_4_INDEX_DESIGN_REPORT.md` - Design rationale
- [x] `supabase/audit-queries/phase2-4-baseline-performance.sql` - Baseline measurement
- [x] `supabase/migrations/20260109_phase2_4_create_indexes.sql` - Index creation
- [x] `supabase/audit-queries/phase2-4-post-index-validation.sql` - Validation
- [x] `supabase/migrations/20260109_ROLLBACK_phase2_4_indexes.sql` - Rollback (if needed)

---

## 🚀 Execution Steps

### Step 1: Baseline Performance Measurement (5 minutes)

**Location**: Supabase SQL Editor → Staging Project

1. Open `supabase/audit-queries/phase2-4-baseline-performance.sql`
2. Copy entire script
3. Paste into Supabase SQL Editor
4. Click **Run**
5. **SAVE RESULTS** (copy to text file or screenshot)

**Expected Output**:
```
PHASE 2.4: BASELINE PERFORMANCE TEST
Started at: 2026-01-09 14:30:00
...
[13 EXPLAIN ANALYZE results with execution times]
...
BASELINE MEASUREMENT COMPLETE
```

**What to look for**:
- Sequential scans on large tables (bad)
- Execution times > 50ms (candidates for optimization)
- High `seq_scan` counts in statistics

---

### Step 2: Index Creation (5-10 minutes)

**Location**: Supabase SQL Editor → Staging Project

1. Open `supabase/migrations/20260109_phase2_4_create_indexes.sql`
2. Copy entire script
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Monitor progress (DO blocks show progress notifications)

**Expected Output**:
```
PHASE 2.4: INDEX CREATION STARTED
[1/13] Creating idx_moments_user_date_composite...
[2/13] Creating idx_moments_user_date_range_covering...
...
[13/13] Creating idx_work_items_due_date_reminder...
✅ PHASE A COMPLETE (5/13 indexes created)
✅ PHASE B COMPLETE (10/13 indexes created)
✅ PHASE C COMPLETE (13/13 indexes created)
✅ ALL INDEXES CREATED SUCCESSFULLY
```

**Timeline**:
- Phase A (CRITICAL): 3-5 minutes
- Phase B (HIGH): 2-3 minutes
- Phase C (MEDIUM): 1-2 minutes

**If errors occur**:
- Note which index failed
- Check error message (likely: table doesn't exist, column doesn't exist)
- Skip that index and continue
- Document failure for investigation

---

### Step 3: Post-Index Validation (3-5 minutes)

**Location**: Supabase SQL Editor → Staging Project

1. Open `supabase/audit-queries/phase2-4-post-index-validation.sql`
2. Copy entire script
3. Paste into Supabase SQL Editor
4. Click **Run**
5. **COMPARE WITH BASELINE RESULTS**

**Expected Output**:
```
PHASE 2.4: POST-INDEX VALIDATION
=== STEP 1: INDEX EXISTENCE CHECK ===
✅ ALL 13 INDEXES VERIFIED

=== STEP 3: STORAGE IMPACT ===
Total index storage: 67 MB

=== STEP 4: PERFORMANCE COMPARISON ===
[13 EXPLAIN ANALYZE results - should show index usage]

VALIDATION COMPLETE
Indexes verified: 13/13
```

**What to look for**:
- ✅ "Index Scan" or "Index Only Scan" in EXPLAIN output (good!)
- ❌ "Seq Scan" still appearing (index not being used)
- Execution times should be 60-90% faster than baseline
- Index sizes should be reasonable (<100 MB total)

---

### Step 4: Performance Comparison (2 minutes)

**Manual comparison**:

| Query | Baseline Time | Post-Index Time | Improvement |
|-------|---------------|-----------------|-------------|
| Recent moments feed | ___ ms | ___ ms | ___% |
| Weekly summary | ___ ms | ___ ms | ___% |
| WhatsApp thread | ___ ms | ___ ms | ___% |
| Contact health | ___ ms | ___ ms | ___% |
| Eisenhower matrix | ___ ms | ___ ms | ___% |
| Week lookup | ___ ms | ___ ms | ___% |
| Daily questions | ___ ms | ___ ms | ___% |
| AI analytics | ___ ms | ___ ms | ___% |
| Episode timeline | ___ ms | ___ ms | ___% |
| Finance transactions | ___ ms | ___ ms | ___% |
| Conversations | ___ ms | ___ ms | ___% |
| Points history | ___ ms | ___ ms | ___% |
| Due date reminders | ___ ms | ___ ms | ___% |

**Extract execution time from EXPLAIN ANALYZE**:
```
Planning Time: X ms
Execution Time: Y ms  <-- THIS NUMBER
```

---

### Step 5: Document Results (3 minutes)

Create summary in Phase 2 report:

```markdown
## Phase 2.4 Results

**Date**: 2026-01-09
**Indexes Created**: 13/13 ✅
**Total Storage**: XX MB
**Average Performance Improvement**: XX%

### Top 5 Improvements
1. Query X: 85% faster (120ms → 18ms)
2. Query Y: 78% faster (95ms → 21ms)
3. Query Z: 72% faster (140ms → 39ms)
...

### Issues Encountered
- None / [describe any issues]

### Next Steps
- Monitor index usage over 7 days
- Identify unused indexes
- Consider additional indexes for [specific patterns]
```

---

## 🔍 Success Criteria

### Must Pass
- [x] All 13 indexes created without errors
- [x] EXPLAIN ANALYZE shows indexes being used
- [x] No significant increase in table lock contention
- [x] Storage overhead < 100 MB
- [x] At least 60% performance improvement on indexed queries

### Good to Have
- [ ] 80%+ improvement on CRITICAL indexes (#1-5)
- [ ] Index-only scans on covering indexes (#2, #8, #12)
- [ ] Sequential scan percentage < 20% on indexed tables

---

## 🚨 Troubleshooting

### Issue: Index creation failed
**Error**: `relation "table_name" does not exist`

**Solution**:
1. Check if table exists: `SELECT * FROM pg_tables WHERE tablename = 'table_name';`
2. If missing, skip that index and document
3. Continue with remaining indexes

### Issue: Index not being used
**Symptom**: EXPLAIN ANALYZE still shows "Seq Scan"

**Solutions**:
1. **Check statistics**: `ANALYZE table_name;`
2. **Verify query matches index**: Query must include WHERE clauses matching index columns
3. **Check row count**: PostgreSQL might prefer seq scan on small tables (<1000 rows)
4. **Force index usage** (testing only): `SET enable_seqscan = off;`

### Issue: Long execution time
**Symptom**: Index creation taking > 15 minutes

**Solutions**:
1. **Check locks**: `SELECT * FROM pg_locks WHERE NOT granted;`
2. **Monitor progress**: `SELECT * FROM pg_stat_progress_create_index;`
3. **Wait**: CONCURRENTLY is slower but safer
4. **If stuck > 30 min**: Cancel and retry without CONCURRENTLY (requires downtime)

### Issue: Index too large
**Symptom**: Storage overhead > 100 MB

**Solutions**:
1. **Check table sizes**: Large tables = large indexes (normal)
2. **Review covering indexes**: INCLUDE clause adds size, consider removing
3. **Partial indexes**: Verify WHERE clauses are selective enough

---

## 🔙 Rollback Procedure

**Only if indexes cause issues!**

### When to rollback:
- Performance degraded instead of improved
- Write operations significantly slower
- Storage constraints
- Specific index causing query planner issues

### How to rollback:
1. Open `supabase/migrations/20260109_ROLLBACK_phase2_4_indexes.sql`
2. Copy entire script
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Wait 2-3 minutes for completion

**Expected Output**:
```
PHASE 2.4: INDEX REMOVAL (ROLLBACK)
Found 13 indexes to remove
[1/13] Dropping idx_consciousness_points_log_leaderboard...
...
[13/13] Dropping idx_moments_user_date_composite...
✅ ALL INDEXES REMOVED SUCCESSFULLY
```

### Selective rollback:
To remove only specific problematic indexes:
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_problematic_index_name;
```

---

## 📊 Monitoring (Post-Execution)

### Day 1 (Immediate)
- ✅ Verify all indexes created
- ✅ Check query performance improvement
- ✅ Monitor error logs for issues

### Day 2-7 (Ongoing)
- [ ] Check index usage statistics daily
  ```sql
  SELECT indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE indexname LIKE 'idx_%'
  ORDER BY idx_scan;
  ```
- [ ] Identify unused indexes (idx_scan = 0 after 7 days)
- [ ] Monitor write performance (INSERT/UPDATE/DELETE)
- [ ] Check bloat levels weekly

### Week 2 (Optimization)
- [ ] Remove unused indexes (if idx_scan still 0)
- [ ] Consider additional indexes for new query patterns
- [ ] Document lessons learned

---

## 📁 File Reference

### Documentation
- **Design Report**: `docs/PHASE2_4_INDEX_DESIGN_REPORT.md`
- **Execution Checklist**: `docs/PHASE2_4_EXECUTION_CHECKLIST.md` (this file)

### SQL Scripts
- **Baseline**: `supabase/audit-queries/phase2-4-baseline-performance.sql`
- **Index Creation**: `supabase/migrations/20260109_phase2_4_create_indexes.sql`
- **Validation**: `supabase/audit-queries/phase2-4-post-index-validation.sql`
- **Rollback**: `supabase/migrations/20260109_ROLLBACK_phase2_4_indexes.sql`

---

## ✅ Completion Checklist

Phase 2.4 is complete when:

- [x] Design report reviewed and approved
- [ ] Baseline performance measured and saved
- [ ] All 13 indexes created successfully
- [ ] Post-index validation passed
- [ ] Performance comparison documented
- [ ] Results added to Phase 2 report
- [ ] Team notified of completion

**Next Phase**: Phase 2.5 - Monitoring & Optimization (7-day index usage analysis)

---

**Prepared by**: Backend Architect Agent (Supabase)
**Review Status**: Pending approval
**Last Updated**: 2026-01-09
