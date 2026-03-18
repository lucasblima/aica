/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * Chat interface with persistent sessions (chat_sessions + chat_messages).
 * Uses useChatSession hook for lifecycle, gemini-chat Edge Function for AI calls.
 * Supports expand to fullscreen with context sidebar.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MessageCircle, X, Send, Plus, Clock, ChevronLeft, Archive, Zap, Maximize2, Minimize2, PenLine, Brain, ArrowUpRight, Mic, Square, Loader2, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabaseClient'
import { getCachedSession } from '@/services/authCacheService'
import { useChatSession } from '@/hooks/useChatSession'
import type { DisplayMessage } from '@/hooks/useChatSession'
import type { InterviewMeta } from '@/services/chatStreamService'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import { formatAgentName } from '@/lib/agents/formatAgentName'
import { ChatActionButtons } from './ChatActionButtons'
import { executeChatAction } from '@/services/chatActionService'
import type { ChatAction } from '@/types/chatActions'
import { useChatContextData } from '@/hooks/useChatContextData'
import { ChatContextSidebar } from './ChatContextSidebar'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import './AicaChatFAB.css'

/** Progressive thinking indicator shown as an assistant message while AI is responding */
function AicaThinkingIndicator() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setPhase(1), 3000)
    return () => clearTimeout(timer)
  }, [])

  const label = useMemo(() => {
    return phase === 0 ? 'Pensando...' : 'Gerando resposta...'
  }, [phase])

  return (
    <div className="aica-fab-message aica-fab-message--assistant">
      <div className="aica-fab-thinking">
        <span className="aica-fab-thinking__label">{label}</span>
        <span className="typing-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
    </div>
  )
}

