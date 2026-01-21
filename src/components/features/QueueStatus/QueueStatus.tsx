/**
 * QueueStatus Component
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Displays status of queued messages when rate limits are exceeded.
 * Shows queue position, estimated wait time, and cancel option.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Clock, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import rateLimiterService, { QueuedMessage } from '@/services/rateLimiterService'
import './QueueStatus.css'

// ============================================================================
// TYPES
// ============================================================================

interface QueueStatusProps {
  className?: string
  variant?: 'full' | 'compact' | 'inline'
  showCompleted?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onMessageProcessed?: (message: QueuedMessage) => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: string) {
  switch (status) {
    case 'queued':
      return <Clock size={14} className="queue-status__icon--queued" />
    case 'processing':
      return <RefreshCw size={14} className="queue-status__icon--processing animate-spin" />
    case 'completed':
      return <CheckCircle size={14} className="queue-status__icon--completed" />
    case 'failed':
      return <AlertCircle size={14} className="queue-status__icon--failed" />
    default:
      return <Clock size={14} />
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return 'Na fila'
    case 'processing':
      return 'Processando'
    case 'completed':
      return 'Concluído'
    case 'failed':
      return 'Falhou'
    default:
      return status
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}m atrás`
  if (diffHour < 24) return `${diffHour}h atrás`
  return date.toLocaleDateString('pt-BR')
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QueueStatus({
  className,
  variant = 'full',
  showCompleted = false,
  autoRefresh = true,
  refreshInterval = 10000,
  onMessageProcessed,
}: QueueStatusProps) {
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [previousMessages, setPreviousMessages] = useState<QueuedMessage[]>([])

  const fetchMessages = useCallback(async () => {
    try {
      const data = await rateLimiterService.getQueuedMessages()
      setMessages(data)

      // Check for newly processed messages
      if (onMessageProcessed && previousMessages.length > 0) {
        const processedIds = previousMessages
          .filter((prev) => prev.status === 'processing')
          .filter((prev) => {
            const current = data.find((m) => m.id === prev.id)
            return current && current.status === 'completed'
          })

        processedIds.forEach((msg) => {
          const current = data.find((m) => m.id === msg.id)
          if (current) onMessageProcessed(current)
        })
      }

      setPreviousMessages(data)
    } catch (error) {
      console.error('[QueueStatus] Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [onMessageProcessed, previousMessages])

  useEffect(() => {
    fetchMessages()

    if (autoRefresh) {
      const interval = setInterval(fetchMessages, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchMessages])

  const handleCancel = async (messageId: string) => {
    const { success } = await rateLimiterService.cancelQueuedMessage(messageId)
    if (success) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
  }

  // Filter messages based on showCompleted
  const filteredMessages = showCompleted
    ? messages
    : messages.filter((m) => m.status !== 'completed')

  if (loading) {
    return (
      <div className={cn('queue-status', `queue-status--${variant}`, 'queue-status--loading', className)}>
        <div className="queue-status__skeleton" />
      </div>
    )
  }

  if (filteredMessages.length === 0) {
    return null
  }

  // -------------------------------------------------------------------------
  // INLINE VARIANT
  // -------------------------------------------------------------------------

  if (variant === 'inline') {
    const queuedCount = filteredMessages.filter((m) => m.status === 'queued').length
    const processingCount = filteredMessages.filter((m) => m.status === 'processing').length

    return (
      <div className={cn('queue-status', 'queue-status--inline', className)}>
        <Clock size={14} />
        <span>
          {processingCount > 0 && `${processingCount} processando`}
          {processingCount > 0 && queuedCount > 0 && ', '}
          {queuedCount > 0 && `${queuedCount} na fila`}
        </span>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // COMPACT VARIANT
  // -------------------------------------------------------------------------

  if (variant === 'compact') {
    return (
      <div className={cn('queue-status', 'queue-status--compact', className)}>
        <div className="queue-status__compact-header">
          <Clock size={14} />
          <span>Fila ({filteredMessages.length})</span>
        </div>
        <div className="queue-status__compact-list">
          {filteredMessages.slice(0, 3).map((msg) => (
            <div key={msg.id} className="queue-status__compact-item">
              {getStatusIcon(msg.status)}
              <span className="queue-status__compact-preview">
                {msg.message_content.slice(0, 30)}...
              </span>
            </div>
          ))}
          {filteredMessages.length > 3 && (
            <span className="queue-status__compact-more">
              +{filteredMessages.length - 3} mais
            </span>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // FULL VARIANT
  // -------------------------------------------------------------------------

  return (
    <div className={cn('queue-status', 'queue-status--full', className)}>
      <div className="queue-status__header">
        <div className="queue-status__header-title">
          <Clock size={16} />
          <h4>Mensagens na Fila</h4>
        </div>
        <span className="queue-status__count">{filteredMessages.length}</span>
      </div>

      <div className="queue-status__list">
        {filteredMessages.map((msg, index) => (
          <div
            key={msg.id}
            className={cn(
              'queue-status__item',
              `queue-status__item--${msg.status}`
            )}
          >
            <div className="queue-status__item-header">
              <div className="queue-status__item-status">
                {getStatusIcon(msg.status)}
                <span>{getStatusLabel(msg.status)}</span>
                {msg.status === 'queued' && (
                  <span className="queue-status__position">#{index + 1}</span>
                )}
              </div>
              <span className="queue-status__time">
                {formatTimeAgo(msg.queued_at)}
              </span>
            </div>

            <p className="queue-status__content">
              {msg.message_content.slice(0, 100)}
              {msg.message_content.length > 100 && '...'}
            </p>

            <div className="queue-status__item-footer">
              <span className="queue-status__tier">
                {msg.preferred_model_tier === 'premium' && '⭐ Premium'}
                {msg.preferred_model_tier === 'standard' && '💡 Standard'}
                {msg.preferred_model_tier === 'lite' && '✨ Lite'}
              </span>

              {msg.status === 'queued' && (
                <button
                  className="queue-status__cancel"
                  onClick={() => handleCancel(msg.id)}
                  title="Cancelar"
                >
                  <X size={14} />
                  Cancelar
                </button>
              )}

              {msg.status === 'failed' && msg.error_message && (
                <span className="queue-status__error">
                  {msg.error_message}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QueueStatus
