/**
 * Hook for interacting with the ADK Multi-Agent System
 *
 * Provides a simple interface to chat with the AICA coordinator
 * agent, which automatically routes to specialized module agents
 * (atlas, captacao, studio, journey, finance, connections).
 *
 * Uses the agent-proxy Edge Function to forward requests to
 * the ADK backend running on Cloud Run.
 *
 * @example
 * ```tsx
 * const { sendMessage, messages, isLoading } = useADKAgent()
 *
 * await sendMessage('Quais editais da FAPERJ estao abertos?')
 * // Response routed to captacao_search_agent with Google Search
 * ```
 */

import { useState, useCallback } from 'react'
import { GeminiClient } from '@/lib/gemini'
import { getUserAIContext } from '@/services/userAIContextService'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useADKAgent')

interface ADKMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  sources?: Array<{ title: string; url: string }>
  timestamp: string
}

interface UseADKAgentReturn {
  sendMessage: (message: string) => Promise<ADKMessage | null>
  messages: ADKMessage[]
  isLoading: boolean
  error: string | null
  clearMessages: () => void
  clearError: () => void
}

export function useADKAgent(): UseADKAgentReturn {
  const [messages, setMessages] = useState<ADKMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (message: string): Promise<ADKMessage | null> => {
    if (!message.trim()) return null

    setIsLoading(true)
    setError(null)

    // Add user message immediately
    const userMsg: ADKMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      // Get user context for the agent
      const userContext = await getUserAIContext()

      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'agent_chat',
        payload: {
          message,
          context: userContext ? {
            userName: userContext.userName,
            pendingTasks: userContext.pendingTasks,
            completedTasksToday: userContext.completedTasksToday,
            activeGrants: userContext.activeGrants,
            upcomingEpisodes: userContext.upcomingEpisodes,
          } : undefined,
        },
      })

      const assistantMsg: ADKMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.result?.response || response.result?.text || '',
        agent: response.result?.agent,
        sources: response.result?.sources || [],
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMsg])
      return assistantMsg
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar mensagem'
      setError(errorMessage)
      log.error('[useADKAgent] Error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearError = useCallback(() => setError(null), [])

  return {
    sendMessage,
    messages,
    isLoading,
    error,
    clearMessages,
    clearError,
  }
}
