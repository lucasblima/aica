/**
 * useWhatsAppConnection Hook
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * React hook for managing WhatsApp connection state:
 * - Real-time connection status
 * - QR code generation for new connections
 * - Instance management
 * - Auto-reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import {
  generateWhatsAppQRCode as generateQRCodeEdge,
  disconnectWhatsApp as disconnectWhatsAppEdge,
} from '@/services/edgeFunctionService';
import {
  WhatsAppConnectionStatus,
  ConnectionState,
  EvolutionInstance,
} from '@/types/whatsapp';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useWhatsAppConnection');

// ============================================================================
// CONSTANTS
// ============================================================================

const EVOLUTION_INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'Lucas_4569';
const POLL_INTERVAL_MS = 30000; // 30 seconds
const RECONNECT_DELAY_MS = 5000; // 5 seconds

// ============================================================================
// TYPES
// ============================================================================

interface UseWhatsAppConnectionOptions {
  autoConnect?: boolean;
  pollInterval?: number;
  onConnectionChange?: (status: WhatsAppConnectionStatus) => void;
  onMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseWhatsAppConnectionReturn {
  // State
  status: WhatsAppConnectionStatus;
  isLoading: boolean;
  error: Error | null;
  qrCode: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  generateQRCode: () => Promise<string | null>;

  // Instance info
  instanceInfo: EvolutionInstance | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWhatsAppConnection(
  options: UseWhatsAppConnectionOptions = {}
): UseWhatsAppConnectionReturn {
  const {
    autoConnect = false,
    pollInterval = POLL_INTERVAL_MS,
    onConnectionChange,
    onMessage,
    onError,
  } = options;

  // State
  const [status, setStatus] = useState<WhatsAppConnectionStatus>({
    isConnected: false,
    state: 'disconnected',
    instanceName: EVOLUTION_INSTANCE_NAME,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    qrCode: null,
    phone: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [instanceInfo, setInstanceInfo] = useState<EvolutionInstance | null>(null);

  // Refs
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  // ============================================================================
  // FETCH STATUS
  // ============================================================================

  const fetchStatus = useCallback(async (): Promise<WhatsAppConnectionStatus> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isConnected: false,
          state: 'disconnected',
          instanceName: EVOLUTION_INSTANCE_NAME,
          lastConnectedAt: null,
          lastDisconnectedAt: null,
          qrCode: null,
          phone: null,
        };
      }

      // Get user's WhatsApp status
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('whatsapp_connected, whatsapp_connected_at, whatsapp_disconnected_at, instance_name')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        log.error('fetchStatus error:', { error: fetchError });
        throw fetchError;
      }

      const newStatus: WhatsAppConnectionStatus = {
        isConnected: data?.whatsapp_connected || false,
        state: data?.whatsapp_connected ? 'open' : 'disconnected',
        instanceName: data?.instance_name || EVOLUTION_INSTANCE_NAME,
        lastConnectedAt: data?.whatsapp_connected_at || null,
        lastDisconnectedAt: data?.whatsapp_disconnected_at || null,
        qrCode: null,
        phone: null,
      };

      return newStatus;
    } catch (err) {
      const error = err as Error;
      log.error('fetchStatus exception:', { error });
      throw error;
    }
  }, []);

  // ============================================================================
  // REFRESH STATUS
  // ============================================================================

  const refreshStatus = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const newStatus = await fetchStatus();

      if (isMountedRef.current) {
        const statusChanged = newStatus.isConnected !== status.isConnected;
        setStatus(newStatus);

        if (statusChanged && onConnectionChange) {
          onConnectionChange(newStatus);
        }
      }
    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchStatus, status.isConnected, onConnectionChange, onError]);

  // ============================================================================
  // GENERATE QR CODE
  // ============================================================================

  const generateQRCode = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Edge Function helper to generate QR code
      const response = await generateQRCodeEdge(status.instanceName);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate QR code');
      }

      const qrCodeBase64 = response.qrcode?.base64 || null;

      if (isMountedRef.current) {
        setQRCode(qrCodeBase64);
        setStatus(prev => ({
          ...prev,
          state: 'connecting',
          qrCode: qrCodeBase64,
        }));
      }

      return qrCodeBase64;
    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [status.instanceName, onError]);

  // ============================================================================
  // CONNECT
  // ============================================================================

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If already connected, just refresh
      if (status.isConnected) {
        await refreshStatus();
        return;
      }

      // Generate QR code for connection
      const qr = await generateQRCode();

      if (!qr) {
        throw new Error('Failed to generate QR code');
      }

      // Start polling more frequently during connection
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        const newStatus = await fetchStatus();
        if (isMountedRef.current) {
          setStatus(newStatus);

          if (newStatus.isConnected) {
            // Connection successful, restore normal polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            pollIntervalRef.current = setInterval(refreshStatus, pollInterval);
            setQRCode(null);
            onConnectionChange?.(newStatus);
          }
        }
      }, 3000); // Poll every 3 seconds during connection

    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [status.isConnected, refreshStatus, generateQRCode, fetchStatus, pollInterval, onConnectionChange, onError]);

  // ============================================================================
  // DISCONNECT
  // ============================================================================

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Edge Function helper to disconnect
      const response = await disconnectWhatsAppEdge(status.instanceName);

      if (!response.success) {
        log.warn('disconnect warning:', response.error);
      }

      // Update local state
      const newStatus: WhatsAppConnectionStatus = {
        ...status,
        isConnected: false,
        state: 'disconnected',
        lastDisconnectedAt: new Date().toISOString(),
        qrCode: null,
      };

      if (isMountedRef.current) {
        setStatus(newStatus);
        setQRCode(null);
        onConnectionChange?.(newStatus);
      }

    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [status, onConnectionChange, onError]);

  // ============================================================================
  // REALTIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    // Subscribe to realtime updates on the users table
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      realtimeChannelRef.current = supabase
        .channel('whatsapp-connection-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;

            const newData = payload.new as {
              whatsapp_connected?: boolean;
              whatsapp_connected_at?: string;
              whatsapp_disconnected_at?: string;
              instance_name?: string;
            };

            const newStatus: WhatsAppConnectionStatus = {
              isConnected: newData.whatsapp_connected || false,
              state: newData.whatsapp_connected ? 'open' : 'disconnected',
              instanceName: newData.instance_name || EVOLUTION_INSTANCE_NAME,
              lastConnectedAt: newData.whatsapp_connected_at || null,
              lastDisconnectedAt: newData.whatsapp_disconnected_at || null,
              qrCode: null,
              phone: null,
            };

            setStatus(prev => {
              if (prev.isConnected !== newStatus.isConnected) {
                onConnectionChange?.(newStatus);
              }
              return newStatus;
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [onConnectionChange]);

  // ============================================================================
  // POLLING
  // ============================================================================

  useEffect(() => {
    // Initial fetch
    refreshStatus();

    // Setup polling
    pollIntervalRef.current = setInterval(refreshStatus, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [refreshStatus, pollInterval]);

  // ============================================================================
  // AUTO CONNECT
  // ============================================================================

  useEffect(() => {
    if (autoConnect && !status.isConnected && !isLoading) {
      connect();
    }
  }, [autoConnect, status.isConnected, isLoading, connect]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    status,
    isLoading,
    error,
    qrCode,
    connect,
    disconnect,
    refreshStatus,
    generateQRCode,
    instanceInfo,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Simple hook to check if WhatsApp is connected
 */
export function useIsWhatsAppConnected(): boolean {
  const { status } = useWhatsAppConnection();
  return status.isConnected;
}

/**
 * Hook to get connection state string
 */
export function useWhatsAppConnectionState(): ConnectionState {
  const { status } = useWhatsAppConnection();
  return status.state;
}

export default useWhatsAppConnection;
