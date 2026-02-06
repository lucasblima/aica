/**
 * AicaChatFAB - Floating Action Button for Aica Chat
 *
 * Temporarily showing a "coming soon" state while the backend
 * integration is being finalized. The FAB remains as a presence
 * indicator — a promise of what's to come.
 */

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

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
        {/* Close */}
        <button
          className="aica-fab-drawer__close"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Coming Soon Content */}
        <div className="aica-fab-coming-soon">
          <div className="aica-fab-coming-soon__orb" />
          <h3 className="aica-fab-coming-soon__title">Aica</h3>
          <p className="aica-fab-coming-soon__subtitle">
            Sua assistente pessoal com IA
          </p>
          <div className="aica-fab-coming-soon__divider" />
          <p className="aica-fab-coming-soon__status">
            Em desenvolvimento
          </p>
          <p className="aica-fab-coming-soon__detail">
            Estamos refinando cada detalhe para que a
            experiencia seja excepcional.
          </p>
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
