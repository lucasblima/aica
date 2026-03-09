/**
 * Unit Tests for useStudioComments hook
 *
 * Tests cover:
 * - Initial fetch loads comments
 * - addComment inserts optimistically
 * - resolveComment updates resolved state
 * - Handles empty/undefined project ID
 * - Cleanup on unmount (channel removal)
 * - Error handling on fetch failure
 *
 * @see src/modules/studio/hooks/useStudioComments.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// =============================================================================
// MOCKS — vi.hoisted ensures these are available inside vi.mock factories
// =============================================================================

const {
  mockRemoveChannel,
  mockChannel,
  mockUser,
  mockResults,
} = vi.hoisted(() => {
  const _mockRemoveChannel = { fn: null as any }
  const _mockChannel = {
    on: null as any,
    subscribe: null as any,
  }
  const _mockUser = { id: 'user-123', email: 'test@example.com' }
  const _mockResults = {
    fetch: { data: [] as any, error: null as any },
    insert: { data: null as any, error: null as any },
    update: { error: null as any },
  }
  return {
    mockRemoveChannel: _mockRemoveChannel,
    mockChannel: _mockChannel,
    mockUser: _mockUser,
    mockResults: _mockResults,
  }
})

// Initialize the mock fns (vi.fn() is available at this point)
mockRemoveChannel.fn = vi.fn()
mockChannel.on = vi.fn().mockReturnThis()
mockChannel.subscribe = vi.fn().mockReturnThis()

// Build chainable select mock
function buildSelectChain(): any {
  const promise = Promise.resolve(mockResults.fetch)
  const chain: any = {}
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.then = promise.then.bind(promise)
  chain.catch = promise.catch.bind(promise)
  return chain
}

function buildInsertChain(): any {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockImplementation(() => {
    const p = Promise.resolve(mockResults.insert)
    return { then: p.then.bind(p), catch: p.catch.bind(p) }
  })
  const promise = Promise.resolve(mockResults.insert)
  chain.then = promise.then.bind(promise)
  chain.catch = promise.catch.bind(promise)
  return chain
}

function buildUpdateChain(): any {
  const promise = Promise.resolve(mockResults.update)
  const chain: any = {
    eq: vi.fn().mockReturnValue({
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    }),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  }
  return chain
}

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => buildSelectChain()),
      insert: vi.fn().mockImplementation(() => buildInsertChain()),
      update: vi.fn().mockImplementation(() => buildUpdateChain()),
    })),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: (...args: any[]) => mockRemoveChannel.fn(...args),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Import AFTER mocking
import { useStudioComments } from '../useStudioComments'

// =============================================================================
// TESTS
// =============================================================================

describe('useStudioComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults.fetch = { data: [], error: null }
    mockResults.insert = { data: null, error: null }
    mockResults.update = { error: null }
    mockChannel.on = vi.fn().mockReturnThis()
    mockChannel.subscribe = vi.fn().mockReturnThis()
    mockRemoveChannel.fn = vi.fn()
  })

  it('should return empty comments initially when projectId is undefined', () => {
    const { result } = renderHook(() => useStudioComments(undefined))

    expect(result.current.comments).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch comments on mount when projectId is provided', async () => {
    const mockComments = [
      {
        id: 'c-1',
        user_id: 'user-123',
        project_id: 'proj-1',
        asset_id: null,
        content: 'Great take!',
        timestamp_seconds: 30,
        parent_comment_id: null,
        resolved: false,
        created_at: '2026-03-09T10:00:00Z',
        updated_at: '2026-03-09T10:00:00Z',
      },
      {
        id: 'c-2',
        user_id: 'user-456',
        project_id: 'proj-1',
        asset_id: null,
        content: 'Re-record this section',
        timestamp_seconds: 120,
        parent_comment_id: null,
        resolved: true,
        created_at: '2026-03-09T10:05:00Z',
        updated_at: '2026-03-09T10:10:00Z',
      },
    ]
    mockResults.fetch = { data: mockComments, error: null }

    const { result } = renderHook(() => useStudioComments('proj-1'))

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(2)
    })

    expect(result.current.comments[0].content).toBe('Great take!')
    expect(result.current.comments[1].resolved).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should set error when fetch fails', async () => {
    mockResults.fetch = { data: null, error: { message: 'Permission denied' } }

    const { result } = renderHook(() => useStudioComments('proj-1'))

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.error?.message).toBe('Permission denied')
    expect(result.current.comments).toEqual([])
  })

  it('should add comment optimistically via addComment', async () => {
    mockResults.fetch = { data: [], error: null }
    mockResults.insert = {
      data: {
        id: 'c-new',
        user_id: 'user-123',
        project_id: 'proj-1',
        asset_id: null,
        content: 'New comment',
        timestamp_seconds: null,
        parent_comment_id: null,
        resolved: false,
        created_at: '2026-03-09T12:00:00Z',
        updated_at: '2026-03-09T12:00:00Z',
      },
      error: null,
    }

    const { result } = renderHook(() => useStudioComments('proj-1'))

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.addComment('New comment')
    })

    expect(result.current.comments).toHaveLength(1)
    expect(result.current.comments[0].content).toBe('New comment')
    expect(result.current.comments[0].resolved).toBe(false)
  })

  it('should throw when addComment is called without projectId', async () => {
    const { result } = renderHook(() => useStudioComments(undefined))

    await expect(
      result.current.addComment('Test comment')
    ).rejects.toThrow('Project ID and authenticated user are required')
  })

  it('should update resolved state via resolveComment', async () => {
    const mockComments = [
      {
        id: 'c-1',
        user_id: 'user-123',
        project_id: 'proj-1',
        asset_id: null,
        content: 'Fix this',
        timestamp_seconds: null,
        parent_comment_id: null,
        resolved: false,
        created_at: '2026-03-09T10:00:00Z',
        updated_at: '2026-03-09T10:00:00Z',
      },
    ]
    mockResults.fetch = { data: mockComments, error: null }
    mockResults.update = { error: null }

    const { result } = renderHook(() => useStudioComments('proj-1'))

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1)
    })

    await act(async () => {
      await result.current.resolveComment('c-1')
    })

    expect(result.current.comments[0].resolved).toBe(true)
  })

  it('should remove channel on unmount', async () => {
    mockResults.fetch = { data: [], error: null }

    const { unmount } = renderHook(() => useStudioComments('proj-1'))

    // Wait for effects to run
    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockRemoveChannel.fn).toHaveBeenCalled()
  })

  it('should reset comments when projectId changes to undefined', async () => {
    const mockComments = [
      {
        id: 'c-1',
        user_id: 'user-123',
        project_id: 'proj-1',
        asset_id: null,
        content: 'Comment',
        timestamp_seconds: null,
        parent_comment_id: null,
        resolved: false,
        created_at: '2026-03-09T10:00:00Z',
        updated_at: '2026-03-09T10:00:00Z',
      },
    ]
    mockResults.fetch = { data: mockComments, error: null }

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string | undefined }) =>
        useStudioComments(projectId),
      { initialProps: { projectId: 'proj-1' as string | undefined } }
    )

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1)
    })

    rerender({ projectId: undefined })

    expect(result.current.comments).toEqual([])
  })
})
