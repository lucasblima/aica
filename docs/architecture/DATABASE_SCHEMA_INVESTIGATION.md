# Database Schema Investigation Report

**Date:** 2025-12-21
**Purpose:** Investigate `podcast_topics` table structure to resolve HTTP 400 errors
**Status:** ✅ COMPLETE

---

## Executive Summary

**Root Cause Confirmed:** Topic ID and Category ID are both **UUID columns**, but frontend code generates string IDs instead.

**Critical Findings:**
1. `podcast_topics.id` is **UUID type** - rejects `topic_${Date.now()}` format
2. `podcast_topics.category_id` is **UUID type** - rejects string category names
3. `podcast_topic_categories` table exists with UUID records per episode
4. Old `category` TEXT column still exists and is populated in legacy data

---

## Table Structure: `podcast_topics`

### Column Details (from OpenAPI schema)

| Column Name | Data Type | Nullable | Current Usage | Notes |
|-------------|-----------|----------|---------------|-------|
| `id` | UUID (string format) | NO | ✓ Active | **PRIMARY KEY** - Requires proper UUID |
| `episode_id` | UUID (string format) | NO | ✓ Active | Foreign key to `podcast_episodes` |
| `category` | TEXT (string) | YES | ⚠️ Legacy | **OLD FIELD** - Contains 'geral', 'quebra-gelo', etc. |
| `category_id` | UUID (string format) | YES | ❌ Unused | **NEW FIELD** - FK to `podcast_topic_categories.id` |
| `question_text` | TEXT (string) | NO | ✓ Active | Topic/question content |
| `completed` | BOOLEAN | NO | ✓ Active | Completion status |
| `order` | INTEGER | NO | ✓ Active | Display order |
| `archived` | BOOLEAN | NO | ✓ Active | Soft delete flag |
| `sponsor_script` | TEXT (string) | YES | ✓ Active | Sponsor read script for teleprompter |
| `is_sponsor_topic` | BOOLEAN | NO | ✓ Active | Flags sponsor topics |
| `created_at` | TIMESTAMPTZ (string) | NO | ✓ Active | Creation timestamp |

---

## Table Structure: `podcast_topic_categories`

### Sample Data (9 records found)

```
┌─────────┬────────────────────────────────────────┬────────────────────────────────────────┬────────────────┬───────────┐
│ (index) │ id (UUID)                              │ episode_id (UUID)                      │ name           │ color     │
├─────────┼────────────────────────────────────────┼────────────────────────────────────────┼────────────────┼───────────┤
│ 0       │ '4395ed67-b9be-4946-8c45-7138799b4e75' │ 'e5baf20e-474a-44bb-b440-f45d38bfefdd' │ 'Quebra-Gelo'  │ '#06B6D4' │
│ 1       │ '53ad9d02-1e1a-4036-a71d-70ec2f7da72f' │ 'e5baf20e-474a-44bb-b440-f45d38bfefdd' │ 'Geral'        │ '#3B82F6' │
│ 2       │ '7320065f-0538-4e2a-b67d-5a16f477d6ba' │ 'e5baf20e-474a-44bb-b440-f45d38bfefdd' │ 'Patrocinador' │ '#F59E0B' │
│ 3       │ '2c057195-3152-4867-9a89-4169dcd201ea' │ 'e6ed7b69-7b68-4d06-b63c-0eb1fd078c86' │ 'Quebra-Gelo'  │ '#06B6D4' │
│ 4       │ '9812e2d5-3987-4320-9f31-054a100717bb' │ 'e6ed7b69-7b68-4d06-b63c-0eb1fd078c86' │ 'Geral'        │ '#3B82F6' │
│ 5       │ '253421b3-6260-448e-bf2f-028d8ca9e25e' │ 'e6ed7b69-7b68-4d06-b63c-0eb1fd078c86' │ 'Patrocinador' │ '#F59E0B' │
└─────────┴────────────────────────────────────────┴────────────────────────────────────────┴────────────────┴───────────┘
```

**Key Insights:**
- Categories are **per-episode** (each episode has its own category set with unique UUIDs)
- Standard categories: "Quebra-Gelo", "Geral", "Patrocinador"
- Names are **capitalized** (not lowercase like frontend uses)
- Each category belongs to a specific episode (`episode_id` foreign key)

---

## Current Frontend-Backend Mismatch

### Frontend Code (`PautaStage.tsx:284`)

