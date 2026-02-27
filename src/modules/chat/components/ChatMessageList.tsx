/**
 * ChatMessageList — Scrollable message list with auto-scroll
 *
 * Renders ChatMessage for each message, typing indicator when loading,
 * streaming text when isStreaming, and ChatWelcome when empty.
 */

import { useEffect, useRef } from 'react'
import type { RichMessage } from '@/modules/chat/types'
import { ChatMessage } from './ChatMessage'
import { ChatWelcome } from './ChatWelcome'

interface ChatMessageListProps {
  messages: RichMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamedText: string
  error: string | null
  onSendMessage: (text: string) => void
}

export function ChatMessageList({
  messages,
  isLoading,
  isStreaming,
  streamedText,
  error,
  onSendMessage,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages or loading state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isStreaming, streamedText])

  const isEmpty = messages.length === 0 && !isLoading && !isStreaming

  return (
    <div className="chat-messages">
      {isEmpty && <ChatWelcome onSendMessage={onSendMessage} />}

      {messages.map((msg, idx) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isLast={idx === messages.length - 1 && msg.role === 'assistant'}
        />
      ))}

      {isStreaming && streamedText && (
        <div className="chat-streaming">
          <span className="chat-streaming__text">{streamedText}</span>
          <span className="chat-streaming__cursor" />
        </div>
      )}

      {isLoading && !isStreaming && (
        <div className="chat-typing">
          <div className="chat-typing__dot" />
          <div className="chat-typing__dot" />
          <div className="chat-typing__dot" />
        </div>
      )}

      {error && (
        <div className="chat-error">
          <p>{error}</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
