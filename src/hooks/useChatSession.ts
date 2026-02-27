/**
 * useChatSession - Session lifecycle hook for Aica Chat
 *
 * Wraps chatService (persistence) + GeminiClient (AI calls via ADK agent-proxy).
 * NEVER calls supabase.auth.refreshSession() — uses getSession() only.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { GeminiClient } from '@/lib/gemini'
import { supabase } from '@/services/supabaseClient'
import { checkInteractionLimit, type InteractionLimitResult } from '@/services/billingService'
import { getUserAIContext } from '@/services/userAIContextService'
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
  error: string | null
  limitReached: boolean
  limitInfo: InteractionLimitResult | null
  sendMessage: (text: string) => Promise<void>
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  showSessions: boolean
  setShowSessions: (show: boolean) => void
  activeAgent: string | null
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
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [limitInfo, setLimitInfo] = useState<InteractionLimitResult | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
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
    const { data: { session: authSession } } = await supabase.auth.getSession()
    if (!authSession?.user?.id) throw new Error('Nao autenticado')
    return authSession.user.id
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setLimitReached(false)
    setIsLoading(true)

    try {
      // Check interaction limit before calling ADK (fail-open)
      try {
        const limit = await checkInteractionLimit()
        setLimitInfo(limit)
        if (!limit.allowed) {
          setLimitReached(true)
          setError(`Seus creditos mensais acabaram. ${limit.remaining} creditos restantes de ${limit.plan}.`)
          return
        }
      } catch {
        // Fail-open: if the check throws, let the message through
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

      // Get user context for ADK agents (best-effort)
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
      } catch {
        // Context enrichment is best-effort
      }

      // Build history for context (last 10 messages)
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      // Call ADK via agent-proxy
      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'agent_chat',
        payload: {
          message: trimmed,
          session_id: currentSession.id,
          history,
          context: userContext,
        },
      })

      const result = response?.result
      const responseText = result?.response || result || 'Desculpe, nao consegui gerar uma resposta.'
      const finalText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText)
      const respondingAgent: string = result?.agent || 'aica_coordinator'
      const sources: Array<{ title: string; url: string }> = result?.sources || []

      // Parse suggested actions from response
      const responseActions: ChatAction[] = Array.isArray(result?.actions)
        ? result.actions
        : []

      // Save assistant message to DB
      const savedAssistantMsg = await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: finalText,
        direction: 'outbound',
        modelUsed: 'adk-agent-proxy',
        tokensInput: response?.tokensUsed?.input,
        tokensOutput: response?.tokensUsed?.output,
      })

      setMessages(prev => [...prev, {
        ...chatMsgToDisplay(savedAssistantMsg),
        agent: respondingAgent,
        actions: responseActions,
        sources,
      }])
      setActiveAgent(respondingAgent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session, messages, isLoading, getUserId])

  const createNewSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setError(null)
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
      setActiveAgent(null)
    } catch {
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
    } catch {
      setError('Erro ao arquivar conversa')
    }
  }, [session])

  return {
    session,
    sessions,
    messages,
    isLoading,
    error,
    limitReached,
    limitInfo,
    sendMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
  }
}
