/**
 * useChatSessionV2 - AI SDK-powered chat session hook
 *
 * Wraps `useChat` from `@ai-sdk/react` with AICA-specific logic:
 * - Session management (create, switch, archive)
 * - Billing checks before sending
 * - DB persistence of messages (chat_messages table)
 * - Morning briefing
 * - Title generation
 *
 * Returns the exact same `UseChatSessionReturn` interface as v1 for drop-in compatibility.
 * Key difference: streaming is handled natively by AI SDK (no manual SSE parsing).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { supabase } from '@/services/supabaseClient'
import { getCachedSession } from '@/services/authCacheService'
import { checkInteractionLimit, type InteractionLimitResult } from '@/services/billingService'
import type { InterviewMeta } from '@/services/chatStreamService'
import { Sentry } from '@/lib/sentry'
import type { DisplayMessage, UseChatSessionReturn } from '@/hooks/useChatSession'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat-v2`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract plain text content from a UIMessage's parts array. */
function getTextFromParts(msg: UIMessage): string {
  const texts: string[] = []
  for (const p of msg.parts) {
    if (p.type === 'text') {
      texts.push(p.text)
    }
  }
  return texts.join('')
}

/** Extract source URLs from a UIMessage's parts array. */
function getSourcesFromParts(msg: UIMessage): Array<{ title: string; url: string }> | undefined {
  const sources: Array<{ title: string; url: string }> = []
  for (const p of msg.parts) {
    if (p.type === 'source-url') {
      sources.push({ title: p.title || p.url, url: p.url })
    }
  }
  return sources.length > 0 ? sources : undefined
}

/** Check if a UIMessage has any text part still streaming. */
function isMessageStreaming(msg: UIMessage): boolean {
  for (const p of msg.parts) {
    if (p.type === 'text' && p.state === 'streaming') {
      return true
    }
  }
  return false
}

/** Convert a UIMessage (AI SDK v3) to a DisplayMessage (AICA v1 compat). */
function uiMessageToDisplay(msg: UIMessage, streaming: boolean = false): DisplayMessage {
  const text = getTextFromParts(msg)

  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: text,
    created_at: new Date().toISOString(),
    sources: getSourcesFromParts(msg),
    isStreaming: streaming || isMessageStreaming(msg),
  }
}

/** Convert a ChatMessage (DB) to a UIMessage (AI SDK). */
function chatMsgToUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  }
}

// ---------------------------------------------------------------------------
// Transport — instantiated once outside the hook to avoid re-creation
// ---------------------------------------------------------------------------

