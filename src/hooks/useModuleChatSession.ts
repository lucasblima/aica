/**
 * useModuleChatSession - Persistent chat sessions for module-specific agents
 *
 * Merges persistence from useChatSession (chat_sessions/chat_messages tables)
 * with agent-specific Gemini calls (chat_with_agent action).
 *
 * Each module gets its own session history, separate from the global AicaChatFAB.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatSession, type ChatMessage } from '@/services/chatService'
import { GeminiClient } from '@/lib/gemini'
import { supabase } from '@/services/supabaseClient'
import type { AgentModule } from '@/lib/agents/types'

export interface ModuleDisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  timestamp?: string
}

export interface UseModuleChatSessionReturn {
  session: ChatSession | null
  sessions: ChatSession[]
  messages: ModuleDisplayMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (text: string, moduleData?: Record<string, any>) => Promise<void>
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  showSessions: boolean
  setShowSessions: (show: boolean) => void
}

function chatMsgToModuleDisplay(msg: ChatMessage): ModuleDisplayMessage {
  return {
    id: msg.id,
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content,
    created_at: msg.created_at,
    timestamp: msg.created_at,
  }
}

export function useModuleChatSession(module: AgentModule): UseModuleChatSessionReturn {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<ModuleDisplayMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const initRef = useRef(false)

  // Load module sessions on mount
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    loadSessions()
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatService.getModuleSessions(module, 20)
      setSessions(list)

      // Auto-load most recent session
      if (list.length > 0) {
        const latest = list[0]
        setSession(latest)
        const msgs = await chatService.getSessionMessages(latest.id)
        setMessages(msgs.map(chatMsgToModuleDisplay))
      }
    } catch {
      // Silently fail — user can still start new conversation
    }
  }, [module])

  const getUserId = useCallback(async (): Promise<string> => {
    const { data: { session: authSession } } = await supabase.auth.getSession()
    if (!authSession?.user?.id) throw new Error('Nao autenticado')
    return authSession.user.id
  }, [])

  const sendMessage = useCallback(async (text: string, moduleData?: Record<string, any>) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setIsLoading(true)

    try {
      const userId = await getUserId()

      // Create module session lazily if none exists
      let currentSession = session
      if (!currentSession) {
        const title = trimmed.slice(0, 60)
        currentSession = await chatService.createModuleSession(userId, module, title)
        setSession(currentSession)
        setSessions(prev => [currentSession!, ...prev])
      }

      // Optimistic user message
      const tempUserMsg: ModuleDisplayMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
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
        prev.map(m => m.id === tempUserMsg.id ? chatMsgToModuleDisplay(savedUserMsg) : m)
      )

      // Build history for Gemini (last 10 messages)
      const history = [...messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      // Call Gemini via agent-specific route
      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'chat_with_agent',
        agent: module,
        payload: {
          message: trimmed,
          moduleData,
          history,
        },
      })

      const result = response?.result
      const responseText = result?.text || result?.response || result || 'Desculpe, nao consegui gerar uma resposta.'
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

      setMessages(prev => [...prev, chatMsgToModuleDisplay(savedAssistantMsg)])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao comunicar com o agente'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session, messages, isLoading, getUserId, module])

  const createNewSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setError(null)
    setShowSessions(false)
  }, [])

  const switchSession = useCallback(async (sessionId: string) => {
    try {
      const msgs = await chatService.getSessionMessages(sessionId)
      setMessages(msgs.map(chatMsgToModuleDisplay))

      const target = sessions.find(s => s.id === sessionId) || null
      setSession(target)
      setShowSessions(false)
      setError(null)
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
  }
}
