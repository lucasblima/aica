/**
 * useChatSession - Session lifecycle hook for Aica Chat
 *
 * Wraps chatService (persistence) + GeminiClient (AI calls).
 * Uses client-side intent classification for agent-specific system prompts.
 * NEVER calls supabase.auth.refreshSession() — uses getSession() only.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { GeminiClient } from '@/lib/gemini'
import { supabase } from '@/services/supabaseClient'
import { classifyIntent } from '@/lib/agents/intentClassifier'
import { getAgentPrompt, hasAgent } from '@/lib/agents'
import type { AgentModule } from '@/lib/agents/types'
import { checkInteractionLimit, type InteractionLimitResult } from '@/services/billingService'
import type { ChatAction } from '@/types/chatActions'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: AgentModule | 'coordinator'
  actions?: ChatAction[]
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
  activeAgent: AgentModule | 'coordinator' | null
}

const BASE_SYSTEM_PROMPT = `Voce e a Aica, assistente pessoal inteligente do AICA Life OS.
Voce ajuda o usuario com produtividade, organizacao e bem-estar.
Seja concisa, amigavel e objetiva. Responda em portugues.`

function getSystemPromptForAgent(module: AgentModule | 'coordinator'): string {
  if (module !== 'coordinator' && hasAgent(module)) {
    return getAgentPrompt(module as AgentModule)
  }
  return BASE_SYSTEM_PROMPT
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
  const [activeAgent, setActiveAgent] = useState<AgentModule | 'coordinator' | null>(null)
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
      // Check interaction limit before calling AI (fail-open)
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

      // Classify intent — client-side keyword matching
      const classification = classifyIntent(trimmed)
      setActiveAgent(classification.module)

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

      // Build history for context (last 10 messages)
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      // Get agent-specific system prompt
      const systemPrompt = getSystemPromptForAgent(classification.module)

      // Call Gemini via gemini-chat Edge Function
      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'chat_aica',
        payload: {
          message: trimmed,
          history,
          systemPrompt,
          module: classification.module || 'coordinator',
        },
      })

      const responseText =
        response?.result?.response ||
        response?.result ||
        'Desculpe, nao consegui gerar uma resposta.'
      const finalText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText)

      // Parse suggested actions from response
      const responseActions: ChatAction[] = Array.isArray(response?.result?.actions)
        ? response.result.actions
        : []

      // Save assistant message to DB
      const savedAssistantMsg = await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: finalText,
        direction: 'outbound',
        modelUsed: 'gemini-2.5-flash',
        tokensInput: response?.tokensUsed?.input,
        tokensOutput: response?.tokensUsed?.output,
      })

      setMessages(prev => [...prev, {
        ...chatMsgToDisplay(savedAssistantMsg),
        agent: classification.module,
        actions: responseActions,
      }])
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
