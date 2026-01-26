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
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('WhatsAppConnection')

interface ConnectionState {
  state: 'open' | 'connecting' | 'close' | 'unknown'
  instance?: string
}

interface ConfigureWebhookResult {
  success: boolean
  webhookConfigured?: boolean
  sessionUpdated?: boolean
  connectionState?: string
  error?: string
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
  /** Configure webhook for existing instance (fixes broken instances) */
  configureWebhook: () => Promise<ConfigureWebhookResult | null>
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

      log.debug('[useWhatsAppConnection] Creating user instance...')

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

      log.debug('[useWhatsAppConnection] Instance created:', result.session.instance_name)

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
      log.error('[useWhatsAppConnection] Connect error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [refreshSession])

  /**
   * Disconnect WhatsApp instance
   * Calls Evolution API to logout, then updates database
   */
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!session?.id) {
        throw new Error('No session to disconnect')
      }

      log.debug('[useWhatsAppConnection] Disconnecting session:', session.instance_name)

      // Get current session to ensure we have valid token
      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession?.access_token) {
        throw new Error('User not authenticated. Please log in again.')
      }

      // Call disconnect-whatsapp Edge Function to logout from Evolution API
      const response = await supabase.functions.invoke('disconnect-whatsapp', {
        body: { sessionId: session.id },
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to disconnect')
      }

      const result = response.data as { success: boolean; message?: string; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect')
      }

      log.debug('[useWhatsAppConnection] Disconnected from Evolution API:', result.message)

      // Clear QR code
      setQrCode(null)

      // Update connection state
      setConnectionState({
        state: 'close',
        instance: session.instance_name,
      })

      // Refresh session data to get latest state
      await refreshSession()

      log.debug('[useWhatsAppConnection] Disconnected successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      log.error('[useWhatsAppConnection] Disconnect error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, refreshSession])

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

      log.debug('[useWhatsAppConnection] Fetching QR code for:', session.instance_name)

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
      log.debug('[useWhatsAppConnection] QR code generated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      log.error('[useWhatsAppConnection] Fetch QR code error:', errorMessage)
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
        log.debug('[useWhatsAppConnection] No instance to check')
        return
      }

      log.debug('[useWhatsAppConnection] Checking connection for:', session.instance_name)

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

      log.debug('[useWhatsAppConnection] Connection status:', result.state)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      log.error('[useWhatsAppConnection] Check connection error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * Configure webhook for existing instance
   * Use this to fix instances that were created before the webhook fix
   * Falls back to direct database update via RPC if Edge Function unavailable
   */
  const configureWebhook = useCallback(async (): Promise<ConfigureWebhookResult | null> => {
    try {
      setIsLoading(true)
      setError(null)

      log.debug('Configuring webhook...')

      const { data: { session: authSession } } = await supabase.auth.getSession()

      if (!authSession?.access_token) {
        throw new Error('User not authenticated')
      }

      // Try calling configure-instance-webhook Edge Function
      const response = await supabase.functions.invoke('configure-instance-webhook', {
        body: { updateSessionStatus: true },
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
      })

      // If Edge Function works, use its result
      if (!response.error) {
        const result = response.data as ConfigureWebhookResult

        if (result?.success) {
          log.info('Webhook configured via Edge Function:', result)

          // Refresh session data to get latest state
          await refreshSession()

          // Update connection state based on result
          if (result.connectionState === 'open') {
            setConnectionState({
              state: 'open',
              instance: session?.instance_name,
            })
          }

          return result
        }
      }

      // Fallback: Edge Function not available or failed
      // Try to update session status directly via RPC
      log.warn('Edge Function unavailable, trying RPC fallback...')

      if (session?.id && session?.instance_name) {
        // Call the database RPC to update session status to 'connected'
        // This is a recovery mechanism when the webhook didn't update properly
        const { error: rpcError } = await supabase.rpc('update_whatsapp_session_status', {
          p_session_id: session.id,
          p_status: 'connected',
          p_error_message: null,
          p_error_code: null,
        })

        if (rpcError) {
          log.error('RPC fallback error:', rpcError)
          throw new Error('Failed to update session status via fallback')
        }

        log.info('Session status updated via RPC fallback')

        // Refresh session data
        await refreshSession()

        // Update connection state
        setConnectionState({
          state: 'open',
          instance: session.instance_name,
        })

        return {
          success: true,
          message: 'Session updated via fallback',
          webhookConfigured: false,
          sessionUpdated: true,
          connectionState: 'open',
        }
      }

      throw new Error('Failed to configure webhook and no session available for fallback')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(errorMessage))
      log.error('Configure webhook error:', errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [session, refreshSession])

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
    configureWebhook,
  }
}

export default useWhatsAppConnection
