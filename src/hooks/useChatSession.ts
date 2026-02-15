/**
 * useChatSession - Session lifecycle hook for Aica Chat
 *
 * Wraps chatService (persistence) + GeminiClient (AI calls).
 * Integrates client-side intent classification for agent routing.
 * NEVER calls supabase.auth.refreshSession() — uses getSession() only.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { GeminiClient } from '@/lib/gemini'
import { supabase } from '@/services/supabaseClient'
import { classifyIntent, type IntentResult } from '@/lib/agents/intentClassifier'
import { getAgentPrompt, hasAgent } from '@/lib/agents'
import type { AgentModule } from '@/lib/agents/types'
import type { TrustLevel } from '@/lib/agents/trustLevel'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: AgentModule | 'coordinator'
  classification?: IntentResult
}

export interface UseChatSessionReturn {
  session: ChatSession | null
  sessions: ChatSession[]
  messages: DisplayMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  showSessions: boolean
  setShowSessions: (show: boolean) => void
  activeAgent: AgentModule | 'coordinator' | null
  lastClassification: IntentResult | null
  reclassifyLastMessage: () => Promise<void>
  isReclassifying: boolean
}

const BASE_SYSTEM_PROMPT = `Voce e a Aica, assistente pessoal inteligente do AICA Life OS.
Voce ajuda o usuario com produtividade, organizacao e bem-estar.
Seja concisa, amigavel e objetiva. Responda em portugues.`

const TRUST_SUFFIXES: Record<TrustLevel, string> = {
  suggest_confirm: '\n\nVoce esta no modo "Sugerir e Confirmar". Sugira acoes e peca confirmacao antes de executar qualquer mudanca no sistema.',
  execute_validate: '\n\nVoce esta no modo "Executar e Validar". Quando tiver alta confianca, execute acoes diretamente e informe o resultado para validacao.',
  jarvis: '\n\nModo Jarvis ativo. Execute acoes autonomamente, otimize proativamente e informe resultados. O usuario confia no seu julgamento.',
}

function chatMsgToDisplay(msg: ChatMessage): DisplayMessage {
  return {
    id: msg.id,
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content,
    created_at: msg.created_at,
  }
}

/**
 * Get the system prompt for a classified agent module + trust level.
 * Falls back to the default BASE_SYSTEM_PROMPT for coordinator or unknown modules.
 */
function getSystemPromptForAgent(
  module: AgentModule | 'coordinator',
  trustLevel: TrustLevel = 'suggest_confirm'
): string {
  const base = module !== 'coordinator' && hasAgent(module)
    ? getAgentPrompt(module as AgentModule)
    : BASE_SYSTEM_PROMPT
  return base + TRUST_SUFFIXES[trustLevel]
}

export function useChatSession(trustLevel: TrustLevel = 'suggest_confirm'): UseChatSessionReturn {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [activeAgent, setActiveAgent] = useState<AgentModule | 'coordinator' | null>(null)
  const [lastClassification, setLastClassification] = useState<IntentResult | null>(null)
  const [isReclassifying, setIsReclassifying] = useState(false)
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
    setIsLoading(true)

    try {
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
      setLastClassification(classification)
      setActiveAgent(classification.module)

      // Optimistic user message
      const tempUserMsg: DisplayMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
        classification,
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
          ? { ...chatMsgToDisplay(savedUserMsg), classification }
          : m
        )
      )

      // Build history for context (last 10 messages)
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      // Get agent-specific system prompt with trust level
      const systemPrompt = getSystemPromptForAgent(classification.module, trustLevel)

      // Call Gemini — reuses chat_aica with agent-specific systemPrompt
      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'chat_aica',
        payload: {
          message: trimmed,
          history,
          systemPrompt,
        },
      })

      const responseText =
        response?.result?.response ||
        response?.result ||
        'Desculpe, nao consegui gerar uma resposta.'
      const finalText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText)

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
        classification,
      }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session, messages, isLoading, getUserId, trustLevel])

  /**
   * Re-classify the last user message via server-side Gemini classification.
   * Replaces the last assistant response with a new one from the correct agent.
   */
  const reclassifyLastMessage = useCallback(async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg || isLoading || isReclassifying) return

    setIsReclassifying(true)
    setError(null)

    try {
      const userId = await getUserId()
      const client = GeminiClient.getInstance()

      // Server-side classification via Edge Function
      const classifyResponse = await client.call({
        action: 'classify_intent',
        payload: { message: lastUserMsg.content },
      })

      const serverResult = classifyResponse?.result?.classification
      if (!serverResult?.module) {
        setError('Nao foi possivel reclassificar')
        return
      }

      const newClassification: IntentResult = {
        module: serverResult.module,
        confidence: serverResult.confidence || 0.9,
        actionHint: serverResult.action_hint || '',
        needsServerClassification: false,
      }

      setLastClassification(newClassification)
      setActiveAgent(serverResult.module)

      // Re-send with new agent prompt + trust level
      const systemPrompt = getSystemPromptForAgent(serverResult.module, trustLevel)
      const history = messages
        .slice(-10)
        .filter(m => m.content !== lastUserMsg.content)
        .map(m => ({ role: m.role, content: m.content }))

      const response = await client.call({
        action: 'chat_aica',
        payload: {
          message: lastUserMsg.content,
          history,
          systemPrompt,
        },
      })

      const responseText =
        response?.result?.response ||
        response?.result ||
        'Desculpe, nao consegui gerar uma resposta.'
      const finalText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText)

      // Save new response to DB
      if (!session) return
      const savedMsg = await chatService.saveMessage({
        sessionId: session.id,
        userId,
        content: finalText,
        direction: 'outbound',
        modelUsed: 'gemini-2.5-flash',
      })

      // Replace last assistant message in UI
      setMessages(prev => {
        const msgs = [...prev]
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant') {
            msgs[i] = {
              ...chatMsgToDisplay(savedMsg),
              agent: serverResult.module,
              classification: newClassification,
            }
            break
          }
        }
        return msgs
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reclassificar')
    } finally {
      setIsReclassifying(false)
    }
  }, [messages, isLoading, isReclassifying, session, getUserId, trustLevel])

  const createNewSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setError(null)
    setShowSessions(false)
    setActiveAgent(null)
    setLastClassification(null)
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
      setLastClassification(null)
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
        setLastClassification(null)
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
    sendMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
    lastClassification,
    reclassifyLastMessage,
    isReclassifying,
  }
}
