/**
 * Chat Context Provider
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Central context for managing Aica chat with rate limiting integration.
 * Handles message sending, queueing, and token consumption.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import rateLimiterService, {
  RateLimitStatus,
  QueuedMessage,
  ModelTier,
} from '@/services/rateLimiterService'

const log = createNamespacedLogger('ChatContext')

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model_tier?: ModelTier
  tokens_used?: number
  created_at: string
  is_queued?: boolean
  queue_position?: number
  error?: string
}

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  error: string | null
  currentSession: ChatSession | null
  sessions: ChatSession[]
  rateLimitStatus: RateLimitStatus | null
  queuedMessages: QueuedMessage[]
}

type ChatAction =
  | { type: 'SET_MESSAGES'; messages: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; updates: Partial<ChatMessage> }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_SENDING'; isSending: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SESSION'; session: ChatSession | null }
  | { type: 'SET_SESSIONS'; sessions: ChatSession[] }
  | { type: 'SET_RATE_LIMIT_STATUS'; status: RateLimitStatus | null }
  | { type: 'SET_QUEUED_MESSAGES'; messages: QueuedMessage[] }
  | { type: 'CLEAR_MESSAGES' }

interface ChatContextValue extends ChatState {
  sendMessage: (content: string, tier?: ModelTier) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  createSession: (title?: string) => Promise<ChatSession | null>
  loadSessions: () => Promise<void>
  refreshRateLimitStatus: () => Promise<void>
  refreshQueuedMessages: () => Promise<void>
  clearChat: () => void
  cancelQueuedMessage: (messageId: string) => Promise<void>
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  currentSession: null,
  sessions: [],
  rateLimitStatus: null,
  queuedMessages: [],
}

// ============================================================================
// REDUCER
// ============================================================================

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, ...action.updates } : m
        ),
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }

    case 'SET_SENDING':
      return { ...state, isSending: action.isSending }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_SESSION':
      return { ...state, currentSession: action.session }

    case 'SET_SESSIONS':
      return { ...state, sessions: action.sessions }

    case 'SET_RATE_LIMIT_STATUS':
      return { ...state, rateLimitStatus: action.status }

    case 'SET_QUEUED_MESSAGES':
      return { ...state, queuedMessages: action.messages }

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], currentSession: null }

    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const ChatContext = createContext<ChatContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface ChatProviderProps {
  children: React.ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  // -------------------------------------------------------------------------
  // RATE LIMIT STATUS
  // -------------------------------------------------------------------------

  const refreshRateLimitStatus = useCallback(async () => {
    const status = await rateLimiterService.checkRateLimit()
    dispatch({ type: 'SET_RATE_LIMIT_STATUS', status })
  }, [])

  const refreshQueuedMessages = useCallback(async () => {
    const messages = await rateLimiterService.getQueuedMessages()
    dispatch({ type: 'SET_QUEUED_MESSAGES', messages })
  }, [])

  // Refresh rate limit status periodically
  useEffect(() => {
    refreshRateLimitStatus()
    refreshQueuedMessages()

    const interval = setInterval(() => {
      refreshRateLimitStatus()
      refreshQueuedMessages()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [refreshRateLimitStatus, refreshQueuedMessages])

  // -------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // -------------------------------------------------------------------------

  const loadSessions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      log.error(' loadSessions error:', error)
      return
    }

    dispatch({ type: 'SET_SESSIONS', sessions: data || [] })
  }, [])

  const loadSession = useCallback(async (sessionId: string) => {
    dispatch({ type: 'SET_LOADING', isLoading: true })

    try {
      // Load session metadata
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      dispatch({ type: 'SET_SESSION', session })

      // Load messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      dispatch({ type: 'SET_MESSAGES', messages: messages || [] })
    } catch (err) {
      log.error(' loadSession error:', err)
      dispatch({ type: 'SET_ERROR', error: 'Failed to load chat session' })
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
  }, [])

  const createSession = useCallback(async (title?: string): Promise<ChatSession | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title || `Chat ${new Date().toLocaleDateString('pt-BR')}`,
      })
      .select()
      .single()

    if (error) {
      log.error(' createSession error:', error)
      return null
    }

    dispatch({ type: 'SET_SESSION', session: data })
    dispatch({ type: 'SET_MESSAGES', messages: [] })

    return data
  }, [])

  // -------------------------------------------------------------------------
  // MESSAGE SENDING
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async (content: string, preferredTier: ModelTier = 'standard') => {
    if (!content.trim()) return

    dispatch({ type: 'SET_SENDING', isSending: true })
    dispatch({ type: 'SET_ERROR', error: null })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      dispatch({ type: 'SET_ERROR', error: 'Not authenticated' })
      dispatch({ type: 'SET_SENDING', isSending: false })
      return
    }

    // Create session if none exists
    let sessionId = state.currentSession?.id
    if (!sessionId) {
      const newSession = await createSession()
      if (!newSession) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to create chat session' })
        dispatch({ type: 'SET_SENDING', isSending: false })
        return
      }
      sessionId = newSession.id
    }

    // Estimate tokens (rough calculation)
    const estimatedTokens = Math.ceil(content.length / 4) + 1000

    // Check rate limit
    const rateLimitStatus = await rateLimiterService.checkRateLimit(preferredTier, estimatedTokens)

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_MESSAGE', message: userMessage })

    // Save user message to database
    await supabase.from('chat_messages').insert({
      id: userMessage.id,
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content,
    })

    // Handle based on rate limit status
    if (!rateLimitStatus.canSend) {
      // Queue the message
      const { success, queuedMessage, error } = await rateLimiterService.queueMessage(content, {
        preferredTier,
        contextMessages: state.messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        estimatedTokens,
      })

      if (success && queuedMessage) {
        const queuePosition = await rateLimiterService.getQueuePosition(queuedMessage.id)

        // Add placeholder for assistant response (queued)
        const queuedAssistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sua mensagem foi adicionada \u00e0 fila (posi\u00e7\u00e3o ${queuePosition}). Ela ser\u00e1 processada quando tokens estiverem dispon\u00edveis.`,
          created_at: new Date().toISOString(),
          is_queued: true,
          queue_position: queuePosition,
        }
        dispatch({ type: 'ADD_MESSAGE', message: queuedAssistantMessage })

        await refreshQueuedMessages()
      } else {
        dispatch({ type: 'SET_ERROR', error: error || 'Failed to queue message' })
      }

      dispatch({ type: 'SET_SENDING', isSending: false })
      await refreshRateLimitStatus()
      return
    }

    // Send message to AI via Edge Function
    try {
      const tierToUse = rateLimitStatus.availableTier || 'standard'

      // Add typing indicator
      const typingId = crypto.randomUUID()
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: typingId,
          role: 'assistant',
          content: '...',
          created_at: new Date().toISOString(),
        },
      })

      const { data, error } = await supabase.functions.invoke('chat-with-aica', {
        body: {
          message: content,
          session_id: sessionId,
          tier: tierToUse,
          context_messages: state.messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      })

      if (error) throw error

      // Remove typing indicator and add real response
      dispatch({
        type: 'UPDATE_MESSAGE',
        id: typingId,
        updates: {
          content: data.response,
          model_tier: tierToUse,
          tokens_used: data.tokens_used,
        },
      })

      // Save assistant message to database
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: data.response,
        model_tier: tierToUse,
        tokens_used: data.tokens_used,
      })

      // Consume tokens
      await rateLimiterService.consumeTokens(tierToUse, data.tokens_used || estimatedTokens)
    } catch (err) {
      const error = err as Error
      log.error(' sendMessage error:', error)
      dispatch({ type: 'SET_ERROR', error: error.message })
    } finally {
      dispatch({ type: 'SET_SENDING', isSending: false })
      await refreshRateLimitStatus()
    }
  }, [state.currentSession, state.messages, createSession, refreshRateLimitStatus, refreshQueuedMessages])

  // -------------------------------------------------------------------------
  // OTHER ACTIONS
  // -------------------------------------------------------------------------

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }, [])

  const cancelQueuedMessage = useCallback(async (messageId: string) => {
    const { success } = await rateLimiterService.cancelQueuedMessage(messageId)
    if (success) {
      await refreshQueuedMessages()
    }
  }, [refreshQueuedMessages])

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  // -------------------------------------------------------------------------

  const value: ChatContextValue = {
    ...state,
    sendMessage,
    loadSession,
    createSession,
    loadSessions,
    refreshRateLimitStatus,
    refreshQueuedMessages,
    clearChat,
    cancelQueuedMessage,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

export default ChatContext
