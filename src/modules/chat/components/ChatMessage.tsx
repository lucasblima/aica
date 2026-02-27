/**
 * ChatMessage — Single message renderer
 *
 * User messages: right-aligned with amber gradient.
 * Assistant messages: left-aligned with ceramic-base bg, markdown rendered.
 * Shows agent badge for non-coordinator agents.
 * Shows ChatActionButtons on last assistant message with actions.
 */

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import { formatAgentName } from '@/lib/agents/formatAgentName'
import { ChatActionButtons } from '@/components/features/AicaChatFAB/ChatActionButtons'
import { executeChatAction } from '@/services/chatActionService'
import type { RichMessage } from '@/modules/chat/types'
import type { ChatAction } from '@/types/chatActions'

interface ChatMessageProps {
  message: RichMessage
  isLast: boolean
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const showAgentBadge = !isUser && message.agent && message.agent !== 'aica_coordinator'
  const showActions = isLast && !isUser && message.actions && message.actions.length > 0

  const handleExecuteAction = useCallback(async (action: ChatAction) => {
    const result = await executeChatAction(action)
    if (!result.success) {
      throw new Error(result.error || 'Erro ao executar acao')
    }
  }, [])

  return (
    <div>
      <div
        className={cn(
          'chat-message',
          isUser ? 'chat-message--user' : 'chat-message--assistant'
        )}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="chat-message__content"
            dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(message.content) }}
          />
        )}
      </div>

      {showActions && (
        <ChatActionButtons
          actions={message.actions!}
          onExecute={handleExecuteAction}
        />
      )}

      {showAgentBadge && (
        <div className="chat-agent-badge">
          {formatAgentName(message.agent!)}
        </div>
      )}
    </div>
  )
}
