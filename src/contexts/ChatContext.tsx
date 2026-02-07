/**
 * Chat Context Provider
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Central context for managing Aica chat with rate limiting integration.
 * Handles message sending, queueing, and token consumption.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import type {
  RateLimitStatus,
  QueuedMessage,
  ModelTier,
} from '@/services/rateLimiterService'

const log = createNamespacedLogger('ChatContext')

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessageSource {
  title: string
  url: string
}

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
  agent?: string
  sources?: ChatMessageSource[]
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
    // TODO: Issue #190 - Re-enable when billing schema is deployed
    log.debug('refreshRateLimitStatus: billing disabled')
  }, [])

  const refreshQueuedMessages = useCallback(async () => {
    // TODO: Issue #190 - Re-enable when billing schema is deployed
    log.debug('refreshQueuedMessages: billing disabled')
  }, [])

  // TODO: Issue #190 - Re-enable when billing schema is deployed to Supabase
  // Temporarily disabled to prevent infinite error loop from missing database objects
  // Refresh rate limit status periodically
  // useEffect(() => {
  //   refreshRateLimitStatus()
  //   refreshQueuedMessages()
  //
  //   const interval = setInterval(() => {
  //     refreshRateLimitStatus()
  //     refreshQueuedMessages()
  //   }, 30000) // Every 30 seconds
  //
  //   return () => clearInterval(interval)
  // }, [refreshRateLimitStatus, refreshQueuedMessages])

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

      // Hydrate agent metadata from JSONB column
      const hydratedMessages: ChatMessage[] = (messages || []).map((m: any) => ({
        ...m,
        agent: m.metadata?.agent,
        sources: m.metadata?.sources,
      }))

      dispatch({ type: 'SET_MESSAGES', messages: hydratedMessages })
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

    // Create or reuse session (graceful fallback if table doesn't exist)
    let sessionId = state.currentSession?.id
    if (!sessionId) {
      const newSession = await createSession()
      if (newSession) {
        sessionId = newSession.id
      } else {
        // Fallback: use local UUID if chat_sessions table is not available
        sessionId = crypto.randomUUID()
        log.warn('Using local session ID - chat_sessions table may not exist')
      }
    }

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_MESSAGE', message: userMessage })

    // Save user message to database (best-effort, don't block on failure)
    supabase.from('chat_messages').insert({
      id: userMessage.id,
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content,
    }).then(({ error: saveError }) => {
      if (saveError) log.warn('Could not save message to DB:', saveError.message)
    })

    // Send message to AI via Edge Function
    try {
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

      // Build conversation history for context
      const history = state.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Call gemini-chat Edge Function directly
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: content,
          history,
          systemPrompt: 'Você é a Aica, assistente pessoal inteligente do AICA Life OS. Responda em português brasileiro de forma útil, concisa e amigável. Você ajuda com produtividade, planejamento, organização e bem-estar.',
        },
      })

      if (error) throw error

      // gemini-chat returns { response, success } for legacy chat
      const responseText = data?.response || data?.result?.response || ''
      if (!responseText) {
        throw new Error(data?.error || 'Resposta vazia do assistente')
      }

      // Remove typing indicator and add real response
      dispatch({
        type: 'UPDATE_MESSAGE',
        id: typingId,
        updates: {
          content: responseText,
          model_tier: preferredTier,
        },
      })

      // Save assistant message to database (best-effort)
      supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: responseText,
        model_tier: preferredTier,
      }).then(({ error: saveErr }) => {
        if (saveErr) log.warn('Could not save assistant message to DB:', saveErr.message)
      })
    } catch (err) {
      const error = err as Error
      log.error(' sendMessage error:', error)
      dispatch({ type: 'SET_ERROR', error: error.message })
    } finally {
      dispatch({ type: 'SET_SENDING', isSending: false })
    }
  }, [state.currentSession, state.messages, createSession])

  // -------------------------------------------------------------------------
  // OTHER ACTIONS
  // -------------------------------------------------------------------------

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }, [])

  const cancelQueuedMessage = useCallback(async (_messageId: string) => {
    // TODO: Issue #190 - Re-enable when billing schema is deployed
    log.debug('cancelQueuedMessage: billing disabled')
  }, [])

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
