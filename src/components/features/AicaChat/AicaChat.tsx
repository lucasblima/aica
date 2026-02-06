/**
 * AicaChat Component
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Main chat interface for interacting with Aica AI assistant.
 * Includes message list, input, rate limit status, and queue management.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, AlertCircle, Zap, Clock, X } from 'lucide-react'
import { useChat, ChatMessage } from '@/contexts/ChatContext'
import { ModelTier } from '@/services/rateLimiterService'
import { cn } from '@/lib/utils'
import './AicaChat.css'

// ============================================================================
// TYPES
// ============================================================================

interface AicaChatProps {
  className?: string
  showHeader?: boolean
  showRateLimitBar?: boolean
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isLoading = message.content === '...'

  return (
    <div
      className={cn(
        'aica-chat-message',
        isUser ? 'aica-chat-message--user' : 'aica-chat-message--assistant'
      )}
    >
      <div className="aica-chat-message__bubble">
        {isLoading ? (
          <div className="aica-chat-message__typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <p className="aica-chat-message__content">{message.content}</p>
        )}

        {message.is_queued && (
          <div className="aica-chat-message__queued">
            <Clock size={12} />
            <span>Na fila (posição {message.queue_position})</span>
          </div>
        )}

        {message.model_tier && !isUser && (
          <div className="aica-chat-message__meta">
            <span className="aica-chat-message__tier">
              {message.model_tier === 'premium' && '⭐'}
              {message.model_tier === 'standard' && '💡'}
              {message.model_tier === 'lite' && '✨'}
            </span>
            {message.tokens_used && (
              <span className="aica-chat-message__tokens">
                {message.tokens_used.toLocaleString()} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface RateLimitBarProps {
  className?: string
}

function RateLimitBar({ className }: RateLimitBarProps) {
  const { rateLimitStatus } = useChat()

  if (!rateLimitStatus) return null

  const { usage, windowResetIn, creditBalance } = rateLimitStatus

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className={cn('aica-chat-rate-limit', className)}>
      <div className="aica-chat-rate-limit__tiers">
        <div className="aica-chat-rate-limit__tier">
          <span className="aica-chat-rate-limit__tier-icon">⭐</span>
          <div className="aica-chat-rate-limit__tier-bar">
            <div
              className="aica-chat-rate-limit__tier-fill aica-chat-rate-limit__tier-fill--premium"
              style={{
                width: `${Math.min(100, (usage.premium.used / usage.premium.limit) * 100)}%`,
              }}
            />
          </div>
          <span className="aica-chat-rate-limit__tier-text">
            {Math.round(usage.premium.remaining / 1000)}k
          </span>
        </div>

        <div className="aica-chat-rate-limit__tier">
          <span className="aica-chat-rate-limit__tier-icon">💡</span>
          <div className="aica-chat-rate-limit__tier-bar">
            <div
              className="aica-chat-rate-limit__tier-fill aica-chat-rate-limit__tier-fill--standard"
              style={{
                width: `${Math.min(100, (usage.standard.used / usage.standard.limit) * 100)}%`,
              }}
            />
          </div>
          <span className="aica-chat-rate-limit__tier-text">
            {Math.round(usage.standard.remaining / 1000)}k
          </span>
        </div>

        <div className="aica-chat-rate-limit__tier">
          <span className="aica-chat-rate-limit__tier-icon">✨</span>
          <div className="aica-chat-rate-limit__tier-bar">
            <div
              className="aica-chat-rate-limit__tier-fill aica-chat-rate-limit__tier-fill--lite"
              style={{
                width: `${Math.min(100, (usage.lite.used / usage.lite.limit) * 100)}%`,
              }}
            />
          </div>
          <span className="aica-chat-rate-limit__tier-text">
            {Math.round(usage.lite.remaining / 1000)}k
          </span>
        </div>
      </div>

      <div className="aica-chat-rate-limit__footer">
        <span className="aica-chat-rate-limit__reset">
          <Clock size={12} />
          Reset em {formatTime(windowResetIn)}
        </span>
        {creditBalance > 0 && (
          <span className="aica-chat-rate-limit__credits">
            <Zap size={12} />
            R$ {creditBalance.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}

interface QueueStatusProps {
  className?: string
}

function QueueStatus({ className }: QueueStatusProps) {
  const { queuedMessages, cancelQueuedMessage } = useChat()

  if (queuedMessages.length === 0) return null

  return (
    <div className={cn('aica-chat-queue', className)}>
      <div className="aica-chat-queue__header">
        <Clock size={14} />
        <span>Mensagens na fila ({queuedMessages.length})</span>
      </div>
      <div className="aica-chat-queue__list">
        {queuedMessages.map((msg) => (
          <div key={msg.id} className="aica-chat-queue__item">
            <p className="aica-chat-queue__preview">
              {msg.message_content.slice(0, 50)}
              {msg.message_content.length > 50 && '...'}
            </p>
            <button
              className="aica-chat-queue__cancel"
              onClick={() => cancelQueuedMessage(msg.id)}
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// AUTO-ROUTING LOGIC
// ============================================================================

/**
 * Automatically determines the best model tier based on message content.
 * - Premium: Complex analysis, detailed explanations, strategic planning
 * - Standard: General questions, moderate complexity
 * - Lite: Simple queries, lists, quick answers
 */
