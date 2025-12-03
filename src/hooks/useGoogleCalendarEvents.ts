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

    // Verificar conexão ao montar
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connected = await isGoogleCalendarConnected();
                setIsConnected(connected);
            } catch (err) {
                console.error('Erro ao verificar conexão:', err);
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
        if (!isConnected) {
            setEvents([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const fetchedEvents = await fetchAndTransformEvents(
                start || startDate,
                end || endDate
            );

            setEvents(fetchedEvents);
            setLastSyncTime(new Date());
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar eventos';
            setError(errorMessage);
            console.error('Erro ao buscar eventos:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, startDate, endDate]);

    // Auto-sync quando conectado
    useEffect(() => {
        if (!isConnected || !autoSync) return;

        // Sincronizar imediatamente
        fetchEvents();

        // Sincronizar periodicamente
        if (syncInterval > 0) {
            const interval = setInterval(() => {
                fetchEvents();
            }, syncInterval * 1000);

            return () => clearInterval(interval);
        }
    }, [isConnected, autoSync, syncInterval, fetchEvents]);

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
        sync,
        addLocalEvent,
        fetchEvents,
    };
}
