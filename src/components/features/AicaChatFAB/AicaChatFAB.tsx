/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * Minimal chat interface that calls gemini-chat Edge Function directly.
 * Self-contained — no external context or billing dependencies.
 */

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabaseClient'
import './AicaChatFAB.css'

interface AicaChatFABProps {
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `Voce e a Aica, assistente pessoal inteligente do AICA Life OS.
Voce ajuda o usuario com produtividade, organizacao e bem-estar.
Seja concisa, amigavel e objetiva. Responda em portugues.`

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80,
}: AicaChatFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [isOpen])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      // Build history for context (last 10 messages)
      const history = [...messages, userMessage]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      const { data, error: fnError } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: trimmed,
          history,
          systemPrompt: SYSTEM_PROMPT,
        },
      })

      if (fnError) throw fnError

      const responseText = data?.response || data?.result?.response || 'Desculpe, nao consegui gerar uma resposta.'

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a Aica'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
          <div className="aica-fab-header__orb" />
          <div className="aica-fab-header__text">
            <h3 className="aica-fab-header__title">Aica</h3>
            <p className="aica-fab-header__subtitle">Assistente pessoal</p>
          </div>
          <button
            className="aica-fab-drawer__close"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="aica-fab-messages">
          {messages.length === 0 && !isLoading && (
            <div className="aica-fab-empty">
              <p>Ola! Como posso ajudar?</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'aica-fab-message',
                msg.role === 'user' ? 'aica-fab-message--user' : 'aica-fab-message--assistant'
              )}
            >
              <p>{msg.content}</p>
            </div>
          ))}

          {isLoading && (
            <div className="aica-fab-message aica-fab-message--assistant">
              <Loader2 size={16} className="aica-fab-loading-icon" />
            </div>
          )}

          {error && (
            <div className="aica-fab-error">
              <p>{error}</p>
            </div>
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
