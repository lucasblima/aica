/**
 * useChatEngine — Wraps useChatSession with SSE streaming
 *
 * Tries streaming first via chatStreamService. On failure, falls back to
 * the non-streaming sendMessage from useChatSession.
 */

import { useState, useCallback } from 'react'
import { useChatSession } from '@/hooks/useChatSession'
import { chatService } from '@/services/chatService'
import { supabase } from '@/services/supabaseClient'
import { checkInteractionLimit } from '@/services/billingService'
import { streamChat } from '@/modules/chat/services/chatStreamService'
import type { ContentBlock, RichMessage } from '@/modules/chat/types'
import type { ChatAction } from '@/types/chatActions'

export interface UseChatEngineReturn {
  // From useChatSession
  session: ReturnType<typeof useChatSession>['session']
  sessions: ReturnType<typeof useChatSession>['sessions']
  messages: RichMessage[]
  isLoading: boolean
  error: string | null
  limitReached: boolean
  limitInfo: ReturnType<typeof useChatSession>['limitInfo']
  activeAgent: string | null
  showSessions: boolean
  setShowSessions: (show: boolean) => void
  createNewSession: () => void
  switchSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  // Streaming additions
  isStreaming: boolean
  streamedText: string
  pendingBlocks: ContentBlock[]
  sendStreamingMessage: (text: string) => Promise<void>
}

export function useChatEngine(): UseChatEngineReturn {
  const chatSession = useChatSession()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [pendingBlocks, setPendingBlocks] = useState<ContentBlock[]>([])

  // Adapt DisplayMessage[] to RichMessage[] (adds blocks field)
  const richMessages: RichMessage[] = chatSession.messages.map(msg => ({
    ...msg,
    blocks: undefined,
  }))

  const sendStreamingMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chatSession.isLoading || isStreaming) return

    setIsStreaming(true)
    setStreamedText('')
    setPendingBlocks([])

    try {
      // Check interaction limit (fail-open)
      try {
        const limit = await checkInteractionLimit()
        if (!limit.allowed) {
          // Fall back to sendMessage which handles limit display
          await chatSession.sendMessage(trimmed)
          return
        }
      } catch {
        // Fail-open
      }

      // Get user ID
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.user?.id) throw new Error('Nao autenticado')
      const userId = authSession.user.id

      // Create session lazily if none exists
      let currentSession = chatSession.session
      if (!currentSession) {
        currentSession = await chatService.createSession(userId, trimmed.slice(0, 60))
      }

      // Save user message to DB
      await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: trimmed,
        direction: 'inbound',
      })

      // Build history from current messages
      const history = [...chatSession.messages, { role: 'user' as const, content: trimmed }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      // Stream the response
      let fullText = ''
      let agent: string | undefined
      let actions: ChatAction[] = []
      let usage: { input: number; output: number } | undefined
      let streamSucceeded = false

      try {
        for await (const event of streamChat(currentSession.id, trimmed, history)) {
          if (event.type === 'token') {
            fullText += event.content
            setStreamedText(fullText)
          } else if (event.type === 'done') {
            fullText = event.fullText || fullText
            agent = event.agent
            actions = (event.actions as ChatAction[]) || []
            usage = event.usage
            streamSucceeded = true
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }

        if (!streamSucceeded && !fullText) {
          throw new Error('Stream ended without done event')
        }
      } catch {
        // Streaming failed — fallback to non-streaming via gemini-chat directly
        // (NOT agent-proxy, which returns 401)
        const fallbackResult = await supabase.functions.invoke('gemini-chat', {
          body: {
            action: 'chat_aica',
            payload: {
              message: trimmed,
              session_id: currentSession.id,
              history,
            },
          },
        })
        if (fallbackResult.data?.text) {
          fullText = fallbackResult.data.text
          agent = fallbackResult.data.agent
          actions = fallbackResult.data.suggestedActions || []
          usage = fallbackResult.data.usage
        } else {
          throw new Error(fallbackResult.data?.error || 'Falha ao enviar mensagem')
        }
      }

      // Save assistant message to DB
      await chatService.saveMessage({
        sessionId: currentSession.id,
        userId,
        content: fullText,
        direction: 'outbound',
        modelUsed: 'gemini-2.5-flash',
        tokensInput: usage?.input,
        tokensOutput: usage?.output,
      })

      // Reload session messages to sync state (includes both user + assistant msgs)
      if (currentSession.id) {
        await chatSession.switchSession(currentSession.id)
      }
    } catch (err) {
      // If everything fails, fall back to non-streaming via gemini-chat
      try {
        const { data: { session: authRetry } } = await supabase.auth.getSession()
        if (authRetry?.user?.id) {
          const lastResort = await supabase.functions.invoke('gemini-chat', {
            body: {
              action: 'chat_aica',
              payload: { message: trimmed, history: [] },
            },
          })
          if (lastResort.data?.text) {
            // Save and reload
            const sess = chatSession.session
            if (sess) {
              await chatService.saveMessage({
                sessionId: sess.id,
                userId: authRetry.user.id,
                content: lastResort.data.text,
                direction: 'outbound',
                modelUsed: 'gemini-2.5-flash',
              })
              await chatSession.switchSession(sess.id)
            }
          }
        }
      } catch {
        // Both paths failed — error is shown by useChatSession
      }
    } finally {
      setIsStreaming(false)
      setStreamedText('')
      setPendingBlocks([])
    }
  }, [chatSession, isStreaming])

  return {
    session: chatSession.session,
    sessions: chatSession.sessions,
    messages: richMessages,
    isLoading: chatSession.isLoading,
    error: chatSession.error,
    limitReached: chatSession.limitReached,
    limitInfo: chatSession.limitInfo,
    activeAgent: chatSession.activeAgent,
    showSessions: chatSession.showSessions,
    setShowSessions: chatSession.setShowSessions,
    createNewSession: chatSession.createNewSession,
    switchSession: chatSession.switchSession,
    archiveSession: chatSession.archiveSession,
    isStreaming,
    streamedText,
    pendingBlocks,
    sendStreamingMessage,
  }
}
