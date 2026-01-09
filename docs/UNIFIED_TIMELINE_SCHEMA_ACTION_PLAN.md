# Unified Timeline Schema - Action Plan

**Date**: 2026-01-09
**Priority**: 🔴 HIGH - Blocking Phase 2 UI
**Status**: 🟡 VERIFICATION REQUIRED

---

## Quick Summary

The unified timeline service layer queries columns that may not exist in Supabase. We need to:

1. **Verify** which columns actually exist
2. **Migrate** to add missing columns (if needed)
3. **Update** service layer to handle missing columns gracefully
4. **Test** timeline functionality with real data

---

## Step-by-Step Workflow

### Step 1: Run Verification Script (5 minutes)

**File**: `supabase/audit-queries/verify_unified_timeline_schema.sql`

**How to run**:
1. Open Supabase Dashboard: https://gppebtrshbvuzatmebhr.supabase.co
2. Go to SQL Editor
3. Copy contents of verification script
4. Execute and save results

**What it checks**:
- ✅ All timeline tables exist
- 📊 Complete column inventory per table
- ❌ Missing columns report
- 🔒 RLS status
- 📈 Index coverage

**Expected output**:
```
TABLE EXISTENCE CHECK
✅ whatsapp_messages - EXISTS
✅ moments - EXISTS
✅ tasks - EXISTS
✅ daily_questions - EXISTS
✅ weekly_summaries - EXISTS
✅ user_activities - EXISTS

MISSING COLUMNS SUMMARY
whatsapp_messages: sentiment, tags
moments: sentiment, audio_url, audio_duration
tasks: quadrant, xp_earned
...
```

---

### Step 2: Analyze Results (10 minutes)

Based on verification output, categorize findings:

#### ✅ Category A: Service Will Work (No Action)
Columns exist OR fallback logic handles missing columns.

**Example**:
- `tasks.title` missing but `tasks.name` exists → Service uses fallback
- `whatsapp_messages.content` exists → No issue

#### ⚠️ Category B: Limited Functionality (Optional Columns Missing)
Service works but features disabled without these columns.

**Example**:
- `sentiment` columns missing → No sentiment filtering
- `xp_earned` columns missing → No gamification tracking
- `audio_url` missing → No audio moments

#### 🔴 Category C: Critical Missing (Breaks Service)
Required columns with NO fallback logic.

**Example**:
- `moments.content` missing → Service fails
- `tasks.id` missing → Service fails

---

### Step 3: Decide Migration Strategy (5 minutes)

Based on categorization:

#### If Category A Only (Everything Works)
✅ **No migration needed**
- Service layer handles gracefully
- Proceed to Phase 2 UI implementation
- Document which fallbacks are being used

#### If Category B (Optional Missing)
🟡 **Optional migration** (recommended but not blocking)
- Add optional columns for better UX
- Use migration template
- Schedule for deployment

#### If Category C (Critical Missing)
🔴 **Mandatory migration** (blocking)
- MUST add missing columns before Phase 2
- Use migration template
- Test thoroughly before applying

---

### Step 4: Create Migration (30 minutes)

**If migration needed:**

1. **Copy template**:
   ```bash
   cp supabase/migrations/.temp/20260109_add_missing_timeline_columns_TEMPLATE.sql \
      supabase/migrations/20260109_add_missing_timeline_columns.sql
   ```

2. **Customize migration**:
   - Uncomment ONLY the sections for missing columns
   - Remove comments for columns that already exist
   - Review constraints and indexes

3. **Verify migration syntax**:
   ```bash
   # Check for SQL syntax errors
   psql -d postgres -f supabase/migrations/20260109_add_missing_timeline_columns.sql --dry-run
   ```

4. **Test in local environment** (if available):
   ```bash
   npx supabase db reset --local
   npx supabase db push --local
   ```

---

### Step 5: Apply Migration to Staging (15 minutes)

**CRITICAL**: Test in staging before production!

1. **Backup current schema** (precaution):
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM pg_dump_schema('public');
   ```

2. **Apply migration**:
   - Open Supabase SQL Editor
   - Copy migration script
   - Execute and verify no errors

3. **Verify changes**:
   - Re-run verification script (Step 1)
   - Confirm missing columns now exist
   - Check indexes were created

4. **Test RLS policies**:
   ```sql
   -- Test as authenticated user
   SET request.jwt.claims TO '{"sub": "user-uuid-here"}';
   SELECT * FROM moments LIMIT 5;
   SELECT * FROM tasks LIMIT 5;
   ```

---

### Step 6: Update Service Layer (15 minutes)

**If columns CAN'T be added** (rare):

1. **Update TypeScript types** to make properties optional:
   ```typescript
   // Before
   sentiment: EventSentiment

   // After
   sentiment?: EventSentiment
   ```

2. **Add defensive checks** in service:
   ```typescript
   // Before
   sentiment: msg.sentiment

   // After
   sentiment: msg.sentiment || undefined
   ```

3. **Update UI components** to handle missing data:
   ```typescript
   {event.sentiment && (
     <SentimentBadge sentiment={event.sentiment} />
   )}
   ```

---

### Step 7: Test Timeline Functionality (20 minutes)

**Test checklist**:

- [ ] Fetch timeline events for authenticated user
- [ ] Verify all event sources appear (WhatsApp, moments, tasks, etc.)
- [ ] Test date range filters (today, last 7, last 30)
- [ ] Test search functionality
- [ ] Test sentiment filter (if column added)
- [ ] Test tag filter (if column added)
- [ ] Verify timeline stats calculation
- [ ] Check performance (queries < 100ms)
- [ ] Test RLS (users only see their own events)

**Test commands**:
```typescript
// In browser console or test file
import { fetchUnifiedTimelineEvents, fetchTimelineStats } from '@/modules/journey/services/unifiedTimelineService'

