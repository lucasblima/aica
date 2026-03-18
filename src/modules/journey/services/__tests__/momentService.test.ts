/**
 * Unit Tests for momentService
 *
 * Tests cover:
 * - createMoment: CP award flow, rate limiting
 * - getMoments: filtering, pagination
 * - getMoment: single fetch, error handling
 * - updateMoment / deleteMoment: CRUD operations
 * - getMomentsCount: with filters
 * - reanalyzeMoments: Edge Function invocation
 *
 * All Supabase and Gemini calls are mocked.
 *
 * @see src/modules/journey/services/momentService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockFunctionsInvoke = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}))

vi.mock('@/lib/gemini', () => ({
  GeminiClient: {
    getInstance: () => ({
      call: vi.fn().mockResolvedValue({
        result: {
          tags: ['test'],
          mood: { emoji: '😊', label: 'Feliz', value: 'happy' },
          sentiment: 'positive',
          sentimentScore: 0.8,
          emotions: ['joy'],
          triggers: [],
          energyLevel: 7,
        },
      }),
    }),
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

vi.mock('@/services/aiUsageTrackingService', () => ({
  trackAIUsage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/audioService', () => ({
  transcribeAudio: vi.fn().mockResolvedValue('Transcribed audio text'),
}))

vi.mock('../qualityEvaluationService', () => ({
  evaluateAndCalculateCP: vi.fn().mockResolvedValue({
    cp_earned: 10,
    quality_score: 0.7,
    assessment: {
      feedback_message: 'Bom momento!',
      feedback_tier: 'good',
    },
  }),
  updateAvgQualityScore: vi.fn(),
}))

vi.mock('../cpAwardLock', () => ({
  serializedCPAward: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

// Import AFTER mocks
import {
  createMoment,
  getMoments,
  getMoment,
  updateMoment,
  deleteMoment,
  getMomentsCount,
  reanalyzeMoments,
} from '../momentService'

// ─── Helpers ──────────────────────────────────────────────────

const TEST_USER_ID = 'user-123'
const TEST_MOMENT_ID = 'moment-456'

/**
 * Creates a fully-chainable Supabase mock.
 * Every method returns `this` (the chain) so any number of chained calls work.
 * The chain is also a thenable: when awaited, it resolves with {data, error}
 * or with {count, error} depending on what is passed.
 */
function createChain(resolveWith: Record<string, unknown>) {
  const chain: Record<string, unknown> = {}

  const methods = [
    'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'neq', 'gte', 'lte', 'in', 'overlaps',
    'order', 'range', 'limit', 'single',
  ]

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // When `single()` is called, resolve the promise
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolveWith)

  // Make chain thenable (for cases where result is awaited without .single())
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
    return Promise.resolve(resolveWith).then(onFulfilled, onRejected)
  }

  return chain
}

// =============================================================================
// createMoment
// =============================================================================

