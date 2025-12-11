# Moment Persistence Service - Examples & Usage Patterns

## Quick Start Examples

### 1. Simple Text Moment

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'

const result = await createMomentEntry({
  userId: 'user-123',
  content: 'Today I realized how much my family means to me.',
  emotionSelected: 'grateful',
  emotionIntensity: 9,
  lifeAreas: ['relationships', 'personal-growth'],
})

console.log('Moment saved!')
console.log(`Points awarded: +${result.pointsAwarded}`)
console.log(`Current streak: ${result.currentStreak} days`)
```

**Expected Output:**
```
Moment saved!
Points awarded: +12
Current streak: 5 days
```

---

### 2. Audio + Text Moment

```typescript
const audioBlob = await recordAudio() // From AudioRecorder component

const result = await createMomentEntry({
  userId: 'user-123',
  content: 'Writing about what I said...',
  audioFile: audioBlob,
  emotionSelected: 'thoughtful',
  emotionIntensity: 7,
  lifeAreas: ['personal-growth', 'work'],
})

// Audio will be:
// 1. Uploaded to Supabase Storage
// 2. Transcribed using Whisper API
// 3. Combined with your text
// 4. Analyzed for sentiment
```

---

### 3. Moment with Custom Tags

```typescript
const result = await createMomentEntry({
  userId: 'user-123',
  content: 'My team successfully delivered the project on time!',
  emotionSelected: 'excited',
  emotionIntensity: 10,
  lifeAreas: ['work'],
  tags: ['milestone', 'team-success', 'delivery'],
  momentType: 'breakthrough',
})

// Result includes:
// - AI-generated tags added to your custom tags
// - Confidence scores for each tag
// - Additional insights
```

---

### 4. Moment with Location & Date

```typescript
const result = await createMomentEntry({
  userId: 'user-123',
  content: 'Had lunch with an old friend in this beautiful coffee shop.',
  emotionSelected: 'happy',
  emotionIntensity: 8,
  lifeAreas: ['relationships'],
  location: 'Cafe Central, Sao Paulo',
  happened_at: new Date('2025-12-10'),
})