function autoSelectTier(message: string): ModelTier {
  const lowerMessage = message.toLowerCase()

  // Premium triggers: complex analysis, detailed explanations, strategic tasks
  const premiumKeywords = [
    'analise detalhada', 'análise detalhada', 'explique detalhadamente',
    'estratégia', 'estrategia', 'planejamento estratégico',
    'compare', 'avalie', 'recomende', 'por que', 'porque',
    'como funciona', 'me ajude a entender', 'profundamente',
    'prós e contras', 'pros e contras', 'trade-off', 'tradeoff'
  ]

  // Lite triggers: simple queries, lists, quick tasks
  const liteKeywords = [
    'liste', 'listar', 'quais são', 'quais sao',
    'o que tenho', 'tarefas de hoje', 'agenda',
    'rápido', 'rapido', 'simples', 'resumido',
    'sim ou não', 'sim ou nao', 'existe', 'tem',
    'quantos', 'quantas', 'qual é', 'qual e'
  ]

  // Check for premium keywords
  if (premiumKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'premium'
  }

  // Check for lite keywords or very short messages
  if (liteKeywords.some(kw => lowerMessage.includes(kw)) || message.length < 30) {
    return 'lite'
  }

  // Default to standard for balanced performance
  return 'standard'
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AicaChat({
  className,
  showHeader = true,
  showRateLimitBar = true,
}: AicaChatProps) {
  const {
    messages,
    isSending,
    error,
    sendMessage,
  } = useChat()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return

    const message = input.trim()
    const autoTier = autoSelectTier(message)
    setInput('')

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    await sendMessage(message, autoTier)
  }, [input, isSending, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className={cn('aica-chat', className)}>
      {showHeader && (
        <div className="aica-chat__header">
          <div className="aica-chat__header-info">
            <h3 className="aica-chat__title">Aica</h3>
            <span className="aica-chat__subtitle">Sua assistente de produtividade</span>
          </div>
          {showRateLimitBar && <RateLimitBar />}
        </div>
      )}

      <QueueStatus />

      <div className="aica-chat__messages">
        {messages.length === 0 ? (
          <div className="aica-chat__empty">
            <p>Olá! Como posso ajudar você hoje?</p>
            <div className="aica-chat__suggestions">
              <button onClick={() => setInput('O que tenho para fazer hoje?')}>
                Tarefas de hoje
              </button>
              <button onClick={() => setInput('Me ajude a planejar minha semana')}>
                Planejamento
              </button>
              <button onClick={() => setInput('Resuma minhas atividades recentes')}>
                Resumo
              </button>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="aica-chat__error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="aica-chat__input-container">
        <textarea
          ref={inputRef}
          className="aica-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo para a Aica..."
          rows={2}
          disabled={isSending}
        />

        <button
          className="aica-chat__send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isSending}
        >
          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}

export default AicaChat
