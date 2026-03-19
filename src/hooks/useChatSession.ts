/**
 * useChatSession - Session lifecycle hook for Aica Chat
 *
 * Wraps chatService (persistence) + streaming via chatStreamService.
 * Streaming is tried first; on failure falls back to non-streaming gemini-chat.
 * NEVER calls supabase.auth.refreshSession() — uses getSession() only.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { supabase } from '@/services/supabaseClient'
import { getCachedSession } from '@/services/authCacheService'
import { checkInteractionLimit, type InteractionLimitResult } from '@/services/billingService'
import { getUserAIContext } from '@/services/userAIContextService'
import { streamChat, fetchChatNonStreaming, fetchReactChat, type InterviewMeta } from '@/services/chatStreamService'
import type { ChatAction } from '@/types/chatActions'
import { Sentry } from '@/lib/sentry'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: string
  actions?: ChatAction[]
  sources?: Array<{ title: string; url: string }>
  isStreaming?: boolean
}

export interface UseChatSessionReturn {
  session: ChatSession | null
  sessions: ChatSession[]
  messages: DisplayMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamedText: string
  error: string | null
  limitReached: boolean
  limitInfo: InteractionLimitResult | null
  suggestedQuestions: string[]
  sendMessage: (text: string, interviewMeta?: InterviewMeta) => Promise<void>
  retryLastMessage: () => Promise<void>
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  showSessions: boolean
  setShowSessions: (show: boolean) => void
  activeAgent: string | null
  lastFailedMessage: string | null
  connectionStatus: 'connected' | 'degraded' | 'offline'
}

function chatMsgToDisplay(msg: ChatMessage): DisplayMessage {
  return {
    id: msg.id,
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content,
    created_at: msg.created_at,
  }
}

export function useChatSession(): UseChatSessionReturn {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [limitInfo, setLimitInfo] = useState<InteractionLimitResult | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected')
  const initRef = useRef(false)
  const streamedTextRef = useRef('')
  const streamingMsgIdRef = useRef<string | null>(null)

  // Load sessions on mount
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    loadSessions()
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatService.getActiveSessions(10)
      setSessions(list)

      // Auto-load most recent session's messages
      if (list.length > 0) {
        const latest = list[0]
        setSession(latest)
        const msgs = await chatService.getSessionMessages(latest.id)
        setMessages(msgs.map(chatMsgToDisplay))
      }
    } catch {
      // Silently fail — user can still start new conversation
    }
  }, [])

  // Morning briefing: show once per day between 6-12h BRT
  const fetchMorningBriefing = useCallback(async () => {
    const now = new Date()
    const brtHour = parseInt(now.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }))
    if (brtHour < 6 || brtHour >= 12) return // Only 6-12h BRT

    const todayKey = `aica_briefing_${now.toISOString().split('T')[0]}`
    if (localStorage.getItem(todayKey)) return // Already shown today

    try {
      const resp = await supabase.functions.invoke('gemini-chat', {
        body: { action: 'generate_morning_briefing', payload: {} },
      })
      if (resp.data?.success && resp.data?.briefing) {
        localStorage.setItem(todayKey, '1')
        const briefingMsg: DisplayMessage = {
          id: `briefing-${Date.now()}`,
          role: 'assistant',
          content: resp.data.briefing,
          created_at: new Date().toISOString(),
          agent: 'aica_coordinator',
        }
        setMessages(prev => prev.length === 0 ? [briefingMsg] : prev)
      }
    } catch (err) {
      console.warn('[useChatSession] Morning briefing failed:', err)
    }
  }, [])

  // Trigger briefing when hook loads with no messages
  useEffect(() => {
    if (messages.length === 0 && !session) {
      fetchMorningBriefing()
    }
  }, [messages.length, session, fetchMorningBriefing])

  const getUserId = useCallback(async (): Promise<string> => {
    const { session: authSession } = await getCachedSession()
    if (!authSession?.user?.id) throw new Error('Não autenticado')
    return authSession.user.id
  }, [])

  /**
   * Try streaming via chatStreamService (SSE).
   * Returns { text, agent, actions, usage } or throws on failure.
   */
  const tryStreaming = useCallback(async (
    sessionId: string,
    message: string,
    history: Array<{ role: string; content: string }>,
    context?: Record<string, unknown>,
    interviewMeta?: InterviewMeta,
  ): Promise<{
    text: string
    agent: string
    actions: ChatAction[]
    usage?: { input: number; output: number }
    suggestedQuestions: string[]
  }> => {
    setIsStreaming(true)
    setStreamedText('')
    streamedTextRef.current = ''

    let fullText = ''
    let agent = 'aica_coordinator'
    let actions: ChatAction[] = []
    let usage: { input: number; output: number } | undefined
    let suggestedQs: string[] = []

    for await (const event of streamChat(sessionId, message, history, context, interviewMeta)) {
      if (event.type === 'token') {
        fullText += event.content
        setStreamedText(fullText)
        streamedTextRef.current = fullText
      } else if (event.type === 'done') {
        fullText = event.fullText || fullText
        agent = event.agent || 'aica_coordinator'
        actions = Array.isArray(event.actions) ? event.actions as ChatAction[] : []
        usage = event.usage
        suggestedQs = Array.isArray(event.suggested_questions) ? event.suggested_questions as string[] : []
      } else if (event.type === 'agent_detected') {
        agent = event.agent
        setActiveAgent(event.agent)
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }

    if (!fullText) {
      throw new Error('Empty streaming response')
    }

    return { text: fullText, agent, actions, usage, suggestedQuestions: suggestedQs }
  }, [])

  const sendMessage = useCallback(async (text: string, interviewMeta?: InterviewMeta) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    // Don't clear error eagerly — only clear on success
    setLimitReached(false)
    setSuggestedQuestions([])
    setIsLoading(true)
    const sendStartMs = Date.now()

    try {
      // Check interaction limit before calling AI (fail-open)
      try {
        const limit = await checkInteractionLimit()
        setLimitInfo(limit)
        if (!limit.allowed) {
          setLimitReached(true)
          setError(`Seus créditos mensais acabaram. ${limit.remaining} créditos restantes de ${limit.plan}.`)
          return
        }
      } catch (limitErr) {
        console.warn('[useChatSession] Billing check failed, failing open:', limitErr)
      }

      const userId = await getUserId()

      // Create session lazily if none exists
      let currentSession = session
      if (!currentSession) {
        const title = trimmed.slice(0, 60)
        currentSession = await chatService.createSession(userId, title)
        setSession(currentSession)
        setSessions(prev => [currentSession!, ...prev])
      }

      // Optimistic user message
      const tempUserMsg: DisplayMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempUserMsg])

      // Save user message to DB
      const savedUserMsg = await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: trimmed,
        direction: 'inbound',
      })

      // Replace temp with saved
      setMessages(prev =>
        prev.map(m => m.id === tempUserMsg.id
          ? chatMsgToDisplay(savedUserMsg)
          : m
        )
      )

      // Get user context for AI (best-effort)
      let userContext: Record<string, unknown> | undefined
      try {
        const ctx = await getUserAIContext()
        if (ctx) {
          userContext = {
            userName: ctx.userName,
            pendingTasks: ctx.pendingTasks,
            completedTasksToday: ctx.completedTasksToday,
            activeGrants: ctx.activeGrants,
            upcomingEpisodes: ctx.upcomingEpisodes,
            patterns: ctx.patterns,
            latestInsight: ctx.latestInsight,
            lifeScore: ctx.lifeScore,
          }
        }
      } catch (ctxErr) {
        console.warn('[useChatSession] Context enrichment failed:', ctxErr)
      }

      // Build history for context (last 10 messages)
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      let finalText: string
      let respondingAgent = 'aica_coordinator'
      let responseActions: ChatAction[] = []
      let tokensInput: number | undefined
      let tokensOutput: number | undefined
      let modelUsed = 'gemini-chat-stream'

      // Insert streaming placeholder — single render path, no separate bubble
      const streamingId = `streaming-${Date.now()}`
      streamingMsgIdRef.current = streamingId
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant' as const,
        content: '',
        created_at: new Date().toISOString(),
        isStreaming: true,
      }])

      // Strategy: try streaming first, fallback to non-streaming gemini-chat
      try {
        const streamResult = await tryStreaming(
          currentSession.id,
          trimmed,
          history,
          userContext,
          interviewMeta,
        )
        finalText = streamResult.text
        respondingAgent = streamResult.agent
        responseActions = streamResult.actions
        tokensInput = streamResult.usage?.input
        tokensOutput = streamResult.usage?.output
        setSuggestedQuestions(streamResult.suggestedQuestions || [])
        setConnectionStatus('connected')
      } catch (streamErr) {
        // Streaming failed — check if we got partial content before falling back
        console.warn('[useChatSession] Streaming failed:', streamErr)
        setIsStreaming(false)

        const partialContent = streamedTextRef.current
        if (partialContent && partialContent.length > 50) {
          // Streaming delivered substantial content — use it, skip fallback
          console.info('[useChatSession] Using partial streamed content (%d chars)', partialContent.length)
          finalText = partialContent
          respondingAgent = 'aica_coordinator'
          responseActions = []
          modelUsed = 'gemini-chat-stream-partial'
          setStreamedText('')
          streamedTextRef.current = ''
          setSuggestedQuestions([])
          setConnectionStatus('connected')
        } else {
          // No substantial content — run fallback chain
          setStreamedText('')
          streamedTextRef.current = ''

          try {
            // Try ReACT agent first — provides context-enriched responses
            modelUsed = 'react-agent'
            const reactResult = await fetchReactChat(
              currentSession.id,
              trimmed,
              history,
              userContext,
            )
            finalText = reactResult.text
            respondingAgent = reactResult.agent
            responseActions = []
            tokensInput = reactResult.usage?.input
            tokensOutput = reactResult.usage?.output
            setSuggestedQuestions([])
            setConnectionStatus('connected')
          } catch (reactErr) {
            // ReACT also failed — final fallback to basic non-streaming chat
            console.warn('[useChatSession] ReACT failed, falling back to basic chat:', reactErr)
            modelUsed = 'gemini-chat-fallback'

            const fallbackResult = await fetchChatNonStreaming(
              currentSession.id,
              trimmed,
              history,
              userContext,
            )
            finalText = fallbackResult.text
            respondingAgent = fallbackResult.agent
            responseActions = Array.isArray(fallbackResult.actions) ? fallbackResult.actions as ChatAction[] : []
            tokensInput = fallbackResult.usage?.input
            tokensOutput = fallbackResult.usage?.output
            setSuggestedQuestions([])
            setConnectionStatus('degraded')
          }
        }
      }

      // Replace streaming placeholder with final message (in-place, never append)
      const tempAssistantId = `temp-assistant-${Date.now()}`
      const streamingIdForReplace = streamingMsgIdRef.current
      setMessages(prev => prev.map(m =>
        m.id === streamingIdForReplace
          ? {
              id: tempAssistantId,
              role: 'assistant' as const,
              content: finalText,
              created_at: m.created_at,
              agent: respondingAgent,
              actions: responseActions,
              isStreaming: false,
            }
          : m
      ))
      streamingMsgIdRef.current = null
      setActiveAgent(respondingAgent)

      // Clear streaming state
      setIsStreaming(false)
      setStreamedText('')
      streamedTextRef.current = ''

      // Save to DB (fire-and-forget for display, but await for consistency)
      chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: finalText,
        direction: 'outbound',
        modelUsed,
        tokensInput,
        tokensOutput,
      }).then(savedMsg => {
        // Replace temp with DB-saved version (gets real ID)
        setMessages(prev => prev.map(m =>
          m.id === tempAssistantId ? { ...chatMsgToDisplay(savedMsg), agent: respondingAgent, actions: responseActions } : m
        ))
      }).catch(err => {
        console.error('[useChatSession] Failed to save assistant message:', err)
        // Message stays visible with temp ID — user doesn't lose the response
      })

      // Generate AI title for new sessions (fire-and-forget)
      if (currentSession && messages.length <= 1) {
        supabase.functions.invoke('gemini-chat', {
          body: {
            action: 'generate_title',
            payload: {
              message: trimmed,
              response: finalText,
            },
          },
        }).then(async (resp) => {
          if (resp.data?.success && resp.data?.title) {
            const newTitle = resp.data.title
            await chatService.updateSessionTitle(currentSession!.id, newTitle)
            setSession(prev => prev ? { ...prev, title: newTitle } : prev)
            setSessions(prev => prev.map(s => s.id === currentSession!.id ? { ...s, title: newTitle } : s))
          }
        }).catch(err => console.warn('[useChatSession] Title generation failed:', err))
      }

      // Sentry breadcrumb: success
      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'message_sent',
        level: 'info',
        data: { modelUsed, latencyMs: Date.now() - sendStartMs, success: true },
      })

      // Clear error and failed message on success
      setError(null)
      setLastFailedMessage(null)
    } catch (err) {
      console.error('[useChatSession] sendMessage failed:', err)
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'

      // Remove streaming placeholder on total failure
      if (streamingMsgIdRef.current) {
        const failedId = streamingMsgIdRef.current
        setMessages(prev => prev.filter(m => m.id !== failedId))
        streamingMsgIdRef.current = null
      }

      // Sentry breadcrumb: failure
      Sentry.addBreadcrumb({
        category: 'chat',
        message: 'message_failed',
        level: 'error',
        data: { latencyMs: Date.now() - sendStartMs, error: message },
      })

      setError(message)
      setLastFailedMessage(trimmed)
      setConnectionStatus('offline')
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamedText('')
      streamedTextRef.current = ''
      streamingMsgIdRef.current = null
    }
  }, [session, messages, isLoading, getUserId, tryStreaming])

  const retryLastMessage = useCallback(async () => {
    if (!lastFailedMessage) return
    const msg = lastFailedMessage
    // Don't clear error/lastFailedMessage here — sendMessage clears on success
    await sendMessage(msg)
  }, [lastFailedMessage, sendMessage])

  const createNewSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setError(null)
    setLastFailedMessage(null)
    setSuggestedQuestions([])
    setShowSessions(false)
    setActiveAgent(null)
    setConnectionStatus('connected')
  }, [])

  const switchSession = useCallback(async (sessionId: string) => {
    try {
      const msgs = await chatService.getSessionMessages(sessionId)
      setMessages(msgs.map(chatMsgToDisplay))

      const target = sessions.find(s => s.id === sessionId) || null
      setSession(target)
      setShowSessions(false)
      setError(null)
      setLastFailedMessage(null)
      setSuggestedQuestions([])
      setActiveAgent(null)
      setConnectionStatus('connected')
    } catch (err) {
      console.error('[useChatSession] Failed to switch session:', sessionId, err)
      setError('Erro ao carregar conversa')
    }
  }, [sessions])

  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      await chatService.archiveSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))

      if (session?.id === sessionId) {
        setSession(null)
        setMessages([])
        setActiveAgent(null)
      }

      // Fire-and-forget: generate session summary for future context
      supabase.functions.invoke('summarize-chat-session', {
        body: { session_id: sessionId },
      }).catch(err => console.warn('[useChatSession] Summary generation failed:', err))
    } catch (err) {
      console.error('[useChatSession] Failed to archive session:', sessionId, err)
      setError('Erro ao arquivar conversa')
    }
  }, [session])

  return {
    session,
    sessions,
    messages,
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
  }
}
