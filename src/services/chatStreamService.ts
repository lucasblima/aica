/**
 * chatStreamService — SSE streaming consumer for gemini-chat Edge Function
 *
 * Uses fetch + ReadableStream reader (not EventSource) to support POST body.
 * Returns an AsyncGenerator yielding TokenEvent | DoneEvent | ErrorEvent.
 */

import { getCachedSession } from '@/services/authCacheService'

export interface TokenEvent {
  type: 'token'
  content: string
}

export interface DoneEvent {
  type: 'done'
  fullText: string
  agent?: string
  actions?: unknown[]
  usage?: { input: number; output: number }
}

export interface AgentDetectedEvent {
  type: 'agent_detected'
  agent: string
}

export interface ErrorEvent {
  type: 'error'
  message: string
}

export type StreamEvent = TokenEvent | DoneEvent | AgentDetectedEvent | ErrorEvent

/** Metadata for interview-mode CTA triggers */
export interface InterviewMeta {
  type: 'interview_start'
  intent: string
}

export async function* streamChat(
  sessionId: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>,
  interview?: InterviewMeta,
): AsyncGenerator<StreamEvent> {
  // Get auth token
  const { session } = await getCachedSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    'https://uzywajqzbdbrfammshdg.supabase.co'
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const url = `${supabaseUrl}/functions/v1/gemini-chat`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      action: 'chat_aica_stream',
      payload: {
        message,
        session_id: sessionId,
        history,
        context,
        ...(interview ? { interview } : {}),
      },
    }),
  })

  if (!response.ok || !response.body) {
    yield { type: 'error', message: `HTTP ${response.status}` }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent
            yield event
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.slice(6)) as StreamEvent
        yield event
      } catch {
        // Skip malformed trailing event
      }
    }
  } finally {
    reader.releaseLock()
  }
}
