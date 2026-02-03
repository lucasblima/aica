/**
 * useWhatsAppMessagesRealtime Hook
 *
 * Real-time subscription to whatsapp_messages table for timeline updates.
 * Listens for new messages and provides callback for UI updates.
 *
 * Issue #91: Processar mensagens recebidas via webhook para timeline
 *
 * @example
 * const { newMessages, clearMessages } = useWhatsAppMessagesRealtime({
 *   onNewMessage: (msg) => console.log('New message:', msg),
 * })
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('WhatsAppMessagesRealtime')

/**
 * WhatsApp message structure from database
 */
export interface WhatsAppMessagePayload {
  id: string
  user_id: string
  contact_id: string
  message_text: string | null
  message_direction: 'incoming' | 'outgoing'
  message_timestamp: string
  message_type?: string
  media_type?: string
  media_url?: string
  created_at: string
  updated_at: string
}

export interface UseWhatsAppMessagesRealtimeOptions {
  /** Callback when a new message is received */
  onNewMessage?: (message: WhatsAppMessagePayload) => void
  /** Whether to automatically track new messages in state */
  trackMessages?: boolean
  /** Maximum number of messages to keep in state */
  maxMessages?: number
  /** Whether the subscription is enabled */
  enabled?: boolean
}

export interface UseWhatsAppMessagesRealtimeReturn {
  /** Array of new messages received since subscription started */
  newMessages: WhatsAppMessagePayload[]
  /** Clear the new messages array */
  clearMessages: () => void
  /** Whether the subscription is active */
  isSubscribed: boolean
  /** Error state */
  error: Error | null
}

export function useWhatsAppMessagesRealtime(
  options: UseWhatsAppMessagesRealtimeOptions = {}
): UseWhatsAppMessagesRealtimeReturn {
  const {
    onNewMessage,
    trackMessages = true,
    maxMessages = 50,
    enabled = true,
  } = options

  const { user } = useAuth()
  const [newMessages, setNewMessages] = useState<WhatsAppMessagePayload[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use ref for callback to avoid re-subscribing when callback changes
  const onNewMessageRef = useRef(onNewMessage)
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  // Clear messages
  const clearMessages = useCallback(() => {
    setNewMessages([])
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      if (!user?.id || !enabled) {
        log.debug('Subscription not enabled or no user')
        return
      }

      try {
        log.debug('Setting up WhatsApp messages subscription for user:', user.id)

        channel = supabase
          .channel(`whatsapp_messages_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'whatsapp_messages',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              log.debug('New message received:', payload.new)

              const newMessage = payload.new as WhatsAppMessagePayload

              // Call the callback
              onNewMessageRef.current?.(newMessage)

              // Track in state if enabled
              if (trackMessages) {
                setNewMessages((prev) => {
                  const updated = [newMessage, ...prev]
                  // Limit the array size
                  return updated.slice(0, maxMessages)
                })
              }
            }
          )
          .subscribe((status) => {
            log.debug('Subscription status:', status)
            setIsSubscribed(status === 'SUBSCRIBED')

            if (status === 'CHANNEL_ERROR') {
              setError(new Error('Failed to subscribe to WhatsApp messages'))
            }
          })
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Subscription setup error')
        log.error('Subscription setup error:', error)
        setError(error)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        log.debug('Cleaning up WhatsApp messages subscription')
        supabase.removeChannel(channel)
        setIsSubscribed(false)
      }
    }
  }, [user?.id, enabled, trackMessages, maxMessages])

  return {
    newMessages,
    clearMessages,
    isSubscribed,
    error,
  }
}

export default useWhatsAppMessagesRealtime
