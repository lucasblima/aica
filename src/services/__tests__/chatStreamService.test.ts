import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock getCachedSession before importing the module
vi.mock('@/services/authCacheService', () => ({
  getCachedSession: vi.fn().mockResolvedValue({
    session: { access_token: 'test-token' },
  }),
}))

describe('chatStreamService', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  describe('streamChat — non-SSE response detection (fix 0.3)', () => {
    it('yields done event when Edge Function returns JSON fallback with text field', async () => {
      const jsonResponse = {
        success: true,
        text: 'Hello from non-streaming fallback',
        agent: 'aica_coordinator',
        suggestedActions: [],
        usage: { input: 100, output: 50 },
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonResponse),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'done',
        fullText: 'Hello from non-streaming fallback',
        agent: 'aica_coordinator',
        actions: [],
        usage: { input: 100, output: 50 },
      })
    })

    it('yields error event when Edge Function returns JSON with error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: false, error: 'API key expired' }),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        message: 'API key expired',
      })
    })
  })

  describe('streamChat — SSE streaming (normal path)', () => {
    it('yields token and done events from SSE stream', async () => {
      const sseData = [
        'data: {"type":"token","content":"Hello"}\n\n',
        'data: {"type":"token","content":" world"}\n\n',
        'data: {"type":"done","fullText":"Hello world","agent":"aica_coordinator","actions":[]}\n\n',
      ].join('')

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData))
          controller.close()
        },
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(3)
      expect(events[0]).toEqual({ type: 'token', content: 'Hello' })
      expect(events[1]).toEqual({ type: 'token', content: ' world' })
      expect(events[2]).toMatchObject({ type: 'done', fullText: 'Hello world' })
    })
  })

  describe('streamChat — HTTP error handling', () => {
    it('yields error event on non-200 response with JSON error body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
        headers: new Headers(),
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        message: 'Internal server error',
      })
    })
  })

  describe('streamChat — timeout (fix 0.6)', () => {
    it('yields timeout error when fetch is aborted', async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      // Use fake timers to trigger the 30s timeout instantly
      vi.useFakeTimers()

      const { streamChat } = await import('@/services/chatStreamService')

      const eventsPromise = (async () => {
        const events: unknown[] = []
        for await (const event of streamChat('session-1', 'test', [])) {
          events.push(event)
        }
        return events
      })()

      // Advance past the 30s timeout
      await vi.advanceTimersByTimeAsync(31_000)

      const events = await eventsPromise

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        message: 'Tempo limite excedido. Tente novamente.',
      })

      vi.useRealTimers()
    })
  })

  describe('streamChat — suggested_questions in done event (phase 2.4)', () => {
    it('yields suggested_questions from SSE done event', async () => {
      const sseData = [
        'data: {"type":"token","content":"Hello"}\n\n',
        'data: {"type":"done","fullText":"Hello","agent":"aica_coordinator","actions":[],"suggested_questions":["Como vai?","O que mais?"]}\n\n',
      ].join('')

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData))
          controller.close()
        },
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(2)
      expect(events[1]).toMatchObject({
        type: 'done',
        fullText: 'Hello',
        suggested_questions: ['Como vai?', 'O que mais?'],
      })
    })

    it('yields suggested_questions from non-SSE JSON fallback', async () => {
      const jsonResponse = {
        success: true,
        text: 'Fallback response',
        agent: 'aica_coordinator',
        suggestedActions: [],
        usage: { input: 50, output: 25 },
        suggested_questions: ['Pergunta 1', 'Pergunta 2', 'Pergunta 3'],
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonResponse),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'done',
        fullText: 'Fallback response',
        suggested_questions: ['Pergunta 1', 'Pergunta 2', 'Pergunta 3'],
      })
    })

    it('omits suggested_questions when not present in non-SSE response', async () => {
      const jsonResponse = {
        success: true,
        text: 'No suggestions here',
        agent: 'aica_coordinator',
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonResponse),
      })

      const { streamChat } = await import('@/services/chatStreamService')

      const events: unknown[] = []
      for await (const event of streamChat('session-1', 'test', [])) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect((events[0] as Record<string, unknown>).suggested_questions).toBeUndefined()
    })
  })

  describe('fetchChatNonStreaming — fallback function (fix 0.2)', () => {
    it('returns parsed response from chat_aica action', async () => {
      const jsonResponse = {
        success: true,
        response: 'Non-streaming response here',
        agent: 'aica_coordinator',
        suggestedActions: [{ type: 'navigate', label: 'Go' }],
        usage: { input: 200, output: 100 },
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(jsonResponse),
      })

      const { fetchChatNonStreaming } = await import('@/services/chatStreamService')

      const result = await fetchChatNonStreaming('session-1', 'test message', [])

      expect(result.text).toBe('Non-streaming response here')
      expect(result.agent).toBe('aica_coordinator')
      expect(result.actions).toHaveLength(1)

      // Verify it called chat_aica (non-streaming) action
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.action).toBe('chat_aica')
    })

    it('throws on non-success response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Quota exceeded' }),
      })

      const { fetchChatNonStreaming } = await import('@/services/chatStreamService')

      await expect(
        fetchChatNonStreaming('session-1', 'test', [])
      ).rejects.toThrow('Quota exceeded')
    })

    it('throws Portuguese timeout message on AbortError', async () => {
      // Simulate an AbortError without fake timers to avoid unhandled rejection timing issues
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        return Promise.reject(err)
      })

      const { fetchChatNonStreaming } = await import('@/services/chatStreamService')

      await expect(
        fetchChatNonStreaming('session-1', 'test', [])
      ).rejects.toThrow('Tempo limite excedido. Tente novamente.')
    })
  })
})
