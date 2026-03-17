/**
 * Gemini Live Service - Real-time chat for interview preparation
 *
 * Manages SSE (Server-Sent Events) connections to the gemini-live Edge Function
 * for streaming chat responses during podcast preparation.
 *
 * Features:
 * - Session management with automatic ID tracking
 * - Streaming response handling with callbacks
 * - Automatic reconnection on errors
 * - Context persistence across messages
 * - Connection state management
 *
 * @module studio/services/geminiLiveService
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('geminiLiveService')

// ============================================
// TYPES
// ============================================

export interface GeminiLiveContext {
  guest_name: string
  guest_bio?: string
  episode_theme?: string
  dossier_summary?: string
}

export interface GeminiLiveMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface StreamCallbacks {
  onChunk: (content: string) => void
  onComplete: (fullResponse: string, sessionId: string) => void
  onError: (error: Error) => void
  onSessionStart?: (sessionId: string) => void
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

// ============================================
// CONFIGURATION
// ============================================

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-live`
  : 'http://localhost:54321/functions/v1/gemini-live'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================
// SERVICE CLASS
// ============================================

/**
 * Gemini Live Service for real-time interview chat
 *
 * @example
 * ```ts
 * const service = new GeminiLiveService()
 *
 * // Initialize with context
 * service.setContext({
 *   guest_name: 'Elon Musk',
 *   episode_theme: 'Inovacao e Futuro'
 * })
 *
 * // Send message with streaming
 * await service.sendMessage('Quais perguntas devo fazer?', {
 *   onChunk: (text) => setResponse(prev => prev + text),
 *   onComplete: (full) => console.log('Done:', full),
 *   onError: (err) => console.error(err)
 * })
 *
 * // End session when done
 * await service.endSession()
 * ```
 */
export class GeminiLiveService {
  private sessionId: string | null = null
  private context: GeminiLiveContext | null = null
  private connectionState: ConnectionState = 'disconnected'
  private abortController: AbortController | null = null
  private messageHistory: GeminiLiveMessage[] = []

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Get message history
   */
  getMessageHistory(): GeminiLiveMessage[] {
    return [...this.messageHistory]
  }

  /**
   * Set interview context for the chat session
   *
   * Context is sent with the first message and updates the AI's understanding
   * of the interview scenario.
   */
  setContext(context: GeminiLiveContext): void {
    this.context = context
    log.debug('Context set:', { guestName: context.guest_name })
  }

  /**
   * Send a message and receive streaming response
   *
   * @param message - The user's message
   * @param callbacks - Callbacks for handling stream events
   * @returns Promise that resolves when stream completes
   */
  async sendMessage(message: string, callbacks: StreamCallbacks): Promise<void> {
    if (!message.trim()) {
      callbacks.onError(new Error('Message cannot be empty'))
      return
    }

    // Cancel any existing request
    this.abortController?.abort()
    this.abortController = new AbortController()

    this.connectionState = 'connecting'

    // Add user message to history
    this.messageHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    })

    let retries = 0

    while (retries < MAX_RETRIES) {
      try {
        await this.executeStreamRequest(message, callbacks)
        this.connectionState = 'connected'
        return
      } catch (error) {
        retries++
        log.warn(`Request failed, retry ${retries}/${MAX_RETRIES}:`, error)

        if (retries >= MAX_RETRIES) {
          this.connectionState = 'error'
          callbacks.onError(error as Error)
          return
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retries))
      }
    }
  }

  /**
   * Execute the actual SSE stream request
   */
  private async executeStreamRequest(message: string, callbacks: StreamCallbacks): Promise<void> {
    const token = await this.getAuthToken()

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'chat',
        session_id: this.sessionId,
        message,
        context: this.context,
      }),
      signal: this.abortController?.signal,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(errorBody.error || `HTTP ${response.status}`)
    }

    // Check if response is SSE
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('text/event-stream')) {
      // Non-streaming response (error case)
      const body = await response.json()
      if (body.error) {
        throw new Error(body.error)
      }
      return
    }

    // Process SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let fullResponse = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const data = JSON.parse(jsonStr)

            switch (data.type) {
              case 'session':
                this.sessionId = data.session_id
                callbacks.onSessionStart?.(data.session_id)
                break

              case 'chunk':
                if (data.content) {
                  fullResponse += data.content
                  callbacks.onChunk(data.content)
                }
                break

              case 'done':
                // Add assistant message to history
                this.messageHistory.push({
                  role: 'assistant',
                  content: data.full_response || fullResponse,
                  timestamp: new Date(),
                })
                callbacks.onComplete(data.full_response || fullResponse, data.session_id)
                return

              case 'error':
                throw new Error(data.message || 'Stream error')
            }
          } catch (parseError) {
            // Skip invalid JSON lines (like empty data)
            if (jsonStr.length > 0) {
              log.warn('Failed to parse SSE message:', jsonStr)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * End the current chat session
   *
   * Cleans up resources on the server and resets local state.
   */
  async endSession(): Promise<void> {
    if (!this.sessionId) {
      log.debug('No active session to end')
      return
    }

    // Cancel any pending request
    this.abortController?.abort()

    try {
      const token = await this.getAuthToken()

      await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'end_session',
          session_id: this.sessionId,
        }),
      })

      log.debug('Session ended:', this.sessionId)
    } catch (error) {
      log.warn('Error ending session:', error)
    } finally {
      this.reset()
    }
  }

  /**
   * Cancel the current streaming request
   */
  cancelRequest(): void {
    this.abortController?.abort()
    this.connectionState = 'disconnected'
  }

  /**
   * Reset the service state
   */
  reset(): void {
    this.sessionId = null
    this.context = null
    this.connectionState = 'disconnected'
    this.abortController = null
    this.messageHistory = []
  }

  /**
   * Get authentication token from Supabase
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('User not authenticated')
    }

    return session.access_token
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let serviceInstance: GeminiLiveService | null = null

/**
 * Get singleton instance of GeminiLiveService
 *
 * @example
 * ```ts
 * const service = getGeminiLiveService()
 * await service.sendMessage('Olá', callbacks)
 * ```
 */
