/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * A floating button that opens the Aica chat in a slide-up drawer.
 * Calls agent-proxy Edge Function directly (no DB table dependencies).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Minimize2, Send, Loader2 } from 'lucide-react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import './AicaChatFAB.css'

// =============================================================================
// TYPES
// =============================================================================

interface AicaChatFABProps {
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  sources?: Array<{ title: string; url: string }>
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80,
}: AicaChatFABProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionIdRef = useRef(crypto.randomUUID())

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isMinimized])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, isMinimized])

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true)
      setIsMinimized(false)
    } else if (isMinimized) {
      setIsMinimized(false)
    } else {
      setIsMinimized(true)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending || !user) return

    const content = input.trim()
    setInput('')
    setError(null)
    setIsSending(true)

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const { data, error: fnError } = await supabase.functions.invoke('agent-proxy', {
        body: {
          message: content,
          session_id: sessionIdRef.current,
          context: {
            context_messages: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        },
      })

      if (fnError) throw fnError
      if (!data.success && data.error) throw new Error(data.error)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua mensagem.',
        agent: data.agent,
        sources: data.sources,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, user, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && !isMinimized && (
        <div className="aica-fab-backdrop" onClick={handleClose} aria-hidden="true" />
      )}

      {/* Chat Drawer */}
      <div
        className={cn(
          'aica-fab-drawer',
          isOpen && 'aica-fab-drawer--open',
          isMinimized && 'aica-fab-drawer--minimized',
          position === 'bottom-left' && 'aica-fab-drawer--left'
        )}
        style={{ '--fab-bottom-offset': `${bottomOffset}px` } as React.CSSProperties}
      >
        {/* Drawer Header */}
        <div
          className="aica-fab-drawer__header"
          onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          style={{ cursor: isMinimized ? 'pointer' : 'default' }}
        >
          <div className="aica-fab-drawer__title">
            <div className="aica-fab-drawer__avatar">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3>Aica</h3>
              <span>{isMinimized ? 'Clique para expandir' : 'Assistente IA'}</span>
            </div>
          </div>
          <div className="aica-fab-drawer__actions">
            {!isMinimized && (
              <button
                onClick={() => setIsMinimized(true)}
                className="aica-fab-drawer__action-btn"
                title="Minimizar"
              >
                <Minimize2 size={18} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose() }}
              className="aica-fab-drawer__action-btn"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="aica-fab-drawer__content">
          <div className="aica-fab-chat">
            {/* Messages */}
            <div className="aica-fab-chat__messages">
              {messages.length === 0 && (
                <div className="aica-fab-chat__welcome">
                  <MessageCircle size={32} className="text-ceramic-text-secondary/40" />
                  <p className="text-sm text-ceramic-text-secondary mt-2">
                    Olá! Sou a Aica, sua assistente pessoal.
                  </p>
                  <p className="text-xs text-ceramic-text-secondary/60 mt-1">
                    Como posso ajudar?
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'aica-fab-chat__bubble',
                    msg.role === 'user'
                      ? 'aica-fab-chat__bubble--user'
                      : 'aica-fab-chat__bubble--assistant'
                  )}
                >
                  <p>{msg.content}</p>
                  {msg.agent && (
                    <span className="text-[10px] text-ceramic-text-secondary/50 mt-1 block">
                      via {msg.agent}
                    </span>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="aica-fab-chat__bubble aica-fab-chat__bubble--assistant">
                  <Loader2 size={16} className="animate-spin text-ceramic-text-secondary" />
                </div>
              )}

              {error && (
                <div className="aica-fab-chat__error">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="aica-fab-chat__input-area">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                disabled={isSending}
                className="aica-fab-chat__input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="aica-fab-chat__send-btn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <button
        className={cn(
          'aica-fab-button',
          isOpen && !isMinimized && 'aica-fab-button--hidden',
          position === 'bottom-left' && 'aica-fab-button--left'
        )}
        onClick={handleToggle}
        style={{ '--fab-bottom-offset': `${bottomOffset}px` } as React.CSSProperties}
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat com Aica'}
      >
        {isMinimized ? (
          <div className="aica-fab-button__minimized">
            <MessageCircle size={20} />
            <span>Chat</span>
          </div>
        ) : (
          <MessageCircle size={24} />
        )}
      </button>
    </>
  )
}

export default AicaChatFAB
