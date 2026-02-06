/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * A floating button that opens the Aica chat in a slide-up drawer.
 * Can be placed anywhere in the app for quick access to the AI assistant.
 */

import React, { useState, useEffect } from 'react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import { AicaChat } from '../AicaChat/AicaChat'
import { ChatProvider } from '@/contexts/ChatContext'
import { cn } from '@/lib/utils'
import './AicaChatFAB.css'

interface AicaChatFABProps {
  /** Position of the FAB button */
  position?: 'bottom-right' | 'bottom-left'
  /** Offset from bottom to account for bottom navigation */
  bottomOffset?: number
}

export function AicaChatFAB({
  position = 'bottom-right',
  bottomOffset = 80
}: AicaChatFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
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
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isMinimized])

  const handleToggle = () => {
    if (!isOpen) {
      // Open the chat
      setIsOpen(true)
      setIsMinimized(false)
    } else if (isMinimized) {
      // Expand if minimized
      setIsMinimized(false)
    } else {
      // Minimize if open (instead of closing)
      setIsMinimized(true)
    }
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  const handleExpand = () => {
    setIsMinimized(false)
  }

  return (
    <ChatProvider>
      {/* Backdrop */}
      {isOpen && !isMinimized && (
        <div
          className="aica-fab-backdrop"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Chat Drawer */}
      <div
        className={cn(
          'aica-fab-drawer',
          isOpen && 'aica-fab-drawer--open',
          isMinimized && 'aica-fab-drawer--minimized',
          position === 'bottom-left' && 'aica-fab-drawer--left'
        )}
        style={{
          '--fab-bottom-offset': `${bottomOffset}px`
        } as React.CSSProperties}
      >
        {/* Drawer Header */}
        <div
          className="aica-fab-drawer__header"
          onClick={isMinimized ? handleExpand : undefined}
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
                onClick={handleMinimize}
                className="aica-fab-drawer__action-btn"
                title="Minimizar"
              >
                <Minimize2 size={18} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="aica-fab-drawer__action-btn"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="aica-fab-drawer__content">
          <AicaChat
            showHeader={false}
            showRateLimitBar={false}
            className="aica-fab-chat"
          />
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
        style={{
          '--fab-bottom-offset': `${bottomOffset}px`
        } as React.CSSProperties}
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
    </ChatProvider>
  )
}

export default AicaChatFAB
