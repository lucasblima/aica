import { useState, useCallback, useEffect } from 'react';
import {
    fetchAndTransformEvents,
    TimelineEvent,
    fetchAvailableCalendars,
} from '../services/googleCalendarService';
import { isGoogleCalendarConnected } from '../services/googleAuthService';

export interface UseGoogleCalendarEventsOptions {
    /** Sincronizar automaticamente ao conectar */
    autoSync?: boolean;
    /** Intervalo de sincronização em segundos (0 = desabilitar) */
    syncInterval?: number;
    /** Data de início (padrão: hoje) */
    startDate?: Date;
    /** Data de término (padrão: início + 7 dias) */
    endDate?: Date;
}

export function useGoogleCalendarEvents(
    options: UseGoogleCalendarEventsOptions = {}
) {
    const {
        autoSync = true,
        syncInterval = 300, // 5 minutos
        startDate,
        endDate,
    } = options;

    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isTokenExpired, setIsTokenExpired] = useState(false);

    // Verificar conexão ao montar
    useEffect(() => {
        const checkConnection = async () => {
            try {
                console.log('[useGoogleCalendarEvents] 🔍 Verificando conexão...');
                const connected = await isGoogleCalendarConnected();
                console.log('[useGoogleCalendarEvents] 📡 Status de conexão:', connected);
                setIsConnected(connected);
            } catch (err) {
                console.error('[useGoogleCalendarEvents] ❌ Erro ao verificar conexão:', err);
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
        console.log('[useGoogleCalendarEvents] 🔄 fetchEvents chamado:', {
            isConnected,
            start: start?.toISOString(),
            end: end?.toISOString(),
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
        });

        if (!isConnected) {
            console.log('[useGoogleCalendarEvents] ⚠️ Não conectado - limpando eventos');
            setEvents([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('[useGoogleCalendarEvents] 📥 Buscando eventos...');

            const fetchedEvents = await fetchAndTransformEvents(
                start || startDate,
                end || endDate
            );

            console.log('[useGoogleCalendarEvents] ✅ Eventos recebidos:', {
                count: fetchedEvents.length,
                events: fetchedEvents
            });

            setEvents(fetchedEvents);
            setLastSyncTime(new Date());
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar eventos';
            console.error('[useGoogleCalendarEvents] ❌ Erro ao buscar eventos:', err);

            // Detectar token expirado e parar auto-sync
            if (errorMessage.includes('Token expirado') || errorMessage.includes('401')) {
                console.warn('[useGoogleCalendarEvents] 🚨 Token expirado detectado - parando auto-sync');
                setIsTokenExpired(true);
                setIsConnected(false);
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, startDate, endDate]);

    // Auto-sync quando conectado
    useEffect(() => {
        console.log('[useGoogleCalendarEvents] 🔄 Auto-sync effect:', {
            isConnected,
            autoSync,
            syncInterval,
            isTokenExpired
        });

        if (!isConnected || !autoSync || isTokenExpired) {
            console.log('[useGoogleCalendarEvents] ⏸️ Auto-sync desabilitado (não conectado, desabilitado, ou token expirado)');
            return;
        }

        // Sincronizar imediatamente
        console.log('[useGoogleCalendarEvents] 🚀 Iniciando sincronização imediata...');
        fetchEvents();

        // Sincronizar periodicamente
        if (syncInterval > 0) {
            console.log('[useGoogleCalendarEvents] ⏰ Configurando sincronização periódica:', {
                intervalSeconds: syncInterval
            });
            const interval = setInterval(() => {
                console.log('[useGoogleCalendarEvents] 🔁 Sincronização periódica disparada');
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

    return {
        events,
        isConnected,
        isLoading,
        error,
        lastSyncTime,
        isTokenExpired,
        sync,
        addLocalEvent,
        fetchEvents,
    };
}
