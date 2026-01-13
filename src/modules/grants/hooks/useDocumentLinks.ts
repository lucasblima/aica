/**
 * Document Links Hook
 * Issue #115 - Classification and Automatic Linking
 *
 * React hook for managing document link suggestions with optimistic updates.
 *
 * @module modules/grants/hooks/useDocumentLinks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getDocumentLinkSuggestions,
  confirmLinkSuggestion,
  rejectLinkSuggestion,
  type LinkSuggestion,
} from '../services/documentProcessingService';

// =============================================================================
// TYPES
// =============================================================================

export interface UseDocumentLinksOptions {
  /** Automatically fetch suggestions on mount */
  autoFetch?: boolean;
  /** Callback when a suggestion is confirmed */
  onConfirm?: (suggestion: LinkSuggestion) => void;
  /** Callback when a suggestion is rejected */
  onReject?: (suggestion: LinkSuggestion) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseDocumentLinksReturn {
  /** List of link suggestions */
  suggestions: LinkSuggestion[];
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Fetch/refresh suggestions */
  fetchSuggestions: () => Promise<void>;
  /** Confirm a link suggestion */
  confirmSuggestion: (suggestionId: string) => Promise<void>;
  /** Reject a link suggestion */
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  /** Clear all suggestions locally */
  clearSuggestions: () => void;
  /** Check if a specific suggestion is being processed */
  isProcessing: (suggestionId: string) => boolean;
  /** Count of pending suggestions */
  pendingCount: number;
}

// =============================================================================
// HOOK: useLinkSuggestions
// =============================================================================

/**
 * Hook for fetching and managing link suggestions for a specific document
 */
export function useLinkSuggestions(
  documentId: string | null | undefined,
  options: UseDocumentLinksOptions = {}
): UseDocumentLinksReturn {
  const { autoFetch = true, onConfirm, onReject, onError } = options;

  // State
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Refs for stable callbacks
  const onConfirmRef = useRef(onConfirm);
  const onRejectRef = useRef(onReject);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onRejectRef.current = onReject;
    onErrorRef.current = onError;
  }, [onConfirm, onReject, onError]);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!documentId) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getDocumentLinkSuggestions(documentId);
      setSuggestions(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar sugestoes');
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Auto-fetch on mount or document change
  useEffect(() => {
    if (autoFetch && documentId) {
      fetchSuggestions();
    }
  }, [autoFetch, documentId, fetchSuggestions]);

  // Confirm suggestion with optimistic update
  const confirmSuggestion = useCallback(
    async (suggestionId: string) => {
      // Find the suggestion for callback
      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) {
        const error = new Error('Sugestao nao encontrada');
        setError(error);
        onErrorRef.current?.(error);
        return;
      }

      // Optimistic update: mark as processing
      setProcessingIds((prev) => new Set([...prev, suggestionId]));

      // Optimistic update: remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

      try {
        await confirmLinkSuggestion(suggestionId);
        onConfirmRef.current?.(suggestion);
      } catch (err) {
        // Rollback on error
        setSuggestions((prev) => [...prev, suggestion].sort((a, b) => b.confidence - a.confidence));

        const error = err instanceof Error ? err : new Error('Erro ao confirmar vinculacao');
        setError(error);
        onErrorRef.current?.(error);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });
      }
    },
    [suggestions]
  );

  // Reject suggestion with optimistic update
  const rejectSuggestion = useCallback(
    async (suggestionId: string) => {
      // Find the suggestion for callback
      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) {
        const error = new Error('Sugestao nao encontrada');
        setError(error);
        onErrorRef.current?.(error);
        return;
      }

      // Optimistic update: mark as processing
      setProcessingIds((prev) => new Set([...prev, suggestionId]));

      // Optimistic update: remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

      try {
        await rejectLinkSuggestion(suggestionId);
        onRejectRef.current?.(suggestion);
      } catch (err) {
        // Rollback on error
        setSuggestions((prev) => [...prev, suggestion].sort((a, b) => b.confidence - a.confidence));

        const error = err instanceof Error ? err : new Error('Erro ao rejeitar sugestao');
        setError(error);
        onErrorRef.current?.(error);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });
      }
    },
    [suggestions]
  );

  // Clear suggestions locally
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  // Check if a suggestion is being processed
  const isProcessing = useCallback(
    (suggestionId: string) => processingIds.has(suggestionId),
    [processingIds]
  );

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    confirmSuggestion,
    rejectSuggestion,
    clearSuggestions,
    isProcessing,
    pendingCount: suggestions.length,
  };
}

// =============================================================================
// HOOK: useDocumentLinks (alias with enhanced functionality)
// =============================================================================

/**
 * Enhanced hook for document links with batch operations
 */
export function useDocumentLinks(
  documentId: string | null | undefined,
  options: UseDocumentLinksOptions = {}
): UseDocumentLinksReturn & {
  /** Confirm all high-confidence suggestions */
  confirmAllHighConfidence: (threshold?: number) => Promise<void>;
  /** Reject all low-confidence suggestions */
  rejectAllLowConfidence: (threshold?: number) => Promise<void>;
  /** Get suggestions filtered by entity type */
  getSuggestionsByType: (entityType: 'organization' | 'project' | 'opportunity') => LinkSuggestion[];
} {
  const baseSuggestions = useLinkSuggestions(documentId, options);

  // Confirm all high-confidence suggestions (parallel processing for performance)
  const confirmAllHighConfidence = useCallback(
    async (threshold = 0.8) => {
      const highConfidence = baseSuggestions.suggestions.filter((s) => s.confidence >= threshold);
      await Promise.all(
        highConfidence.map((suggestion) => baseSuggestions.confirmSuggestion(suggestion.id))
      );
    },
    [baseSuggestions]
  );

  // Reject all low-confidence suggestions (parallel processing for performance)
  const rejectAllLowConfidence = useCallback(
    async (threshold = 0.4) => {
      const lowConfidence = baseSuggestions.suggestions.filter((s) => s.confidence < threshold);
      await Promise.all(
        lowConfidence.map((suggestion) => baseSuggestions.rejectSuggestion(suggestion.id))
      );
    },
    [baseSuggestions]
  );

  // Get suggestions by entity type
  const getSuggestionsByType = useCallback(
    (entityType: 'organization' | 'project' | 'opportunity') => {
      return baseSuggestions.suggestions.filter((s) => s.entity_type === entityType);
    },
    [baseSuggestions.suggestions]
  );

  return {
    ...baseSuggestions,
    confirmAllHighConfidence,
    rejectAllLowConfidence,
    getSuggestionsByType,
  };
}

// Default export
export default useDocumentLinks;
