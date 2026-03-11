/**
 * Unit Tests for atlasAIService
 *
 * Tests cover:
 * - QUADRANT_MAP: Eisenhower quadrant mapping correctness
 * - suggestPriority: AI priority suggestion (Edge Function call)
 * - decomposeTask: AI task decomposition
 * - getDailyBriefing: AI daily briefing generation
 * - Error handling for failed AI responses
 *
 * All Supabase Edge Function calls are mocked — no real API calls.
 *
 * @see src/modules/atlas/services/atlasAIService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

const mockInvoke = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
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

import {
  QUADRANT_MAP,
  suggestPriority,
  decomposeTask,
  getDailyBriefing,
  type PrioritySuggestion,
  type TaskDecomposition,
  type DailyBriefing,
} from '../atlasAIService'

// =============================================================================
// QUADRANT_MAP
// =============================================================================

describe('QUADRANT_MAP', () => {
  it('should map "do" to urgent-important quadrant', () => {
    expect(QUADRANT_MAP.do.quadrant).toBe('urgent-important')
    expect(QUADRANT_MAP.do.is_urgent).toBe(true)
    expect(QUADRANT_MAP.do.is_important).toBe(true)
  })

  it('should map "schedule" to important (not urgent) quadrant', () => {
    expect(QUADRANT_MAP.schedule.quadrant).toBe('important')
    expect(QUADRANT_MAP.schedule.is_urgent).toBe(false)
    expect(QUADRANT_MAP.schedule.is_important).toBe(true)
  })

  it('should map "delegate" to urgent (not important) quadrant', () => {
    expect(QUADRANT_MAP.delegate.quadrant).toBe('urgent')
    expect(QUADRANT_MAP.delegate.is_urgent).toBe(true)
    expect(QUADRANT_MAP.delegate.is_important).toBe(false)
  })

  it('should map "eliminate" to low priority quadrant', () => {
    expect(QUADRANT_MAP.eliminate.quadrant).toBe('low')
    expect(QUADRANT_MAP.eliminate.is_urgent).toBe(false)
    expect(QUADRANT_MAP.eliminate.is_important).toBe(false)
  })

  it('should have labels in Portuguese for all quadrants', () => {
    expect(QUADRANT_MAP.do.label).toContain('Urgente')
    expect(QUADRANT_MAP.do.label).toContain('Importante')
    expect(QUADRANT_MAP.schedule.label).toContain('Importante')
    expect(QUADRANT_MAP.delegate.label).toContain('Urgente')
    expect(QUADRANT_MAP.eliminate.label).toContain('Nem')
  })

  it('should cover all 4 Eisenhower quadrants', () => {
    const quadrants = Object.keys(QUADRANT_MAP)
    expect(quadrants).toHaveLength(4)
    expect(quadrants).toEqual(['do', 'schedule', 'delegate', 'eliminate'])
  })
})

// =============================================================================
// suggestPriority
// =============================================================================

describe('suggestPriority', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('should invoke atlas-task-intelligence with suggest_priority action', async () => {
    const mockResponse: PrioritySuggestion = {
      quadrant: 'do',
      confidence: 0.92,
      reasoning: 'Task is both urgent and important due to deadline.',
      is_urgent: true,
      is_important: true,
    }

    mockInvoke.mockResolvedValue({
      data: { success: true, data: mockResponse },
      error: null,
    })

    const result = await suggestPriority('Deploy hotfix', 'Production is down', '2026-03-11', ['critical'])

    expect(mockInvoke).toHaveBeenCalledWith('atlas-task-intelligence', {
      body: {
        action: 'suggest_priority',
        payload: {
          title: 'Deploy hotfix',
          description: 'Production is down',
          dueDate: '2026-03-11',
          tags: ['critical'],
        },
      },
    })

    expect(result.quadrant).toBe('do')
    expect(result.confidence).toBe(0.92)
    expect(result.is_urgent).toBe(true)
    expect(result.is_important).toBe(true)
  })

  it('should work with minimal parameters (title only)', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        data: {
          quadrant: 'schedule',
          confidence: 0.75,
          reasoning: 'Important but not urgent.',
          is_urgent: false,
          is_important: true,
        },
      },
      error: null,
    })

    const result = await suggestPriority('Write documentation')

    expect(mockInvoke).toHaveBeenCalledWith('atlas-task-intelligence', {
      body: {
        action: 'suggest_priority',
        payload: {
          title: 'Write documentation',
          description: undefined,
          dueDate: undefined,
          tags: undefined,
        },
      },
    })

    expect(result.quadrant).toBe('schedule')
  })

  it('should throw error when Edge Function returns error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function invocation failed' },
    })

    await expect(suggestPriority('Test task')).rejects.toThrow('Function invocation failed')
  })

  it('should throw error when response indicates failure', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Model rate limited' },
      error: null,
    })

    await expect(suggestPriority('Test task')).rejects.toThrow('Model rate limited')
  })

  it('should throw generic error when no error message in failed response', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false },
      error: null,
    })

    await expect(suggestPriority('Test task')).rejects.toThrow('Resposta inesperada da IA')
  })
})

// =============================================================================
// decomposeTask
// =============================================================================

describe('decomposeTask', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('should invoke atlas-task-intelligence with decompose_task action', async () => {
    const mockResponse: TaskDecomposition = {
      subtasks: [
        { title: 'Set up project', estimatedMinutes: 30, priority: 'high' },
        { title: 'Write tests', estimatedMinutes: 60, priority: 'high' },
        { title: 'Implement feature', estimatedMinutes: 120, priority: 'medium' },
      ],
      totalEstimate: '3.5 hours',
    }

    mockInvoke.mockResolvedValue({
      data: { success: true, data: mockResponse },
      error: null,
    })

    const result = await decomposeTask('Build user dashboard', 'Interactive analytics dashboard', 4)

    expect(mockInvoke).toHaveBeenCalledWith('atlas-task-intelligence', {
      body: {
        action: 'decompose_task',
        payload: {
          title: 'Build user dashboard',
          description: 'Interactive analytics dashboard',
          estimatedHours: 4,
        },
      },
    })

    expect(result.subtasks).toHaveLength(3)
    expect(result.subtasks[0].title).toBe('Set up project')
    expect(result.totalEstimate).toBe('3.5 hours')
  })

  it('should throw on Edge Function error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Timeout' },
    })

    await expect(decomposeTask('Complex task')).rejects.toThrow('Timeout')
  })
})

// =============================================================================
// getDailyBriefing
// =============================================================================

describe('getDailyBriefing', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('should invoke atlas-task-intelligence with daily_briefing action', async () => {
    const mockResponse: DailyBriefing = {
      briefing: 'You have 3 tasks today. Focus on the deployment first.',
      topPriority: 'Deploy production hotfix',
      suggestedOrder: [
        'Deploy production hotfix',
        'Review PR #42',
        'Update documentation',
      ],
    }

    mockInvoke.mockResolvedValue({
      data: { success: true, data: mockResponse },
      error: null,
    })

    const tasks = [
      { title: 'Deploy production hotfix', priority: 'urgent', status: 'pending', quadrant: 'urgent-important' },
      { title: 'Review PR #42', priority: 'high', status: 'pending', dueDate: '2026-03-12' },
      { title: 'Update documentation', priority: 'medium', status: 'in_progress' },
    ]

    const result = await getDailyBriefing(tasks)

    expect(mockInvoke).toHaveBeenCalledWith('atlas-task-intelligence', {
      body: {
        action: 'daily_briefing',
        payload: { tasks },
      },
    })

    expect(result.topPriority).toBe('Deploy production hotfix')
    expect(result.suggestedOrder).toHaveLength(3)
    expect(result.briefing).toContain('3 tasks')
  })

  it('should handle empty task list', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        data: {
          briefing: 'No tasks for today!',
          topPriority: '',
          suggestedOrder: [],
        },
      },
      error: null,
    })

    const result = await getDailyBriefing([])

    expect(result.suggestedOrder).toHaveLength(0)
  })

  it('should throw on AI failure', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'AI service unavailable' },
      error: null,
    })

    await expect(getDailyBriefing([])).rejects.toThrow('AI service unavailable')
  })
})
