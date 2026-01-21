/**
 * Hook especializado para File Search no módulo Grants
 *
 * Fornece interface otimizada para:
 * - Indexar PDFs de editais automaticamente
 * - Buscar semanticamente em documentos de editais
 * - Gerenciar corpus por projeto
 * - Integrar com documentService
 */

import { useCallback, useEffect, useState } from 'react';
import { useModuleFileSearch } from '../../../hooks/useFileSearch';
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchResult,
} from '../../../types/fileSearch';
import type { GrantProject, GrantOpportunity } from '../types';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Usegrantsfilesearch');

export interface UseGrantsFileSearchOptions {
  /** ID do projeto de grant (module_id) */
  projectId?: string;
  /** Auto-carregar corpora ao montar */
  autoLoad?: boolean;
}

export interface GrantsSearchContext {
  project?: GrantProject;
  opportunity?: GrantOpportunity;
}

/**
 * Hook especializado para File Search no módulo Grants
 *
 * @example
 * ```tsx
 * const {
 *   corpus,
 *   documents,
 *   indexEditalPDF,
 *   searchInEdital,
 *   isIndexing,
 *   searchResults
 * } = useGrantsFileSearch({ projectId: 'proj-123', autoLoad: true });
 *
 * // Indexar PDF do edital
 * await indexEditalPDF(pdfFile, 'Edital FAPESP 2024');
 *
 * // Buscar informações no edital
 * const results = await searchInEdital('Quais são os critérios de avaliação?');
 * ```
 */
