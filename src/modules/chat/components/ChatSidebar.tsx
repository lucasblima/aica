/**
 * ChatSidebar — Session history panel for full-page chat
 *
 * Features:
 * - Search filter for sessions by title
 * - Session list with title, relative date, module badge
 * - Active session highlighted with amber accent
 * - Archive action per session (hover-visible)
 * - New session button
 * - Responsive: full-screen overlay on mobile
 */

import { useState, useMemo } from 'react'
import { Plus, Archive, X, Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/services/chatService'

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSwitchSession: (id: string) => Promise<void>
  onNewSession: () => void
  onArchiveSession: (id: string) => Promise<void>
  onClose: () => void
}

const MODULE_BADGE_COLORS: Record<string, string> = {
  atlas: 'bg-blue-100 text-blue-700',
  journey: 'bg-purple-100 text-purple-700',
  studio: 'bg-pink-100 text-pink-700',
  captacao: 'bg-green-100 text-green-700',
  finance: 'bg-emerald-100 text-emerald-700',
  connections: 'bg-cyan-100 text-cyan-700',
  flux: 'bg-orange-100 text-orange-700',
  agenda: 'bg-yellow-100 text-yellow-700',
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d atras`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSwitchSession,
  onNewSession,
  onArchiveSession,
  onClose,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const query = searchQuery.toLowerCase()
    return sessions.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(query) ||
        (s.module || '').toLowerCase().includes(query)
    )
  }, [sessions, searchQuery])

  return (
    <>
      {/* Header */}
      <div className="chat-sidebar__header">
        <h2 className="chat-sidebar__title">Conversas</h2>
        <button
          className="chat-sidebar__action"
          onClick={onNewSession}
          aria-label="Nova conversa"
          title="Nova conversa"
        >
          <Plus size={16} />
        </button>
        <button
          className="chat-sidebar__action md:hidden"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-8 pr-3 py-2 text-[13px]',
              'bg-black/[0.03] border border-black/[0.06] rounded-lg',
              'outline-none placeholder:text-black/30 text-[#1a1a1a]',
              'focus:border-amber-400/40 transition-colors'
            )}
          />
        </div>
      </div>

      {/* Session list */}
      <div className="chat-sidebar__list">
        {filteredSessions.length === 0 ? (
          <div className="chat-sidebar__empty">
            <div className="flex flex-col items-center gap-2">
              <MessageSquare size={24} className="opacity-30" />
              <span>
                {searchQuery
                  ? 'Nenhuma conversa encontrada'
                  : 'Nenhuma conversa ainda. Comece uma nova!'}
              </span>
            </div>
          </div>
        ) : (
          filteredSessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                'chat-sidebar-item',
                currentSessionId === s.id && 'chat-sidebar-item--active'
              )}
            >
              <button
                className="chat-sidebar-item__btn"
                onClick={() => onSwitchSession(s.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="chat-sidebar-item__title">
                    {s.title || 'Sem titulo'}
                  </span>
                  {s.module && (
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                        MODULE_BADGE_COLORS[s.module] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {s.module}
                    </span>
                  )}
                </div>
                <span className="chat-sidebar-item__date">
                  {formatRelativeDate(s.updated_at)}
                </span>
              </button>
              <button
                className="chat-sidebar-item__archive"
                onClick={() => onArchiveSession(s.id)}
                aria-label="Arquivar"
                title="Arquivar"
              >
                <Archive size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}
