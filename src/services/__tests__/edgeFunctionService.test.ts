/**
 * Unit Tests for Edge Function Service — Auth Retry Logic
 *
 * Tests cover:
 * - callGeminiEdgeFunction retries with fresh session on FunctionsHttpError (401)
 * - callGeminiEdgeFunction throws if retry also fails
 *
 * @see src/services/edgeFunctionService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs BEFORE vi.mock hoisting
const {
  mockInvoke,
  mockGetSession,
  mockGetCachedSession,
  mockInvalidateAuthCache,
} = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetCachedSession: vi.fn(),
  mockInvalidateAuthCache: vi.fn(),
}))

// Mock supabaseClient
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
    auth: {
      getSession: mockGetSession,
    },
  },
}))

// Mock authCacheService
vi.mock('@/services/authCacheService', () => ({
  getCachedSession: mockGetCachedSession,
  invalidateAuthCache: mockInvalidateAuthCache,
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Import AFTER mocking
import { callGeminiEdgeFunction } from '../edgeFunctionService'

describe('callGeminiEdgeFunction', () => {
  const validSession = {
    session: { access_token: 'valid-token-abc123' },
    error: null,
  }

  const freshSession = {
    data: { session: { access_token: 'fresh-token-xyz789' } },
    error: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retry with fresh session on FunctionsHttpError', async () => {
    // First call: getCachedSession returns a valid (but expired) session
    mockGetCachedSession.mockResolvedValueOnce(validSession)

    // First invoke returns a FunctionsHttpError
    const authError = new Error('Edge Function returned a non-2xx status code')
    authError.name = 'FunctionsHttpError'
    mockInvoke.mockResolvedValueOnce({ data: null, error: authError })

    // Fresh session from supabase.auth.getSession
    mockGetSession.mockResolvedValueOnce(freshSession)

    // Retry invoke succeeds
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        result: { answer: 42 },
        usageMetadata: { totalTokenCount: 100 },
      },
      error: null,
    })

    const result = await callGeminiEdgeFunction('test_action', { foo: 'bar' })

    // Verify invalidateAuthCache was called
    expect(mockInvalidateAuthCache).toHaveBeenCalledTimes(1)

    // Verify supabase.auth.getSession was called for fresh token
    expect(mockGetSession).toHaveBeenCalledTimes(1)

    // Verify invoke was called twice (original + retry)
    expect(mockInvoke).toHaveBeenCalledTimes(2)

    // Verify retry used the fresh token
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'gemini-chat', {
      body: { action: 'test_action', payload: { foo: 'bar' } },
      headers: { Authorization: 'Bearer fresh-token-xyz789' },
    })

    // Verify result
    expect(result).toEqual({
      answer: 42,
      __usageMetadata: { totalTokenCount: 100 },
    })
  })

  it('should throw if retry also fails', async () => {
    // First call: getCachedSession returns a valid session
    mockGetCachedSession.mockResolvedValueOnce(validSession)

    // First invoke returns a FunctionsHttpError
    const authError = new Error('Edge Function returned a non-2xx status code')
    authError.name = 'FunctionsHttpError'
    mockInvoke.mockResolvedValueOnce({ data: null, error: authError })

    // Fresh session from supabase.auth.getSession
    mockGetSession.mockResolvedValueOnce(freshSession)

    // Retry also fails
    const retryError = new Error('Still unauthorized')
    mockInvoke.mockResolvedValueOnce({ data: null, error: retryError })

    await expect(
      callGeminiEdgeFunction('test_action', { foo: 'bar' })
    ).rejects.toThrow('Edge Function error: Still unauthorized')

    // Verify invalidateAuthCache was called
    expect(mockInvalidateAuthCache).toHaveBeenCalledTimes(1)

    // Verify both calls were made
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })

  it('should not retry on non-auth errors', async () => {
    // getCachedSession returns a valid session
    mockGetCachedSession.mockResolvedValueOnce(validSession)

    // First invoke returns a generic error (not auth-related)
    const genericError = new Error('Rate limit exceeded')
    genericError.name = 'FunctionsRelayError'
    mockInvoke.mockResolvedValueOnce({ data: null, error: genericError })

    await expect(
      callGeminiEdgeFunction('test_action', { foo: 'bar' })
    ).rejects.toThrow('Edge Function error: Rate limit exceeded')

    // Should NOT have called invalidateAuthCache or getSession
    expect(mockInvalidateAuthCache).not.toHaveBeenCalled()
    expect(mockGetSession).not.toHaveBeenCalled()

    // Should have invoked only once
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})
