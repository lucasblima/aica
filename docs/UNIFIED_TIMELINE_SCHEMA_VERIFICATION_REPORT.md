# Unified Timeline Schema Verification Report

**Date**: 2026-01-09
**Issue**: Unified Timeline Phase 2 - Schema Verification
**Agent**: Backend Architect (Supabase)
**Priority**: 🔴 HIGH - Blocking Phase 2 UI Implementation

---

## Executive Summary

**Status**: ⚠️ SCHEMA VERIFICATION REQUIRED

The unified timeline service layer (`unifiedTimelineService.ts`) queries columns that may not exist in the actual Supabase database. This report identifies expected vs. actual schema and provides migration scripts to add missing columns.

**Critical Finding**: Service layer includes fallback logic for missing columns, but we need to verify which columns actually exist to determine if migrations are needed.

---

## Tables Involved

| Table | Purpose | Status |
|-------|---------|--------|
| `whatsapp_messages` | WhatsApp chat history | ⚠️ Verify columns |
| `moments` | Journal entries, consciousness points | ⚠️ Verify columns |
| `tasks` | Atlas task management | ⚠️ Verify columns |
| `daily_questions` | Daily reflection questions | ⚠️ Verify columns |
| `weekly_summaries` | Weekly AI-generated summaries | ⚠️ Verify columns |
| `user_activities` | System activity tracking | ⚠️ Verify columns |
| `grant_responses` | Grant approval decisions | ⚠️ Verify columns (NOT YET IMPLEMENTED) |

---

## Schema Verification Checklist

### 1. WhatsApp Messages (`whatsapp_messages`)

**Service Expectations** (lines 191-204):

```typescript
{
  id: msg.id,
  user_id: msg.user_id,
  created_at: msg.created_at,
  content: msg.content || msg.message || '',  // FALLBACK
  contact_name: msg.contact_name,
  contact_number: msg.contact_number || msg.remote_jid,  // FALLBACK
  message_type: msg.message_type || 'text',
  direction: msg.direction || 'incoming',
  sentiment: msg.sentiment,  // OPTIONAL
  tags: msg.tags || [],  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)

**Content Columns** (at least ONE required):
- ❓ `content` (TEXT)
- ❓ `message` (TEXT)
- ❓ `message_text` (TEXT)

**Contact Columns**:
- ❓ `contact_name` (TEXT)
- ❓ `contact_number` (TEXT)
- ❓ `remote_jid` (TEXT) - WhatsApp ID format

**Metadata Columns**:
- ❓ `message_type` (TEXT) - Default: 'text'
- ❓ `direction` (TEXT) - Values: 'incoming', 'outgoing'

**Optional AI Columns** (service handles missing):
- ❓ `sentiment` (TEXT) - Values: 'positive', 'neutral', 'negative'
- ❓ `tags` (TEXT[]) - Array of tags

**Action**:
- Run verification query #2 to check column existence
- If `content` missing but `message` exists, service will work (fallback)
- If `sentiment` missing, service will work (optional)

---

### 2. Moments (`moments`)

**Service Expectations** (lines 244-258):

```typescript
{
  id: moment.id,
  user_id: moment.user_id,
  created_at: moment.created_at,
  content: moment.content || '',
  title: moment.title,
  emotion: moment.emotion,
  energy_level: moment.energy_level,
  tags: moment.tags || [],
  sentiment: moment.sentiment,  // OPTIONAL
  has_audio: !!moment.audio_url,  // OPTIONAL
  audio_duration_seconds: moment.audio_duration,  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)
- ✅ `content` (TEXT) - Required, no fallback

**Metadata Columns**:
- ❓ `title` (TEXT)
- ❓ `emotion` (TEXT)
- ❓ `energy_level` (INTEGER)
- ❓ `tags` (TEXT[])

**Optional AI/Audio Columns**:
- ❓ `sentiment` (TEXT)
- ❓ `audio_url` (TEXT)
- ❓ `audio_duration` (INTEGER) - Seconds

