# PHASE 1: Onboarding Redesign - moment_entries Implementation

**Status:** COMPLETED
**Date:** 2025-12-11
**Migration:** `20251211_consolidate_moment_tables.sql`
**Project:** Aica Life OS - Backend Architecture

---

## Executive Summary

Successfully created the unified `moment_entries` table consolidating the legacy `journey_moments` and `moments` systems. This implementation provides:

- **Unified Schema:** Single source of truth for all journey entries
- **Rich Features:** Audio, sentiment analysis, emotion tracking, life areas categorization
- **Performance:** 10 optimized indexes for common query patterns
- **Security:** Full Row-Level Security (RLS) with 4 CRUD policies
- **Backward Compatibility:** Legacy views (`moments_legacy`, `journey_moments_legacy`) for existing code

---

## Table Schema

### moment_entries Table

**Primary Purpose:** Central repository for all types of journey entries (moments, reflections, question responses, weekly summaries)

**Key Characteristics:**
- **29 columns** covering content, emotion, sentiment, categorization, and temporal tracking
- **4 required fields:** `id`, `user_id`, `entry_type`, `week_number`, `year`
- **2 unique constraints:** Primary key `id` and composite `(user_id, created_at)`
- **4 foreign keys:** References to `auth.users`, `daily_questions`, `weekly_summaries`

### Column Breakdown

#### Core Identification
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

#### Content Storage
```sql
content TEXT                                -- Text or audio transcription
audio_url TEXT                              -- Supabase Storage URL
audio_duration_seconds INT                  -- Duration in seconds
audio_transcribed_at TIMESTAMPTZ            -- When transcription completed
```

#### Entry Type & Context
```sql
entry_type VARCHAR(50) NOT NULL             -- 'moment', 'reflection', 'question_answer', 'weekly_summary'
source TEXT CHECK (source IN ('manual', 'voice', 'imported'))
question_id UUID REFERENCES daily_questions(id) ON DELETE SET NULL
question_text TEXT                          -- Denormalized reference
weekly_summary_id UUID REFERENCES weekly_summaries(id) ON DELETE SET NULL
```

#### Emotion & Sentiment
```sql
emotion_selected TEXT                       -- User-selected mood
emotion_intensity INT CHECK (0-10)          -- 1-10 scale
emotion_categories TEXT[]                   -- Multiple: ['anger', 'sadness', ...]
sentiment_score FLOAT CHECK (-1 to 1)       -- AI-generated (-1=very negative, 1=very positive)
sentiment_label VARCHAR(20)                 -- 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
sentiment_generated_at TIMESTAMPTZ          -- When AI analysis occurred
```

#### Categorization
```sql
tags TEXT[]                                 -- User/AI tags: #health #work
life_areas TEXT[]                           -- ['health', 'finance', 'relationships', ...]
is_shared_with_associations UUID[]          -- Which associations can view
```

#### Location & Context
```sql
location TEXT                               -- Optional: where this happened
weather_notes TEXT                          -- Optional: weather context
people_involved TEXT[]                      -- Optional: who was involved
```

#### Week Tracking
```sql
week_number INT NOT NULL                    -- ISO week (1-53)
year INT NOT NULL                           -- Calendar year
day_of_week INT                             -- 0-6 (0=Sunday)
```

#### Timestamps
```sql
created_at TIMESTAMPTZ DEFAULT NOW()        -- When entry was created
updated_at TIMESTAMPTZ DEFAULT NOW()        -- Auto-updated on changes
happened_at TIMESTAMPTZ                     -- When event occurred (optional)
```

---

## Indexes (10 Total)

All indexes created for optimal query performance:

| Index | Type | Purpose |
|-------|------|---------|
| `idx_moment_entries_user_id` | BTREE | User filtering (most common) |
| `idx_moment_entries_created_at` | BTREE DESC | Time-based sorting |
| `idx_moment_entries_week` | BTREE (user_id, week_number, year) | Weekly aggregation |
| `idx_moment_entries_type` | BTREE (user_id, entry_type) | Type-based filtering |
| `idx_moment_entries_emotion` | BTREE | Emotion analysis |
| `idx_moment_entries_tags` | GIN | Array tag searching |
| `idx_moment_entries_life_areas` | GIN | Array life_areas filtering |
| `idx_moment_entries_sentiment` | BTREE DESC | Sentiment sorting |
| `idx_moment_entries_question_id` | BTREE (partial) | Question response tracking |
| `idx_moment_entries_weekly_summary_id` | BTREE (partial) | Weekly summary linking |

---

## Row-Level Security (RLS)

**Status:** ENABLED on `moment_entries` table

### Policies (4 Total - Complete CRUD Coverage)

1. **SELECT Policy:** `Users can view own entries`
   - Condition: `auth.uid() = user_id`
   - Effect: Each user sees only their own moment entries