// Moment is timestamped with when it actually occurred
// Location data can be used for insights later
```

---

## React Component Examples

### Complete Moment Capture Form

```typescript
import React, { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
import { AVAILABLE_EMOTIONS, LIFE_AREAS_LABELS } from '@/modules/journey/types/moment'
import { validateMomentInput } from '@/utils/momentValidation'

export function MomentCaptureForm() {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)

  // Form state
  const [content, setContent] = useState('')
  const [emotion, setEmotion] = useState('calm')
  const [intensity, setIntensity] = useState(5)
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['personal-growth'])
  const [audioFile, setAudioFile] = useState<Blob | null>(null)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [momentType, setMomentType] = useState('reflection')

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Validate form on change
  const validateForm = () => {
    const input = {
      userId: user?.id,
      content: content.trim(),
      audioFile: audioFile,
      emotionSelected: emotion,
      emotionIntensity: intensity,
      lifeAreas: selectedAreas,
      tags: customTags,
      momentType: momentType,
    }

    const result = validateMomentInput(input)
    if (!result.valid) {
      setError(result.errors[0])
      return false
    }

    if (result.warnings.length > 0) {
      console.warn('Warnings:', result.warnings)
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('User not authenticated')
      return
    }

    // Validate
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create moment
      const result = await createMomentEntry({
        userId: user.id,
        content: content.trim() || undefined,
        audioFile: audioFile || undefined,
        emotionSelected: emotion,
        emotionIntensity: intensity,
        lifeAreas: selectedAreas as any,
        tags: customTags.length > 0 ? customTags : undefined,
        momentType: momentType as any,
      })

      // Show success
      setSuccess(
        `Moment saved! +${result.pointsAwarded} CP (Streak: ${result.currentStreak} days)`
      )

      // Reset form
      setContent('')
      setEmotion('calm')
      setIntensity(5)
      setSelectedAreas(['personal-growth'])
      setAudioFile(null)
      setCustomTags([])
      setMomentType('reflection')

      // Redirect or refresh list
      setTimeout(() => {
        window.location.href = '/journey'
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save moment'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const handleAudioRecorded = (blob: Blob) => {
    setAudioFile(blob)
  }

  return (
    <form onSubmit={handleSubmit} className="moment-capture-form">
      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Content Section */}
      <div className="form-section">
        <label>What's on your mind?</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share your thoughts, feelings, or insights..."
          maxLength={10000}
          rows={5}
        />
        <small>{content.length}/10000 characters</small>
      </div>

      {/* Emotion Section */}
      <div className="form-section">
        <label>How are you feeling?</label>
        <div className="emotion-wheel">
          {AVAILABLE_EMOTIONS.map(e => (
            <button
              key={e.value}
              type="button"
              className={`emotion-btn ${emotion === e.value ? 'active' : ''}`}
              onClick={() => setEmotion(e.value)}
              title={e.name}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Slider */}
      <div className="form-section">
        <label>Emotion Intensity</label>
        <div className="intensity-slider">
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={e => setIntensity(parseInt(e.target.value))}
          />
          <span className="intensity-value">{intensity}/10</span>
        </div>
      </div>

      {/* Life Areas */}
      <div className="form-section">
        <label>Which areas of your life does this relate to?</label>
        <div className="life-areas-grid">
          {Object.entries(LIFE_AREAS_LABELS).map(([area, label]) => (
            <label key={area} className="checkbox">
              <input
                type="checkbox"
                checked={selectedAreas.includes(area)}
                onChange={() => toggleArea(area)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Custom Tags */}
      <div className="form-section">
        <label>Add Tags (optional)</label>
        <div className="tag-input">
          <input
            type="text"
            placeholder="Type and press Enter"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const input = e.currentTarget
                const tag = input.value.trim()
                if (tag && customTags.length < 10) {
                  setCustomTags([...customTags, tag])
                  input.value = ''
                }
              }
            }}
          />
          <div className="tags-list">
            {customTags.map((tag, idx) => (
              <span key={idx} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => setCustomTags(customTags.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Audio Recording */}
      <div className="form-section">
        <label>Record Audio (optional)</label>
        {audioFile ? (
          <div className="audio-preview">
            <audio controls src={URL.createObjectURL(audioFile)} />
            <button
              type="button"
              onClick={() => setAudioFile(null)}
              className="btn-secondary"
            >
              Remove Audio
            </button>
          </div>
        ) : (
          <AudioRecorder onRecordingComplete={handleAudioRecorded} />
        )}
      </div>

      {/* Moment Type */}
      <div className="form-section">
        <label>Moment Type (optional)</label>
        <select value={momentType} onChange={e => setMomentType(e.target.value)}>
          <option value="reflection">Reflection</option>
          <option value="milestone">Milestone</option>
          <option value="challenge">Challenge</option>
          <option value="learning">Learning</option>
          <option value="breakthrough">Breakthrough</option>
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !selectedAreas.length}
        className="btn-primary"
      >
        {isLoading ? 'Saving...' : 'Save Moment'}
      </button>
    </form>
  )
}
```

---

## Hook Integration Example

### useMoments Hook Usage

```typescript
import { useMoments } from '@/modules/journey/hooks/useMoments'

export function MomentsList() {
  // Load moments with filters
  const {
    moments,
    isLoading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
    create,
    update,
    delete: deleteMoment,
  } = useMoments({
    filter: {
      emotions: ['grateful', 'happy'],
      lifeAreas: ['relationships'],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    },
    limit: 20,
    autoFetch: true,
  })

  return (
    <div>
      {isLoading && <p>Loading moments...</p>}
      {error && <p>Error: {error.message}</p>}

      <div className="moments-grid">
        {moments.map(moment => (
          <div key={moment.id} className="moment-card">
            <p className="emotion">{moment.emotion_selected}</p>
            <p className="content">{moment.content?.substring(0, 100)}...</p>
            <p className="sentiment">{moment.sentiment_label}</p>
            <p className="date">{new Date(moment.created_at).toLocaleDateString()}</p>

            <button
              onClick={() => deleteMoment(moment.id)}
              className="btn-small"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More
        </button>
      )}

      <p>Total: {totalCount} moments</p>
    </div>
  )
}
```

---

## Advanced Examples

### Batch Create Moments

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'

async function importMomentsFromJSON(jsonFile: File) {
  const text = await jsonFile.text()
  const data = JSON.parse(text)
  const moments = data.moments || []

  console.log(`Importing ${moments.length} moments...`)

  const results = []
  let successful = 0
  let failed = 0

  for (const momentData of moments) {
    try {
      const result = await createMomentEntry({
        userId: currentUserId,
        content: momentData.content,
        emotionSelected: momentData.emotion || 'neutral',
        emotionIntensity: momentData.intensity || 5,
        lifeAreas: momentData.lifeAreas || ['personal-growth'],
        tags: momentData.tags,
        happened_at: momentData.date ? new Date(momentData.date) : undefined,
      })

      successful += 1
      results.push({ status: 'success', momentId: result.momentId })

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      failed += 1
      results.push({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log(`Import complete: ${successful} succeeded, ${failed} failed`)
  return results
}
```

---

### Generate Insights from Moments

```typescript
import { getUserMoments } from '@/modules/journey/services/momentPersistenceService'
import { analyzeSentimentWithGemini } from '@/integrations/geminiSentimentAnalysis'

async function generateWeeklyInsights(userId: string) {
  // Get moments from last week
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)

  const { moments } = await getUserMoments(userId, {
    startDate,
    limit: 100,
  })

  if (moments.length === 0) {
    return { message: 'No moments this week' }
  }

  // Calculate statistics
  const sentiments = moments.map(m => m.sentiment_label)
  const sentimentCounts = sentiments.reduce((acc: any, s: any) => {
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const avgScore =
    moments.reduce((sum: number, m: any) => sum + (m.sentiment_score || 0), 0) /
    moments.length

  // Get top emotions
  const emotions = moments.map(m => m.emotion_selected)
  const emotionCounts = emotions.reduce((acc: any, e: any) => {
    acc[e] = (acc[e] || 0) + 1
    return acc
  }, {})

  const topEmotions = Object.entries(emotionCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion)

  // Get top life areas
  const areas: string[] = []
  moments.forEach((m: any) => {
    areas.push(...(m.life_areas || []))
  })

  const areaCounts = areas.reduce((acc: any, a: any) => {
    acc[a] = (acc[a] || 0) + 1
    return acc
  }, {})

  const topAreas = Object.entries(areaCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([area]) => area)

  return {
    weekStart: startDate.toISOString().split('T')[0],
    momentCount: moments.length,
    sentimentDistribution: sentimentCounts,
    averageSentiment: {
      score: avgScore,
      label: avgScore > 0.3 ? 'positive' : avgScore < -0.3 ? 'negative' : 'neutral',
    },
    topEmotions,
    topLifeAreas: topAreas,
    insights: {
      message: `This week you had ${moments.length} moments, mostly about ${topAreas.join(', ')}. Your overall sentiment is ${avgScore > 0.3 ? 'positive' : avgScore < -0.3 ? 'negative' : 'neutral'}.`,
    },
  }
}
```

---

### Export & Backup Moments

```typescript
import { getUserMoments, getUserStats } from '@/modules/journey/services/momentPersistenceService'

async function exportUserData(userId: string) {
  // Get all moments
  const { moments } = await getUserMoments(userId, { limit: 10000 })

  // Get stats
  const stats = await getUserStats(userId)

  // Create export object
  const exportData = {
    exportDate: new Date().toISOString(),
    user: { id: userId },
    stats,
    moments: moments.map(m => ({
      id: m.id,
      content: m.content,
      emotion: m.emotion_selected,
      intensity: m.emotion_intensity,
      sentiment: m.sentiment_label,
      lifeAreas: m.life_areas,
      tags: m.tags,
      createdAt: m.created_at,
    })),
  }

  // Create downloadable JSON file
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

  const exportFileDefaultName = `moment-export-${new Date().toISOString().split('T')[0]}.json`

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}
```

---

## Error Handling Examples

### Comprehensive Error Handling

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
import { validateMomentInput, getUserFriendlyErrorMessage } from '@/utils/momentValidation'

async function saveMomentWithErrorHandling(input: any) {
  // 1. Validate input first
  const validation = validateMomentInput(input)

  if (!validation.valid) {
    // Show validation errors
    validation.errors.forEach(error => {
      const friendlyMsg = getUserFriendlyErrorMessage(error)
      console.error(friendlyMsg)
      // Show to user in UI
    })
    return
  }

  // Show warnings if any
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      console.warn(warning)
    })
  }

  // 2. Try to create moment with error handling
  try {
    const result = await createMomentEntry(validation.validatedInput!)

    console.log('Success!')
    console.log(`Created moment: ${result.momentId}`)
    console.log(`Awarded: +${result.pointsAwarded} CP`)

    if (result.leveledUp) {
      console.log(`Level up! You are now level ${result.newLevel}`)
    }

    if (result.streakUpdated) {
      console.log(`Streak: ${result.currentStreak} days`)
    }

    return result
  } catch (error) {
    // 3. Handle different error types
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    if (errorMsg.includes('rate limit')) {
      console.error('You are creating moments too quickly. Wait a moment.')
    } else if (errorMsg.includes('Validation failed')) {
      console.error('Input validation failed. Please check your data.')
    } else if (errorMsg.includes('authentication')) {
      console.error('You are not logged in. Please log in and try again.')
    } else {
      console.error('An unexpected error occurred:', errorMsg)
    }

    // Could also log to error tracking service
    logErrorToService({
      operation: 'createMomentEntry',
      error: errorMsg,
      input: { ...input, audioFile: !!input.audioFile },
      timestamp: new Date().toISOString(),
    })

    return null
  }
}
```

---

## Performance Examples

### Optimize Large Lists

```typescript
import { getUserMoments } from '@/modules/journey/services/momentPersistenceService'

async function loadMomentsWithPagination(userId: string) {
  let offset = 0
  const limit = 50
  const allMoments = []

  while (true) {
    const { moments, hasMore } = await getUserMoments(userId, {
      limit,
      offset,
    })

    allMoments.push(...moments)

    if (!hasMore) break

    offset += limit

    // Add small delay to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return allMoments
}
```

---

## Testing Examples

### Jest Tests

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
import { validateMomentInput } from '@/utils/momentValidation'

describe('momentPersistenceService', () => {
  const testUserId = 'test-user-123'

  test('should create a simple text moment', async () => {
    const result = await createMomentEntry({
      userId: testUserId,
      content: 'This is a test moment',
      emotionSelected: 'happy',
      emotionIntensity: 7,
      lifeAreas: ['personal-growth'],
    })

    expect(result.momentId).toBeDefined()
    expect(result.pointsAwarded).toBeGreaterThan(0)
    expect(result.createdAt).toBeDefined()
  })

  test('should validate input correctly', () => {
    const input = {
      userId: testUserId,
      emotionSelected: 'invalid',
      emotionIntensity: 15, // Out of range
      lifeAreas: [],
    }

    const result = validateMomentInput(input)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

---

**For more information, see the full technical documentation in `MOMENT_PERSISTENCE_SERVICE.md`**
