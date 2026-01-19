/**
 * useWhatsAppConnection Hook
 *
 * Comprehensive hook for managing WhatsApp connection lifecycle:
 * - Create/retrieve user instance
 * - Connect/disconnect WhatsApp
 * - Generate QR codes and pairing codes
 * - Monitor connection status with real-time updates
 * - Handle connection errors
 *
 * @example
 * const {
 *   session,
 *   connectionState,
 *   isConnected,
 *   connect,
 *   disconnect,
 *   fetchQRCode,
 * } = useWhatsAppConnection()
 *
 * Issue: #90 - Connection Page Update
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useWhatsAppSessionSubscription } from '@/hooks/useWhatsAppSessionSubscription'
import type { CreateInstanceResponse } from '@/types/whatsappSession'

interface ConnectionState {
  state: 'open' | 'connecting' | 'close' | 'unknown'
  instance?: string
}

interface UseWhatsAppConnectionReturn {
  /** Current session data from database */
  session: ReturnType<typeof useWhatsAppSessionSubscription>['session']
  /** Connection state from Evolution API */
  connectionState: ConnectionState | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether user is connected */
  isConnected: boolean
  /** QR code for connection (base64 or URL) */
  qrCode: string | null
  /** Create instance and initiate connection */
  connect: () => Promise<void>
  /** Disconnect WhatsApp instance */
  disconnect: () => Promise<void>
  /** Fetch QR code for connection */
  fetchQRCode: () => Promise<void>
  /** Check current connection status */
  checkConnection: () => Promise<void>
}

export function useWhatsAppConnection(): UseWhatsAppConnectionReturn {
  // Use real-time subscription for session data
  const {
    session,
    isConnected,
    refresh: refreshSession,
  } = useWhatsAppSessionSubscription()

  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)

  /**
   * Create user instance via Edge Function
   */
  const connect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[useWhatsAppConnection] Creating user instance...')

      // Get current session to ensure we have valid token
      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession?.access_token) {
        throw new Error('User not authenticated. Please log in again.')
      }

      // Call create-user-instance Edge Function
      const response = await supabase.functions.invoke('create-user-instance', {
        body: {},
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create instance')
      }

      const result = response.data as CreateInstanceResponse

      if (!result.success || !result.session) {
        throw new Error(result.error || 'Failed to create instance')
      }

      console.log('[useWhatsAppConnection] Instance created:', result.session.instance_name)

      // Refresh session data to get latest state
      await refreshSession()

      // Set connection state
      setConnectionState({
        state: result.session.status === 'connected' ? 'open' : 'connecting',
        instance: result.session.instance_name,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      console.error('[useWhatsAppConnection] Connect error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [refreshSession])

  /**
   * Disconnect WhatsApp instance
   */
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!session?.id) {
        throw new Error('No session to disconnect')
      }

      console.log('[useWhatsAppConnection] Disconnecting session:', session.instance_name)

      // Update session status in database
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (updateError) {
        throw updateError
      }

      // Clear QR code
      setQrCode(null)

      // Update connection state
      setConnectionState({
        state: 'close',
        instance: session.instance_name,
      })

      console.log('[useWhatsAppConnection] Disconnected successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      console.error('[useWhatsAppConnection] Disconnect error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * Fetch QR code for connection
   */
  const fetchQRCode = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!session?.instance_name) {
        throw new Error('No instance available. Please connect first.')
      }

      console.log('[useWhatsAppConnection] Fetching QR code for:', session.instance_name)

      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession?.access_token) {
        throw new Error('User not authenticated')
      }

      // Call webhook-evolution Edge Function to get QR code
      const response = await supabase.functions.invoke('webhook-evolution', {
        body: {
          action: 'generate_qrcode',
          instance: session.instance_name,
        },
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate QR code')
      }

      const result = response.data as { success: boolean; qrcode?: { base64?: string }; error?: string }

      if (!result.success || !result.qrcode?.base64) {
        throw new Error(result.error || 'Failed to generate QR code')
      }

      setQrCode(result.qrcode.base64)
      console.log('[useWhatsAppConnection] QR code generated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      console.error('[useWhatsAppConnection] Fetch QR code error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * Check current connection status
   */
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!session?.instance_name) {
        console.log('[useWhatsAppConnection] No instance to check')
        return
      }

      console.log('[useWhatsAppConnection] Checking connection for:', session.instance_name)

      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession?.access_token) {
        throw new Error('User not authenticated')
      }

      // Call webhook-evolution Edge Function to check connection
      const response = await supabase.functions.invoke('webhook-evolution', {
        body: {
          action: 'check_connection',
          instance: session.instance_name,
        },
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to check connection')
      }

      const result = response.data as { success: boolean; state?: string; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to check connection')
      }

      // Update connection state
      setConnectionState({
        state: result.state === 'open' ? 'open' : result.state === 'connecting' ? 'connecting' : 'close',
        instance: session.instance_name,
      })

      console.log('[useWhatsAppConnection] Connection status:', result.state)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      console.error('[useWhatsAppConnection] Check connection error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  return {
    session,
    connectionState,
    isLoading,
    error,
    isConnected,
    qrCode,
    connect,
    disconnect,
    fetchQRCode,
    checkConnection,
  }
}

export default useWhatsAppConnection