2. **INSERT Policy:** `Users can insert own entries`
   - Condition: `auth.uid() = user_id` (WITH CHECK)
   - Effect: Users can only create entries for themselves

3. **UPDATE Policy:** `Users can update own entries`
   - Conditions: USING `auth.uid() = user_id`, WITH CHECK `auth.uid() = user_id`
   - Effect: Users can only modify their own entries

4. **DELETE Policy:** `Users can delete own entries`
   - Condition: `auth.uid() = user_id`
   - Effect: Users can only delete their own entries

**Security Model:** Per-user isolation - no cross-user data access possible

---

## Triggers & Functions

### Auto-Update Timestamp Trigger

**Function:** `update_moment_entries_updated_at()`
```sql
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger:** `update_moment_entries_updated_at_trigger`
- **Event:** BEFORE UPDATE ON `moment_entries`
- **Effect:** Automatically updates `updated_at` column with current timestamp

---

## Backward Compatibility Views

### moments_legacy View

**Purpose:** Allow existing code referencing old `moments` table to continue working

**Schema Mapping:**
```sql
SELECT
  id,
  user_id,
  content,
  audio_url,
  emotion_selected as emotion,
  jsonb_build_object('score', sentiment_score, 'label', sentiment_label) as sentiment_data,
  tags,
  location,
  created_at,
  updated_at
FROM moment_entries
WHERE entry_type = 'moment' AND sentiment_score IS NOT NULL;
```

**Scope:** Only returns entries of type 'moment' with sentiment analysis

### journey_moments_legacy View

**Purpose:** Allow existing code referencing `journey_moments` to continue working

**Schema Mapping:**
```sql
SELECT
  id,
  user_id,
  content,
  emotion_selected as mood,
  entry_type as type,
  question_id,
  week_number,
  created_at
FROM moment_entries
WHERE entry_type IN ('moment', 'question_answer', 'reflection');
```

**Scope:** Returns entries of types 'moment', 'question_answer', 'reflection'

---

## Verification Checklist

### Table Creation
- [x] Table `moment_entries` exists with 29 columns
- [x] All columns have correct data types and constraints
- [x] Primary key defined: `id UUID`
- [x] Foreign keys properly configured
- [x] Unique constraint on `(user_id, created_at)`

### Indexes
- [x] 10 indexes created (1 primary key + 9 supporting)
- [x] Composite indexes for week aggregation
- [x] GIN indexes for array columns (tags, life_areas)
- [x] Partial indexes for optional references

### Row-Level Security
- [x] RLS enabled on table
- [x] 4 policies created (SELECT, INSERT, UPDATE, DELETE)
- [x] All policies use `auth.uid()` for user isolation
- [x] No direct table references in RLS (prevents recursion)

### Triggers & Functions
- [x] Function `update_moment_entries_updated_at()` created
- [x] Trigger `update_moment_entries_updated_at_trigger` created
- [x] Trigger set to execute BEFORE UPDATE

### Views
- [x] View `moments_legacy` created
- [x] View `journey_moments_legacy` created
- [x] Views include appropriate WHERE conditions
- [x] Column mappings match legacy schemas

### Documentation
- [x] Comments added to table
- [x] Comments added to columns
- [x] Comments added to views
- [x] Migration includes verification queries

---

## TypeScript Types Generated

TypeScript types have been automatically generated by Supabase for the `moment_entries` table:

```typescript
moment_entries: {
  Row: {
    id: string
    user_id: string
    content: string | null
    audio_url: string | null
    audio_duration_seconds: number | null
    audio_transcribed_at: string | null
    entry_type: string
    source: string | null
    question_id: string | null
    question_text: string | null
    weekly_summary_id: string | null
    emotion_selected: string | null
    emotion_intensity: number | null
    emotion_categories: string[] | null
    sentiment_score: number | null
    sentiment_label: string | null
    sentiment_generated_at: string | null
    tags: string[] | null
    life_areas: string[] | null
    is_shared_with_associations: string[] | null
    location: string | null
    weather_notes: string | null
    people_involved: string[] | null
    week_number: number
    year: number
    day_of_week: number | null
    created_at: string | null
    updated_at: string | null
    happened_at: string | null
  }
  Insert: { /* same fields, most optional */ }
  Update: { /* same fields, all optional */ }
  Relationships: [
    { foreignKeyName: "moment_entries_question_id_fkey", ... },
    { foreignKeyName: "moment_entries_weekly_summary_id_fkey", ... }
  ]
}
```

---

## Common Query Patterns

### 1. Get User's Moments for a Specific Week
```typescript
const { data } = await supabase
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)
  .eq('week_number', weekNumber)
  .eq('year', year)
  .order('created_at', { ascending: false });