**Action**:
- Run verification query #3
- If `sentiment` missing, service will work (optional)
- If `audio_url`/`audio_duration` missing, `has_audio` will be false (OK)

---

### 3. Tasks (`tasks`)

**Service Expectations** (lines 298-311):

```typescript
{
  id: task.id,
  user_id: task.user_id,
  created_at: task.created_at,
  title: task.title || task.name || '',  // FALLBACK
  description: task.description,
  status: task.status || 'pending',
  priority: task.quadrant || task.priority || 'not_urgent_not_important',  // FALLBACK
  completed_at: task.completed_at,
  due_date: task.due_date,
  xp_earned: task.xp_earned,  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)

**Title Columns** (at least ONE required):
- ❓ `title` (TEXT)
- ❓ `name` (TEXT)

**Metadata Columns**:
- ❓ `description` (TEXT)
- ❓ `status` (TEXT) - Values: 'pending', 'in_progress', 'completed', 'cancelled'

**Priority Columns** (fallback logic):
- ❓ `quadrant` (INTEGER) - Eisenhower matrix quadrant (1-4)
- ❓ `priority` (TEXT) - Priority string

**Date Columns**:
- ❓ `completed_at` (TIMESTAMPTZ)
- ❓ `due_date` (TIMESTAMPTZ)

**Optional Gamification**:
- ❓ `xp_earned` (INTEGER)

**Action**:
- Run verification query #4
- If `quadrant` missing but `priority` exists, service will work (fallback)
- If `xp_earned` missing, service will work (optional)

---

### 4. Daily Questions (`daily_questions`)

**Service Expectations** (lines 351-362):

```typescript
{
  id: q.id,
  user_id: q.user_id,
  created_at: q.created_at,
  question_text: q.question || q.question_text || '',  // FALLBACK
  response: q.response || q.answer,  // FALLBACK
  answered_at: q.answered_at,
  skipped: q.skipped,
  xp_earned: q.xp_earned,  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)

**Question Columns** (at least ONE required):
- ❓ `question` (TEXT)
- ❓ `question_text` (TEXT)

**Response Columns** (fallback):
- ❓ `response` (TEXT)
- ❓ `answer` (TEXT)

**Metadata Columns**:
- ❓ `answered_at` (TIMESTAMPTZ)
- ❓ `skipped` (BOOLEAN)

**Optional Gamification**:
- ❓ `xp_earned` (INTEGER)

**Action**:
- Run verification query #5
- If `question` missing but `question_text` exists, service will work (fallback)
- If `xp_earned` missing, service will work (optional)

---

### 5. Weekly Summaries (`weekly_summaries`)

**Service Expectations** (lines 402-415):

