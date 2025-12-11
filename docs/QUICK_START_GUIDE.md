# Moment Persistence Service - Quick Start Guide

## 5-Minute Setup

### Step 1: Import the Service

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
```

### Step 2: Create a Moment (Simplest Case)

```typescript
const result = await createMomentEntry({
  userId: 'your-user-id',
  content: 'Your reflection text here',
  emotionSelected: 'grateful',  // See AVAILABLE_EMOTIONS
  emotionIntensity: 5,           // 1-10
  lifeAreas: ['personal-growth'], // At least one required
})

// Result includes CP points awarded and streak info
console.log(`Moment created! +${result.pointsAwarded} CP`)
```

### Step 3: Use in React Component

```typescript
import { useState } from 'react'
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
import { useAuth } from '@/hooks/useAuth'

export function SimpleMomentCapture() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [emotion, setEmotion] = useState('calm')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const result = await createMomentEntry({
        userId: user.id,
        content: text,
        emotionSelected: emotion,
        emotionIntensity: 5,
        lifeAreas: ['personal-growth'],
      })

      console.log(`Saved! +${result.pointsAwarded} CP`)
      setText('')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What's on your mind?"
      />
      <select value={emotion} onChange={e => setEmotion(e.target.value)}>
        <option value="happy">Happy</option>
        <option value="calm">Calm</option>
        <option value="grateful">Grateful</option>
        <option value="thoughtful">Thoughtful</option>
      </select>
      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Moment'}
      </button>
    </div>
  )
}
```

---

## Common Use Cases

### 1. Text-Only Moment

```typescript
await createMomentEntry({
  userId: user.id,
  content: 'Today was a great day!',
  emotionSelected: 'happy',
  emotionIntensity: 8,
  lifeAreas: ['personal-growth'],
})
```

### 2. Audio + Text Moment

```typescript
const audioBlob = await recordAudio() // Get from your recorder

await createMomentEntry({
  userId: user.id,
  content: 'Also writing about this...',
  audioFile: audioBlob,
  emotionSelected: 'inspired',
  emotionIntensity: 9,
  lifeAreas: ['work', 'personal-growth'],
})
```

### 3. Moment with All Fields

```typescript
await createMomentEntry({
  userId: user.id,
  content: 'Had a breakthrough conversation',
  audioFile: audioBlob,
  emotionSelected: 'inspired',
  emotionIntensity: 9,
  lifeAreas: ['relationships', 'personal-growth'],
  tags: ['breakthrough', 'meaningful-conversation'],
  momentType: 'breakthrough',
  happened_at: new Date('2025-12-10'),
  location: 'Coffee shop',
})
```

### 4. List User Moments

```typescript
import { getUserMoments } from '@/modules/journey/services/momentPersistenceService'

const { moments, total, hasMore } = await getUserMoments(user.id, {
  limit: 50,
  offset: 0,
})

moments.forEach(moment => {
  console.log(`${moment.emotion_selected}: ${moment.content.substring(0, 50)}...`)
})
```

### 5. Get Single Moment

```typescript
import { getMomentById } from '@/modules/journey/services/momentPersistenceService'

const moment = await getMomentById(user.id, 'moment-id-123')
console.log(moment)
```

### 6. Update Moment

```typescript
import { updateMomentEntry } from '@/modules/journey/services/momentPersistenceService'

const updated = await updateMomentEntry(user.id, 'moment-id-123', {
  content: 'Updated text',
  tags: ['new-tag'],
})
```

### 7. Delete Moment

```typescript
import { deleteMomentEntry } from '@/modules/journey/services/momentPersistenceService'

await deleteMomentEntry(user.id, 'moment-id-123')
// Audio file is automatically deleted
```

### 8. Get User Stats

```typescript
import { getUserStats } from '@/modules/journey/services/momentPersistenceService'

const stats = await getUserStats(user.id)
console.log(`Level: ${stats.level_name}`)
console.log(`Points: ${stats.total_points}`)
console.log(`Streak: ${stats.current_streak} days`)
```

---

## Available Emotions

Use with `emotionSelected`:

```
happy, sad, anxious, angry, thoughtful, calm, grateful,
tired, inspired, neutral, excited, disappointed, frustrated,
loving, scared, determined, sleepy, overwhelmed, confident, confused
```

---

## Life Areas

Use with `lifeAreas` (at least one required):

```
health, relationships, work, finance, personal-growth,
spirituality, creativity, learning
```

---

## Moment Types

Use with `momentType` (optional):

```
reflection, milestone, challenge, learning, breakthrough
```

---

## Input Validation

The service automatically validates all inputs. Validation errors are descriptive:

```typescript
import { validateMomentInput } from '@/utils/momentValidation'

