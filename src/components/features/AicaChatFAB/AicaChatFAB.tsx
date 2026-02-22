/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * Chat interface with persistent sessions (chat_sessions + chat_messages).
 * Uses useChatSession hook for lifecycle, ADK agent-proxy for AI calls.
 * Supports expand to fullscreen with context sidebar.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Plus, Clock, ChevronLeft, Archive, Zap, Maximize2, Minimize2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useChatSession } from '@/hooks/useChatSession'
import type { DisplayMessage } from '@/hooks/useChatSession'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import { formatAgentName } from '@/lib/agents/formatAgentName'
import { ChatActionButtons } from './ChatActionButtons'
import { executeChatAction } from '@/services/chatActionService'
import type { ChatAction } from '@/types/chatActions'
import { useChatContextData } from '@/hooks/useChatContextData'
import { ChatContextSidebar } from './ChatContextSidebar'
import './AicaChatFAB.css'

interface AicaChatFABProps {
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
}

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80,
}: AicaChatFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const {
    session,
    sessions,
    messages,
    isLoading,
    error,
    limitReached,
    limitInfo,
    sendMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
  } = useChatSession()

  const activeModule = activeAgent
    ? activeAgent.replace(/_agent$/, '').replace('aica_', '')
    : 'coordinator'

  const { context: chatContext, isLoading: contextLoading } = useChatContextData(isExpanded)

  // Escape cascade: sessions → expanded → close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSessions) {
          setShowSessions(false)
        } else if (isExpanded) {
          setIsExpanded(false)
        } else {
          setIsOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isExpanded, showSessions, setShowSessions])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && !showSessions) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [isOpen, showSessions])

  const handleClose = () => {
    setIsExpanded(false)
    setIsOpen(false)
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setInput('')
    await sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewSession = () => {
    createNewSession()
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleExecuteAction = useCallback(async (action: ChatAction) => {
    const result = await executeChatAction(action)
    if (!result.success) {
      throw new Error(result.error || 'Erro ao executar acao')
    }
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays}d atras`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const isLastAssistantMessage = (msg: DisplayMessage, idx: number) => {
    if (msg.role !== 'assistant') return false
    for (let i = idx + 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant') return false
    }
    return true
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="aica-fab-backdrop"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'aica-fab-drawer',
          isOpen && 'aica-fab-drawer--open',
          isExpanded && 'aica-fab-drawer--expanded',
          position === 'bottom-left' && 'aica-fab-drawer--left'
        )}
        style={{ '--fab-bottom-offset': `${bottomOffset}px` } as React.CSSProperties}
      >
        {/* Header */}
        <div className="aica-fab-header">
          {showSessions ? (
            <>
              <button
                className="aica-fab-header__back"
                onClick={() => setShowSessions(false)}
                aria-label="Voltar"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="aica-fab-header__text">
                <h3 className="aica-fab-header__title">Conversas</h3>
              </div>
            </>
          ) : (
            <>
              <div className="aica-fab-header__orb" />
              <div className="aica-fab-header__text">
                <h3 className="aica-fab-header__title">
                  {session?.title || 'Aica'}
                </h3>
                <p className="aica-fab-header__subtitle">
                  {activeAgent && activeAgent !== 'aica_coordinator'
                    ? `via ${formatAgentName(activeAgent)}`
                    : 'Assistente pessoal'}
                </p>
              </div>
              <button
                className="aica-fab-header__action"
                onClick={() => setShowSessions(true)}
                aria-label="Ver conversas"
                title="Historico"
              >
                <Clock size={16} />
              </button>
              <button
                className="aica-fab-header__action"
                onClick={handleNewSession}
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <Plus size={16} />
              </button>
              <button
                className="aica-fab-header__action"
                onClick={() => setIsExpanded(prev => !prev)}
                aria-label={isExpanded ? 'Reduzir' : 'Expandir'}
                title={isExpanded ? 'Reduzir' : 'Expandir'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </>
          )}
          <button
            className="aica-fab-drawer__close"
            onClick={handleClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Session List Panel */}
        {showSessions ? (
          <div className="aica-fab-sessions">
            {sessions.length === 0 ? (
              <div className="aica-fab-empty">
                <p>Nenhuma conversa ainda</p>
              </div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  className={cn(
                    'aica-fab-session-item',
                    session?.id === s.id && 'aica-fab-session-item--active'
                  )}
                >
                  <button
                    className="aica-fab-session-item__content"
                    onClick={() => switchSession(s.id)}
                  >
                    <span className="aica-fab-session-item__title">
                      {s.title || 'Sem titulo'}
                    </span>
                    <span className="aica-fab-session-item__date">
                      {formatDate(s.updated_at)}
                    </span>
                  </button>
                  <button
                    className="aica-fab-session-item__archive"
                    onClick={() => archiveSession(s.id)}
                    aria-label="Arquivar"
                    title="Arquivar"
                  >
                    <Archive size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="aica-fab-body">
            {isExpanded && (
              <ChatContextSidebar
                activeModule={activeModule}
                context={chatContext}
                isLoading={contextLoading}
              />
            )}
            <div className="aica-fab-main">
              {/* Messages */}
              <div className="aica-fab-messages">
                {messages.length === 0 && !isLoading && (
                  <div className="aica-fab-empty">
                    <p>Ola! Como posso ajudar?</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={msg.id}>
                    <div
                      className={cn(
                        'aica-fab-message',
                        msg.role === 'user' ? 'aica-fab-message--user' : 'aica-fab-message--assistant'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div
                          className="aica-fab-message__content"
                          dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }}
                        />
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Action buttons on last assistant message */}
                    {isLastAssistantMessage(msg, idx) && msg.actions && msg.actions.length > 0 && (
                      <ChatActionButtons
                        actions={msg.actions}
                        onExecute={handleExecuteAction}
                      />
                    )}

                    {/* Agent badge for non-coordinator assistant messages */}
                    {msg.role === 'assistant' && msg.agent && msg.agent !== 'aica_coordinator' && (
                      <div className="aica-fab-agent-badge">
                        {formatAgentName(msg.agent)}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="aica-fab-message aica-fab-message--assistant">
                    <Loader2 size={16} className="aica-fab-loading-icon" />
                  </div>
                )}

                {error && (
                  limitReached ? (
                    <div className="rounded-lg mx-3 my-2 p-3 bg-ceramic-warning/10 border border-ceramic-warning/30">
                      <p className="text-ceramic-warning text-xs font-medium mb-1">
                        Creditos mensais esgotados
                      </p>
                      <p className="text-ceramic-text-secondary text-xs">
                        {error}
                      </p>
                      {limitInfo && (
                        <p className="text-ceramic-text-secondary text-[10px] mt-1">
                          Plano: {limitInfo.plan} | {limitInfo.remaining} creditos restantes | Renova: {new Date(limitInfo.resetsAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      <button
                        onClick={() => navigate('/pricing')}
                        className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        <Zap size={12} />
                        Fazer upgrade
                      </button>
                    </div>
                  ) : (
                    <div className="aica-fab-error">
                      <p>{error}</p>
                    </div>
                  )
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="aica-fab-input-bar">
                <input
                  ref={inputRef}
                  type="text"
                  className="aica-fab-input"
                  placeholder="Pergunte algo..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button
                  className="aica-fab-send"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB Button */}
      <button
        className={cn(
          'aica-fab-button',
          isOpen && 'aica-fab-button--hidden',
          position === 'bottom-left' && 'aica-fab-button--left'
        )}
        onClick={() => setIsOpen(true)}
        style={{ '--fab-bottom-offset': `${bottomOffset}px` } as React.CSSProperties}
        aria-label="Abrir chat com Aica"
      >
        <MessageCircle size={24} />
      </button>
    </>
  )
}

export default AicaChatFAB
