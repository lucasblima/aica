/**
 * Hook especializado para File Search no módulo Podcast
 *
 * Fornece interface otimizada para:
 * - Indexar transcrições de episódios automaticamente
 * - Buscar semanticamente em transcrições
 * - Gerenciar corpus por show/episódio
 * - Buscar tópicos e momentos específicos
 */

import { useCallback, useEffect, useState } from 'react';
import { useModuleFileSearch } from '../../../hooks/useFileSearch';
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchResult,
} from '../../../types/fileSearch';

export interface UsePodcastFileSearchOptions {
  /** ID do episódio (module_id) */
  episodeId?: string;
  /** ID do show (para corpus compartilhado) */
  showId?: string;
  /** Auto-carregar corpora ao montar */
  autoLoad?: boolean;
}

export interface PodcastSearchContext {
  episodeTitle?: string;
  guestName?: string;
  topics?: string[];
}

/**
 * Hook especializado para File Search no módulo Podcast
 *
 * @example
 * ```tsx
 * const {
 *   corpus,
 *   indexTranscription,
 *   searchInEpisode,
 *   findTopicMoments,
 *   isIndexing
 * } = usePodcastFileSearch({ episodeId: 'ep-123', autoLoad: true });
 *
 * // Indexar transcrição do episódio
 * await indexTranscription(transcriptText, 'Episódio #42');
 *
 * // Buscar momentos específicos
 * const results = await searchInEpisode('Quando o convidado falou sobre IA?');
 *
 * // Encontrar todos os momentos de um tópico
 * const topicResults = await findTopicMoments('inteligência artificial');
 * ```
 */
