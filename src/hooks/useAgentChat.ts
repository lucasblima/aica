/**
 * useAgentChat - Hook for interacting with AICA module-specific AI agents
 *
 * Provides a simple interface for sending messages to any module agent
 * via the centralized GeminiClient -> gemini-chat Edge Function pipeline.
 *
 * @example
 * ```tsx
 * const { sendMessage, isLoading, messages } = useAgentChat('captacao')
 *
 * // Send a message to the Captacao agent
 * const response = await sendMessage('Quais editais da FAPERJ estao abertos?')
 * console.log(response.text, response.sources)
 * ```
 */

import { useState, useCallback, useRef } from 'react'
import { GeminiClient } from '@/lib/gemini'
import type { AgentModule, AgentMessage, AgentSource } from '@/lib/agents'

interface AgentChatMessage extends AgentMessage {
  sources?: AgentSource[]
  agent?: AgentModule
}

interface AgentChatResponse {
  text: string
  agent: AgentModule
  sources: AgentSource[]
}

interface UseAgentChatReturn {
  /** Send a message to the agent */
  sendMessage: (message: string, context?: string, moduleData?: Record<string, any>) => Promise<AgentChatResponse>
  /** Whether a request is in progress */
  isLoading: boolean
  /** Current error, if any */
  error: string | null
  /** Conversation message history */
  messages: AgentChatMessage[]
  /** Clear conversation history */
  clearMessages: () => void
  /** Clear error state */
  clearError: () => void
}

export function useAgentChat(agent: AgentModule): UseAgentChatReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const clientRef = useRef(GeminiClient.getInstance())

  const sendMessage = useCallback(async (
    message: string,
    context?: string,
    moduleData?: Record<string, any>
  ): Promise<AgentChatResponse> => {
    setIsLoading(true)
    setError(null)

    // Add user message to history
    const userMessage: AgentChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Build history for the API (exclude the message we're sending)
      const history = messages.map(msg => ({
        role: msg.role as string,
        content: msg.content,
      }))

      const response = await clientRef.current.call({
        action: 'chat_with_agent',
        agent,
        payload: {
          message,
          context,
          moduleData,
          history,
        },
      })

      const result = response.result as AgentChatResponse

      // Add assistant message to history
      const assistantMessage: AgentChatMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toISOString(),
        sources: result.sources,
        agent: result.agent,
      }
      setMessages(prev => [...prev, assistantMessage])

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao comunicar com o agente'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [agent, messages])

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearError = useCallback(() => setError(null), [])

  return {
    sendMessage,
    isLoading,
    error,
    messages,
    clearMessages,
    clearError,
  }
}