const result = validateMomentInput(input)

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(error)
    // Show error to user
  })
}
```

User-friendly error messages are auto-generated:
- 'emotionSelected is required' → 'Por favor, selecione uma emocao'
- 'emotionIntensity must be between 1 and 10' → 'A intensidade deve estar entre 1 e 10'

---

## Error Handling

```typescript
try {
  const result = await createMomentEntry({
    userId: user.id,
    content: 'Moment text',
    emotionSelected: 'grateful',
    emotionIntensity: 8,
    lifeAreas: ['personal-growth'],
  })

  console.log('Success!', result)
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('rate limit')) {
      console.error('Too fast! Wait a second.')
    } else if (error.message.includes('Validation')) {
      console.error('Please check your input.')
    } else {
      console.error('Error:', error.message)
    }
  }
}
```

---

## What Happens Automatically

When you create a moment, the service automatically:

1. **Validates** all your input
2. **Uploads** audio to cloud storage (if provided)
3. **Transcribes** audio to text (if provided)
4. **Analyzes** sentiment of your text
5. **Generates** tags automatically
6. **Saves** to database with full metadata
7. **Awards** Consciousness Points
8. **Updates** your streak
9. **Logs** analytics events

All this happens in **3-15 seconds** (mostly AI processing).

---

## Getting Results Back

After creating a moment, you get:

```typescript
interface MomentEntryResult {
  momentId: string              // Unique ID of moment
  pointsAwarded: number         // How many CP you earned
  leveledUp: boolean            // Did you level up?
  newLevel?: number             // Your new level (if leveled up)
  streakUpdated: boolean        // Was your streak updated?
  currentStreak: number         // Your current streak (days)
  createdAt: Date               // When it was created
}
```

---

## React Hook

The easiest way to use in React:

```typescript
import { useMoments } from '@/modules/journey/hooks/useMoments'

function MyComponent() {
  const {
    moments,      // List of moments
    isLoading,    // Loading state
    error,        // Error if any
    totalCount,   // Total moments
    hasMore,      // More to load?
    create,       // Create function
    update,       // Update function
    delete,       // Delete function
    loadMore,     // Load more function
    refresh,      // Refresh list
  } = useMoments({
    limit: 50,
    autoFetch: true,
  })

  return (
    <div>
      {moments.map(m => <MomentCard key={m.id} moment={m} />)}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  )
}
```

---

## API Endpoints (REST)

If you prefer REST API instead of direct service calls:

```typescript
import * as journeyAPI from '@/api/journeyAPI'

// Create
const result = await journeyAPI.apiCreateMoment(input)

// Get one
const moment = await journeyAPI.apiGetMoment(momentId)

// List
const { moments, total } = await journeyAPI.apiGetMoments({
  limit: 50,
  emotions: ['grateful'],
})

// Update
const updated = await journeyAPI.apiUpdateMoment(momentId, updates)

// Delete
await journeyAPI.apiDeleteMoment(momentId)

// Stats
const stats = await journeyAPI.apiGetUserStats()

// Insights
const insights = await journeyAPI.apiGetEmotionalInsights(30)
```

---

## Common Gotchas

### 1. Missing User ID

```typescript
// WRONG - Will fail
await createMomentEntry({
  content: 'Text',
  // ... missing userId
})

// RIGHT
await createMomentEntry({
  userId: user.id,
  content: 'Text',
  // ...
})
```

### 2. Invalid Emotion

```typescript
// WRONG - Not a valid emotion
await createMomentEntry({
  emotionSelected: 'awesome', // Not in AVAILABLE_EMOTIONS
  // ...
})

// RIGHT
import { AVAILABLE_EMOTIONS } from '@/modules/journey/types/moment'

const validEmotions = AVAILABLE_EMOTIONS.map(e => e.value)
// Use one of: happy, sad, grateful, etc.
```

### 3. No Life Areas

```typescript
// WRONG - At least one required
await createMomentEntry({
  lifeAreas: [],
  // ...
})

// RIGHT
await createMomentEntry({
  lifeAreas: ['personal-growth'], // At least one
  // ...
})
```

### 4. Emotion Intensity Out of Range

```typescript
// WRONG
await createMomentEntry({
  emotionIntensity: 15, // Should be 1-10
  // ...
})

// RIGHT
await createMomentEntry({
  emotionIntensity: 8, // Between 1 and 10
  // ...
})
```

### 5. No Content At All

```typescript
// WRONG - Need text or audio
await createMomentEntry({
  emotionSelected: 'happy',
  emotionIntensity: 5,
  lifeAreas: ['personal-growth'],
  // No content or audioFile
})

// RIGHT
await createMomentEntry({
  content: 'My reflection',  // Or audioFile, or both
  emotionSelected: 'happy',
  emotionIntensity: 5,
  lifeAreas: ['personal-growth'],
})
```

---

## Performance Tips

1. **Use hooks** - Automatically handles state and updates
2. **Enable caching** - Sentiment results cached for 24h
3. **Batch operations** - Process multiple moments together
4. **Limit queries** - Use filters to reduce data transfer
5. **Pagination** - Load 50 at a time, use `loadMore()`

```typescript
// GOOD - Uses pagination
const { moments, hasMore, loadMore } = useMoments({
  limit: 50,
  autoFetch: true,
})

// LESS GOOD - Loads everything at once
const { moments: allMoments } = useMoments({
  limit: 10000, // Too much!
})
```

---

## Need Help?

1. **Check Examples:** `docs/MOMENT_SERVICE_EXAMPLES.md`
2. **Full Documentation:** `docs/MOMENT_PERSISTENCE_SERVICE.md`
3. **Type Definitions:** `src/modules/journey/types/persistenceTypes.ts`
4. **Source Code:** `src/modules/journey/services/momentPersistenceService.ts`

---

## Next Steps

1. Copy a simple example above
2. Adapt to your component
3. Test with a real moment
4. Check the console for logs
5. Look at `docs/MOMENT_SERVICE_EXAMPLES.md` for more complex examples

---

**Happy moment capturing! 🌱**

For production deployment, also review:
- `MOMENT_PERSISTENCE_SERVICE.md` - Full technical docs
- `MOMENT_SERVICE_FEATURE_CHECKLIST.md` - What's included
- `PHASE3_PART2_IMPLEMENTATION_SUMMARY.md` - What was built