```typescript
const newTopic: Topic = {
  id: `topic_${Date.now()}`,        // ❌ String: "topic_1734567890123"
  text: newTopicText.trim(),
  completed: false,
  order: pauta.topics.filter(t => t.categoryId === selectedCategory).length,
  archived: false,
  categoryId: selectedCategory       // ❌ String: 'geral' or 'quebra-gelo'
};
```

### Auto-Save Code (`useAutoSave.ts:151-166`)

```typescript
const topicsToInsert = currentState.pauta.topics.map((topic, index) => ({
  id: topic.id,                      // ❌ Tries to insert "topic_1734567890123"
  episode_id: currentState.episodeId,
  category_id: topic.categoryId || null,  // ❌ Tries to insert 'geral' or null
  question_text: topic.text,
  completed: topic.completed,
  order: index,
  archived: topic.archived || false,
  sponsor_script: topic.sponsorScript || null,
}));

const { error: insertError } = await supabase
  .from('podcast_topics')
  .insert(topicsToInsert);  // 💥 FAILS with HTTP 400
```

### Database Rejection

**Error from PostgreSQL:**
```
ERROR: invalid input syntax for type uuid: "topic_1734567890123"
CODE: 22P02
STATUS: 400
```

**Second Error (when testing category_id):**
```
ERROR: invalid input syntax for type uuid: "geral"
CODE: 22P02
STATUS: 400
```

---

## Why Existing Data Works

**Sample Topic from Database:**
```json
{
  "id": "96180576-3ca5-4b02-b9f6-4943ef8780fc",  // ✅ Proper UUID
  "episode_id": "e6ed7b69-7b68-4d06-b63c-0eb1fd078c86",
  "category": "geral",                            // ✅ OLD field (TEXT type)
  "category_id": null,                            // ⚠️ NEW field (unused)
  "question_text": "Os desafios da gestão...",
  "completed": false,
  "order": 0,
  "created_at": "2025-12-09T17:49:12.051353+00:00"
}
```

**Analysis:**
- Existing topics use **proper UUIDs** for `id`
- Existing topics use **old `category` TEXT field** with lowercase strings
- `category_id` field exists but is **null** (unused)
- This suggests a **partial migration** - column added but not fully implemented

---

## Fix Options

### Option A: Revert to Old Schema (Quick Fix) ⚡

**Approach:** Use the old `category` TEXT field instead of `category_id` UUID field.

**Changes Required:**
1. Fix topic ID generation (required regardless)
2. Change auto-save to use `category` instead of `category_id`

**Code Changes:**

```typescript
// File: src/modules/studio/components/workspace/PautaStage.tsx:284
const newTopic: Topic = {
  id: crypto.randomUUID(),  // ✅ FIX: Use proper UUID
  // ... rest unchanged
};
```

```typescript
// File: src/modules/studio/hooks/useAutoSave.ts:151-166
const topicsToInsert = currentState.pauta.topics.map((topic, index) => ({
  id: topic.id,
  episode_id: currentState.episodeId,
  category: topic.categoryId || null,  // ✅ FIX: Use 'category' (TEXT) instead
  // Remove category_id line entirely
  question_text: topic.text,
  completed: topic.completed,
  order: index,
  archived: topic.archived || false,
  sponsor_script: topic.sponsorScript || null,
}));
```

**Pros:**
- ✅ Minimal code changes (2 files)
- ✅ No database migration needed
- ✅ Works with existing data immediately
- ✅ Can deploy today

**Cons:**
- ⚠️ Uses deprecated field (not following normalized DB design)
- ⚠️ May need migration later when `category` field is removed

---

### Option B: Complete UUID Migration (Proper Fix) 🏗️

**Approach:** Fully migrate to UUID-based category references.

**Changes Required:**
1. Fix topic ID generation (required)
2. Load categories from `podcast_topic_categories` on episode load
3. Map frontend category strings to category UUIDs
4. Save category UUIDs in `category_id` field

**Implementation Steps:**

**Step 1: Fix Topic ID**
```typescript
// File: src/modules/studio/components/workspace/PautaStage.tsx:284
const newTopic: Topic = {
  id: crypto.randomUUID(),  // ✅ FIX
  categoryId: selectedCategory  // Will be UUID after Step 2
};
```

