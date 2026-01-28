import { useState, useCallback } from 'react';
import {
  listCorpora,
  createCorpus,
  indexDocument,
  queryFileSearch,
  listDocuments,
  deleteDocument,
} from '../services/fileSearchApiClient';
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchQuery,
  FileSearchResult,
  IndexDocumentRequest,
} from '../types/fileSearch';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useFileSearch');

/**
 * Hook genérico para File Search com gerenciamento de estado
 *
 * Fornece interface completa para:
 * - Criar e listar corpora
 * - Indexar e gerenciar documentos
 * - Realizar buscas semânticas
 *
 * @example
 * ```tsx
 * const {
 *   corpora,
 *   createNewCorpus,
 *   uploadDocument,
 *   search,
 *   isLoading
 * } = useFileSearch();
 *
 * // Criar corpus
 * await createNewCorpus('grants-edital-001', 'Edital de Pesquisa 2024');
 *
 * // Indexar documento
 * await uploadDocument({
 *   file: pdfFile,
 *   corpus_id: 'corpus-123',
 *   module_type: 'grants',
 *   module_id: 'project-456'
 * });
 *
 * // Buscar
 * const results = await search({
 *   corpus_id: 'corpus-123',
 *   query: 'Como fazer orçamento?',
 *   result_count: 10
 * });
 * ```
 */
export function useFileSearch() {
  const [corpora, setCorpora] = useState<FileSearchCorpus[]>([]);
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega lista de corpora do usuário
   * @param filters - Filtros opcionais (module_type, module_id)
   */
  const loadCorpora = useCallback(async (filters?: { module_type?: string | string[]; module_id?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await listCorpora(filters?.module_type, filters?.module_id);
      setCorpora(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load corpora';
      setError(errorMsg);
      log.error('loadCorpora error:', { error: err });
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cria um novo corpus ou retorna existente se já houver
   * @param name - Nome interno do corpus (slug)
   * @param displayName - Nome para exibição
   * @param module_type - Tipo do módulo (opcional)
   * @param module_id - ID da entidade no módulo (opcional)
   */
  const createNewCorpus = useCallback(async (
    name: string,
    displayName: string,
    module_type?: string,
    module_id?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newCorpus = await createCorpus(name, displayName, module_type, module_id);
      // Update state - avoid duplicates
      setCorpora((prev) => {
        const exists = prev.some(c => c.id === newCorpus.id || c.name === newCorpus.name);
        if (exists) {
          return prev.map(c => c.name === newCorpus.name ? newCorpus : c);
        }
        return [...prev, newCorpus];
      });
      return newCorpus;
    } catch (err) {
      // Handle 409 Conflict or duplicate key error - try to fetch existing corpus
      const errorMsg = err instanceof Error ? err.message : 'Failed to create corpus';
      const isDuplicateError = errorMsg.includes('duplicate') ||
                               errorMsg.includes('409') ||
                               errorMsg.includes('already exists') ||
                               errorMsg.includes('23505');

      if (isDuplicateError) {
        log.debug('Corpus already exists, fetching existing...');
        try {
          // Fetch existing corpus instead of failing
          const existingCorpora = await listCorpora(module_type, module_id);
          const existingCorpus = existingCorpora.find(c => c.name === name);
          if (existingCorpus) {
            log.debug('Found existing corpus:', existingCorpus.name);
            setCorpora((prev) => {
              const exists = prev.some(c => c.id === existingCorpus.id);
              return exists ? prev : [...prev, existingCorpus];
            });
            return existingCorpus;
          }
        } catch (listErr) {
          log.error('Failed to list corpora after duplicate error:', { error: listErr });
        }
      }

      setError(errorMsg);
      log.error('createNewCorpus error:', { error: err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Indexa um documento em um corpus
   * @param request - Dados para indexação (file, corpus_id, metadata, etc.)
   */
  const uploadDocument = useCallback(async (request: IndexDocumentRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const newDocument = await indexDocument(request);
      setDocuments((prev) => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMsg);
      log.error('uploadDocument error:', { error: err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Realiza busca semântica em um corpus
   * @param query - Parâmetros da busca
   */
  const search = useCallback(async (query: FileSearchQuery) => {
    try {
      setIsSearching(true);
      setError(null);
      const results = await queryFileSearch(query);
      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Search failed';
      setError(errorMsg);
      log.error('search error:', { error: err });
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Carrega lista de documentos indexados
   * @param filters - Filtros opcionais (corpus_id, module_type, module_id)
   */
  const loadDocuments = useCallback(async (filters?: {
    corpus_id?: string;
    module_type?: string | string[];
    module_id?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await listDocuments(
        filters?.corpus_id,
        filters?.module_type,
        filters?.module_id
      );
      setDocuments(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMsg);
      log.error('loadDocuments error:', { error: err });
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove um documento do corpus
   * @param documentId - ID do documento a ser removido
   */
  const removeDocument = useCallback(async (documentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMsg);
      log.error('removeDocument error:', { error: err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Limpa os resultados de busca
   */
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  /**
   * Limpa o erro atual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estados
    corpora,
    documents,
    searchResults,
    isLoading,
    isSearching,
    error,

    // Ações
    loadCorpora,
    createNewCorpus,
    uploadDocument,
    search,
    loadDocuments,
    removeDocument,
    clearSearchResults,
    clearError,
  };
}

/**
 * Hook especializado para busca em módulos específicos
 *
 * Wrapper do useFileSearch com filtros pré-configurados
 *
 * @param module_type - Tipo do módulo (grants, podcast, finance, etc.) ou array de tipos para busca unificada
 * @param module_id - ID opcional da entidade específica
 *
 * @example
 * ```tsx
 * // Hook para Grants module
 * const grantsSearch = useModuleFileSearch('grants', projectId);
 *
 * // Hook para busca unificada (Journey + WhatsApp)
 * const unifiedSearch = useModuleFileSearch(['journey', 'whatsapp'], userId);
 *
 * // Automaticamente filtra apenas documentos do módulo Grants
 * await grantsSearch.loadDocuments();
 * ```
 */
export function useModuleFileSearch(module_type: string | string[], module_id?: string) {
  const baseHook = useFileSearch();

  const loadCorporaFiltered = useCallback(
    () => baseHook.loadCorpora({ module_type, module_id }),
    [baseHook, module_type, module_id]
  );

  const loadDocumentsFiltered = useCallback(
    (corpus_id?: string) =>
      baseHook.loadDocuments({ corpus_id, module_type, module_id }),
    [baseHook, module_type, module_id]
  );

  const searchWithModuleContext = useCallback(
    (query: Omit<FileSearchQuery, 'module_type' | 'module_id'>) => {
      // When searching across multiple modules, use the first module type for context
      // (The actual search will include all modules via corpus filters)
      const contextModuleType = Array.isArray(module_type) ? module_type[0] : module_type;
      return baseHook.search({ ...query, module_type: contextModuleType, module_id });
    },
    [baseHook, module_type, module_id]
  );

  const createCorpusForModule = useCallback(
    (name: string, displayName: string) => {
      // When creating corpus for multiple modules, use the first one
      const corpusModuleType = Array.isArray(module_type) ? module_type[0] : module_type;
      return baseHook.createNewCorpus(name, displayName, corpusModuleType, module_id);
    },
    [baseHook, module_type, module_id]
  );

  return {
    ...baseHook,
    loadCorpora: loadCorporaFiltered,
    loadDocuments: loadDocumentsFiltered,
    search: searchWithModuleContext,
    createNewCorpus: createCorpusForModule,
    module_type,
    module_id,
  };
}
