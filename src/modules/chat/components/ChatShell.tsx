/**
 * ChatShell — Main layout for full-page chat
 *
 * CSS Grid: sidebar (280px, always visible on desktop) + main area (1fr).
 * Mobile: sidebar as full-screen overlay, toggle with hamburger.
 * Sidebar content delegated to ChatSidebar component.
 */

import { useState, useCallback } from 'react'
import { Menu, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const navigate = useNavigate()

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
    setMobileSidebarOpen(false)
  }, [createNewSession])

  const handleSwitchSession = useCallback(async (sessionId: string) => {
    await switchSession(sessionId)
    setMobileSidebarOpen(false)
  }, [switchSession])

  return (
    <div className="chat-shell">
      {/* Sidebar — always visible on desktop, overlay on mobile */}
      <aside className={cn('chat-sidebar', mobileSidebarOpen && 'chat-sidebar--open')}>
        <ChatSidebar
          sessions={sessions}
          currentSessionId={session?.id || null}
          onSwitchSession={handleSwitchSession}
          onNewSession={handleNewSession}
          onArchiveSession={archiveSession}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </aside>

      {/* Main area */}
      <main className="chat-main">
        {/* Header — mobile: hamburger + title, desktop: back + title */}
        <div className="chat-main__header">
          <button
            className="chat-main__hamburger"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <button
            className="chat-main__back"
            onClick={() => navigate('/')}
            aria-label="Voltar"
            title="Voltar para o app"
          >
            <ArrowLeft size={20} />
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
