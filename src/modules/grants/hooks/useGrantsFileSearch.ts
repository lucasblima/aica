/**
 * Hook simplificado para File Search no módulo Grants
 *
 * ARQUITETURA: Google File Search como fonte única
 * - Processamento de editais via Edge Function `process-edital`
 * - Busca semântica usando `gemini_file_name` diretamente
 * - Sem corpus management (arquivos são indexados diretamente)
 *
 * @module modules/grants/hooks/useGrantsFileSearch
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { invokeEdgeFunction } from '@/services/edgeFunctionService';
import type { GrantProject, GrantOpportunity } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useGrantsFileSearch');

// =============================================================================
// TYPES
// =============================================================================

export interface UseGrantsFileSearchOptions {
  /** gemini_file_name (files/xxx) do documento indexado */
  geminiFileName?: string;
  /** ID do documento no file_search_documents */
  documentId?: string;
  /** Auto-carregar documento ao montar */
  autoLoad?: boolean;
}

export interface GrantsSearchContext {
  project?: GrantProject;
  opportunity?: GrantOpportunity;
}

export interface FileSearchDocument {
  id: string;
  gemini_file_name: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  module_type: string;
  module_id?: string;
  indexing_status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface FileSearchResult {
  content: string;
  score?: number;
  citations?: string[];
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook simplificado para File Search no módulo Grants
 *
 * Usa Google File Search como fonte única (sem corpus management).
 *
 * @example
 * ```tsx
 * const {
 *   document,
 *   searchInEdital,
 *   isSearching,
 *   searchResults
 * } = useGrantsFileSearch({ geminiFileName: 'files/abc123' });
 *
 * // Buscar informações no edital
 * const results = await searchInEdital('Quais são os critérios de avaliação?');
 * ```
 */
export function useGrantsFileSearch(options: UseGrantsFileSearchOptions = {}) {
  const { geminiFileName, documentId, autoLoad = true } = options;

  // Estados
  const [document, setDocument] = useState<FileSearchDocument | null>(null);
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GrantsSearchContext>({});

  /**
   * Carrega documento do banco de dados
   */
  const loadDocument = useCallback(async (): Promise<FileSearchDocument | null> => {
    if (!geminiFileName && !documentId) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('file_search_documents')
        .select('*')
        .eq('module_type', 'grants');

      if (documentId) {
        query = query.eq('id', documentId);
      } else if (geminiFileName) {
        query = query.eq('gemini_file_name', geminiFileName);
      }

      const { data, error: dbError } = await query.single();

      if (dbError) {
        log.warn('Document not found:', dbError.message);
        return null;
      }

      const doc: FileSearchDocument = {
        id: data.id,
        gemini_file_name: data.gemini_file_name,
        original_filename: data.original_filename,
        mime_type: data.mime_type,
        file_size_bytes: data.file_size_bytes,
        module_type: data.module_type,
        module_id: data.module_id,
        indexing_status: data.indexing_status,
        created_at: data.created_at,
      };

      setDocument(doc);
      return doc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load document';
      setError(msg);
      log.error('loadDocument error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [geminiFileName, documentId]);

  /**
   * Busca semântica no edital usando Google File Search
   *
   * @param query - Pergunta ou termo de busca
   */
  const searchInEdital = useCallback(
    async (query: string): Promise<FileSearchResult[]> => {
      const targetFile = document?.gemini_file_name || geminiFileName;

      if (!targetFile) {
        throw new Error('Nenhum documento disponível. Faça upload de um PDF primeiro.');
      }

      try {
        setIsSearching(true);
        setError(null);

        // Call Edge Function to query the file using Gemini
        const response = await invokeEdgeFunction<{
          success: boolean;
          answer: string;
          citations?: string[];
          error?: string;
        }>('query-edital', {
          gemini_file_name: targetFile,
          query,
        });

        if (!response.success) {
          throw new Error(response.error || 'Search failed');
        }

        const results: FileSearchResult[] = [
          {
            content: response.answer,
            score: 1.0,
            citations: response.citations || [],
          },
        ];

        setSearchResults(results);
        return results;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        setError(msg);
        log.error('searchInEdital error:', err);
        throw err;
      } finally {
        setIsSearching(false);
      }
    },
    [document, geminiFileName]
  );

  /**
   * Busca com contexto adicional (projeto + edital)
   */
  const searchWithContext = useCallback(
    async (
      query: string,
      searchContext: GrantsSearchContext
    ): Promise<FileSearchResult[]> => {
      setContext(searchContext);

      // Enriquecer query com contexto
      let enrichedQuery = query;

      if (searchContext.project) {
        enrichedQuery += ` (contexto: projeto "${searchContext.project.project_name}")`;
      }

      if (searchContext.opportunity) {
        enrichedQuery += ` (edital: "${searchContext.opportunity.title}")`;
      }

      return await searchInEdital(enrichedQuery);
    },
    [searchInEdital]
  );

  /**
   * Lista todos os documentos de grants do usuário
   */
  const loadGrantsDocuments = useCallback(async (): Promise<FileSearchDocument[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error: dbError } = await supabase
        .from('file_search_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_type', 'grants')
        .eq('indexing_status', 'completed')
        .order('created_at', { ascending: false });

      if (dbError) {
        log.error('loadGrantsDocuments error:', dbError);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        gemini_file_name: row.gemini_file_name,
        original_filename: row.original_filename,
        mime_type: row.mime_type,
        file_size_bytes: row.file_size_bytes,
        module_type: row.module_type,
        module_id: row.module_id,
        indexing_status: row.indexing_status,
        created_at: row.created_at,
      }));
    } catch (err) {
      log.error('loadGrantsDocuments error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verifica se há documento carregado
   */
  const hasDocument = useCallback(() => {
    return !!document || !!geminiFileName;
  }, [document, geminiFileName]);

  /**
   * Limpa resultados de busca
   */
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  /**
   * Limpa erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-load ao montar
   */
  useEffect(() => {
    if (autoLoad && (geminiFileName || documentId)) {
      loadDocument().catch((err) => {
        log.warn('Auto-load failed:', err);
      });
    }
  }, [autoLoad, geminiFileName, documentId, loadDocument]);

  return {
    // Estados
    document,
    searchResults,
    isLoading,
    isSearching,
    error,
    context,

    // Ações
    loadDocument,
    searchInEdital,
    searchWithContext,
    loadGrantsDocuments,
    hasDocument,
    clearSearchResults,
    clearError,

    // Metadados
    geminiFileName: document?.gemini_file_name || geminiFileName,
    moduleType: 'grants' as const,
  };
}

// =============================================================================
// QUICK SEARCH HOOK
// =============================================================================

/**
 * Hook simplificado para busca rápida em um edital específico
 *
 * @example
 * ```tsx
 * const { quickSearch, isSearching } = useGrantsQuickSearch('files/abc123');
 * const results = await quickSearch('Critérios de avaliação');
 * ```
 */
export function useGrantsQuickSearch(geminiFileName: string) {
  const { searchInEdital, isSearching, error } = useGrantsFileSearch({
    geminiFileName,
    autoLoad: false,
  });

  const quickSearch = useCallback(
    async (query: string) => {
      return await searchInEdital(query);
    },
    [searchInEdital]
  );

  return { quickSearch, isSearching, error };
}
