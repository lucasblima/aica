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
import { streamChat, fetchChatNonStreaming, type InterviewMeta } from '@/services/chatStreamService'
import type { ChatAction } from '@/types/chatActions'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: string
  actions?: ChatAction[]
  sources?: Array<{ title: string; url: string }>
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
  sendMessage: (text: string, interviewMeta?: InterviewMeta) => Promise<void>
  retryLastMessage: () => Promise<void>
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  showSessions: boolean
  setShowSessions: (show: boolean) => void
  activeAgent: string | null
  lastFailedMessage: string | null
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
  const initRef = useRef(false)

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

  const getUserId = useCallback(async (): Promise<string> => {
    const { session: authSession } = await getCachedSession()
    if (!authSession?.user?.id) throw new Error('Nao autenticado')
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
  }> => {
    setIsStreaming(true)
    setStreamedText('')

    let fullText = ''
    let agent = 'aica_coordinator'
    let actions: ChatAction[] = []
    let usage: { input: number; output: number } | undefined

    for await (const event of streamChat(sessionId, message, history, context, interviewMeta)) {
      if (event.type === 'token') {
        fullText += event.content
        setStreamedText(fullText)
      } else if (event.type === 'done') {
        fullText = event.fullText || fullText
        agent = event.agent || 'aica_coordinator'
        actions = Array.isArray(event.actions) ? event.actions as ChatAction[] : []
        usage = event.usage
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

    return { text: fullText, agent, actions, usage }
  }, [])

  const sendMessage = useCallback(async (text: string, interviewMeta?: InterviewMeta) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    // Don't clear error eagerly — only clear on success
    setLimitReached(false)
    setIsLoading(true)

    try {
      // Check interaction limit before calling AI (fail-open)
      try {
        const limit = await checkInteractionLimit()
        setLimitInfo(limit)
        if (!limit.allowed) {
          setLimitReached(true)
          setError(`Seus creditos mensais acabaram. ${limit.remaining} creditos restantes de ${limit.plan}.`)
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
      } catch (streamErr) {
        // Streaming failed — fallback to non-streaming chat_aica
        console.warn('[useChatSession] Streaming failed, falling back to non-streaming:', streamErr)
        setIsStreaming(false)
        setStreamedText('')
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
      }

      // Success — clear streaming state, save to DB, append final message
      setIsStreaming(false)
      setStreamedText('')

      const savedAssistantMsg = await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: finalText,
        direction: 'outbound',
        modelUsed,
        tokensInput,
        tokensOutput,
      })

      setMessages(prev => [...prev, {
        ...chatMsgToDisplay(savedAssistantMsg),
        agent: respondingAgent,
        actions: responseActions,
      }])
      setActiveAgent(respondingAgent)

      // Clear error and failed message on success
      setError(null)
      setLastFailedMessage(null)
    } catch (err) {
      console.error('[useChatSession] sendMessage failed:', err)
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'
      setError(message)
      setLastFailedMessage(trimmed)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamedText('')
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
    setShowSessions(false)
    setActiveAgent(null)
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
      setActiveAgent(null)
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
    sendMessage,
    retryLastMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
    lastFailedMessage,
  }
}
