/**
 * Unit Tests for interviewerService
 *
 * Tests cover:
 * - getInterviewSessions: fetching sessions
 * - getSessionQuestions: fetching questions by session
 * - getInterviewStats: RPC call, default stats
 * - submitInterviewResponse: Edge Function path, local fallback
 * - startSession: session creation with question lookup
 * - getCategoryCompletion: per-category stats, error re-throw
 *
 * All Supabase calls are mocked.
 *
 * @see src/modules/journey/services/interviewerService.ts
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

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('../../types/interviewer', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    INTERVIEW_CATEGORY_META: {
      biografia: { label: 'Biografia', icon: '📖', description: 'Historia pessoal' },
      anamnese: { label: 'Anamnese', icon: '🧠', description: 'Saude mental' },
      censo: { label: 'Censo', icon: '📊', description: 'Dados demograficos' },
      preferências: { label: 'Preferencias', icon: '⭐', description: 'Gostos' },
      conexoes: { label: 'Conexoes', icon: '🤝', description: 'Relacionamentos' },
      objetivos: { label: 'Objetivos', icon: '🎯', description: 'Metas' },
    },
  }
})

import {
  getInterviewSessions,
  getSessionQuestions,
  getInterviewStats,
  submitInterviewResponse,
  startSession,
  getCategoryCompletion,
} from '../interviewerService'

// ─── Helpers ──────────────────────────────────────────────────

const TEST_USER_ID = 'user-123'

/**
 * Creates a fully-chainable Supabase mock.
 * All methods return the chain itself (builder pattern).
 * The chain is thenable: when awaited, resolves with the given object.
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

  // single() resolves the promise
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolveWith)

  // Make chain thenable (Supabase builder pattern)
  chain.then = (
    onFulfilled: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolveWith).then(onFulfilled, onRejected)

  return chain
}

// =============================================================================
// getInterviewSessions
// =============================================================================

describe('getInterviewSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return sessions for a user', async () => {
    const sessions = [
      { id: 's1', user_id: TEST_USER_ID, category: 'biografia', status: 'in_progress' },
      { id: 's2', user_id: TEST_USER_ID, category: 'anamnese', status: 'completed' },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sessions, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getInterviewSessions(TEST_USER_ID)
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('biografia')
  })

  it('should return empty array on error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getInterviewSessions(TEST_USER_ID)
    expect(result).toEqual([])
  })
})

// =============================================================================
// getSessionQuestions
// =============================================================================

describe('getSessionQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return questions for a session', async () => {
    const sessionData = { question_ids: ['q1', 'q2', 'q3'] }
    const questionsData = [
      { id: 'q1', question_text: 'Q1', sort_order: 1 },
      { id: 'q2', question_text: 'Q2', sort_order: 2 },
      { id: 'q3', question_text: 'Q3', sort_order: 3 },
    ]

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++
      if (table === 'interviewer_sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
        }
      }
      if (table === 'interviewer_questions') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: questionsData, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getSessionQuestions('session-1')
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('q1')
  })

  it('should return empty array if session has no question_ids', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { question_ids: [] }, error: null }),
    })

    const result = await getSessionQuestions('session-empty')
    expect(result).toEqual([])
  })

  it('should return empty array on session fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    })

    const result = await getSessionQuestions('nonexistent')
    expect(result).toEqual([])
  })
})

// =============================================================================
// getInterviewStats
// =============================================================================

describe('getInterviewStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return stats from RPC', async () => {
    const statsData = {
      total_questions: 30,
      total_answered: 15,
      categories_started: 4,
      categories_completed: 2,
      total_cp_earned: 75,
      completion_percentage: 50,
    }
    mockRpc.mockResolvedValue({ data: statsData, error: null })

    const result = await getInterviewStats(TEST_USER_ID)
    expect(result.total_questions).toBe(30)
    expect(result.completion_percentage).toBe(50)
  })

  it('should return default stats on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

    const result = await getInterviewStats(TEST_USER_ID)
    expect(result.total_questions).toBe(0)
    expect(result.total_answered).toBe(0)
    expect(result.completion_percentage).toBe(0)
  })
})

// =============================================================================
// submitInterviewResponse
// =============================================================================

describe('submitInterviewResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit via Edge Function on success', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: true,
        response_id: 'resp-1',
        cp_earned: 10,
        cp_result: { success: true, new_total: 100, level: 5, level_name: 'Sábio', leveled_up: false },
        insights_extracted: 3,
        processing_time_ms: 250,
      },
      error: null,
    })

    const result = await submitInterviewResponse(
      TEST_USER_ID,
      'q1',
      'session-1',
      { text: 'My answer' },
      'My answer'
    )

    expect(result.success).toBe(true)
    expect(result.response_id).toBe('resp-1')
    expect(result.cp_earned).toBe(10)
    expect(result.insights_extracted).toBe(3)
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('process-interview-response', expect.any(Object))
  })

  it('should fall back to local insert when Edge Function errors', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function unavailable' },
    })

    // Mock local insert chain
    const insertData = { id: 'local-resp-1' }
    const insertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertData, error: null }),
    }

    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { memory_mapping: null, target_modules: [] },
        error: null,
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'interviewer_responses') return insertChain
      if (table === 'interviewer_questions') return questionChain
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    })

    const result = await submitInterviewResponse(
      TEST_USER_ID,
      'q1',
      null,
      { text: 'fallback answer' },
      'fallback answer'
    )

    expect(result.success).toBe(true)
    expect(result.response_id).toBe('local-resp-1')
    expect(result.cp_earned).toBe(5) // CP_PER_ANSWER default
    expect(result.cp_result).toBeNull() // CP not awarded via gamification in local fallback
  })

  it('should fall back when Edge Function returns success: false', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: false, error: 'Processing error' },
      error: null,
    })

    const insertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'fallback-resp' }, error: null }),
    }

    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { memory_mapping: null }, error: null }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'interviewer_responses') return insertChain
      if (table === 'interviewer_questions') return questionChain
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    })

    const result = await submitInterviewResponse(
      TEST_USER_ID, 'q1', null, { text: 'answer' }, 'answer'
    )

    expect(result.success).toBe(true)
    expect(result.response_id).toBe('fallback-resp')
  })

  it('should return failure when both Edge Function and local insert fail', async () => {
    mockFunctionsInvoke.mockRejectedValue(new Error('Network error'))

    const insertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
    }

    mockFrom.mockImplementation(() => insertChain)

    const result = await submitInterviewResponse(
      TEST_USER_ID, 'q1', null, { text: 'answer' }, 'answer'
    )

    expect(result.success).toBe(false)
    expect(result.response_id).toBe('')
    expect(result.cp_earned).toBe(0)
  })
})

// =============================================================================
// startSession
// =============================================================================

describe('startSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new session for a category', async () => {
    // Mock questions fetch
    const questionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
        error: null,
      }),
    }

    // Mock answered count
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ count: 1, error: null }),
    }

    // Mock session insert
    const sessionData = {
      id: 's1',
      user_id: TEST_USER_ID,
      category: 'biografia',
      status: 'in_progress',
      question_ids: ['q1', 'q2', 'q3'],
      total_questions: 3,
      answered_count: 1,
    }
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
    }

    let fromCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'interviewer_questions') {
        return questionsChain
      }
      if (table === 'interviewer_responses') {
        return countChain
      }
      if (table === 'interviewer_sessions') {
        return insertChain
      }
      return questionsChain
    })

    const result = await startSession(TEST_USER_ID, 'biografia')
    expect(result).toBeTruthy()
    expect(result!.category).toBe('biografia')
    expect(result!.status).toBe('in_progress')
  })

  it('should return null when no curated questions exist', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await startSession(TEST_USER_ID, 'biografia')
    expect(result).toBeNull()
  })

  it('should return null on questions fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
    })

    const result = await startSession(TEST_USER_ID, 'anamnese')
    expect(result).toBeNull()
  })
})

// =============================================================================
// getCategoryCompletion
// =============================================================================

describe('getCategoryCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return completion for all 6 categories', async () => {
    // Mock: each category has 5 questions, user answered 2
    // getCategoryCompletion calls from('interviewer_questions') twice per category:
    //   1. .select('id', {count}).eq('category').eq('is_curated') — count
    //   2. .select('id').eq('category').eq('is_curated') — get ids
    // Then from('interviewer_responses').select().eq().in() — count answered

    const questionsChain = createChain({
      count: 5,
      error: null,
      data: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }],
    })

    const answeredChain = createChain({ count: 2, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'interviewer_questions') return questionsChain
      if (table === 'interviewer_responses') return answeredChain
      return questionsChain
    })

    const result = await getCategoryCompletion(TEST_USER_ID)

    // Should have all 6 categories
    const categories = Object.keys(result)
    expect(categories).toHaveLength(6)
    expect(categories).toContain('biografia')
    expect(categories).toContain('objetivos')
  })

  it('should re-throw errors (not swallow them)', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    await expect(getCategoryCompletion(TEST_USER_ID)).rejects.toThrow('Database connection failed')
  })
})