describe('createMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a moment and return CP data', async () => {
    const momentData = {
      id: TEST_MOMENT_ID,
      user_id: TEST_USER_ID,
      content: 'Test moment content',
      emotion: 'happy',
      created_at: new Date().toISOString(),
    }

    // The service calls:
    // 1. from('moments').insert(...).select().single() — insert
    // 2. from('moments').update(...).eq().eq() — background analysis update
    // 3. from('moments').update({quality_score}).eq().eq().then() — fire-and-forget
    const insertChain = createChain({ data: momentData, error: null })
    const updateChain = createChain({ data: null, error: null })

    let insertDone = false
    mockFrom.mockImplementation(() => {
      if (!insertDone) {
        insertDone = true
        return insertChain
      }
      return updateChain
    })

    mockRpc.mockImplementation((...args: unknown[]) => {
      const fnName = args[0] as string
      if (fnName === 'award_consciousness_points') {
        return Promise.resolve({
          data: { leveled_up: false, level: 2, level_name: 'Explorador' },
          error: null,
        })
      }
      if (fnName === 'update_consciousness_streak') {
        return Promise.resolve({ error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const result = await createMoment(TEST_USER_ID, {
      content: 'Test moment content',
      emotion: 'happy',
    })

    expect(result.id).toBe(TEST_MOMENT_ID)
    expect(result.cp_earned).toBe(10)
    expect(result.leveled_up).toBe(false)
    expect(result.quality_score).toBe(0.7)
  })

  it('should throw when Supabase insert fails', async () => {
    // Use a different userId to avoid rate limiter from previous test
    const errorUserId = 'user-error-test'
    const errorChain = createChain({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(errorChain)

    await expect(
      createMoment(errorUserId, { content: 'fail' })
    ).rejects.toMatchObject({ message: 'DB error' })
  })

  it('should throw rate limit error on rapid duplicate submissions', async () => {
    // Use a unique userId to avoid contamination from other tests
    const rateLimitUserId = 'user-rate-limit-test'
    const momentData = {
      id: 'moment-1',
      user_id: rateLimitUserId,
      content: 'First',
      created_at: new Date().toISOString(),
    }
    const insertChain = createChain({ data: momentData, error: null })
    const updateChain = createChain({ data: null, error: null })

    let firstInsert = false
    mockFrom.mockImplementation(() => {
      if (!firstInsert) {
        firstInsert = true
        return insertChain
      }
      return updateChain
    })

    mockRpc.mockResolvedValue({ data: { leveled_up: false, level: 1 }, error: null })

    // First call succeeds
    await createMoment(rateLimitUserId, { content: 'First' })

    // Immediate second call should be rate limited (within 1s)
    await expect(
      createMoment(rateLimitUserId, { content: 'Second' })
    ).rejects.toThrow('Rate limited')
  })
})

// =============================================================================
// getMoments
// =============================================================================

describe('getMoments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return moments for a user', async () => {
    const mockData = [
      { id: '1', user_id: TEST_USER_ID, content: 'Moment 1', created_at: '2026-03-01T00:00:00Z' },
      { id: '2', user_id: TEST_USER_ID, content: 'Moment 2', created_at: '2026-03-02T00:00:00Z' },
    ]

    // getMoments awaits the entire chain as a thenable
    const chain = createChain({ data: mockData, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getMoments(TEST_USER_ID)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
  })

  it('should apply date filters when provided', async () => {
    const chain = createChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const filter = {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
    }

    await getMoments(TEST_USER_ID, filter)
    expect(chain.gte).toHaveBeenCalled()
    expect(chain.lte).toHaveBeenCalled()
  })

  it('should throw on Supabase error', async () => {
    const chain = createChain({ data: null, error: { message: 'Query failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(getMoments(TEST_USER_ID)).rejects.toMatchObject({ message: 'Query failed' })
  })
})

// =============================================================================
// getMoment
// =============================================================================

describe('getMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a single moment', async () => {
    const momentData = { id: TEST_MOMENT_ID, user_id: TEST_USER_ID, content: 'Test' }
    const chain = createChain({ data: momentData, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getMoment(TEST_USER_ID, TEST_MOMENT_ID)
    expect(result).toEqual(momentData)
  })

  it('should return null on error', async () => {
    const chain = createChain({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)

    const result = await getMoment(TEST_USER_ID, 'nonexistent')
    expect(result).toBeNull()
  })
})

// =============================================================================
// updateMoment
// =============================================================================

describe('updateMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update and return the moment', async () => {
    const updated = { id: TEST_MOMENT_ID, user_id: TEST_USER_ID, content: 'Updated content' }
    const chain = createChain({ data: updated, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await updateMoment(TEST_USER_ID, TEST_MOMENT_ID, { content: 'Updated content' })
    expect(result.content).toBe('Updated content')
  })

  it('should throw on update error', async () => {
    const chain = createChain({ data: null, error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      updateMoment(TEST_USER_ID, TEST_MOMENT_ID, { content: 'fail' })
    ).rejects.toMatchObject({ message: 'Update failed' })
  })
})

// =============================================================================
// deleteMoment
// =============================================================================

describe('deleteMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete without throwing on success', async () => {
    // deleteMoment: from().delete().eq('id').eq('user_id') — awaited
    const chain = createChain({ error: null })
    mockFrom.mockReturnValue(chain)

    await expect(deleteMoment(TEST_USER_ID, TEST_MOMENT_ID)).resolves.toBeUndefined()
  })

  it('should throw on delete error', async () => {
    const chain = createChain({ error: { message: 'Delete failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      deleteMoment(TEST_USER_ID, TEST_MOMENT_ID)
    ).rejects.toMatchObject({ message: 'Delete failed' })
  })
})

// =============================================================================
// getMomentsCount
// =============================================================================

describe('getMomentsCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the count', async () => {
    // getMomentsCount: from().select('*', opts).eq().gte().lte().in().overlaps()
    // Final result: { count, error }
    const chain = createChain({ count: 42, error: null })
    mockFrom.mockReturnValue(chain)

    const count = await getMomentsCount(TEST_USER_ID)
    expect(count).toBe(42)
  })

  it('should return 0 on error', async () => {
    const chain = createChain({ count: null, error: { message: 'error' } })
    mockFrom.mockReturnValue(chain)

    const count = await getMomentsCount(TEST_USER_ID)
    expect(count).toBe(0)
  })

  it('should return 0 when count is null', async () => {
    const chain = createChain({ count: null, error: null })
    mockFrom.mockReturnValue(chain)

    const count = await getMomentsCount(TEST_USER_ID)
    expect(count).toBe(0)
  })
})

// =============================================================================
// reanalyzeMoments
// =============================================================================

describe('reanalyzeMoments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should invoke the Edge Function and return results', async () => {
    const responseData = {
      success: true,
      processed: 10,
      updated: 5,
      results: [{ id: '1', oldEmotion: null, newEmotion: 'happy', newMood: { emoji: '😊', label: 'Feliz' } }],
    }
    mockFunctionsInvoke.mockResolvedValue({ data: responseData, error: null })

    const result = await reanalyzeMoments(50)
    expect(result.processed).toBe(10)
    expect(result.updated).toBe(5)
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('reanalyze-moments', { body: { limit: 50 } })
  })

  it('should throw on Edge Function error', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Function error' } })

    await expect(reanalyzeMoments()).rejects.toMatchObject({ message: 'Function error' })
  })
})
