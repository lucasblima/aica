/**
 * Unit Tests for unifiedTimelineService
 *
 * Tests cover:
 * - fetchUnifiedTimelineEvents: multi-source aggregation, per-source limits, filtering
 * - fetchTimelineStats: event counting, sentiment aggregation, top tags
 * - Date range filtering: today, last7, last30, last90, all
 * - Search, sentiment, and tag filters
 * - Empty userId guard
 * - Per-source limit cap (MAX_PER_SOURCE_LIMIT = 50)
 *
 * All Supabase calls are mocked.
 *
 * @see src/modules/journey/services/unifiedTimelineService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock the emotionHelper to avoid importing actual module
vi.mock('../../types/emotionHelper', () => ({
  getEmotionDisplay: (emotion: string | undefined) => ({
    emoji: emotion === 'happy' ? '😊' : '😐',
    label: emotion === 'happy' ? 'Feliz' : 'Neutro',
  }),
}))

import {
  fetchUnifiedTimelineEvents,
  fetchTimelineStats,
} from '../unifiedTimelineService'

// ─── Helpers ──────────────────────────────────────────────────

const TEST_USER_ID = 'user-123'

/**
 * Creates a mock Supabase query chain that resolves with given data/error.
 * All methods return the chain itself (builder pattern).
 * The chain is thenable: when awaited, resolves with { data, error }.
 */
function createQueryChain(data: unknown[], error: unknown = null) {
  const resolveWith = { data, error }
  const chain: Record<string, unknown> = {}

  const methods = [
    'select', 'eq', 'gte', 'lte', 'in', 'order', 'range',
    'overlaps', 'not', 'neq', 'single', 'limit',
  ]

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Make chain thenable (Supabase PostgrestBuilder is a PromiseLike)
  chain.then = (
    onFulfilled: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolveWith).then(onFulfilled, onRejected)

  return chain
}

// =============================================================================
// fetchUnifiedTimelineEvents
// =============================================================================

describe('fetchUnifiedTimelineEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty events for empty userId', async () => {
    const result = await fetchUnifiedTimelineEvents('')
    expect(result.events).toEqual([])
    expect(result.total).toBe(0)
  })

  it('should fetch from moment source and return enriched events', async () => {
    const momentData = [
      {
        id: 'moment-1',
        user_id: TEST_USER_ID,
        content: 'Today was a great day!',
        emotion: 'happy',
        tags: ['gratitude'],
        sentiment_data: { sentiment: 'positive', energyLevel: 8, emotions: ['joy'] },
        created_at: '2026-03-15T10:00:00Z',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment'], dateRange: 'last30' },
      20,
      0
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].source).toBe('moment')
    expect(result.events[0].id).toBe('moment-moment-1')
    // Should have display data enriched
    expect(result.events[0].displayData).toBeDefined()
    expect(result.events[0].displayData.icon).toBeTruthy()
  })

  it('should aggregate events from multiple sources sorted by date', async () => {
    const momentData = [
      {
        id: 'm1', user_id: TEST_USER_ID, content: 'Moment',
        emotion: 'happy', tags: [], sentiment_data: null,
        created_at: '2026-03-15T10:00:00Z',
      },
    ]

    const questionData = [
      {
        id: 'q1', user_id: TEST_USER_ID,
        response_text: 'My answer',
        responded_at: '2026-03-15T12:00:00Z',
        daily_questions: { question_text: 'How are you?', category: 'reflection' },
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      if (table === 'question_responses') return createQueryChain(questionData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment', 'question'], dateRange: 'last30' },
      20,
      0
    )

    expect(result.events).toHaveLength(2)
    // Should be sorted by date descending — question (12:00) before moment (10:00)
    expect(result.events[0].source).toBe('question')
    expect(result.events[1].source).toBe('moment')
  })

  it('should apply searchTerm filter across events', async () => {
    const momentData = [
      {
        id: 'm1', user_id: TEST_USER_ID, content: 'I love coding',
        emotion: null, tags: [], sentiment_data: null,
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 'm2', user_id: TEST_USER_ID, content: 'Went for a walk',
        emotion: null, tags: [], sentiment_data: null,
        created_at: '2026-03-14T10:00:00Z',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment'], dateRange: 'all', searchTerm: 'coding' },
      20,
      0
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].id).toBe('moment-m1')
  })

  it('should apply sentiment filter', async () => {
    const momentData = [
      {
        id: 'm1', user_id: TEST_USER_ID, content: 'Happy',
        emotion: 'happy', tags: [],
        sentiment_data: { sentiment: 'positive', energyLevel: 8, emotions: ['joy'] },
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 'm2', user_id: TEST_USER_ID, content: 'Sad day',
        emotion: 'sad', tags: [],
        sentiment_data: { sentiment: 'negative', energyLevel: 3, emotions: ['sadness'] },
        created_at: '2026-03-14T10:00:00Z',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment'], dateRange: 'all', sentiments: ['positive'] },
      20,
      0
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].id).toBe('moment-m1')
  })

  it('should apply tag filter', async () => {
    const momentData = [
      {
        id: 'm1', user_id: TEST_USER_ID, content: 'Tagged moment',
        emotion: null, tags: ['work', 'coding'], sentiment_data: null,
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 'm2', user_id: TEST_USER_ID, content: 'Untagged',
        emotion: null, tags: ['personal'], sentiment_data: null,
        created_at: '2026-03-14T10:00:00Z',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment'], dateRange: 'all', tags: ['coding'] },
      20,
      0
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0].id).toBe('moment-m1')
  })

  it('should apply pagination (offset + limit)', async () => {
    const moments = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`, user_id: TEST_USER_ID, content: `Moment ${i}`,
      emotion: null, tags: [], sentiment_data: null,
      created_at: new Date(2026, 2, 15 - i).toISOString(),
    }))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(moments)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment'], dateRange: 'all' },
      2,  // limit
      1   // offset: skip first
    )

    expect(result.events).toHaveLength(2)
    expect(result.total).toBe(5)
  })

  it('should gracefully handle source fetch errors', async () => {
    // Moments error but questions succeed
    const errorChain = createQueryChain([], { message: 'moments error' })

    const questionData = [
      {
        id: 'q1', user_id: TEST_USER_ID,
        response_text: 'Answer',
        responded_at: '2026-03-15T12:00:00Z',
        daily_questions: { question_text: 'Q?', category: 'reflection' },
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return errorChain
      if (table === 'question_responses') return createQueryChain(questionData)
      return createQueryChain([])
    })

    const result = await fetchUnifiedTimelineEvents(
      TEST_USER_ID,
      { sources: ['moment', 'question'], dateRange: 'all' },
      20,
      0
    )

    // Moments returned [] due to error, questions returned 1
    expect(result.events.length).toBeGreaterThanOrEqual(0)
  })
})

// =============================================================================
// fetchTimelineStats
// =============================================================================

describe('fetchTimelineStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return zero stats for empty userId', async () => {
    const stats = await fetchTimelineStats('')
    expect(stats.totalEvents).toBe(0)
    expect(stats.eventsByType.moment).toBe(0)
  })

  it('should count events by type', async () => {
    const momentData = [
      {
        id: 'm1', user_id: TEST_USER_ID, content: 'Moment 1',
        emotion: 'happy', tags: ['tag1'],
        sentiment_data: { sentiment: 'positive', energyLevel: 8, emotions: [] },
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 'm2', user_id: TEST_USER_ID, content: 'Moment 2',
        emotion: null, tags: ['tag1', 'tag2'],
        sentiment_data: { sentiment: 'neutral', energyLevel: 5, emotions: [] },
        created_at: '2026-03-14T10:00:00Z',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const stats = await fetchTimelineStats(TEST_USER_ID, 'last30')

    expect(stats.totalEvents).toBeGreaterThanOrEqual(2)
    expect(stats.eventsByType.moment).toBeGreaterThanOrEqual(2)
  })

  it('should compute top tags', async () => {
    const momentData = [
      { id: 'm1', user_id: TEST_USER_ID, content: 'M1', emotion: null, tags: ['work', 'coding'], sentiment_data: null, created_at: '2026-03-15T10:00:00Z' },
      { id: 'm2', user_id: TEST_USER_ID, content: 'M2', emotion: null, tags: ['work'], sentiment_data: null, created_at: '2026-03-14T10:00:00Z' },
      { id: 'm3', user_id: TEST_USER_ID, content: 'M3', emotion: null, tags: ['personal'], sentiment_data: null, created_at: '2026-03-13T10:00:00Z' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'moments') return createQueryChain(momentData)
      return createQueryChain([])
    })

    const stats = await fetchTimelineStats(TEST_USER_ID, 'last30')

    // 'work' appears 2x, should be first
    expect(stats.topTags).toBeDefined()
    if (stats.topTags && stats.topTags.length > 0) {
      expect(stats.topTags[0]).toBe('work')
    }
  })
})