// Fetch events
const { events, total } = await fetchUnifiedTimelineEvents(
  'user-uuid',
  { dateRange: 'last7', sources: ['whatsapp', 'moment', 'task'] },
  20,
  0
)
console.log('Events:', events)

// Fetch stats
const stats = await fetchTimelineStats('user-uuid', 'last30')
console.log('Stats:', stats)
```

---

### Step 8: Document Results (10 minutes)

Create `VERIFICATION_RESULTS.md`:

```markdown
# Timeline Schema Verification Results

**Date**: 2026-01-09
**Environment**: Staging

## Verification Output
[Paste SQL script results here]

## Missing Columns Identified
| Table | Missing Columns | Action Taken |
|-------|-----------------|--------------|
| whatsapp_messages | sentiment, tags | ✅ Added via migration |
| moments | audio_url, audio_duration | ✅ Added via migration |
| tasks | xp_earned | ✅ Added via migration |

## Migration Applied
- File: `20260109_add_missing_timeline_columns.sql`
- Status: ✅ Applied successfully
- Date: 2026-01-09 15:30 UTC

## Test Results
- ✅ All queries working
- ✅ RLS policies verified
- ✅ Indexes created and used
- ✅ Timeline renders correctly

## Next Steps
- Proceed to Phase 2 UI components
- Monitor performance in staging
- Deploy to production after 48h soak test
```

---

## Decision Tree

```
┌─────────────────────────┐
│ Run Verification Script │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Missing       │───No──▶ Proceed to Phase 2 ✅
    │ Columns?      │
    └───────┬───────┘
            │ Yes
            ▼
    ┌───────────────┐
    │ Critical or   │───Optional──▶ Create optional migration
    │ Optional?     │                (non-blocking)
    └───────┬───────┘
            │ Critical
            ▼
    ┌───────────────┐
    │ Create        │
    │ Migration     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Test in       │
    │ Staging       │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Verify        │───Fail──▶ Rollback & Debug
    │ Success?      │
    └───────┬───────┘
            │ Pass
            ▼
    Proceed to Phase 2 ✅
```

---

## Key Questions to Answer

After running verification script:

1. **Do we have content columns?**
   - `whatsapp_messages.content` OR `message` OR `message_text`?
   - `moments.content`?
   - `tasks.title` OR `name`?

2. **Do we have priority columns?**
   - `tasks.quadrant` OR `priority`?
   - Which pattern is used?

3. **Do we have gamification columns?**
   - `tasks.xp_earned`?
   - `daily_questions.xp_earned`?
   - `user_activities.xp_earned`?

4. **Do we have AI analysis columns?**
   - `sentiment` columns on whatsapp_messages and moments?
   - `tags` arrays?

5. **Do we have audio support?**
   - `moments.audio_url`?
   - `moments.audio_duration`?

6. **Do we have summary statistics?**
   - `weekly_summaries.highlights`, `reflection`, `mood_average`?

---

## Risk Assessment

### Low Risk (Proceed)
- All required columns exist
- Fallback logic handles missing optional columns
- Service layer tested and working

### Medium Risk (Optional Migration)
- Optional columns missing (sentiment, xp_earned, audio)
- Features disabled but core functionality works
- Can add columns later without breaking changes

### High Risk (Mandatory Migration)
- Critical columns missing (content, id, user_id)
- Service will fail without migration
- MUST fix before Phase 2

---

## Time Estimates

| Step | Time | Complexity |
|------|------|------------|
| Verification | 5 min | Easy |
| Analysis | 10 min | Medium |
| Migration (if needed) | 30 min | Medium |
| Testing | 20 min | Medium |
| Documentation | 10 min | Easy |
| **Total** | **1h 15m** | **Medium** |

---

## Success Criteria

✅ **Ready for Phase 2** when:
- [ ] Verification script executed
- [ ] Missing columns documented
- [ ] Migration applied (if needed) OR service updated to handle missing
- [ ] All test cases pass
- [ ] RLS policies verified
- [ ] Performance acceptable (< 100ms queries)
- [ ] Documentation updated

---

## References

- **Verification Script**: `supabase/audit-queries/verify_unified_timeline_schema.sql`
- **Migration Template**: `supabase/migrations/.temp/20260109_add_missing_timeline_columns_TEMPLATE.sql`
- **Detailed Report**: `docs/UNIFIED_TIMELINE_SCHEMA_VERIFICATION_REPORT.md`
- **Service Layer**: `src/modules/journey/services/unifiedTimelineService.ts`
- **Type Definitions**: `src/modules/journey/types/unifiedEvent.ts`

---

## Next Action

**YOU ARE HERE** 👉 **Step 1: Run Verification Script**

Open Supabase SQL Editor and execute:
`supabase/audit-queries/verify_unified_timeline_schema.sql`

Then return with results to determine next steps.
