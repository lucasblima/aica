/**
 * Hook for Gmail integration — lists emails, searches, paginates.
 * Returns empty state gracefully if Gmail scope is not connected.
 */

import { useState, useEffect, useCallback } from 'react';
import { listEmails, searchEmails, type GmailMessage } from '@/services/gmailService';
import { hasGmailScope } from '@/services/googleCalendarTokenService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useGmailIntegration');

interface UseGmailIntegrationReturn {
    isConnected: boolean;
    emails: GmailMessage[];
    isLoading: boolean;
    error: string | null;
    search: (query: string) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
}

export function useGmailIntegration(): UseGmailIntegrationReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>();
    const [currentQuery, setCurrentQuery] = useState<string | undefined>();

    const checkConnection = useCallback(async () => {
        const connected = await hasGmailScope();
        setIsConnected(connected);
        return connected;
    }, []);

    const fetchEmails = useCallback(async (query?: string, pageToken?: string, append = false) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await listEmails({ query, pageToken });
            if (append) {
                setEmails(prev => [...prev, ...result.messages]);
            } else {
                setEmails(result.messages);
            }
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar emails';
            log.error('[fetchEmails]', { error: err });
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const init = async () => {
            const connected = await checkConnection();
            if (connected) {
                await fetchEmails();
            } else {
                setIsLoading(false);
            }
        };
        init();
    }, [checkConnection, fetchEmails]);

    const search = useCallback(async (query: string) => {
        setCurrentQuery(query);
        await fetchEmails(query);
    }, [fetchEmails]);

    const refresh = useCallback(async () => {
        const connected = await checkConnection();
        if (connected) {
            await fetchEmails(currentQuery);
        }
    }, [checkConnection, fetchEmails, currentQuery]);

    const loadMore = useCallback(async () => {
        if (!nextPageToken) return;
        await fetchEmails(currentQuery, nextPageToken, true);
    }, [fetchEmails, currentQuery, nextPageToken]);

    return {
        isConnected,
        emails,
        isLoading,
        error,
        search,
        refresh,
        loadMore,
        hasMore: !!nextPageToken,
    };
}