const chatTransport = new DefaultChatTransport({
  api: API_URL,
  headers: async () => {
    const { session } = await getCachedSession()
    return {
      Authorization: `Bearer ${session?.access_token || ''}`,
      apikey: ANON_KEY,
    }
  },
})

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatSessionV2(): UseChatSessionReturn {
  // Session management state
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showSessions, setShowSessions] = useState(false)

  // Billing state
  const [limitReached, setLimitReached] = useState(false)
  const [limitInfo, setLimitInfo] = useState<InteractionLimitResult | null>(null)

  // UI state not covered by useChat
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected')
  const [suggestedQuestions] = useState<string[]>([])
  const [hookError, setHookError] = useState<string | null>(null)

  // Refs
  const initRef = useRef(false)
  const sessionRef = useRef<ChatSession | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const messageCountOnSendRef = useRef(0)

  // Keep sessionRef in sync
  sessionRef.current = session

  // -------------------------------------------------------------------------
  // Auth helper
  // -------------------------------------------------------------------------

  const getUserId = useCallback(async (): Promise<string> => {
    const { session: authSession } = await getCachedSession()
    if (!authSession?.user?.id) throw new Error('Nao autenticado')
    currentUserIdRef.current = authSession.user.id
    return authSession.user.id
  }, [])

  // -------------------------------------------------------------------------
  // AI SDK useChat
  // -------------------------------------------------------------------------

  const {
    messages: aiMessages,
    sendMessage: aiSendMessage,
    regenerate,
    status: aiStatus,
    error: aiError,
    setMessages: setAiMessages,
  } = useChat({
    transport: chatTransport,

    // Callback: assistant message completed
    onFinish: async ({ message }) => {
      const currentSession = sessionRef.current
      const userId = currentUserIdRef.current
      if (!currentSession || !userId) return

      const content = getTextFromParts(message)
      if (!content) return

      // Persist assistant message to DB (fire-and-forget)
      chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content,
        direction: 'outbound',
        modelUsed: 'gemini-chat-v2',
      }).catch(err => {
        console.error('[useChatSessionV2] Failed to save assistant message:', err)
      })

      // Generate title for new sessions (fire-and-forget)
      if (messageCountOnSendRef.current <= 1) {
        supabase.functions.invoke('gemini-chat', {
          body: {
            action: 'generate_title',
            payload: { message: lastUserTextRef.current, response: content },
          },
        }).then(async (resp) => {
          if (resp.data?.success && resp.data?.title) {
            const newTitle = resp.data.title
            await chatService.updateSessionTitle(currentSession.id, newTitle)
            setSession(prev => prev ? { ...prev, title: newTitle } : prev)
            setSessions(prev => prev.map(s =>
              s.id === currentSession.id ? { ...s, title: newTitle } : s
            ))
          }
        }).catch(err => console.warn('[useChatSessionV2] Title generation failed:', err))
      }

      setConnectionStatus('connected')
      setLastFailedMessage(null)
      setHookError(null)

      // Sentry breadcrumb: success
      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'v2_message_complete',
        level: 'info',
        data: { sessionId: currentSession.id },
      })
    },

    // Callback: error
    onError: (error) => {
      console.error('[useChatSessionV2] AI SDK error:', error)
      setHookError(error.message || 'Erro ao conectar com a Aica')
      setConnectionStatus('offline')

      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'v2_message_failed',
        level: 'error',
        data: { error: error.message },
      })
    },
  })

  // Ref to track the last user message text (for title generation in onFinish)
  const lastUserTextRef = useRef('')

  // Reply-to state (mirrors V1 hook interface)
  const [replyTo, setReplyTo] = useState<DisplayMessage | null>(null)

  // -------------------------------------------------------------------------
  // Derived state: map AI SDK messages to DisplayMessage[]
  // -------------------------------------------------------------------------

  const isStreaming = aiStatus === 'streaming'
  const isSubmitted = aiStatus === 'submitted'
  const isLoading = isSubmitted || isStreaming

  const displayMessages: DisplayMessage[] = useMemo(() => {
    return aiMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(msg => uiMessageToDisplay(msg, isStreaming && msg === aiMessages[aiMessages.length - 1]))
  }, [aiMessages, isStreaming])

  // Compute streamedText from the last assistant message when streaming
  const streamedText = useMemo(() => {
    if (!isStreaming) return ''
    const lastMsg = aiMessages[aiMessages.length - 1]
    if (lastMsg?.role === 'assistant') {
      return getTextFromParts(lastMsg)
    }
    return ''
  }, [aiMessages, isStreaming])

  // Compute error: prefer hookError (our own), fallback to aiError
  const error = hookError || (aiError ? aiError.message : null)

  // -------------------------------------------------------------------------
  // Load sessions on mount
  // -------------------------------------------------------------------------

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatService.getActiveSessions(10)
      setSessions(list)

      // Auto-load most recent session's messages
      if (list.length > 0) {
        const latest = list[0]
        setSession(latest)
        const msgs = await chatService.getSessionMessages(latest.id)
        setAiMessages(msgs.map(chatMsgToUIMessage))
      }
    } catch {
      // Silently fail -- user can still start new conversation
    }
  }, [setAiMessages])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Morning briefing: show once per day between 6-12h BRT
  // -------------------------------------------------------------------------

  const fetchMorningBriefing = useCallback(async () => {
    const now = new Date()
    const brtHour = parseInt(
      now.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })
    )
    if (brtHour < 6 || brtHour >= 12) return

    const todayKey = `aica_briefing_${now.toISOString().split('T')[0]}`
    if (localStorage.getItem(todayKey)) return

    try {
      const resp = await supabase.functions.invoke('gemini-chat', {
        body: { action: 'generate_morning_briefing', payload: {} },
      })
      if (resp.data?.success && resp.data?.briefing) {
        localStorage.setItem(todayKey, '1')
        // Inject briefing as an assistant message in AI SDK messages
        const briefingMsg: UIMessage = {
          id: `briefing-${Date.now()}`,
          role: 'assistant',
          parts: [{ type: 'text', text: resp.data.briefing }],
        }
        setAiMessages(prev => prev.length === 0 ? [briefingMsg] : prev)
      }
    } catch (err) {
      console.warn('[useChatSessionV2] Morning briefing failed:', err)
    }
  }, [setAiMessages])

  // Trigger briefing when hook loads with no messages
  useEffect(() => {
    if (aiMessages.length === 0 && !session) {
      fetchMorningBriefing()
    }
  }, [aiMessages.length, session, fetchMorningBriefing])

  // -------------------------------------------------------------------------
  // sendMessage - wraps AI SDK sendMessage with billing + persistence
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async (text: string, _interviewMeta?: InterviewMeta) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setLimitReached(false)
    setHookError(null)
    const sendStartMs = Date.now()

    try {
      // 1. Billing check (fail-open)
      try {
        const limit = await checkInteractionLimit()
        setLimitInfo(limit)
        if (!limit.allowed) {
          setLimitReached(true)
          setHookError(`Seus creditos mensais acabaram. ${limit.remaining} creditos restantes de ${limit.plan}.`)
          return
        }
      } catch (limitErr) {
        console.warn('[useChatSessionV2] Billing check failed, failing open:', limitErr)
      }

      // 2. Get userId
      const userId = await getUserId()

      // 3. Create session lazily if none exists
      let currentSession = sessionRef.current
      if (!currentSession) {
        const title = trimmed.slice(0, 60)
        currentSession = await chatService.createSession(userId, title)
        setSession(currentSession)
        sessionRef.current = currentSession
        setSessions(prev => [currentSession!, ...prev])
      }

      // 4. Save user message to chat_messages DB
      await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: trimmed,
        direction: 'inbound',
      })

      // Track state for onFinish callback
      messageCountOnSendRef.current = aiMessages.length
      lastUserTextRef.current = trimmed

      // 5. Call AI SDK sendMessage -- it handles streaming automatically
      //    Send session_id in the request body via ChatRequestOptions
      await aiSendMessage({
        text: trimmed,
      }, {
        body: {
          session_id: currentSession.id,
        },
      })

      // Sentry breadcrumb: sent
      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'v2_message_sent',
        level: 'info',
        data: { latencyMs: Date.now() - sendStartMs },
      })
    } catch (err) {
      console.error('[useChatSessionV2] sendMessage failed:', err)
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'

      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'v2_message_failed',
        level: 'error',
        data: { latencyMs: Date.now() - sendStartMs, error: message },
      })

      setHookError(message)
      setLastFailedMessage(trimmed)
      setConnectionStatus('offline')
    }
  }, [isLoading, getUserId, aiMessages.length, aiSendMessage])

  // -------------------------------------------------------------------------
  // retryLastMessage
  // -------------------------------------------------------------------------

  const retryLastMessage = useCallback(async () => {
    if (lastFailedMessage) {
      const msg = lastFailedMessage
      setHookError(null)
      await sendMessage(msg)
    } else {
      // If no failed message, try to regenerate the last assistant response
      try {
        await regenerate()
      } catch (err) {
        console.error('[useChatSessionV2] Retry failed:', err)
      }
    }
  }, [lastFailedMessage, sendMessage, regenerate])

  // -------------------------------------------------------------------------
  // Session management
  // -------------------------------------------------------------------------

  const createNewSession = useCallback(() => {
    setSession(null)
    sessionRef.current = null
    setAiMessages([])
    setHookError(null)
    setLastFailedMessage(null)
    setShowSessions(false)
    setActiveAgent(null)
    setConnectionStatus('connected')
  }, [setAiMessages])

  const switchSession = useCallback(async (sessionId: string) => {
    try {
      const msgs = await chatService.getSessionMessages(sessionId)
      setAiMessages(msgs.map(chatMsgToUIMessage))

      const target = sessions.find(s => s.id === sessionId) || null
      setSession(target)
      sessionRef.current = target
      setShowSessions(false)
      setHookError(null)
      setLastFailedMessage(null)
      setActiveAgent(null)
      setConnectionStatus('connected')
    } catch (err) {
      console.error('[useChatSessionV2] Failed to switch session:', sessionId, err)
      setHookError('Erro ao carregar conversa')
    }
  }, [sessions, setAiMessages])

  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      await chatService.archiveSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))

      if (session?.id === sessionId) {
        setSession(null)
        sessionRef.current = null
        setAiMessages([])
        setActiveAgent(null)
      }

      // Fire-and-forget: generate session summary for future context
      supabase.functions.invoke('summarize-chat-session', {
        body: { session_id: sessionId },
      }).catch(err => console.warn('[useChatSessionV2] Summary generation failed:', err))
    } catch (err) {
      console.error('[useChatSessionV2] Failed to archive session:', sessionId, err)
      setHookError('Erro ao arquivar conversa')
    }
  }, [session, setAiMessages])

  // -------------------------------------------------------------------------
  // Return -- exact same shape as UseChatSessionReturn
  // -------------------------------------------------------------------------

  return {
    session,
    sessions,
    messages: displayMessages,
    isLoading,
    isStreaming,
    streamedText,
    error,
    limitReached,
    limitInfo,
    suggestedQuestions,
    sendMessage,
    retryLastMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
    lastFailedMessage,
    connectionStatus,
    replyTo,
    setReplyTo,
  }
}
