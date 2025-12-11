# Moment Persistence Service
## PHASE 3 Part 2 - Complete Implementation Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-11
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [API Reference](#api-reference)
5. [Integration Guides](#integration-guides)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Security](#security)
9. [Testing](#testing)
10. [Examples](#examples)

---

## Overview

The Moment Persistence Service is a comprehensive backend system that handles the complete lifecycle of user moments in Aica Life OS:

1. **Capture** - Text, audio, or both
2. **Validate** - Input validation with XSS prevention
3. **Process** - Audio transcription, sentiment analysis, auto-tagging
4. **Persist** - Database storage with RLS
5. **Reward** - Consciousness Points (CP) and streak management

### Key Features

- Complete input validation with security scanning
- Audio transcription using Whisper API
- Sentiment analysis with Gemini
- Intelligent auto-tagging with confidence scores
- CP awards with level-up tracking
- Streak management and bonuses
- Comprehensive error handling and fallbacks
- Analytics event logging
- Rate limiting
- Caching for performance

### Technology Stack

- **Frontend:** React + TypeScript
- **Backend:** Supabase PostgreSQL
- **AI/ML:**
  - Gemini API (sentiment, tagging, insights)
  - Whisper API (transcription)
- **Storage:** Supabase Storage (audio files)
- **Authentication:** Supabase Auth

---

## Architecture

### System Diagram

```
User Input (Text + Audio + Emotion)
           ↓
     Validation Layer
    (XSS Prevention)
           ↓
    ┌──────────────┬──────────────┐
    ↓              ↓              ↓
Audio Upload  Content Combine  Check Rate Limit
(Supabase)    (Text + Audio)    (Anti-Spam)
    ↓              ↓              ↓
    └──────────────┴──────────────┘
           ↓
    ┌──────────────┬──────────────┐
    ↓              ↓
Transcription    Sentiment Analysis
(Whisper API)    (Gemini API)
    ↓              ↓
    └──────────────┬──────────────┘
           ↓
    Auto-Tagging (Gemini)
    ├─ Tag generation
    ├─ Confidence scoring
    └─ Insights generation
           ↓
    Database Insert
    (moment_entries)
           ↓
    ┌──────────────┬──────────────┐
    ↓              ↓
Award CP        Update Streak
(SQL Function)  (SQL Function)
    ↓              ↓
    └──────────────┬──────────────┘
           ↓
Return Result + Analytics
```

### Data Flow

1. **Input Validation**
   - Check required fields
   - Validate emotion intensity (1-10)
   - Validate life areas
   - Ensure text or audio provided
   - Sanitize text for XSS

2. **Rate Limiting**
   - Check time since last moment (min 1s)
   - Prevent spam/abuse

3. **Audio Processing**
   - Upload to Supabase Storage
   - Transcribe with Whisper
   - Post-process transcription

4. **Content Analysis**
   - Combine text + transcription
   - Analyze sentiment with Gemini
   - Generate tags and insights
   - Calculate confidence scores

5. **Database Persistence**
   - Insert into `moment_entries`
   - RLS policies enforce user isolation
   - Trigger `updated_at` timestamp

6. **Gamification**
   - Award CP via `award_consciousness_points()`
   - Update streak via `update_moment_streak()`
   - Log to `consciousness_points_log`

---

## Core Components

### 1. momentPersistenceService.ts

**Location:** `src/modules/journey/services/momentPersistenceService.ts`

Main service orchestrating the moment creation process.

**Key Functions:**

```typescript
createMomentEntry(input: CreateMomentEntryInput): Promise<MomentEntryResult>
getMomentById(userId: string, momentId: string): Promise<Moment>
getUserMoments(userId: string, options: QueryOptions): Promise<{moments: [], total: number}>
updateMomentEntry(userId: string, momentId: string, updates: Partial<ProcessedMomentData>): Promise<Moment>
deleteMomentEntry(userId: string, momentId: string): Promise<void>
getUserStats(userId: string): Promise<UserConsciousnessStats>
```

**Responsibilities:**
- Coordinate all sub-services
- Handle transactions
- Error handling and logging
- Performance monitoring

### 2. momentValidation.ts

**Location:** `src/utils/momentValidation.ts`

Input validation and sanitization utility.

**Key Functions:**

```typescript
validateMomentInput(input: any): ValidationResult
sanitizeText(text: string): string
hasXSSPatterns(text: string): boolean
estimateBaseCP(input: CreateMomentEntryInput): number
checkRateLimit(lastMomentCreatedAt: Date): boolean
```

**Responsibilities:**
- Validate all input fields
- Prevent XSS attacks
- Estimate CP rewards
- Rate limiting checks

### 3. geminiSentimentAnalysis.ts

**Location:** `src/integrations/geminiSentimentAnalysis.ts`

Sentiment analysis using Google's Gemini API.

**Key Functions:**

```typescript
analyzeSentimentWithGemini(content: string): Promise<SentimentAnalysisResult>
generateSentimentInsights(content: string, sentiment: SentimentAnalysisResult): Promise<string>
detectEmotionalPatterns(sentimentHistory: SentimentAnalysisResult[]): Promise<PatternAnalysis>
getCachedOrAnalyzeSentiment(content: string, forceRefresh?: boolean): Promise<SentimentAnalysisResult>
```

**Responsibilities:**
- Analyze sentiment (-1 to 1 scale)
- Detect emotions and keywords
- Generate insights
- Cache results for performance

### 4. whisperTranscription.ts

**Location:** `src/integrations/whisperTranscription.ts`

Audio transcription using Whisper API.

**Key Functions:**

```typescript
transcribeAudioWithWhisper(audioFile: Blob, language?: string): Promise<TranscriptionResult>
detectAudioLanguage(audioFile: Blob): Promise<{language: string; confidence: number}>
validateAudioFile(audioFile: Blob): {valid: boolean; error?: string}
getAudioDuration(audioFile: Blob): Promise<number>
```

**Responsibilities:**
- Transcribe audio to text
- Detect language
- Validate audio format/size
- Post-process transcription

### 5. journeyAPI.ts

**Location:** `src/api/journeyAPI.ts`

REST API endpoints for moment management.

**Key Functions:**

```typescript
apiCreateMoment(input: CreateMomentEntryInput): Promise<MomentEntryResult>
apiGetMoments(options: QueryOptions): Promise<{moments: []; total: number}>
apiGetMoment(momentId: string): Promise<Moment>
apiUpdateMoment(momentId: string, updates): Promise<Moment>
apiDeleteMoment(momentId: string): Promise<void>
apiGetUserStats(): Promise<UserConsciousnessStats>
apiGetEmotionalInsights(days?: number): Promise<InsightsData>
apiSearchMoments(query: string): Promise<SearchResults>
```

**Responsibilities:**
- HTTP endpoint handling
- Request validation
- Response formatting
- Error responses

---

## API Reference

### Create Moment

**Function:** `createMomentEntry()`
**Method:** POST (via API)
**Auth:** Required

#### Request

```typescript
interface CreateMomentEntryInput {
  userId: string                    // Required: User ID from auth
  content?: string                  // Optional: Text content (max 10,000 chars)
  audioFile?: Blob                  // Optional: Audio file (max 25MB)
  emotionSelected: string           // Required: Emotion value
  emotionIntensity: number          // Required: 1-10 scale
  lifeAreas: LifeArea[]             // Required: At least one life area
  tags?: string[]                   // Optional: Custom tags (max 10)
  momentType?: MomentCategory       // Optional: Moment categorization
  happened_at?: Date                // Optional: When moment occurred
  location?: string                 // Optional: Location (max 200 chars)
}
```

#### Response

```typescript
interface MomentEntryResult {
  momentId: string                  // UUID of created moment
  pointsAwarded: number             // CP points earned
  leveledUp: boolean                // Did user level up?
  newLevel?: number                 // New level if leveled up
  streakUpdated: boolean            // Was streak updated?
  currentStreak: number             // Current consecutive days
  createdAt: Date                   // Creation timestamp
}
```

#### Example

```typescript
const result = await createMomentEntry({
  userId: 'user-123',
  content: 'Tive uma conversa importante com meu chefe sobre meu crescimento na empresa.',
  audioFile: audioBlob,
  emotionSelected: 'grateful',
  emotionIntensity: 8,
  lifeAreas: ['work', 'personal-growth'],
  tags: ['milestone', 'feedback'],
  momentType: 'breakthrough',
  happened_at: new Date('2025-12-11'),
});

// Result:
// {
//   momentId: 'moment-uuid-123',
//   pointsAwarded: 25,
//   leveledUp: true,
//   newLevel: 3,
//   streakUpdated: true,
//   currentStreak: 7,
//   createdAt: 2025-12-11T10:30:00Z
// }
```

### Get Moment

**Function:** `getMomentById()`

```typescript
const moment = await getMomentById(userId, momentId);

// Returns:
{
  id: "moment-uuid",
  user_id: "user-123",
  type: "both",
  content: "...",
  audio_url: "https://...",
  emotion_selected: "grateful",
  emotion_intensity: 8,
  sentiment_score: 0.75,
  sentiment_label: "very_positive",
  life_areas: ["work", "personal-growth"],
  tags: ["milestone", "feedback", "growth"],
  ai_generated_tags: ["career", "leadership"],
  ai_insights: "Você está reconhecendo oportunidades de crescimento...",
  created_at: "2025-12-11T10:30:00Z",
  updated_at: "2025-12-11T10:30:00Z"
}
```

### List Moments

**Function:** `getUserMoments()`

```typescript
const { moments, total, hasMore } = await getUserMoments(userId, {
  limit: 50,
  offset: 0,
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-31'),
  emotions: ['grateful', 'happy'],
  lifeAreas: ['work', 'relationships'],
  tags: ['milestone'],
});
```

### Update Moment

**Function:** `updateMomentEntry()`

```typescript
const updated = await updateMomentEntry(userId, momentId, {
  content: 'Updated content',
  tags: ['new-tag'],
  emotion_intensity: 9,
});
```

### Delete Moment

**Function:** `deleteMomentEntry()`

```typescript
await deleteMomentEntry(userId, momentId);
// Audio file is automatically deleted from storage
```

### Get User Stats

**Function:** `getUserStats()`

```typescript
const stats = await getUserStats(userId);

// Returns:
{
  user_id: "user-123",
  total_points: 245,
  level: 3,
  level_name: "Reflexivo",
  current_streak: 7,
  longest_streak: 12,
  total_moments: 42,
  total_questions_answered: 15,
  total_summaries_reflected: 3,
  updated_at: "2025-12-11T10:30:00Z"
}
```

---

## Integration Guides

### React Hook Integration

```typescript
import { useMoments } from '@/modules/journey/hooks/useMoments'

function MyComponent() {
  const { moments, create, isLoading, error } = useMoments({
    filter: { emotions: ['grateful'] },
    limit: 50,
    autoFetch: true,
  })

  const handleCreateMoment = async () => {
    try {
      const result = await create({
        userId: user.id,
        content: 'Meu texto',
        audioFile: audioBlob,
        emotionSelected: 'grateful',
        emotionIntensity: 8,
        lifeAreas: ['work'],
      })

      console.log('Moment created!', result.momentId)
      console.log('CP awarded:', result.pointsAwarded)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <div>
      {moments.map(moment => (
        <MomentCard key={moment.id} moment={moment} />
      ))}
      <button onClick={handleCreateMoment} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Moment'}
      </button>
    </div>
  )
}
```

### React Query Integration

```typescript
import { useMutation, useQuery } from '@tanstack/react-query'
import { createMomentEntry, getMomentById } from '@/modules/journey/services/momentPersistenceService'

// Create moment
const createMutation = useMutation({
  mutationFn: (input: CreateMomentEntryInput) => createMomentEntry(input),
  onSuccess: (data) => {
    console.log('Moment created:', data.momentId)
    // Invalidate moments list
    queryClient.invalidateQueries({ queryKey: ['moments'] })
  },
  onError: (error) => {
    console.error('Error:', error.message)
  },
})

// Get moments list
const { data: moments } = useQuery({
  queryKey: ['moments', { userId }],
  queryFn: () => getUserMoments(userId),
})

// Get single moment
const { data: moment } = useQuery({
  queryKey: ['moment', momentId],
  queryFn: () => getMomentById(userId, momentId),
})
```

### Form Integration

```typescript
import { useForm } from 'react-hook-form'
import { validateMomentInput } from '@/utils/momentValidation'

function MomentForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      emotionSelected: 'calm',
      emotionIntensity: 5,
      lifeAreas: [],
    },
  })

  const onSubmit = async (data: CreateMomentEntryInput) => {
    // Validate
    const validation = validateMomentInput(data)
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors)
      return
    }

    // Create moment
    try {
      const result = await createMomentEntry({
        ...data,
        userId: user.id,
        audioFile: recordedAudio,
      })
      console.log('Success:', result)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <textarea {...register('content')} placeholder="Your reflection" />
      <select {...register('emotionSelected')}>
        {AVAILABLE_EMOTIONS.map(e => (
          <option key={e.value} value={e.value}>{e.name}</option>
        ))}
      </select>
      <input type="range" min="1" max="10" {...register('emotionIntensity', { valueAsNumber: true })} />
      <button type="submit">Create Moment</button>
    </form>
  )
}
```

---

## Error Handling

### Validation Errors

```typescript
const result = validateMomentInput(input)

if (!result.valid) {
  result.errors.forEach(error => {
    console.error('Validation Error:', error)
    // Show user-friendly message
    const message = getUserFriendlyErrorMessage(error)
    notify.error(message)
  })
}

// User-friendly messages are automatically generated:
// 'emotionSelected is required' → 'Por favor, selecione uma emocao'
// 'emotionIntensity must be between 1 and 10' → 'A intensidade deve estar entre 1 e 10'
```

### Try-Catch Patterns

```typescript
try {
  const result = await createMomentEntry(input)
  console.log('Success:', result)
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Validation failed')) {
      // Handle validation error
      showValidationErrors(error.message)
    } else if (error.message.includes('rate limit')) {
      // Handle rate limiting
      showRateLimitMessage()
    } else {
      // Handle other errors
      showErrorNotification(error.message)
    }
  }
}
```

### Graceful Fallbacks

```typescript
// If transcription fails, continue with just text
try {
  audioTranscription = await transcribeAudioWithWhisper(audioFile)
} catch (err) {
  console.warn('Transcription failed, continuing without text')
  audioTranscription = undefined
}

// If sentiment analysis fails, use neutral
try {
  const sentiment = await analyzeSentimentWithGemini(content)
} catch (err) {
  console.warn('Sentiment analysis failed, using neutral')
  const sentiment = { score: 0, label: 'neutral' }
}

// If tagging fails, continue without tags
try {
  const tags = await generateAutoTags(content, lifeAreas)
} catch (err) {
  console.warn('Auto-tagging failed')
  const tags = []
}
```

---

## Performance Optimization

### Parallel Processing

```typescript
// Run sentiment analysis and tagging in parallel
const [sentimentResult, taggingResult] = await Promise.all([
  analyzeSentimentWithGemini(finalContent),
  generateAutoTags(finalContent, validatedInput.lifeAreas),
])

// Run CP award and streak update in parallel
const [cpResult, streakResult] = await Promise.all([
  awardConsciousnessPoints(userId, momentId, data),
  updateUserStreak(userId, momentId),
])
```

### Caching

```typescript
// Sentiment analysis is cached for 24 hours
const sentiment = await getCachedOrAnalyzeSentiment(content)

// Clear cache if needed
clearSentimentCache()

// Get cache statistics
const stats = getSentimentCacheStats()
console.log(`Cache size: ${stats.size} entries`)
```

### Batch Operations

```typescript
// Process multiple moments
const results = await Promise.all(
  momentInputs.map(input => createMomentEntry(input))
)

// Batch sentiment analysis with progress
const sentiments = await batchAnalyzeSentiments(texts, (completed, total) => {
  console.log(`Analyzed ${completed}/${total} texts`)
})
```

### Database Indexes

The following indexes exist for performance:

```sql
-- Indexed for quick user moment retrieval
CREATE INDEX idx_moment_entries_user_created ON moment_entries(user_id, created_at DESC)

-- Indexed for emotion filtering
CREATE INDEX idx_moment_entries_emotion ON moment_entries(user_id, emotion_selected)

-- Indexed for sentiment analysis
CREATE INDEX idx_moment_entries_sentiment ON moment_entries(user_id, sentiment_label)

-- Indexed for tag searches
CREATE INDEX idx_moment_entries_tags ON moment_entries(user_id, tags)

-- Indexed for life area filtering
CREATE INDEX idx_moment_entries_areas ON moment_entries(user_id, life_areas)
```

---

## Security

### Input Validation

```typescript
// All inputs are validated:
- emoji lengths checked
- XSS patterns detected
- SQL injection prevented via parameterized queries
- File size limits enforced
- Audio format validation

const validation = validateMomentInput(input)
if (hasXSSPatterns(input.content)) {
  throw new Error('Detected XSS pattern in content')
}
```

### Row-Level Security

```sql
-- RLS policy ensures users can only access their own moments
ALTER TABLE moment_entries ENABLE ROW LEVEL SECURITY

CREATE POLICY "Users can see their own moments"
  ON moment_entries FOR SELECT
  USING (auth.uid() = user_id)

CREATE POLICY "Users can insert their own moments"
  ON moment_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can update their own moments"
  ON moment_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can delete their own moments"
  ON moment_entries FOR DELETE
  USING (auth.uid() = user_id)
```

### Rate Limiting

```typescript
// Client-side rate limiting (min 1s between moments)
const rateLimitOk = await checkUserRateLimit(userId)
if (!rateLimitOk) {
  throw new Error('Too many requests. Wait before creating another moment.')
}

// Server-side rate limiting can be added via:
// - Supabase RLS with triggers
// - Edge Function rate limiting
// - Database function rate checking
```

### XSS Prevention

```typescript
// Text sanitization
const sanitized = sanitizeText(content)
// - Removes HTML tags
// - Removes null bytes
// - Normalizes whitespace

// XSS pattern detection
if (hasXSSPatterns(content)) {
  throw new Error('Detected malicious patterns')
}
```

---

## Testing

### Unit Tests

```typescript
import { validateMomentInput, sanitizeText, hasXSSPatterns } from '@/utils/momentValidation'

describe('momentValidation', () => {
  describe('validateMomentInput', () => {
    it('should validate correct input', () => {
      const input = {
        userId: 'user-123',
        emotionSelected: 'grateful',
        emotionIntensity: 8,
        lifeAreas: ['work'],
        content: 'Test content',
      }

      const result = validateMomentInput(input)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing required fields', () => {
      const input = {
        userId: 'user-123',
        // Missing emotionSelected
        emotionIntensity: 8,
        lifeAreas: ['work'],
        content: 'Test',
      }

      const result = validateMomentInput(input)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('emotionSelected is required')
    })
  })

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const text = 'Hello <script>alert("xss")</script> world'
      const sanitized = sanitizeText(text)
      expect(sanitized).not.toContain('<script>')
    })

    it('should detect XSS patterns', () => {
      const xssText = '<img src=x onerror=alert("xss")>'
      expect(hasXSSPatterns(xssText)).toBe(true)
    })
  })
})
```

### Integration Tests

```typescript
describe('momentPersistenceService', () => {
  describe('createMomentEntry', () => {
    it('should create moment and award CP', async () => {
      const input: CreateMomentEntryInput = {
        userId: testUserId,
        content: 'Test moment',
        emotionSelected: 'grateful',
        emotionIntensity: 8,
        lifeAreas: ['work'],
      }

      const result = await createMomentEntry(input)

      expect(result.momentId).toBeDefined()
      expect(result.pointsAwarded).toBeGreaterThan(0)
      expect(result.createdAt).toBeDefined()

      // Verify moment was created
      const moment = await getMomentById(testUserId, result.momentId)
      expect(moment).toBeDefined()
      expect(moment.content).toBe('Test moment')
    })

    it('should handle transcription failure gracefully', async () => {
      const input: CreateMomentEntryInput = {
        userId: testUserId,
        audioFile: invalidAudioBlob,
        emotionSelected: 'happy',
        emotionIntensity: 5,
        lifeAreas: ['health'],
      }

      const result = await createMomentEntry(input)

      // Should still create moment even if transcription fails
      expect(result.momentId).toBeDefined()
      expect(result.pointsAwarded).toBeGreaterThan(0)
    })
  })
})
```

### Mock Data

```typescript
// Test fixtures
export const MOCK_MOMENT_INPUT: CreateMomentEntryInput = {
  userId: 'test-user-123',
  content: 'Tive uma conversa importante com meu mentor.',
  emotionSelected: 'grateful',
  emotionIntensity: 8,
  lifeAreas: ['personal-growth', 'relationships'],
  tags: ['learning', 'mentorship'],
  momentType: 'breakthrough',
  happened_at: new Date('2025-12-11'),
}

export const MOCK_AUDIO_BLOB = new Blob(
  [new Uint8Array([/* audio data */])],
  { type: 'audio/webm' }
)

export const MOCK_SENTIMENT_RESULT = {
  score: 0.75,
  label: 'very_positive' as const,
  confidence: 0.95,
  keywords: ['grateful', 'important', 'mentor'],
  generatedAt: new Date(),
}
```

---

## Examples

### Basic Usage

```typescript
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'

async function saveMoment() {
  try {
    const result = await createMomentEntry({
      userId: 'user-123',
      content: 'Tive um insight importante sobre meus padrões.',
      emotionSelected: 'inspired',
      emotionIntensity: 9,
      lifeAreas: ['personal-growth'],
    })

    console.log('Moment created:', result.momentId)
    console.log('CP awarded:', result.pointsAwarded)
    console.log('Level up:', result.leveledUp)
    console.log('Current streak:', result.currentStreak)
  } catch (error) {
    console.error('Failed to create moment:', error)
  }
}
```

### With Audio and Text

```typescript
async function saveMomentWithAudio(audioBlob: Blob) {
  const result = await createMomentEntry({
    userId: 'user-123',
    content: 'Gravei um reflexão sobre meu dia.',
    audioFile: audioBlob, // Will be transcribed
    emotionSelected: 'thoughtful',
    emotionIntensity: 6,
    lifeAreas: ['work', 'personal-growth'],
    momentType: 'reflection',
  })

  return result
}
```

### React Component Example

```typescript
import { useState } from 'react'
import { createMomentEntry } from '@/modules/journey/services/momentPersistenceService'
import { useAuth } from '@/hooks/useAuth'

export function MomentCapture() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [emotion, setEmotion] = useState('calm')
  const [intensity, setIntensity] = useState(5)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      const result = await createMomentEntry({
        userId: user.id,
        content,
        emotionSelected: emotion,
        emotionIntensity: intensity,
        lifeAreas: ['personal-growth'],
      })

      // Show success message
      console.log(`Moment saved! +${result.pointsAwarded} CP`)

      // Reset form
      setContent('')
      setEmotion('calm')
      setIntensity(5)
    } catch (error) {
      console.error('Error saving moment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
      />

      <select value={emotion} onChange={e => setEmotion(e.target.value)}>
        <option value="happy">Happy</option>
        <option value="calm">Calm</option>
        <option value="grateful">Grateful</option>
        {/* ... more emotions */}
      </select>

      <input
        type="range"
        min="1"
        max="10"
        value={intensity}
        onChange={e => setIntensity(parseInt(e.target.value))}
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Moment'}
      </button>
    </form>
  )
}
```

---

## Troubleshooting

### Issue: "Validation failed: emotionSelected is required"

**Solution:** Make sure you're passing the `emotionSelected` field with a valid emotion value:

```typescript
const validEmotions = ['happy', 'sad', 'grateful', 'calm', ...] // See AVAILABLE_EMOTIONS

const input = {
  // ... other fields
  emotionSelected: 'grateful', // Must match available emotions
}
```

### Issue: "audioFile must be less than 25MB"

**Solution:** Compress the audio before uploading or record in a compressed format:

```typescript
// Trim long audio
const trimmedAudio = await trimAudio(audioFile, 300) // Max 5 minutes

// Check size
if (audioFile.size > 25 * 1024 * 1024) {
  console.error('Audio file too large')
}
```

### Issue: Transcription returns empty text

**Solution:** Check audio quality and format:

```typescript
// Validate audio first
const validation = validateAudioFile(audioFile)
if (!validation.valid) {
  console.error(validation.error)
}

// Use supported formats: webm, mp3, wav, m4a
const supportedTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a']
if (!supportedTypes.includes(audioFile.type)) {
  console.error('Unsupported audio format')
}
```

### Issue: Rate limiting error

**Solution:** Wait before creating another moment:

```typescript
const canCreate = await checkUserRateLimit(userId)
if (!canCreate) {
  console.warn('Wait at least 1 second before creating another moment')
}
```

---

## Future Enhancements

1. **Multi-language Support**
   - Auto-detect language
   - Sentiment analysis in detected language
   - Tag generation in user's language

2. **Advanced Analytics**
   - Pattern recognition across moments
   - Predictive insights
   - Recommended actions based on patterns

3. **Integration with Other Services**
   - Calendar integration (remember when moments occurred)
   - Location-based insights
   - Connect with other life areas

4. **Media Support**
   - Image attachments
   - Video support
   - Sketch notes

5. **Collaborative Features**
   - Share moments with trusted friends
   - Get feedback on moments
   - Collaborative reflection

---

## Support

For issues or questions, please refer to:
- Architecture: `/docs/architecture/backend_architecture.md`
- Database Schema: `/docs/DATABASE_SCHEMA_NEW_TABLES.sql`
- Migration Guide: `/docs/MIGRATION_GUIDE_NEW_TABLES.md`

---

**Last Updated:** 2025-12-11
**Maintained By:** Backend Architect Agent
**Status:** Production Ready
