import { useState, useCallback, useEffect, useRef } from 'react';
import {
    fetchAndTransformEvents,
    TimelineEvent,
    fetchAvailableCalendars,
} from '../services/googleCalendarService';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';
import {
    onTokenRefreshFailure,
    getTokenRefreshState,
} from '@/services/googleCalendarTokenService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useGoogleCalendarEvents');

/**
 * Token refresh failure notification interface
 */
export interface TokenRefreshFailureNotification {
    code: string;
    message: string;
    requiresReconnect: boolean;
    consecutiveFailures: number;
    timestamp: Date;
}

export interface UseGoogleCalendarEventsOptions {
    /** Sincronizar automaticamente ao conectar */
    autoSync?: boolean;
    /** Intervalo de sincronização em segundos (0 = desabilitar) */
    syncInterval?: number;
    /** Data de início (padrão: hoje) */
    startDate?: Date;
    /** Data de término (padrão: início + 7 dias) */
    endDate?: Date;
    /** Callback quando token refresh falha */
    onRefreshFailure?: (notification: TokenRefreshFailureNotification) => void;
}

export function useGoogleCalendarEvents(
    options: UseGoogleCalendarEventsOptions = {}
) {
    const {
        autoSync = true,
        syncInterval = 300, // 5 minutos
        startDate,
        endDate,
        onRefreshFailure,
    } = options;

    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isTokenExpired, setIsTokenExpired] = useState(false);
    const [refreshFailure, setRefreshFailure] = useState<TokenRefreshFailureNotification | null>(null);

    // Keep track of the callback ref to avoid unnecessary re-subscriptions
    const onRefreshFailureRef = useRef(onRefreshFailure);
    onRefreshFailureRef.current = onRefreshFailure;

    // Subscribe to token refresh failure notifications
    useEffect(() => {
        log.debug('Subscribing to token refresh failure notifications');

        const unsubscribe = onTokenRefreshFailure((failureInfo) => {
            const notification: TokenRefreshFailureNotification = {
                ...failureInfo,
                timestamp: new Date(),
            };

            log.warn('Token refresh failure notification received:', {
                code: notification.code,
                message: notification.message,
                requiresReconnect: notification.requiresReconnect,
                consecutiveFailures: notification.consecutiveFailures,
            });

            setRefreshFailure(notification);

            if (notification.requiresReconnect) {
                setIsTokenExpired(true);
                setIsConnected(false);
            }

            // Call the callback if provided
            if (onRefreshFailureRef.current) {
                onRefreshFailureRef.current(notification);
            }
        });

        return () => {
            log.debug('Unsubscribing from token refresh failure notifications');
            unsubscribe();
        };
    }, []);

    // Clear refresh failure when connection is re-established
    useEffect(() => {
        if (isConnected && refreshFailure) {
            log.debug('Connection re-established, clearing refresh failure state');
            setRefreshFailure(null);
        }
    }, [isConnected, refreshFailure]);

    // Verificar conexão ao montar
    useEffect(() => {
        const checkConnection = async () => {
            try {
                log.debug('🔍 Verificando conexão...');
                const connected = await isGoogleCalendarConnected();
                log.debug('📡 Status de conexão:', connected);
                setIsConnected(connected);
            } catch (err) {
                log.error('❌ Erro ao verificar conexão:', { error: err });
            }
        };

        checkConnection();

        // Ouvir mudanças de conexão
        const interval = setInterval(checkConnection, 10000); // Verificar a cada 10s
        return () => clearInterval(interval);
    }, []);

    // Buscar eventos
    const fetchEvents = useCallback(async (
        start?: Date,
        end?: Date
    ) => {
        log.debug('🔄 fetchEvents chamado:', {
            isConnected,
            start: start?.toISOString(),
            end: end?.toISOString(),
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
        });

        if (!isConnected) {
            log.debug('⚠️ Não conectado - limpando eventos');
            setEvents([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            log.debug('📥 Buscando eventos...');

            const fetchedEvents = await fetchAndTransformEvents(
                start || startDate,
                end || endDate
            );

            log.debug('✅ Eventos recebidos:', {
                count: fetchedEvents.length,
                events: fetchedEvents
            });

            setEvents(fetchedEvents);
            setLastSyncTime(new Date());
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar eventos';
            log.error('❌ Erro ao buscar eventos:', { error: err });

            // Detectar token expirado e parar auto-sync
            if (errorMessage.includes('Token expirado') || errorMessage.includes('401')) {
                log.warn('🚨 Token expirado detectado - parando auto-sync');
                setIsTokenExpired(true);
                setIsConnected(false);
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, startDate?.getTime(), endDate?.getTime()]);

    // Auto-sync quando conectado
    useEffect(() => {
        log.debug('🔄 Auto-sync effect:', {
            isConnected,
            autoSync,
            syncInterval,
            isTokenExpired
        });

        if (!isConnected || !autoSync || isTokenExpired) {
            log.debug('⏸️ Auto-sync desabilitado (não conectado, desabilitado, ou token expirado)');
            return;
        }

        // Sincronizar imediatamente
        log.debug('🚀 Iniciando sincronização imediata...');
        fetchEvents();

        // Sincronizar periodicamente
        if (syncInterval > 0) {
            log.debug('⏰ Configurando sincronização periódica:', {
                intervalSeconds: syncInterval
            });
            const interval = setInterval(() => {
                log.debug('🔁 Sincronização periódica disparada');
                fetchEvents();
            }, syncInterval * 1000);

            return () => clearInterval(interval);
        }
    }, [isConnected, autoSync, syncInterval, isTokenExpired, fetchEvents]);

    // Sincronizar manualmente
    const sync = useCallback(async () => {
        await fetchEvents();
    }, [fetchEvents]);

    // Adicionar evento localmente (antes de ser sincronizado)
    const addLocalEvent = useCallback((event: TimelineEvent) => {
        setEvents(prev => [...prev, event].sort((a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));
    }, []);

    // Function to clear the refresh failure notification
    const clearRefreshFailure = useCallback(() => {
        setRefreshFailure(null);
    }, []);

    // Function to get current refresh state for debugging
    const getRefreshState = useCallback(() => {
        return getTokenRefreshState();
    }, []);

    return {
        events,
        isConnected,
        isLoading,
        error,
        lastSyncTime,
        isTokenExpired,
        /** Current token refresh failure notification, if any */
        refreshFailure,
        /** Clear the current refresh failure notification */
        clearRefreshFailure,
        /** Get current token refresh state for debugging */
        getRefreshState,
        sync,
        addLocalEvent,
        fetchEvents,
    };
}
