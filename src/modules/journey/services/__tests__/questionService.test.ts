/**
 * Unit Tests for questionService
 *
 * Tests cover:
 * - getDailyQuestion: RPC call, question selection, generation trigger
 * - answerQuestion: response saving, CP award, streak update
 * - getQuestionResponse: single response fetch
 * - getResponseHistory: paginated responses
 * - getQuestionStats: streak calculation, answer rate
 * - Timeout handling: 5s limit on question generation
 *
 * All Supabase calls are mocked.
 *
 * @see src/modules/journey/services/questionService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
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

const mockTriggerQuestionGeneration = vi.fn()
const mockCheckAndTriggerGenerationIfNeeded = vi.fn()

vi.mock('../questionGenerationService', () => ({
  triggerQuestionGeneration: (...args: unknown[]) => mockTriggerQuestionGeneration(...args),
  checkAndTriggerGenerationIfNeeded: (...args: unknown[]) => mockCheckAndTriggerGenerationIfNeeded(...args),
}))

vi.mock('../qualityEvaluationService', () => ({
  evaluateAndCalculateCP: vi.fn().mockResolvedValue({
    cp_earned: 8,
    quality_score: 0.6,
    assessment: {
      feedback_message: 'Boa resposta!',
      feedback_tier: 'good',
    },
  }),
  updateAvgQualityScore: vi.fn(),
}))

// Import AFTER mocks
import {
  getDailyQuestion,
  answerQuestion,
  getQuestionResponse,
  getResponseHistory,
  getQuestionStats,
  getAllQuestionsWithResponses,
} from '../questionService'

// ─── Helpers ──────────────────────────────────────────────────

const TEST_USER_ID = 'user-123'

/**
 * Creates a fully-chainable Supabase mock.
 * Every method returns the chain so any number of chained calls work.
 * The chain is also thenable: when awaited, resolves with the given object.
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

  // Make chain thenable
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
    return Promise.resolve(resolveWith).then(onFulfilled, onRejected)
  }

  return chain
}

// =============================================================================
// getDailyQuestion
// =============================================================================

describe('getDailyQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a question when unanswered questions are available', async () => {
    const mockQuestions = [
      { id: 'q1', question_text: 'How do you feel?', category: 'reflection', active: true },
      { id: 'q2', question_text: 'What are you grateful for?', category: 'gratitude', active: true },
      { id: 'q3', question_text: 'What did you learn?', category: 'learning', active: true },
    ]

    mockRpc.mockResolvedValue({ data: mockQuestions, error: null })
    mockCheckAndTriggerGenerationIfNeeded.mockResolvedValue(undefined)

    const result = await getDailyQuestion(TEST_USER_ID)

    expect(result).toBeTruthy()
    expect(mockQuestions.map((q) => q.id)).toContain(result!.id)
    expect(result!.user_response).toBeUndefined()
    expect(mockRpc).toHaveBeenCalledWith('get_unanswered_question', { p_user_id: TEST_USER_ID, p_limit: 3 })
  })

  it('should return null when no questions and generation fails', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockTriggerQuestionGeneration.mockRejectedValue(new Error('Generation failed'))

    const result = await getDailyQuestion(TEST_USER_ID)
    expect(result).toBeNull()
  })

  it('should return null when generation times out', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    // Simulate a slow generation that exceeds 5s timeout
    mockTriggerQuestionGeneration.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    )

    const result = await getDailyQuestion(TEST_USER_ID)
    expect(result).toBeNull()
  }, 10000)

  it('should trigger background generation when below threshold', async () => {
    // Only 2 questions (below MIN_UNANSWERED_THRESHOLD of 3)
    const mockQuestions = [
      { id: 'q1', question_text: 'Question 1', category: 'reflection', active: true },
      { id: 'q2', question_text: 'Question 2', category: 'gratitude', active: true },
    ]

    mockRpc.mockResolvedValue({ data: mockQuestions, error: null })
    mockCheckAndTriggerGenerationIfNeeded.mockResolvedValue(undefined)

    await getDailyQuestion(TEST_USER_ID)
    expect(mockCheckAndTriggerGenerationIfNeeded).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('should return null on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

    const result = await getDailyQuestion(TEST_USER_ID)
    expect(result).toBeNull()
  })

  it('should retry after successful generation and return new question', async () => {
    const newQuestion = { id: 'q-new', question_text: 'New AI question', category: 'reflection', active: true }

    // First RPC call: no questions
    // Second RPC call (retry): returns new question
    mockRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [newQuestion], error: null })

    mockTriggerQuestionGeneration.mockResolvedValue({ success: true, questionsGenerated: 5 })

    const result = await getDailyQuestion(TEST_USER_ID)
    expect(result).toBeTruthy()
    expect(result!.id).toBe('q-new')
  })
})

// =============================================================================
// answerQuestion
// =============================================================================

describe('answerQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save a response and award CP', async () => {
    const responseData = { id: 'resp-1', question_id: 'q1', user_id: TEST_USER_ID }
    const upsertChain = createChain({ data: responseData, error: null })

    // For getting question text
    const questionChain = createChain({ data: { question_text: 'How do you feel?' }, error: null })

    // For saving quality data (fire-and-forget)
    const updateChain = createChain({ data: null, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'question_responses') {
        // First call is upsert, subsequent are update
        if (!(mockFrom as any)._upsertDone) {
          (mockFrom as any)._upsertDone = true
          return upsertChain
        }
        return updateChain
      }
      if (table === 'daily_questions') return questionChain
      return updateChain
    })

    mockRpc
      // award_consciousness_points
      .mockResolvedValueOnce({
        data: { leveled_up: false, level: 3 },
        error: null,
      })
      // update_consciousness_streak
      .mockResolvedValueOnce({ error: null })

    const result = await answerQuestion(TEST_USER_ID, {
      question_id: 'q1',
      response_text: 'I feel great today!',
    })

    expect(result.cp_earned).toBe(8)
    expect(result.leveled_up).toBe(false)
    expect(result.quality_score).toBe(0.6)
    expect(result.response).toEqual(responseData)
  })

  it('should throw when upsert fails', async () => {
    const errorChain = createChain({ data: null, error: { message: 'Upsert failed' } })
    mockFrom.mockReturnValue(errorChain)

    await expect(
      answerQuestion(TEST_USER_ID, {
        question_id: 'q1',
        response_text: 'Test',
      })
    ).rejects.toMatchObject({ message: 'Upsert failed' })
  })
})

// =============================================================================
// getQuestionResponse
// =============================================================================

describe('getQuestionResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the response when found', async () => {
    const responseData = { id: 'resp-1', question_id: 'q1', response_text: 'My answer' }
    const chain = createChain({ data: responseData, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getQuestionResponse(TEST_USER_ID, 'q1')
    expect(result).toEqual(responseData)
  })

  it('should return null when not found (PGRST116)', async () => {
    const chain = createChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
    mockFrom.mockReturnValue(chain)

    const result = await getQuestionResponse(TEST_USER_ID, 'nonexistent')
    expect(result).toBeNull()
  })

  it('should return null on other errors', async () => {
    const chain = createChain({ data: null, error: { code: '42P01', message: 'Table not found' } })
    mockFrom.mockReturnValue(chain)

    const result = await getQuestionResponse(TEST_USER_ID, 'q1')
    expect(result).toBeNull()
  })
})

// =============================================================================
// getResponseHistory
// =============================================================================

describe('getResponseHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return paginated response history', async () => {
    const historyData = [
      { id: 'r1', response_text: 'Answer 1', responded_at: '2026-03-01T00:00:00Z' },
      { id: 'r2', response_text: 'Answer 2', responded_at: '2026-03-02T00:00:00Z' },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: historyData, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getResponseHistory(TEST_USER_ID, 10)
    expect(result).toHaveLength(2)
    expect(chain.limit).toHaveBeenCalledWith(10)
  })

  it('should return empty array on error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getResponseHistory(TEST_USER_ID)
    expect(result).toEqual([])
  })
})

// =============================================================================
// getQuestionStats
// =============================================================================

describe('getQuestionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should compute answer rate and streak', async () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    // Mock daily_questions query
    const questionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }],
        error: null,
      }),
    }

    // Mock question_responses query with consecutive days
    const responsesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'r1', responded_at: now.toISOString() },
          { id: 'r2', responded_at: yesterday.toISOString() },
        ],
        error: null,
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'daily_questions') return questionsChain
      if (table === 'question_responses') return responsesChain
      return questionsChain
    })

    const stats = await getQuestionStats(TEST_USER_ID)
    expect(stats.total_available).toBe(4)
    expect(stats.total_answered).toBe(2)
    expect(stats.answer_rate).toBe(50)
    expect(stats.recent_streak).toBeGreaterThanOrEqual(1)
  })

  it('should return zeros on error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
    }
    mockFrom.mockReturnValue(chain)

    const stats = await getQuestionStats(TEST_USER_ID)
    expect(stats.total_answered).toBe(0)
    expect(stats.total_available).toBe(0)
    expect(stats.answer_rate).toBe(0)
    expect(stats.recent_streak).toBe(0)
  })
})

// =============================================================================
// getAllQuestionsWithResponses
// =============================================================================

describe('getAllQuestionsWithResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return questions mapped with user responses', async () => {
    const questionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'q1', question_text: 'Q1', active: true },
          { id: 'q2', question_text: 'Q2', active: true },
        ],
        error: null,
      }),
    }

    const responsesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'r1', question_id: 'q1', response_text: 'Answer 1' }],
        error: null,
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'daily_questions') return questionsChain
      if (table === 'question_responses') return responsesChain
      return questionsChain
    })

    const result = await getAllQuestionsWithResponses(TEST_USER_ID)
    expect(result).toHaveLength(2)
    // q1 should have a response
    expect(result[0].user_response).toBeDefined()
    expect(result[0].user_response!.question_id).toBe('q1')
    // q2 should not have a response
    expect(result[1].user_response).toBeUndefined()
  })

  it('should return empty array on error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await getAllQuestionsWithResponses(TEST_USER_ID)
    expect(result).toEqual([])
  })
})
