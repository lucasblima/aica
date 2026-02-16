/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * Chat interface with persistent sessions (chat_sessions + chat_messages).
 * Uses useChatSession hook for lifecycle, GeminiClient for AI calls.
 * Displays agent routing indicators and supports reclassification.
 */

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, Plus, Clock, ChevronLeft, Archive, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatSession } from '@/hooks/useChatSession'
import type { DisplayMessage } from '@/hooks/useChatSession'
import { useUserStats } from '@/hooks/useUserStats'
import { calculateTrustLevel, getTrustLevelLabel } from '@/lib/agents/trustLevel'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import type { AgentModule } from '@/lib/agents/types'
import './AicaChatFAB.css'

const AGENT_LABELS: Record<AgentModule | 'coordinator', string> = {
  atlas: 'Atlas',
  journey: 'Jornada',
  connections: 'Conexoes',
  finance: 'Financas',
  flux: 'Flux',
  studio: 'Studio',
  captacao: 'Captacao',
  agenda: 'Agenda',
  coordinator: 'Aica',
}

interface AicaChatFABProps {
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
}

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80,
}: AicaChatFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Trust level from user engagement stats
  const { stats } = useUserStats()
  const trustLevel = stats ? calculateTrustLevel(stats) : 'suggest_confirm'
  const trustLabel = getTrustLevelLabel(trustLevel)

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
    lastClassification,
    reclassifyLastMessage,
    isReclassifying,
  } = useChatSession(trustLevel)

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSessions) {
          setShowSessions(false)
        } else {
          setIsOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, showSessions, setShowSessions])

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

  const showReclassifyButton = lastClassification?.needsServerClassification && !isLoading

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="aica-fab-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'aica-fab-drawer',
          isOpen && 'aica-fab-drawer--open',
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
                  {activeAgent
                    ? <span className="aica-fab-agent-indicator">{AGENT_LABELS[activeAgent]}</span>
                    : (session ? 'Conversa ativa' : 'Assistente pessoal')
                  }
                  {stats && (
                    <span className={cn('aica-fab-trust-badge', `aica-fab-trust-badge--${trustLevel}`)}>
                      {trustLabel}
                    </span>
                  )}
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
            </>
          )}
          <button
            className="aica-fab-drawer__close"
            onClick={() => setIsOpen(false)}
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
          <>
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

                  {/* Agent badge for assistant messages */}
                  {msg.role === 'assistant' && msg.agent && (
                    <div className="aica-fab-agent-badge">
                      {AGENT_LABELS[msg.agent]}
                      {msg.classification && (
                        <span className="aica-fab-agent-badge__confidence">
                          {Math.round(msg.classification.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reclassify button on last assistant message */}
                  {isLastAssistantMessage(msg, idx) && showReclassifyButton && (
                    <button
                      className="aica-fab-reclassify"
                      onClick={reclassifyLastMessage}
                      disabled={isReclassifying}
                      title="Reanalisar com IA"
                    >
                      {isReclassifying ? (
                        <Loader2 size={12} className="aica-fab-loading-icon" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      <span>Reanalisar</span>
                    </button>
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
                      Limite diario atingido
                    </p>
                    <p className="text-ceramic-text-secondary text-xs">
                      {error}
                    </p>
                    {limitInfo && (
                      <p className="text-ceramic-text-secondary text-[10px] mt-1">
                        Plano: {limitInfo.plan} | Renova: {new Date(limitInfo.resetsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
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
                disabled={isLoading || isReclassifying}
              />
              <button
                className="aica-fab-send"
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isReclassifying}
                aria-label="Enviar"
              >
                <Send size={16} />
              </button>
            </div>
          </>
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
