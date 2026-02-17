/**
 * Hook for Google Drive integration — lists files, searches, paginates.
 * Returns empty state gracefully if Drive scope is not connected.
 */

import { useState, useEffect, useCallback } from 'react';
import { listFiles, type DriveFile } from '@/services/driveService';
import { hasDriveScope } from '@/services/googleCalendarTokenService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useDriveIntegration');

interface UseDriveIntegrationReturn {
    isConnected: boolean;
    files: DriveFile[];
    isLoading: boolean;
    error: string | null;
    search: (query: string) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
}

export function useDriveIntegration(): UseDriveIntegrationReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>();
    const [currentQuery, setCurrentQuery] = useState<string | undefined>();

    const checkConnection = useCallback(async () => {
        const connected = await hasDriveScope();
        setIsConnected(connected);
        return connected;
    }, []);

    const fetchFiles = useCallback(async (query?: string, pageToken?: string, append = false) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await listFiles({ query, pageToken });
            if (append) {
                setFiles(prev => [...prev, ...result.files]);
            } else {
                setFiles(result.files);
            }
            setNextPageToken(result.nextPageToken);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar arquivos';
            log.error('[fetchFiles]', { error: err });
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
                await fetchFiles();
            } else {
                setIsLoading(false);
            }
        };
        init();
    }, [checkConnection, fetchFiles]);

    const search = useCallback(async (query: string) => {
        setCurrentQuery(query);
        await fetchFiles(query);
    }, [fetchFiles]);

    const refresh = useCallback(async () => {
        const connected = await checkConnection();
        if (connected) {
            await fetchFiles(currentQuery);
        }
    }, [checkConnection, fetchFiles, currentQuery]);

    const loadMore = useCallback(async () => {
        if (!nextPageToken) return;
        await fetchFiles(currentQuery, nextPageToken, true);
    }, [fetchFiles, currentQuery, nextPageToken]);

    return {
        isConnected,
        files,
        isLoading,
        error,
        search,
        refresh,
        loadMore,
        hasMore: !!nextPageToken,
    };
}