export function useGrantsFileSearch(options: UseGrantsFileSearchOptions = {}) {
  const { projectId, autoLoad = true } = options;

  // Base hook com filtro de módulo 'grants'
  const baseHook = useModuleFileSearch('grants', projectId);

  // Estados específicos do Grants
  const [corpus, setCorpus] = useState<FileSearchCorpus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [context, setContext] = useState<GrantsSearchContext>({});

  /**
   * Carrega ou cria corpus para o projeto
   */
  const ensureCorpus = useCallback(async (): Promise<FileSearchCorpus> => {
    try {
      if (!projectId) {
        throw new Error('projectId is required to create or load corpus');
      }

      // Tentar carregar corpus existente
      const existingCorpora = await baseHook.loadCorpora();
      const existingCorpus = existingCorpora.find(
        (c) => c.module_type === 'grants' && c.module_id === projectId
      );

      if (existingCorpus) {
        setCorpus(existingCorpus);
        return existingCorpus;
      }

      // Criar novo corpus
      const corpusName = `grants-project-${projectId}`;
      const displayName = `Grant Project ${projectId}`;

      const newCorpus = await baseHook.createNewCorpus(corpusName, displayName);
      setCorpus(newCorpus);
      return newCorpus;
    } catch (error) {
      log.error(ensureCorpus error:', error);
      throw error;
    }
  }, [projectId, baseHook]);

  /**
   * Indexa um PDF de edital
   *
   * @param file - Arquivo PDF do edital
   * @param displayName - Nome para exibição (ex: "Edital FAPESP 2024")
   * @param metadata - Metadados adicionais (opcional)
   */
  const indexEditalPDF = useCallback(
    async (
      file: File,
      displayName: string,
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        // Validar tipo de arquivo
        if (file.type !== 'application/pdf') {
          throw new Error('Apenas arquivos PDF são suportados');
        }

        // Validar tamanho (máx 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          throw new Error('Arquivo muito grande. Máximo: 50MB');
        }

        // Garantir que corpus existe
        const targetCorpus = await ensureCorpus();

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file,
          corpus_id: targetCorpus.id,
          display_name: displayName,
          module_type: 'grants',
          module_id: projectId,
          custom_metadata: {
            document_type: 'edital_pdf',
            project_id: projectId,
            ...metadata,
          },
        });

        log.debug(PDF indexado com sucesso:', document.id);
        return document;
      } catch (error) {
        log.error(indexEditalPDF error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [projectId, ensureCorpus, baseHook]
  );

  /**
   * Busca semântica em documentos do edital
   *
   * @param query - Pergunta ou termo de busca
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const searchInEdital = useCallback(
    async (query: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      try {
        if (!corpus) {
          throw new Error('Nenhum corpus disponível. Indexe um PDF primeiro.');
        }

        const results = await baseHook.search({
          corpus_id: corpus.id,
          query,
          result_count: resultCount,
        });

        return results;
      } catch (error) {
        log.error(searchInEdital error:', error);
        throw error;
      }
    },
    [corpus, baseHook]
  );

  /**
   * Busca com contexto adicional (projeto + edital)
   *
   * Útil para fazer perguntas contextualizadas como:
   * "Quais critérios de avaliação se aplicam ao meu projeto?"
   */
  const searchWithContext = useCallback(
    async (
      query: string,
      context: GrantsSearchContext,
      resultCount: number = 5
    ): Promise<FileSearchResult[]> => {
      try {
        setContext(context);

        // Enriquecer query com contexto
        let enrichedQuery = query;

        if (context.project) {
          enrichedQuery += ` (contexto: projeto "${context.project.project_name}")`;
        }

        if (context.opportunity) {
          enrichedQuery += ` (edital: "${context.opportunity.title}")`;
        }

        return await searchInEdital(enrichedQuery, resultCount);
      } catch (error) {
        log.error(searchWithContext error:', error);
        throw error;
      }
    },
    [searchInEdital]
  );

  /**
   * Lista todos os documentos indexados do projeto
   */
  const loadProjectDocuments = useCallback(async () => {
    try {
      if (!corpus) {
        await ensureCorpus();
      }
      return await baseHook.loadDocuments(corpus?.id);
    } catch (error) {
      log.error(loadProjectDocuments error:', error);
      throw error;
    }
  }, [corpus, ensureCorpus, baseHook]);

  /**
   * Remove um documento indexado
   */
  const removeDocument = useCallback(
    async (documentId: string) => {
      try {
        await baseHook.removeDocument(documentId);
      } catch (error) {
        log.error(removeDocument error:', error);
        throw error;
      }
    },
    [baseHook]
  );

  /**
   * Verifica se há documentos indexados
   */
  const hasIndexedDocuments = useCallback(() => {
    return baseHook.documents.length > 0;
  }, [baseHook.documents]);

  /**
   * Auto-load ao montar (se autoLoad=true)
   */
  useEffect(() => {
    if (autoLoad && projectId) {
      ensureCorpus().catch((error) => {
        log.warn(Auto-load failed:', error);
      });
    }
  }, [autoLoad, projectId, ensureCorpus]);

  return {
    // Estados
    corpus,
    documents: baseHook.documents,
    searchResults: baseHook.searchResults,
    isLoading: baseHook.isLoading,
    isSearching: baseHook.isSearching,
    isIndexing,
    error: baseHook.error,
    context,

    // Ações específicas do Grants
    indexEditalPDF,
    searchInEdital,
    searchWithContext,
    loadProjectDocuments,
    removeDocument,
    hasIndexedDocuments,

    // Ações do base hook (se necessário)
    clearSearchResults: baseHook.clearSearchResults,
    clearError: baseHook.clearError,

    // Metadados
    projectId,
    moduleType: 'grants' as const,
  };
}

/**
 * Hook simplificado para busca rápida sem gerenciamento de estado
 *
 * Útil para componentes que apenas fazem busca pontual
 *
 * @example
 * ```tsx
 * const { quickSearch } = useGrantsQuickSearch('proj-123');
 * const results = await quickSearch('Critérios de avaliação');
 * ```
 */
export function useGrantsQuickSearch(projectId: string) {
  const { searchInEdital, ensureCorpus } = useGrantsFileSearch({
    projectId,
    autoLoad: true,
  });

  const quickSearch = useCallback(
    async (query: string, resultCount: number = 5) => {
      try {
        await ensureCorpus();
        return await searchInEdital(query, resultCount);
      } catch (error) {
        log.error(error:', error);
        throw error;
      }
    },
    [searchInEdital, ensureCorpus]
  );

  return { quickSearch };
}
