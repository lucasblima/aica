/**
 * ChatShell — Main layout for full-page chat
 *
 * CSS Grid: sidebar (280px, collapsible) + main area (1fr).
 * Mobile: sidebar as overlay, toggle with hamburger.
 * Sidebar content delegated to ChatSidebar component.
 */

import { useState, useCallback } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseChatEngineReturn } from '@/modules/chat/hooks/useChatEngine'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { ChatSidebar } from './ChatSidebar'
import './ChatPage.css'

interface ChatShellProps {
  engine: UseChatEngineReturn
}

export function ChatShell({ engine }: ChatShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    session,
    sessions,
    messages,
    isLoading,
    isStreaming,
    streamedText,
    error,
    sendStreamingMessage,
    createNewSession,
    switchSession,
    archiveSession,
  } = engine

  const handleSend = useCallback((text: string) => {
    sendStreamingMessage(text)
  }, [sendStreamingMessage])

  const handleNewSession = useCallback(() => {
    createNewSession()
    setSidebarOpen(false)
  }, [createNewSession])

  const handleSwitchSession = useCallback(async (sessionId: string) => {
    await switchSession(sessionId)
    setSidebarOpen(false)
  }, [switchSession])

  return (
    <div className={cn('chat-shell', !sidebarOpen && 'chat-shell--sidebar-hidden')}>
      {/* Sidebar */}
      <aside className={cn('chat-sidebar', sidebarOpen && 'chat-sidebar--open')}>
        <ChatSidebar
          sessions={sessions}
          currentSessionId={session?.id || null}
          onSwitchSession={handleSwitchSession}
          onNewSession={handleNewSession}
          onArchiveSession={archiveSession}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main area */}
      <main className="chat-main">
        {/* Mobile header */}
        <div className="chat-main__header">
          <button
            className="chat-main__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="chat-main__title">
            {session?.title || 'Aica'}
          </h1>
          <div className="chat-main__orb" />
        </div>

        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          streamedText={streamedText}
          error={error}
          onSendMessage={handleSend}
        />

        <ChatInput
          onSend={handleSend}
          disabled={isLoading || isStreaming}
        />
      </main>
    </div>
  )
}
