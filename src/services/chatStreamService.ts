/**
 * chatStreamService — SSE streaming consumer for gemini-chat Edge Function
 *
 * Uses fetch + ReadableStream reader (not EventSource) to support POST body.
 * Returns an AsyncGenerator yielding TokenEvent | DoneEvent | ErrorEvent.
 *
 * Handles Edge Function fallback: when sendMessageStream fails server-side,
 * the Edge Function returns JSON (Content-Type: application/json) instead of SSE.
 * This service detects that and extracts the response from JSON.
 */

import { getCachedSession } from '@/services/authCacheService'

/** Timeout for the streaming fetch (60 seconds — Edge Function needs ~10-15s for context + Gemini) */
const STREAM_TIMEOUT_MS = 60_000

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
  suggested_questions?: string[]
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

/** Build common headers + URL for an Edge Function */
function getEdgeFunctionEndpoint(accessToken: string, functionName: string = 'gemini-chat') {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  return {
    url: `${supabaseUrl}/functions/v1/${functionName}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  }
}

/** Backward-compatible alias */
function getChatEndpoint(accessToken: string) {
  return getEdgeFunctionEndpoint(accessToken, 'gemini-chat')
}

/**
 * Non-streaming fallback: POST to gemini-chat with action=chat_aica.
 * Used when streaming fails on the client side.
 */
export async function fetchChatNonStreaming(
  sessionId: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>,
): Promise<{ text: string; agent: string; actions: unknown[]; usage?: { input: number; output: number } }> {
  const { session } = await getCachedSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const { url, headers } = getChatEndpoint(session.access_token)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'chat_aica',
        payload: { message, session_id: sessionId, history, context },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = await response.json()
    if (!json.success) {
      throw new Error(json.error || 'Erro no servidor')
    }

    return {
      text: json.response || json.text || '',
      agent: json.agent || 'aica_coordinator',
      actions: Array.isArray(json.suggestedActions) ? json.suggestedActions : [],
      usage: json.usage,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Tempo limite excedido. Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * ReACT-enriched chat: POST to react-agent Edge Function.
 * Uses ReACT loop for context-enriched responses (queries user data before answering).
 * Has built-in intent pre-check — simple questions get direct answers without the loop.
 */
export async function fetchReactChat(
  sessionId: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>,
): Promise<{ text: string; agent: string; actions: unknown[]; usage?: { input: number; output: number }; react?: boolean; steps?: number; confidence?: number }> {
  const { session } = await getCachedSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const { url, headers } = getEdgeFunctionEndpoint(session.access_token, 'react-agent')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min for ReACT loop

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'react_chat',
        payload: { message, session_id: sessionId, history, context },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = await response.json()
    if (!json.success) {
      throw new Error(json.error || 'Erro no servidor')
    }

    return {
      text: json.response || '',
      agent: 'react_agent',
      actions: [],
      usage: json.tokens ? { input: json.tokens?.input || 0, output: json.tokens?.output || 0 } : undefined,
      react: json.react,
      steps: json.steps,
      confidence: json.confidence,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Tempo limite excedido. Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function* streamChat(
  sessionId: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>,
  interview?: InterviewMeta,
  parentMessageId?: string,
): AsyncGenerator<StreamEvent> {
  // Get auth token
  const { session } = await getCachedSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const { url, headers } = getChatEndpoint(session.access_token)

  // AbortController with 30s timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'chat_aica_stream',
        payload: {
          message,
          session_id: sessionId,
          history,
          context,
          ...(interview ? { interview } : {}),
          ...(parentMessageId ? { parent_message_id: parentMessageId } : {}),
        },
      }),
      signal: controller.signal,
    })
  } catch (fetchErr) {
    clearTimeout(timeout)
    if ((fetchErr as Error).name === 'AbortError') {
      yield { type: 'error', message: 'Tempo limite excedido. Tente novamente.' }
    } else {
      yield { type: 'error', message: (fetchErr as Error).message || 'Erro de conexao' }
    }
    return
  }

  if (!response.ok || !response.body) {
    clearTimeout(timeout)
    try {
      const errJson = await response.json()
      yield { type: 'error', message: errJson.error || `HTTP ${response.status}` }
    } catch {
      yield { type: 'error', message: `HTTP ${response.status}` }
    }
    return
  }

  // Detect non-SSE response (Edge Function fallback returns JSON when streaming fails server-side)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    clearTimeout(timeout)
    try {
      const json = await response.json()
      if (json.text || json.response) {
        yield {
          type: 'done',
          fullText: json.text || json.response,
          agent: json.agent || 'aica_coordinator',
          actions: json.suggestedActions || json.actions || [],
          usage: json.usage,
          suggested_questions: Array.isArray(json.suggested_questions) ? json.suggested_questions : undefined,
        }
      } else if (json.error) {
        yield { type: 'error', message: json.error }
      } else {
        yield { type: 'error', message: 'Resposta inesperada do servidor' }
      }
    } catch {
      yield { type: 'error', message: 'Resposta invalida do servidor' }
    }
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
          } catch (parseErr) {
            console.warn('[streamChat] Malformed SSE event:', line, parseErr)
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
    clearTimeout(timeout)
    reader.releaseLock()
  }
}