export function usePodcastFileSearch(options: UsePodcastFileSearchOptions = {}) {
  const { episodeId, showId, autoLoad = true } = options;

  // Base hook com filtro de módulo 'podcast'
  const baseHook = useModuleFileSearch('podcast', episodeId);

  // Estados específicos do Podcast
  const [corpus, setCorpus] = useState<FileSearchCorpus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [context, setContext] = useState<PodcastSearchContext>({});

  /**
   * Carrega ou cria corpus para o episódio/show
   */
  const ensureCorpus = useCallback(async (): Promise<FileSearchCorpus> => {
    try {
      if (!episodeId && !showId) {
        throw new Error('episodeId or showId is required to create or load corpus');
      }

      // Tentar carregar corpus existente
      const existingCorpora = await baseHook.loadCorpora();
      const existingCorpus = existingCorpora.find(
        (c) =>
          c.module_type === 'podcast' &&
          (episodeId ? c.module_id === episodeId : c.module_id === showId)
      );

      if (existingCorpus) {
        setCorpus(existingCorpus);
        return existingCorpus;
      }

      // Criar novo corpus
      const id = episodeId || showId!;
      const corpusName = episodeId
        ? `podcast-episode-${episodeId}`
        : `podcast-show-${showId}`;
      const displayName = episodeId
        ? `Podcast Episode ${episodeId}`
        : `Podcast Show ${showId}`;

      const newCorpus = await baseHook.createNewCorpus(corpusName, displayName);
      setCorpus(newCorpus);
      return newCorpus;
    } catch (error) {
      console.error('[usePodcastFileSearch] ensureCorpus error:', error);
      throw error;
    }
  }, [episodeId, showId, baseHook]);

  /**
   * Indexa uma transcrição de episódio
   *
   * @param transcription - Texto da transcrição
   * @param episodeTitle - Título do episódio
   * @param metadata - Metadados adicionais (guest, topics, etc.)
   */
  const indexTranscription = useCallback(
    async (
      transcription: string,
      episodeTitle: string,
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        // Validar transcrição
        if (!transcription || transcription.trim().length < 100) {
          throw new Error('Transcrição muito curta. Mínimo: 100 caracteres');
        }

        // Garantir que corpus existe
        const targetCorpus = await ensureCorpus();

        // Criar um "arquivo virtual" com a transcrição
        const transcriptBlob = new Blob([transcription], { type: 'text/plain' });
        const transcriptFile = new File(
          [transcriptBlob],
          `${episodeTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`,
          { type: 'text/plain' }
        );

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file: transcriptFile,
          corpus_id: targetCorpus.id,
          display_name: `${episodeTitle} - Transcrição`,
          module_type: 'podcast',
          module_id: episodeId || showId,
          custom_metadata: {
            document_type: 'transcription',
            episode_id: episodeId,
            show_id: showId,
            episode_title: episodeTitle,
            character_count: transcription.length,
            ...metadata,
          },
        });

        console.log('[usePodcastFileSearch] Transcrição indexada:', document.id);
        return document;
      } catch (error) {
        console.error('[usePodcastFileSearch] indexTranscription error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [episodeId, showId, ensureCorpus, baseHook]
  );

  /**
   * Busca semântica em transcrições de episódios
   *
   * @param query - Pergunta ou termo de busca
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const searchInEpisode = useCallback(
    async (query: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      try {
        if (!corpus) {
          throw new Error('Nenhum corpus disponível. Indexe uma transcrição primeiro.');
        }

        const results = await baseHook.search({
          corpus_id: corpus.id,
          query,
          result_count: resultCount,
        });

        return results;
      } catch (error) {
        console.error('[usePodcastFileSearch] searchInEpisode error:', error);
        throw error;
      }
    },
    [corpus, baseHook]
  );

  /**
   * Busca com contexto adicional do episódio
   *
   * Útil para fazer perguntas contextualizadas como:
   * "O que o convidado [nome] disse sobre [tópico]?"
   */
  const searchWithContext = useCallback(
    async (
      query: string,
      context: PodcastSearchContext,
      resultCount: number = 5
    ): Promise<FileSearchResult[]> => {
      try {
        setContext(context);

        // Enriquecer query com contexto
        let enrichedQuery = query;

        if (context.episodeTitle) {
          enrichedQuery += ` (episódio: "${context.episodeTitle}")`;
        }

        if (context.guestName) {
          enrichedQuery += ` (convidado: ${context.guestName})`;
        }

        if (context.topics && context.topics.length > 0) {
          enrichedQuery += ` (tópicos: ${context.topics.join(', ')})`;
        }

        return await searchInEpisode(enrichedQuery, resultCount);
      } catch (error) {
        console.error('[usePodcastFileSearch] searchWithContext error:', error);
        throw error;
      }
    },
    [searchInEpisode]
  );

  /**
   * Encontra momentos onde um tópico específico foi discutido
   *
   * @param topic - Tópico a buscar (ex: "inteligência artificial", "política")
   * @param resultCount - Número de momentos (padrão: 10)
   */
  const findTopicMoments = useCallback(
    async (topic: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = `Encontre todos os momentos onde o tema "${topic}" foi discutido em profundidade`;
      return await searchInEpisode(query, resultCount);
    },
    [searchInEpisode]
  );

  /**
   * Busca citações ou frases específicas
   *
   * @param phrase - Frase a buscar
   */
  const findQuote = useCallback(
    async (phrase: string): Promise<FileSearchResult[]> => {
      const query = `Encontre onde foi dito algo similar a: "${phrase}"`;
      return await searchInEpisode(query, 3);
    },
    [searchInEpisode]
  );

  /**
   * Busca momentos com sentimento específico
   *
   * @param sentiment - 'funny', 'emotional', 'controversial', 'inspiring'
   */
  const findMomentsBySentiment = useCallback(
    async (
      sentiment: 'funny' | 'emotional' | 'controversial' | 'inspiring',
      resultCount: number = 5
    ): Promise<FileSearchResult[]> => {
      const sentimentQueries = {
        funny: 'Encontre os momentos mais engraçados ou humorísticos da conversa',
        emotional: 'Encontre os momentos mais emocionantes ou tocantes',
        controversial: 'Encontre os momentos mais polêmicos ou controversos',
        inspiring: 'Encontre os momentos mais inspiradores ou motivacionais',
      };

      const query = sentimentQueries[sentiment];
      return await searchInEpisode(query, resultCount);
    },
    [searchInEpisode]
  );

  /**
   * Lista todos os documentos indexados do episódio/show
   */
  const loadTranscriptions = useCallback(async () => {
    try {
      if (!corpus) {
        await ensureCorpus();
      }
      return await baseHook.loadDocuments(corpus?.id);
    } catch (error) {
      console.error('[usePodcastFileSearch] loadTranscriptions error:', error);
      throw error;
    }
  }, [corpus, ensureCorpus, baseHook]);

  /**
   * Remove uma transcrição indexada
   */
  const removeTranscription = useCallback(
    async (documentId: string) => {
      try {
        await baseHook.removeDocument(documentId);
      } catch (error) {
        console.error('[usePodcastFileSearch] removeTranscription error:', error);
        throw error;
      }
    },
    [baseHook]
  );

  /**
   * Verifica se há transcrições indexadas
   */
  const hasIndexedTranscriptions = useCallback(() => {
    return baseHook.documents.length > 0;
  }, [baseHook.documents]);

  /**
   * Auto-load ao montar (se autoLoad=true)
   */
  useEffect(() => {
    if (autoLoad && (episodeId || showId)) {
      ensureCorpus().catch((error) => {
        console.warn('[usePodcastFileSearch] Auto-load failed:', error);
      });
    }
  }, [autoLoad, episodeId, showId, ensureCorpus]);

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

    // Ações específicas do Podcast
    indexTranscription,
    searchInEpisode,
    searchWithContext,
    findTopicMoments,
    findQuote,
    findMomentsBySentiment,
    loadTranscriptions,
    removeTranscription,
    hasIndexedTranscriptions,

    // Ações do base hook (se necessário)
    clearSearchResults: baseHook.clearSearchResults,
    clearError: baseHook.clearError,

    // Metadados
    episodeId,
    showId,
    moduleType: 'podcast' as const,
  };
}

/**
 * Hook simplificado para busca rápida em transcrições
 *
 * @example
 * ```tsx
 * const { quickSearch } = usePodcastQuickSearch('episode-123');
 * const results = await quickSearch('O que foi dito sobre política?');
 * ```
 */
export function usePodcastQuickSearch(episodeId: string) {
  const { searchInEpisode, ensureCorpus } = usePodcastFileSearch({
    episodeId,
    autoLoad: true,
  });

  const quickSearch = useCallback(
    async (query: string, resultCount: number = 5) => {
      try {
        await ensureCorpus();
        return await searchInEpisode(query, resultCount);
      } catch (error) {
        console.error('[usePodcastQuickSearch] error:', error);
        throw error;
      }
    },
    [searchInEpisode, ensureCorpus]
  );

  return { quickSearch };
}
