/**
 * Tests for GeminiLiveService
 *
 * Tests SSE streaming, session management, and error handling
 * for the Gemini Live interview chat service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  GeminiLiveService,
  getGeminiLiveService,
  resetGeminiLiveService,
  type StreamCallbacks,
  type GeminiLiveContext,
} from '../geminiLiveService'

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token-123',
          },
        },
      }),
    },
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GeminiLiveService', () => {
  let service: GeminiLiveService

  beforeEach(() => {
    resetGeminiLiveService()
    service = new GeminiLiveService()
    mockFetch.mockReset()
  })

  afterEach(() => {
    resetGeminiLiveService()
  })

  describe('getConnectionState', () => {
    it('should return disconnected initially', () => {
      expect(service.getConnectionState()).toBe('disconnected')
    })
  })

  describe('getSessionId', () => {
    it('should return null initially', () => {
      expect(service.getSessionId()).toBe(null)
    })
  })

  describe('setContext', () => {
    it('should set context for the session', () => {
      const context: GeminiLiveContext = {
        guest_name: 'Elon Musk',
        episode_theme: 'Inovacao',
      }

      service.setContext(context)
      // Context is internal, but we can test by sending a message
      // The context would be included in the request
    })
  })

  describe('sendMessage', () => {
    it('should reject empty messages', async () => {
      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }

      await service.sendMessage('', callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Message cannot be empty',
        })
      )
    })

    it('should reject whitespace-only messages', async () => {
      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }

      await service.sendMessage('   ', callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Message cannot be empty',
        })
      )
    })

    it('should make request with auth token', async () => {
      // Mock SSE response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"session","session_id":"test-123"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"chunk","content":"Hello"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"done","session_id":"test-123","full_response":"Hello"}\n\n')
          )
          controller.close()
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: stream,
      })

      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
        onSessionStart: vi.fn(),
      }

      await service.sendMessage('Hello', callbacks)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/gemini-live'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      )
    })

    it('should handle streaming chunks', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"session","session_id":"test-123"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"chunk","content":"Hello "}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"chunk","content":"World"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"done","session_id":"test-123","full_response":"Hello World"}\n\n')
          )
          controller.close()
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: stream,
      })

      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
        onSessionStart: vi.fn(),
      }

      await service.sendMessage('Test', callbacks)

      expect(callbacks.onSessionStart).toHaveBeenCalledWith('test-123')
      expect(callbacks.onChunk).toHaveBeenCalledTimes(2)
      expect(callbacks.onChunk).toHaveBeenNthCalledWith(1, 'Hello ')
      expect(callbacks.onChunk).toHaveBeenNthCalledWith(2, 'World')
      expect(callbacks.onComplete).toHaveBeenCalledWith('Hello World', 'test-123')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }

      await service.sendMessage('Test', callbacks)

      expect(callbacks.onError).toHaveBeenCalled()
    })

    it('should handle stream errors', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"error","message":"Something went wrong"}\n\n')
          )
          controller.close()
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: stream,
      })

      const callbacks: StreamCallbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }

      await service.sendMessage('Test', callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      )
    })
  })

  describe('endSession', () => {
    it('should not make request if no session', async () => {
      await service.endSession()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should make request to end session', async () => {
      // First, create a session
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"session","session_id":"test-123"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"done","session_id":"test-123","full_response":"Hi"}\n\n')
          )
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: stream,
      })

      await service.sendMessage('Test', {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      })

      mockFetch.mockReset()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await service.endSession()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/gemini-live'),
        expect.objectContaining({
          body: expect.stringContaining('end_session'),
        })
      )
    })
  })

  describe('reset', () => {
    it('should reset all state', () => {
      service.setContext({ guest_name: 'Test' })
      service.reset()

      expect(service.getSessionId()).toBe(null)
      expect(service.getConnectionState()).toBe('disconnected')
      expect(service.getMessageHistory()).toEqual([])
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getGeminiLiveService()
      const instance2 = getGeminiLiveService()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = getGeminiLiveService()
      resetGeminiLiveService()
      const instance2 = getGeminiLiveService()

      expect(instance1).not.toBe(instance2)
    })
  })
})