**Step 2: Load Categories on Episode Load**
```typescript
// File: src/modules/studio/context/PodcastWorkspaceContext.tsx (or new hook)

async function loadEpisodeCategories(episodeId: string) {
  const { data, error } = await supabase
    .from('podcast_topic_categories')
    .select('*')
    .eq('episode_id', episodeId);

  if (error) throw error;

  // Create lookup map: name → UUID
  const categoryMap = {
    'geral': data.find(c => c.name === 'Geral')?.id,
    'quebra-gelo': data.find(c => c.name === 'Quebra-Gelo')?.id,
    'patrocinador': data.find(c => c.name === 'Patrocinador')?.id,
    'polêmicas': data.find(c => c.name === 'Polêmicas')?.id,
  };

  return { categories: data, categoryMap };
}
```

**Step 3: Create Categories if Missing**
```typescript
// When creating new episode, seed categories
const DEFAULT_CATEGORIES = [
  { name: 'Quebra-Gelo', color: '#06B6D4', icon: '❄️' },
  { name: 'Geral', color: '#3B82F6', icon: '🎙️' },
  { name: 'Patrocinador', color: '#F59E0B', icon: '🎁' },
  { name: 'Polêmicas', color: '#EF4444', icon: '⚠️' },
];

async function seedCategories(episodeId: string) {
  const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
    id: crypto.randomUUID(),
    episode_id: episodeId,
    ...cat,
  }));

  const { error } = await supabase
    .from('podcast_topic_categories')
    .insert(categoriesToInsert);

  if (error) throw error;
}
```

**Step 4: Update PautaStage to Use UUIDs**
```typescript
// File: src/modules/studio/components/workspace/PautaStage.tsx

// Get categoryMap from context
const { categoryMap } = usePodcastWorkspace();

const handleAddTopic = () => {
  const newTopic: Topic = {
    id: crypto.randomUUID(),
    text: newTopicText.trim(),
    completed: false,
    order: pauta.topics.filter(t => t.categoryId === selectedCategory).length,
    archived: false,
    categoryId: categoryMap[selectedCategory]  // ✅ Use UUID from map
  };

  actions.addTopic(newTopic);
};
```

**Pros:**
- ✅ Follows normalized database design
- ✅ Supports per-episode custom categories in future
- ✅ Cleaner architecture

**Cons:**
- ⚠️ More complex implementation (4-5 files affected)
- ⚠️ Requires category loading logic
- ⚠️ Need to handle category creation for new episodes
- ⚠️ Existing data migration might be needed

---

## Recommended Fix Strategy

### Phase 1: Immediate Fix (Option A) - Deploy Today

**Priority:** 🔴 **CRITICAL BLOCKER**

1. Fix topic ID generation: `crypto.randomUUID()`
2. Change auto-save to use `category` (TEXT) field
3. Test and deploy

**Estimated Time:** 30 minutes
**Risk:** LOW

### Phase 2: Proper Migration (Option B) - Next Sprint

**Priority:** 🟡 **TECHNICAL DEBT**

1. Implement category loading
2. Add category seeding for new episodes
3. Migrate existing topics to use `category_id`
4. Deprecate `category` field
5. Test thoroughly

**Estimated Time:** 4-6 hours
**Risk:** MEDIUM

---

## Testing Verification

After implementing Option A (immediate fix):

```bash
# Test 1: Add topic in UI
# Test 2: Check Network tab - should see 200 OK (not 400)
# Test 3: Refresh page - topic should persist
# Test 4: Query database directly
echo "SELECT id, question_text, category FROM podcast_topics ORDER BY created_at DESC LIMIT 5;" | psql $DATABASE_URL
```

**Expected Output:**
```
id                                   | question_text              | category
-------------------------------------|----------------------------|----------
<UUID format>                        | Test topic                 | geral
96180576-3ca5-4b02-b9f6-4943ef8780fc | Os desafios da gestão...   | geral
```

---

## Conclusion

**Database Schema Analysis:** ✅ COMPLETE

**Confirmed Issues:**
1. ✅ `id` column is UUID type - rejects `topic_${Date.now()}`
2. ✅ `category_id` column is UUID type - rejects 'geral' strings
3. ✅ Old `category` TEXT field still works
4. ✅ `podcast_topic_categories` table exists with per-episode UUID records

**Recommended Path:**
1. **NOW:** Implement Option A (quick fix using `category` field)
2. **LATER:** Implement Option B (full UUID migration)

**Files to Modify (Option A):**
- `src/modules/studio/components/workspace/PautaStage.tsx:284`
- `src/modules/studio/hooks/useAutoSave.ts:151-166`

---

**Investigation Complete**
**Report Generated:** 2025-12-21
**Next Action:** Implement Option A fix