```
**Index Used:** `idx_moment_entries_week`

### 2. Filter by Emotion
```typescript
const { data } = await supabase
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)
  .eq('emotion_selected', 'happy')
  .order('created_at', { ascending: false });
```
**Index Used:** `idx_moment_entries_emotion`

### 3. Search by Tags
```typescript
const { data } = await supabase
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)
  .overlaps('tags', ['#health', '#work']);
```
**Index Used:** `idx_moment_entries_tags` (GIN)

### 4. Filter by Life Areas
```typescript
const { data } = await supabase
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)
  .contains('life_areas', ['health', 'relationships']);
```
**Index Used:** `idx_moment_entries_life_areas` (GIN)

### 5. Get High-Sentiment Entries
```typescript
const { data } = await supabase
  .from('moment_entries')
  .select('*')
  .eq('user_id', userId)
  .gt('sentiment_score', 0.7)
  .order('sentiment_score', { ascending: false });
```
**Index Used:** `idx_moment_entries_sentiment`

---

## Migration File Details

**Location:** `/supabase/migrations/20251211_consolidate_moment_tables.sql`
**Size:** ~600 lines
**Sections:**
1. Table creation (29 columns, constraints)
2. Index definitions (10 indexes)
3. RLS enablement (1 ALTER TABLE)
4. RLS policies (4 CREATE POLICY)
5. Function and trigger creation (1 function, 1 trigger)
6. Backward compatibility views (2 views)
7. Comments and documentation
8. Migration notes and verification queries

---

## Next Steps (Phase 1b)

### Data Migration
- Create migration: `20251211_migrate_moment_data.sql`
- Migrate `journey_moments` → `moment_entries`
- Migrate `moments` → `moment_entries`
- Create backup views for old tables
- Rename old tables to `*_deprecated`

### Frontend Updates
- Update `journeyService.ts` to use `moment_entries`
- Update all queries referencing old tables
- Test backward compatibility views
- Update TypeScript interfaces

### Timeline
- **Week 1:** Schema creation (COMPLETE) + data migration
- **Week 2-3:** Frontend code updates
- **Week 4:** Full onboarding testing
- **Week 5-6:** Monitoring and bug fixes
- **Week 7:** Remove backward compatibility views
- **Week 8:** Delete deprecated tables

---

## Key Features Enabled

### 1. Rich Entry Types
- `moment`: Freeform journal entry (with audio support)
- `reflection`: Guided reflection on a topic
- `question_answer`: Response to daily question
- `weekly_summary`: Reflection on the past week

### 2. Emotion Tracking
- User-selected emotion/mood
- Intensity scale (1-10)
- Multiple emotion categories (anger, sadness, joy, etc.)

### 3. AI-Generated Analysis
- Sentiment score (-1 to 1)
- Sentiment label (very_positive, positive, neutral, negative, very_negative)
- Timestamp of when analysis was performed

### 4. Life Areas Categorization
- Multi-select categorization
- Supports: health, finance, relationships, work, personal, spiritual, education, family, leisure
- Indexed for fast filtering

### 5. Audio Support
- Audio file URL storage
- Duration tracking (in seconds)
- Transcription timestamp tracking

### 6. Weekly Aggregation
- ISO week number tracking
- Year and day-of-week fields
- Optimized indexes for weekly queries

### 7. Sharing & Collaboration
- `is_shared_with_associations` array for multi-user visibility
- Can be extended to support group sharing

---

## Database Relationships

```
moment_entries
├── user_id → auth.users(id) [CASCADE DELETE]
├── question_id → daily_questions(id) [SET NULL]
└── weekly_summary_id → weekly_summaries(id) [SET NULL]
```

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `/supabase/migrations/20251211_consolidate_moment_tables.sql` | CREATED | Main migration file |
| `docs/PHASE_1_ONBOARDING_REDESIGN_MOMENT_ENTRIES_IMPLEMENTATION.md` | CREATED | This documentation |

---

## Success Metrics

- [x] Table created with all 29 columns
- [x] 10 performance indexes established
- [x] RLS policies securing all CRUD operations
- [x] Auto-update trigger functioning
- [x] Backward compatibility views in place
- [x] TypeScript types generated
- [x] Documentation complete
- [x] Ready for Phase 1b (data migration)

---

## References

- **Architecture:** `/docs/architecture/backend_architecture.md`
- **Database Schema:** `/docs/DATABASE_SCHEMA_NEW_TABLES.sql`
- **Journey Persistence:** `/docs/onboarding/PERSISTENCIA_DADOS_JOURNEY.md`
- **Migration Guide:** `/docs/MIGRATION_GUIDE_NEW_TABLES.md`

---

**Implementation by:** Backend Architect Agent (Aica Life OS)
**Implementation Date:** 2025-12-11
**Status:** READY FOR PHASE 1b