```typescript
{
  id: s.id,
  user_id: s.user_id,
  created_at: s.created_at,
  week_start: s.week_start,
  week_end: s.week_end,
  highlights: s.highlights || [],  // OPTIONAL
  mood_average: s.mood_average,  // OPTIONAL
  moments_count: s.moments_count,  // OPTIONAL
  tasks_completed: s.tasks_completed,  // OPTIONAL
  reflection: s.reflection,  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)
- ✅ `week_start` (DATE)
- ✅ `week_end` (DATE)

**Optional Summary Columns**:
- ❓ `highlights` (TEXT[]) - Array of highlight strings
- ❓ `mood_average` (DECIMAL)
- ❓ `moments_count` (INTEGER)
- ❓ `tasks_completed` (INTEGER)
- ❓ `reflection` (TEXT)

**Action**:
- Run verification query #6
- All summary columns are optional, service will work if missing
- But UI will be empty without these columns

---

### 6. User Activities (`user_activities`)

**Service Expectations** (lines 455-465):

```typescript
{
  id: a.id,
  user_id: a.user_id,
  created_at: a.created_at,
  activity_type: a.activity_type || a.type || 'general',  // FALLBACK
  description: a.description || '',
  metadata: a.metadata,  // OPTIONAL
  xp_earned: a.xp_earned,  // OPTIONAL
}
```

**Required Columns**:
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `created_at` (TIMESTAMPTZ)

**Type Columns** (at least ONE required):
- ❓ `activity_type` (TEXT)
- ❓ `type` (TEXT)

**Content Columns**:
- ❓ `description` (TEXT)

**Optional Columns**:
- ❓ `metadata` (JSONB)
- ❓ `xp_earned` (INTEGER)

**Action**:
- Run verification query #7
- If `activity_type` missing but `type` exists, service will work (fallback)

---

### 7. Grant Responses (`grant_responses`)

**Service Status**: ⚠️ NOT YET IMPLEMENTED

The `fetchApprovalEvents` function is NOT implemented in the service (line 102-112 shows placeholder).

**Expected Schema** (from types/unifiedEvent.ts):
```typescript
interface ApprovalEvent {
  id: string
  source: 'approval'
  created_at: string
  user_id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  rejected_at?: string
}
```

**Action**:
- Verify `grant_responses` table exists
- Check schema alignment
- Implement `fetchApprovalEvents` function later

---

## Verification Workflow

### Step 1: Run Verification Script

Execute the SQL verification script in Supabase SQL Editor:

```bash
# File location
supabase/audit-queries/verify_unified_timeline_schema.sql
```

This script will output:
1. ✅ Table existence check
2. 📊 Column inventory per table
3. ❌ Missing columns report
4. 🔒 RLS status verification
5. 📈 Index coverage check

### Step 2: Analyze Results

Based on the output, categorize findings:

**Category A: Critical Missing** (breaks service)
- Required columns with NO fallback
- Example: `moments.content`, `tasks.id`

**Category B: Fallback Works** (service handles gracefully)
- Columns with fallback logic
- Example: `tasks.title || tasks.name`, `whatsapp_messages.content || message`

**Category C: Optional** (service works, but limited functionality)
- Optional columns service checks for
- Example: `sentiment`, `audio_url`, `xp_earned`

### Step 3: Create Migration (if needed)

If Category A or C columns are missing, create migration:

```sql
-- Migration: 20260109_add_missing_timeline_columns.sql
-- Description: Add missing columns for unified timeline service
-- Issue: Unified Timeline Phase 2

-- Example: Add sentiment to whatsapp_messages
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS sentiment TEXT
CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed'));

-- Example: Add audio columns to moments
ALTER TABLE moments
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER CHECK (audio_duration > 0);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sentiment
ON whatsapp_messages(sentiment) WHERE sentiment IS NOT NULL;
```

### Step 4: Update Service Layer (if needed)

If columns DON'T exist and CAN'T be added:

1. Update TypeScript types to make properties optional
2. Add more robust fallback logic
3. Update UI to handle missing data gracefully

---

## Migration Templates

### Template 1: Add Optional Column (No Breaking Change)

```sql
-- Add optional sentiment column to whatsapp_messages
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS sentiment TEXT;

-- Add constraint (optional)
ALTER TABLE whatsapp_messages
ADD CONSTRAINT check_sentiment_values
CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed') OR sentiment IS NULL);

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sentiment
ON whatsapp_messages(sentiment)
WHERE sentiment IS NOT NULL;

-- Add comment
COMMENT ON COLUMN whatsapp_messages.sentiment IS
'AI-analyzed sentiment of message content';
```

### Template 2: Add Required Column (With Default)

```sql
-- Add required column with default value (safe for existing rows)
ALTER TABLE user_activities
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Remove default after backfill (optional)
ALTER TABLE user_activities
ALTER COLUMN description DROP DEFAULT;

-- Make NOT NULL (optional, only if appropriate)
ALTER TABLE user_activities
ALTER COLUMN description SET NOT NULL;
```

### Template 3: Add Gamification Column (Standard Pattern)

```sql
-- Add xp_earned to daily_questions
ALTER TABLE daily_questions
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0 CHECK (xp_earned >= 0);

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_daily_questions_xp_earned
ON daily_questions(xp_earned)
WHERE xp_earned > 0;