export function getGeminiLiveService(): GeminiLiveService {
  if (!serviceInstance) {
    serviceInstance = new GeminiLiveService()
  }
  return serviceInstance
}

/**
 * Reset the singleton instance (useful for testing or page unmount)
 */
export function resetGeminiLiveService(): void {
  if (serviceInstance) {
    serviceInstance.endSession().catch(() => {})
    serviceInstance = null
  }
}

// ============================================
// REACT HOOK
// ============================================

export interface UseGeminiLiveOptions {
  context?: GeminiLiveContext
  onSessionStart?: (sessionId: string) => void
}

export interface UseGeminiLiveReturn {
  // State
  messages: GeminiLiveMessage[]
  isStreaming: boolean
  connectionState: ConnectionState
  sessionId: string | null
  currentResponse: string

  // Actions
  sendMessage: (message: string) => Promise<void>
  endSession: () => Promise<void>
  cancelRequest: () => void
  clearMessages: () => void
  setContext: (context: GeminiLiveContext) => void
}

/**
 * React hook for Gemini Live chat
 *
 * @example
 * ```tsx
 * function InterviewChat() {
 *   const {
 *     messages,
 *     isStreaming,
 *     currentResponse,
 *     sendMessage,
 *   } = useGeminiLive({
 *     context: { guest_name: 'Elon Musk' }
 *   })
 *
 *   const handleSubmit = async (text: string) => {
 *     await sendMessage(text)
 *   }
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.timestamp.getTime()} {...m} />)}
 *       {isStreaming && <StreamingIndicator text={currentResponse} />}
 *       <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useGeminiLive(options: UseGeminiLiveOptions = {}): UseGeminiLiveReturn {
  const serviceRef = useRef<GeminiLiveService | null>(null)
  const [messages, setMessages] = useState<GeminiLiveMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState('')

  // Initialize service
  useEffect(() => {
    serviceRef.current = getGeminiLiveService()

    // Set initial context if provided
    if (options.context) {
      serviceRef.current.setContext(options.context)
    }

    return () => {
      // Don't end session on unmount to preserve state across re-renders
      // User should explicitly call endSession when done
    }
  }, [])

  // Update context when it changes
  useEffect(() => {
    if (options.context && serviceRef.current) {
      serviceRef.current.setContext(options.context)
    }
  }, [options.context])

  const sendMessage = useCallback(async (message: string) => {
    if (!serviceRef.current || isStreaming) return

    setIsStreaming(true)
    setCurrentResponse('')
    setConnectionState('connecting')

    // Add user message immediately
    const userMessage: GeminiLiveMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    await serviceRef.current.sendMessage(message, {
      onSessionStart: (id) => {
        setSessionId(id)
        options.onSessionStart?.(id)
      },
      onChunk: (chunk) => {
        setConnectionState('connected')
        setCurrentResponse(prev => prev + chunk)
      },
      onComplete: (fullResponse) => {
        const assistantMessage: GeminiLiveMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsStreaming(false)
        setCurrentResponse('')
      },
      onError: (error) => {
        log.error('Chat error:', error)
        setConnectionState('error')
        setIsStreaming(false)
        setCurrentResponse('')

        // Add error message
        const errorMessage: GeminiLiveMessage = {
          role: 'assistant',
          content: `Erro: ${error.message}. Tente novamente.`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      },
    })
  }, [isStreaming, options.onSessionStart])

  const endSession = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.endSession()
      setSessionId(null)
      setConnectionState('disconnected')
    }
  }, [])

  const cancelRequest = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cancelRequest()
      setIsStreaming(false)
      setCurrentResponse('')
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setCurrentResponse('')
  }, [])

  const setContext = useCallback((context: GeminiLiveContext) => {
    if (serviceRef.current) {
      serviceRef.current.setContext(context)
    }
  }, [])

  return {
    messages,
    isStreaming,
    connectionState,
    sessionId,
    currentResponse,
    sendMessage,
    endSession,
    cancelRequest,
    clearMessages,
    setContext,
  }
}
