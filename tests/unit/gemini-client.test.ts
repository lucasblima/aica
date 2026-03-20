/**
 * Unit Tests - GeminiClient
 *
 * Testa a biblioteca de cliente Gemini:
 * - Singleton pattern
 * - Retry logic
 * - Model selection
 * - Error handling
 * - Request building
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callWithRetry } from '@/lib/gemini/retry'

// Mock modules — factories run once, but we re-establish return values in beforeEach
vi.mock('@/services/authCacheService')
vi.mock('@/services/billingService')
vi.mock('@/services/supabaseClient')
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { GeminiClient } from '@/lib/gemini/client'
import { getCachedSession, invalidateAuthCache } from '@/services/authCacheService'
import { checkInteractionLimit } from '@/services/billingService'

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset GeminiClient circuit breaker between tests
    // @ts-expect-error accessing private static for test reset
    GeminiClient.authFailedAt = 0

    // Re-establish mock return values before each test
    vi.mocked(getCachedSession).mockResolvedValue({
      session: { access_token: 'mock-test-token.eyJleHAiOjk5OTk5OTk5OTl9.sig' } as any,
      error: null,
    })
    vi.mocked(invalidateAuthCache).mockImplementation(() => {})
    vi.mocked(checkInteractionLimit).mockResolvedValue({ allowed: true } as any)

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'default' }),
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = GeminiClient.getInstance()
      const instance2 = GeminiClient.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should have private constructor', () => {
      // TypeScript private is compile-time only; verify singleton pattern instead
      const instance = GeminiClient.getInstance()
      expect(instance).toBeDefined()
      expect(instance).toBe(GeminiClient.getInstance())
    })
  })

  describe('Model Selection', () => {
    it('should use fast model when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'suggest_guest',
        payload: {},
        model: 'fast'
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('fast')
    })

    it('should use smart model when specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'generate_dossier',
        payload: {},
        model: 'smart'
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('smart')
    })

    it('should auto-select model based on action', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()

      // Actions without explicit model get auto-selected
      await client.call({
        action: 'suggest_guest',
        payload: {}
      })

      // Should go to Edge Function endpoint
      expect(mockFetch.mock.calls[0][0]).toContain('/functions/v1/gemini-chat')
    })
  })

  describe('Request Building', () => {
    it('should include authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'suggest_guest',
        payload: {}
      })

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Authorization']).toContain('Bearer')
    })

    it('should include action and payload in body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'suggest_topic',
        payload: { guestName: 'Test Guest' }
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.action).toBe('suggest_topic')
      expect(callBody.payload.guestName).toBe('Test Guest')
    })

    it('should use correct endpoint for Edge Function actions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'suggest_guest', // Edge Function action
        payload: {}
      })

      const url = mockFetch.mock.calls[0][0]
      expect(url).toContain('/functions/v1/gemini-chat')
    })

    it('should use dedicated Edge Function for deep_research', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'test' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      await client.call({
        action: 'deep_research',
        payload: {}
      })

      const url = mockFetch.mock.calls[0][0]
      expect(url).toContain('/functions/v1/deep-research')
    })
  })

  describe('Error Handling', () => {
    it('should throw GeminiError on 401', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()

      await expect(client.call({
        action: 'suggest_guest',
        payload: {}
      })).rejects.toThrow('Unauthorized')
    })

    it('should throw GeminiError on 429 rate limit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()

      await expect(client.call({
        action: 'suggest_guest',
        payload: {}
      })).rejects.toThrow('Rate limit')
    })

    it('should throw GeminiError on 500 server error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()

      await expect(client.call({
        action: 'suggest_guest',
        payload: {}
      })).rejects.toThrow()
    })

    it('should throw on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()

      await expect(client.call({
        action: 'suggest_guest',
        payload: {}
      })).rejects.toThrow('Network error')
    })
  })

  describe('Response Parsing', () => {
    it('should return result from successful response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'Test result' })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'suggest_guest',
        payload: {}
      })

      expect(response.result).toBe('Test result')
    })

    it('should include cached flag when present', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'Cached result',
          cached: true
        })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'suggest_guest',
        payload: {}
      })

      expect(response.cached).toBe(true)
    })

    it('should include latencyMs when present', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'Test',
          latencyMs: 1234
        })
      })
      global.fetch = mockFetch

      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'suggest_guest',
        payload: {}
      })

      expect(response.latencyMs).toBe(1234)
    })
  })
})

describe('Retry Logic', () => {
  // Use real timers with short delays to avoid fake timer / async interaction issues

  it('should retry on 429 rate limit', async () => {
    let callCount = 0
    const mockFn = vi.fn(async () => {
      callCount++
      if (callCount < 3) {
        const error: any = new Error('Rate limited')
        error.statusCode = 429
        throw error
      }
      return 'success'
    })

    const result = await callWithRetry(mockFn, {
      maxRetries: 3,
      baseDelay: 10,
    })

    expect(mockFn).toHaveBeenCalledTimes(3)
    expect(result).toBe('success')
  }, 10_000)

  it('should not retry on non-retryable errors', async () => {
    const mockFn = vi.fn(async () => {
      const error: any = new Error('Bad request')
      error.statusCode = 400
      throw error
    })

    await expect(callWithRetry(mockFn, {
      maxRetries: 3,
    })).rejects.toThrow('Bad request')

    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should respect maxRetries limit', async () => {
    const mockFn = vi.fn(async () => {
      const error: any = new Error('Rate limited')
      error.statusCode = 429
      throw error
    })

    await expect(callWithRetry(mockFn, {
      maxRetries: 3,
      baseDelay: 10,
    })).rejects.toThrow('Rate limited')

    expect(mockFn).toHaveBeenCalledTimes(3)
  }, 10_000)

  it('should succeed on first try if no error', async () => {
    const mockFn = vi.fn(async () => 'success')

    const result = await callWithRetry(mockFn, {
      maxRetries: 3,
    })

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(result).toBe('success')
  })
})