COMMENT ON COLUMN daily_questions.xp_earned IS
'Experience points earned for answering question';
```

### Template 4: Add Audio Metadata (Moments Pattern)

```sql
-- Add audio metadata columns to moments
ALTER TABLE moments
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER CHECK (audio_duration > 0);

-- Add index for audio moments queries
CREATE INDEX IF NOT EXISTS idx_moments_audio_url
ON moments(user_id, created_at)
WHERE audio_url IS NOT NULL;

COMMENT ON COLUMN moments.audio_url IS
'URL to audio recording (if moment was recorded via voice)';

COMMENT ON COLUMN moments.audio_duration IS
'Audio duration in seconds';
```

---

## Type Definition Updates

If columns are missing and CAN'T be added, update TypeScript types:

### Before (Assumes Column Exists)
```typescript
export interface MomentEvent extends BaseEvent {
  source: 'moment'
  content: string
  sentiment: EventSentiment  // ❌ Assumes column exists
  audio_duration_seconds: number  // ❌ Assumes column exists
}
```

### After (Optional Properties)
```typescript
export interface MomentEvent extends BaseEvent {
  source: 'moment'
  content: string
  sentiment?: EventSentiment  // ✅ Optional
  audio_duration_seconds?: number  // ✅ Optional
  has_audio?: boolean  // ✅ Optional
}
```

---

## Testing Checklist

After applying migrations:

- [ ] **Run verification script again** - Confirm columns exist
- [ ] **Test service layer** - Call `fetchUnifiedTimelineEvents()` with real data
- [ ] **Test filters** - Verify sentiment filter works if column added
- [ ] **Test UI components** - Ensure timeline renders correctly
- [ ] **Test performance** - Verify new indexes are being used (`EXPLAIN ANALYZE`)
- [ ] **Test RLS** - Confirm users can only see their data
- [ ] **Document schema** - Update DATABASE_SCHEMA.md with new columns

---

## Deliverables

1. **Verification Results** (`VERIFICATION_RESULTS.md`)
   - Output from SQL verification script
   - List of missing columns by table
   - Categorization (Critical/Fallback/Optional)

2. **Migration Script** (`20260109_add_missing_timeline_columns.sql`)
   - Add missing columns (if needed)
   - Add indexes for performance
   - Add comments for documentation

3. **Service Layer Updates** (`unifiedTimelineService.ts`)
   - More robust null checks
   - Better fallback defaults
   - Error handling for missing columns

4. **Type Updates** (`types/unifiedEvent.ts`)
   - Make optional properties optional (`?`)
   - Add JSDoc comments explaining optionality

---

## Next Steps

1. **Execute verification script** in Supabase SQL Editor
2. **Review output** and categorize missing columns
3. **Decide migration strategy**:
   - Add missing columns (preferred)
   - Update service to handle missing columns (if can't add)
4. **Create migration** if columns need to be added
5. **Test thoroughly** before deploying to staging
6. **Update documentation** with final schema

---

## Questions to Resolve

1. **Which `content` column name is correct?**
   - `whatsapp_messages.content` vs `message` vs `message_text`?

2. **Which `priority` approach for tasks?**
   - `tasks.quadrant` (INTEGER 1-4) vs `priority` (TEXT)?

3. **Should we add sentiment analysis columns?**
   - `sentiment` columns are marked optional but could be valuable
   - Would require AI Edge Function integration

4. **Gamification columns** (`xp_earned`):
   - Should all tables support XP tracking?
   - Or only specific "achievement" actions?

5. **Audio support priority**:
   - Are audio moments a core feature or nice-to-have?
   - Determines urgency of `audio_url`/`audio_duration` columns

---

## References

- **Service Layer**: `src/modules/journey/services/unifiedTimelineService.ts`
- **Type Definitions**: `src/modules/journey/types/unifiedEvent.ts`
- **Database Diagnostic**: `docs/DATABASE_DIAGNOSTIC_REPORT_ISSUE_73.md`
- **Verification Script**: `supabase/audit-queries/verify_unified_timeline_schema.sql`

---

**Status**: 🟡 AWAITING VERIFICATION

Execute verification script and report findings to proceed with Phase 2 implementation.