interface AicaChatFABProps {
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
  /** When true, hides the FAB circle button but keeps the drawer functional (openable via CustomEvent). Used on /vida where VidaChatHero replaces the FAB button. */
  hideButton?: boolean
}

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80,
  hideButton = false,
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
    isStreaming,
    streamedText,
    error,
    limitReached,
    limitInfo,
    suggestedQuestions,
    sendMessage,
    retryLastMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
    activeAgent,
    lastFailedMessage,
    connectionStatus,
  } = useChatSession()

  const activeModule = activeAgent
    ? activeAgent.replace(/_agent$/, '').replace('aica_', '')
    : 'coordinator'

  const { context: chatContext, isLoading: contextLoading } = useChatContextData(isExpanded)

  const { isListening, isTranscribing, isSupported, audioLevel, recordSeconds, toggle: toggleMic } = useVoiceRecorder({
    onResult: (transcript) => {
      setInput(prev => prev ? `${prev} ${transcript}` : transcript)
    },
  })

  const waveformBars = useMemo(() => {
    const bars = 6
    return Array.from({ length: bars }, (_, i) => {
      const variance = Math.sin((Date.now() / 200) + i) * 0.3 + 0.7
      return Math.max(3, (audioLevel / 100) * 16 * variance)
    })
  }, [audioLevel])

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Track whether streak has been updated this session (fire once per chat session)
  const streakUpdatedRef = useRef(false)

  // Ref to hold pending message from external event (VidaChatHero)
  const pendingMessageRef = useRef<{ message: string; interview?: InterviewMeta } | null>(null)

  // Listen for external open requests (e.g. from VidaChatHero)
  useEffect(() => {
    const handleExternalOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setIsOpen(true)
      if (detail?.fullscreen) {
        setIsExpanded(true)
      }
      if (detail?.message) {
        // Store the message to be auto-sent once the drawer is open
        pendingMessageRef.current = {
          message: detail.message,
          interview: detail.interview,
        }
        setInput(detail.message)
      }
    }
    window.addEventListener('aica-chat-open', handleExternalOpen)
    return () => window.removeEventListener('aica-chat-open', handleExternalOpen)
  }, [])

  // Auto-send pending message once the drawer is open and not loading
  useEffect(() => {
    if (isOpen && pendingMessageRef.current && !isLoading) {
      const { message, interview } = pendingMessageRef.current
      pendingMessageRef.current = null
      // Small delay to let the drawer animation finish and input render
      const timer = setTimeout(() => {
        setInput('')
        sendMessage(message, interview)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isLoading, sendMessage])

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

  // Update consciousness streak once per chat session after first AI response
  useEffect(() => {
    if (streakUpdatedRef.current) return
    const hasAssistantMessage = messages.some(m => m.role === 'assistant')
    if (!hasAssistantMessage) return

    streakUpdatedRef.current = true
    getCachedSession().then(({ session: authSession }) => {
      const userId = authSession?.user?.id
      if (!userId) return
      supabase.rpc('update_consciousness_streak', {
        p_user_id: userId,
        p_interaction_type: 'chat',
      }).then(({ error }) => {
        if (error) console.warn('Chat streak update failed:', error)
      })
    })
  }, [messages])

  // Reset streak tracking when session changes
  useEffect(() => {
    streakUpdatedRef.current = false
  }, [session?.id])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && !showSessions) {
      requestAnimationFrame(() => {
        setTimeout(() => inputRef.current?.focus(), 300)
      })
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
      throw new Error(result.error || 'Erro ao executar ação')
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
                {connectionStatus !== 'connected' && (
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    connectionStatus === 'degraded' && 'bg-ceramic-warning/10 text-ceramic-warning',
                    connectionStatus === 'offline' && 'bg-ceramic-error/10 text-ceramic-error',
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      connectionStatus === 'degraded' && 'bg-ceramic-warning',
                      connectionStatus === 'offline' && 'bg-ceramic-error',
                    )} />
                    {connectionStatus === 'degraded' ? 'Modo fallback' : 'Sem conexao'}
                  </span>
                )}
              </div>
              <button
                className="aica-fab-header__action"
                onClick={() => setShowSessions(true)}
                aria-label="Ver conversas"
                title="Histórico"
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
              <button
                className="aica-fab-header__action"
                onClick={() => {
                  navigate('/chat')
                  handleClose()
                }}
                aria-label="Abrir chat completo"
                title="Chat completo"
              >
                <ArrowUpRight size={16} />
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
                      {s.title || 'Sem título'}
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
                  <div className="aica-fab-empty-state">
                    <p className="aica-fab-empty-state__greeting">Olá! Como posso ajudar?</p>
                    <div className="aica-fab-quick-actions">
                      <button
                        className="aica-fab-quick-action"
                        onClick={() => {
                          setInput('')
                          sendMessage('Quero registrar um momento agora', {
                            type: 'interview_start',
                            intent: 'register_moment',
                          })
                        }}
                      >
                        <PenLine size={13} />
                        <span>Registrar momento</span>
                      </button>
                      <button
                        className="aica-fab-quick-action"
                        onClick={() => {
                          setInput('')
                          sendMessage('Me faca a pergunta do dia', {
                            type: 'interview_start',
                            intent: 'daily_question',
                          })
                        }}
                      >
                        <MessageCircle size={13} />
                        <span>Pergunta do dia</span>
                      </button>
                      <button
                        className="aica-fab-quick-action"
                        onClick={() => {
                          setInput('')
                          sendMessage('Quais sao meus padrões comportamentais recentes?')
                        }}
                      >
                        <Brain size={13} />
                        <span>Meus padrões</span>
                      </button>
                    </div>
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
                  streamedText ? (
                    <div className="aica-fab-message aica-fab-message--assistant">
                      <div
                        className="aica-fab-message__content"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(streamedText) }}
                      />
                    </div>
                  ) : (
                    <AicaThinkingIndicator />
                  )
                )}

                {error && (
                  limitReached ? (
                    <div className="rounded-lg mx-3 my-2 p-3 bg-ceramic-warning/10 border border-ceramic-warning/30">
                      <p className="text-ceramic-warning text-xs font-medium mb-1">
                        Créditos mensais esgotados
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
                      {lastFailedMessage && (
                        <button
                          onClick={retryLastMessage}
                          disabled={isLoading}
                          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  )
                )}

                {suggestedQuestions.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-1.5 px-3 py-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        onClick={() => {
                          setInput('')
                          sendMessage(q)
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Recording / Transcribing strip */}
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-ceramic-error/5 border-t border-ceramic-error/20">
                  <div className="flex items-center gap-0.5 h-4">
                    {waveformBars.map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-ceramic-error rounded-full transition-all duration-75"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-ceramic-error">{formatRecordTime(recordSeconds)}</span>
                  <div className="w-1.5 h-1.5 bg-ceramic-error rounded-full animate-pulse" />
                  <span className="text-[10px] text-ceramic-text-secondary">Gravando...</span>
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-t border-amber-200">
                  <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                  <span className="text-[10px] text-amber-700">Transcrevendo...</span>
                </div>
              )}

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
                {isSupported && (
                  <button
                    className={cn(
                      'aica-fab-mic-btn',
                      isListening && 'listening',
                      isTranscribing && 'transcribing',
                    )}
                    onClick={toggleMic}
                    disabled={isLoading || isTranscribing}
                    aria-label={isListening ? 'Parar gravação' : isTranscribing ? 'Transcrevendo...' : 'Gravar voz'}
                    title={isListening ? 'Parar' : isTranscribing ? 'Transcrevendo...' : 'Falar'}
                  >
                    {isTranscribing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isListening ? (
                      <Square size={14} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                )}
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

      {/* FAB Button — hidden when hideButton=true (e.g. /vida where VidaChatHero replaces it) */}
      {!hideButton && (
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
      )}
    </>
  )
}

export default AicaChatFAB
