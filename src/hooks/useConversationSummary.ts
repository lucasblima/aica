import { useState, useCallback } from 'react';
import { summarizeContact, type ConversationSummary } from '@/services/gmailSummarizeService';

type LoadingPhase = 'fetching' | 'analyzing' | null;

export function useConversationSummary() {
    const [summary, setSummary] = useState<ConversationSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
    const [error, setError] = useState<string | null>(null);

    const summarize = useCallback(async (email: string, name?: string) => {
        setIsLoading(true);
        setError(null);
        setSummary(null);
        setLoadingPhase('fetching');

        // Transition to analyzing phase after a short delay
        const phaseTimer = setTimeout(() => setLoadingPhase('analyzing'), 3000);

        try {
            const result = await summarizeContact(email, name);
            setSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao gerar resumo');
        } finally {
            clearTimeout(phaseTimer);
            setIsLoading(false);
            setLoadingPhase(null);
        }
    }, []);

    const clear = useCallback(() => {
        setSummary(null);
        setError(null);
        setIsLoading(false);
        setLoadingPhase(null);
    }, []);

    return { summary, isLoading, loadingPhase, error, summarize, clear };
}
