/**
 * Document Processing Hooks
 * Issue #114 - Upload e extração de conteúdo de documentos
 *
 * @module modules/grants/hooks/useDocumentProcessing
 */

import { useState, useCallback, useEffect } from 'react';
import {
  uploadAndProcessDocument,
  getProcessedDocuments,
  getProcessedDocument,
  deleteProcessedDocument,
  updateDocumentLinks,
  getDocumentLinkSuggestions,
  confirmLinkSuggestion,
  rejectLinkSuggestion,
  searchDocuments,
  getDocumentStats,
  type ProcessedDocument,
  type LinkSuggestion,
  type ProcessingStatus,
  type ProcessDocumentResponse,
} from '../services/documentProcessingService';

// =============================================================================
// useDocumentUpload - Upload and process documents
// =============================================================================

export interface UseDocumentUploadOptions {
  organizationId?: string;
  projectId?: string;
  onSuccess?: (response: ProcessDocumentResponse) => void;
  onError?: (error: Error) => void;
}

export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ProcessDocumentResponse | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setIsProcessing(false);
      setProgress(0);
      setError(null);
      setResult(null);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        setProgress(50);
        setIsUploading(false);
        setIsProcessing(true);

        const response = await uploadAndProcessDocument({
          file,
          organizationId: options.organizationId,
          projectId: options.projectId,
          source: 'web',
        });

        clearInterval(progressInterval);
        setProgress(100);
        setResult(response);
        options.onSuccess?.(response);

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro desconhecido');
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsUploading(false);
        setIsProcessing(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    upload,
    reset,
    isUploading,
    isProcessing,
    isLoading: isUploading || isProcessing,
    progress,
    error,
    result,
  };
}

// =============================================================================
// useDocuments - List and manage processed documents
// =============================================================================

export interface UseDocumentsOptions {
  organizationId?: string;
  projectId?: string;
  status?: ProcessingStatus;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await getProcessedDocuments({
        organizationId: options.organizationId,
        projectId: options.projectId,
        status: options.status,
        limit: options.limit,
      });
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar documentos'));
    } finally {
      setIsLoading(false);
    }
  }, [options.organizationId, options.projectId, options.status, options.limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(fetchDocuments, options.refreshInterval || 30000);
    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, fetchDocuments]);

  const deleteDocument = useCallback(async (documentId: string) => {
    await deleteProcessedDocument(documentId);
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  }, []);

  const updateLinks = useCallback(
    async (documentId: string, updates: { organizationId?: string; projectId?: string }) => {
      const updated = await updateDocumentLinks(documentId, updates);
      setDocuments((prev) => prev.map((d) => (d.id === documentId ? updated : d)));
      return updated;
    },
    []
  );

  return {
    documents,
    isLoading,
    error,
    refresh: fetchDocuments,
    deleteDocument,
    updateLinks,
  };
}

// =============================================================================
// useDocument - Single document with details
// =============================================================================

export function useDocument(documentId: string | null) {
  const [document, setDocument] = useState<ProcessedDocument | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setDocument(null);
      setLinkSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const [doc, suggestions] = await Promise.all([
        getProcessedDocument(documentId),
        getDocumentLinkSuggestions(documentId),
      ]);
      setDocument(doc);
      setLinkSuggestions(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar documento'));
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const confirmLink = useCallback(
    async (suggestionId: string) => {
      await confirmLinkSuggestion(suggestionId);
      setLinkSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      // Refresh document to get updated links
      if (documentId) {
        const doc = await getProcessedDocument(documentId);
        setDocument(doc);
      }
    },
    [documentId]
  );

  const rejectLink = useCallback(async (suggestionId: string) => {
    await rejectLinkSuggestion(suggestionId);
    setLinkSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }, []);

  return {
    document,
    linkSuggestions,
    isLoading,
    error,
    refresh: fetchDocument,
    confirmLink,
    rejectLink,
  };
}

// =============================================================================
// useDocumentSearch - Semantic search
// =============================================================================

export function useDocumentSearch() {
  const [results, setResults] = useState<
    Array<{
      document_id: string;
      chunk_text: string;
      similarity: number;
      document_type: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (
      query: string,
      options?: {
        organizationId?: string;
        projectId?: string;
        limit?: number;
        threshold?: number;
      }
    ) => {
      if (!query.trim()) {
        setResults([]);
        return [];
      }

      setIsSearching(true);
      setError(null);

      try {
        const data = await searchDocuments(query, options);
        setResults(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro na busca');
        setError(error);
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clear,
  };
}

// =============================================================================
// useDocumentStats - Statistics
// =============================================================================

export function useDocumentStats() {
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    byType: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await getDocumentStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar estatísticas'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
