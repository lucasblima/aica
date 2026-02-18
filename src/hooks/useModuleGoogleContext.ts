/**
 * Hook for module-aware Google contextual search.
 *
 * Any AICA module can use this hook to find relevant Gmail/Drive content
 * based on the module's current context (entities, keywords, people).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleScopes } from '@/hooks/useGoogleScopes';
import {
    searchGoogleContext,
    confirmLink as confirmLinkApi,
    rejectLink as rejectLinkApi,
    getModuleLinks,
    type AicaModule,
    type GoogleContextResponse,
    type GoogleResourceLink,
} from '@/services/googleContextService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useModuleGoogleContext');

interface ModuleGoogleContextOptions {
    entities?: string[];
    keywords?: string[];
    people?: string[];
    entityId?: string;
}

interface ModuleGoogleContextReturn {
    results: GoogleContextResponse | null;
    isLoading: boolean;
    error: string | null;
    search: (context?: { entities?: string[]; keywords?: string[]; people?: string[] }) => Promise<void>;
    confirmLink: (linkId: string) => Promise<void>;
    rejectLink: (linkId: string) => Promise<void>;
    savedLinks: GoogleResourceLink[];
    isLoadingSaved: boolean;
    hasGmail: boolean;
    hasDrive: boolean;
    isGoogleLoading: boolean;
    connectGmail: () => Promise<void>;
    connectDrive: () => Promise<void>;
}

export function useModuleGoogleContext(
    module: AicaModule,
    defaultContext?: ModuleGoogleContextOptions
): ModuleGoogleContextReturn {
    const { hasGmail, hasDrive, isLoading: isGoogleLoading, connectGmail, connectDrive } = useGoogleScopes();

    const [results, setResults] = useState<GoogleContextResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedLinks, setSavedLinks] = useState<GoogleResourceLink[]>([]);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Load saved links on mount
    useEffect(() => {
        let cancelled = false;

        async function loadSaved() {
            setIsLoadingSaved(true);
            try {
                const links = await getModuleLinks(module, defaultContext?.entityId);
                if (!cancelled && mountedRef.current) {
                    setSavedLinks(links);
                }
            } catch (err) {
                log.error('Failed to load saved links:', { error: err });
            } finally {
                if (!cancelled && mountedRef.current) {
                    setIsLoadingSaved(false);
                }
            }
        }

        loadSaved();
        return () => { cancelled = true; };
    }, [module, defaultContext?.entityId]);

    const search = useCallback(async (
        context?: { entities?: string[]; keywords?: string[]; people?: string[] }
    ) => {
        const entities = context?.entities ?? defaultContext?.entities ?? [];
        const keywords = context?.keywords ?? defaultContext?.keywords ?? [];
        const people = context?.people ?? defaultContext?.people ?? [];

        if (entities.length === 0 && keywords.length === 0 && people.length === 0) {
            setError('Forneça ao menos um termo de busca');
            return;
        }

        // Build sources based on connected services
        const sources: ('gmail' | 'drive')[] = [];
        if (hasGmail) sources.push('gmail');
        if (hasDrive) sources.push('drive');

        if (sources.length === 0) {
            setError('Conecte Gmail ou Drive para buscar');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await searchGoogleContext({
                module,
                context: { entities, keywords, people },
                sources,
            });

            if (mountedRef.current) {
                setResults(response);

                // Reload saved links after search (search may auto-save high-confidence results)
                const links = await getModuleLinks(module, defaultContext?.entityId);
                if (mountedRef.current) {
                    setSavedLinks(links);
                }
            }
        } catch (err) {
            if (mountedRef.current) {
                const message = err instanceof Error ? err.message : 'Erro na busca contextual';
                setError(message);
                log.error('Search failed:', { error: err });
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [module, hasGmail, hasDrive, defaultContext]);

    const handleConfirmLink = useCallback(async (linkId: string) => {
        try {
            await confirmLinkApi(linkId);
            setSavedLinks(prev =>
                prev.map(l => l.id === linkId ? { ...l, status: 'confirmed' as const } : l)
            );
        } catch (err) {
            log.error('Failed to confirm link:', { error: err });
        }
    }, []);

    const handleRejectLink = useCallback(async (linkId: string) => {
        try {
            await rejectLinkApi(linkId);
            setSavedLinks(prev =>
                prev.map(l => l.id === linkId ? { ...l, status: 'rejected' as const } : l)
            );
        } catch (err) {
            log.error('Failed to reject link:', { error: err });
        }
    }, []);

    return {
        results,
        isLoading,
        error,
        search,
        confirmLink: handleConfirmLink,
        rejectLink: handleRejectLink,
        savedLinks,
        isLoadingSaved,
        hasGmail,
        hasDrive,
        isGoogleLoading,
        connectGmail,
        connectDrive,
    };
}
