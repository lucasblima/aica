/**
 * Hook especializado para File Search no módulo Journey
 *
 * Fornece interface otimizada para:
 * - Indexar momentos e memórias automaticamente
 * - Buscar semanticamente em momentos e transcrições
 * - Gerenciar corpus por usuário ou período
 * - Buscar por emoções, tags e sentimentos
 */

import { useCallback, useEffect, useState } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { useModuleFileSearch } from '../../../hooks/useFileSearch';

const log = createNamespacedLogger('JourneyFileSearch');
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchResult,
} from '../../../types/fileSearch';
import type { Moment, EmotionValue } from '../types/moment';

export interface UseJourneyFileSearchOptions {
  /** ID do usuário (module_id) */
  userId?: string;
  /** ID do momento específico */
  momentId?: string;
  /** Auto-carregar corpora ao montar */
  autoLoad?: boolean;
}

export interface JourneySearchContext {
  periodStart?: string;
  periodEnd?: string;
  emotions?: string[];
  tags?: string[];
  sentiments?: string[];
}

/**
 * Hook especializado para File Search no módulo Journey
 *
 * @example
 * ```tsx
 * const {
 *   corpus,
 *   indexMoment,
 *   searchInMoments,
 *   findByEmotion,
 *   findByTag,
 *   findBySentiment,
 *   isIndexing
 * } = useJourneyFileSearch({ userId: 'user-123', autoLoad: true });
 *
 * // Indexar momento
 * await indexMoment(moment);
 *
 * // Buscar por emoção
 * const results = await findByEmotion('happy');
 *
 * // Buscar por tag
 * const tagResults = await findByTag('trabalho');
 * ```
 */
export function useJourneyFileSearch(options: UseJourneyFileSearchOptions = {}) {
  const { userId, momentId, autoLoad = true } = options;

  // Base hook com filtro de múltiplos módulos: 'journey' + 'whatsapp'
  // Isso permite buscar tanto momentos do Journey quanto documentos enviados via WhatsApp
  const baseHook = useModuleFileSearch(['journey', 'whatsapp'], userId || momentId);

  // Estados específicos do Journey
  const [corpus, setCorpus] = useState<FileSearchCorpus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [context, setContext] = useState<JourneySearchContext>({});

  /**
   * Carrega ou cria corpus para o usuário/momento
   */
  const ensureCorpus = useCallback(async (): Promise<FileSearchCorpus> => {
    try {
      if (!userId && !momentId) {
        throw new Error('userId or momentId is required to create or load corpus');
      }

      // Tentar carregar corpus existente
      const existingCorpora = await baseHook.loadCorpora();
      const existingCorpus = existingCorpora.find(
        (c) =>
          c.module_type === 'journey' &&
          (userId ? c.module_id === userId : c.module_id === momentId)
      );

      if (existingCorpus) {
        setCorpus(existingCorpus);
        return existingCorpus;
      }

      // Criar novo corpus
      const id = userId || momentId!;
      const corpusName = userId
        ? `journey-user-${userId}`
        : `journey-moment-${momentId}`;
      const displayName = userId
        ? `Journey - User ${userId}`
        : `Journey Moment ${momentId}`;

      const newCorpus = await baseHook.createNewCorpus(corpusName, displayName);
      setCorpus(newCorpus);
      return newCorpus;
    } catch (error) {
      log.error('[useJourneyFileSearch] ensureCorpus error:', error);
      throw error;
    }
  }, [userId, momentId, baseHook]);

  /**
   * Indexa um momento/memória
   *
   * @param moment - Dados do momento
   * @param metadata - Metadados adicionais
   */
  const indexMoment = useCallback(
    async (
      moment: Moment,
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        // Validar que há conteúdo para indexar
        if (!moment.content || moment.content.trim().length < 10) {
          throw new Error('Momento não tem conteúdo suficiente. Mínimo: 10 caracteres');
        }

        // Garantir que corpus existe
        const targetCorpus = await ensureCorpus();

        // Criar conteúdo enriquecido com metadados
        const enrichedContent = `
# Momento - ${new Date(moment.created_at).toLocaleDateString('pt-BR')}

${moment.emotion ? `**Emoção**: ${moment.emotion}\n` : ''}
${moment.tags && moment.tags.length > 0 ? `**Tags**: ${moment.tags.join(', ')}\n` : ''}
${moment.location ? `**Local**: ${moment.location}\n` : ''}

## Conteúdo

${moment.content}

${moment.sentiment_data ? `\n## Análise de Sentimento\n\n- **Sentimento**: ${moment.sentiment_data.sentiment}\n- **Score**: ${((moment.sentiment_data.sentimentScore + 1) * 50).toFixed(1)}%\n` : ''}
        `.trim();

        // Criar um "arquivo virtual" com o conteúdo
        const contentBlob = new Blob([enrichedContent], { type: 'text/markdown' });
        const contentFile = new File(
          [contentBlob],
          `moment_${moment.id}_${Date.now()}.md`,
          { type: 'text/markdown' }
        );

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file: contentFile,
          corpus_id: targetCorpus.id,
          display_name: `Momento - ${new Date(moment.created_at).toLocaleDateString('pt-BR')}`,
          module_type: 'journey',
          module_id: userId || moment.id,
          custom_metadata: {
            document_type: 'moment',
            moment_id: moment.id,
            moment_type: moment.type,
            emotion: moment.emotion,
            tags: moment.tags || [],
            location: moment.location,
            has_audio: !!moment.audio_url,
            sentiment: moment.sentiment_data?.sentiment,
            sentiment_score: moment.sentiment_data?.sentimentScore,
            created_at: moment.created_at,
            character_count: moment.content.length,
            ...metadata,
          },
        });

        log.debug('[useJourneyFileSearch] Momento indexado:', document.id);
        return document;
      } catch (error) {
        log.error('[useJourneyFileSearch] indexMoment error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [userId, ensureCorpus, baseHook]
  );

  /**
   * Indexa múltiplos momentos em lote
   *
   * @param moments - Lista de momentos
   */
  const indexMoments = useCallback(
    async (moments: Moment[]): Promise<FileSearchDocument[]> => {
      try {
        setIsIndexing(true);

        const results: FileSearchDocument[] = [];

        for (const moment of moments) {
          try {
            const doc = await indexMoment(moment);
            results.push(doc);
          } catch (error) {
            log.error(`[useJourneyFileSearch] Erro ao indexar momento ${moment.id}:`, error);
            // Continua com próximo momento
          }
        }

        log.debug(`[useJourneyFileSearch] ${results.length}/${moments.length} momentos indexados`);
        return results;
      } catch (error) {
        log.error('[useJourneyFileSearch] indexMoments error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [indexMoment]
  );

  /**
   * Busca semântica em momentos
   *
   * @param query - Pergunta ou termo de busca
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const searchInMoments = useCallback(
    async (query: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      try {
        if (!corpus) {
          throw new Error('Nenhum corpus disponível. Indexe um momento primeiro.');
        }

        const results = await baseHook.search({
          corpus_id: corpus.id,
          query,
          result_count: resultCount,
        });

        return results;
      } catch (error) {
        log.error('[useJourneyFileSearch] searchInMoments error:', error);
        throw error;
      }
    },
    [corpus, baseHook]
  );

  /**
   * Busca com contexto adicional do período/emoções/tags
   */
  const searchWithContext = useCallback(
    async (
      query: string,
      context: JourneySearchContext,
      resultCount: number = 5
    ): Promise<FileSearchResult[]> => {
      try {
        setContext(context);

        // Enriquecer query com contexto
        let enrichedQuery = query;

        if (context.periodStart && context.periodEnd) {
          enrichedQuery += ` (período: ${context.periodStart} a ${context.periodEnd})`;
        }

        if (context.emotions && context.emotions.length > 0) {
          enrichedQuery += ` (emoções: ${context.emotions.join(', ')})`;
        }

        if (context.tags && context.tags.length > 0) {
          enrichedQuery += ` (tags: ${context.tags.join(', ')})`;
        }

        if (context.sentiments && context.sentiments.length > 0) {
          enrichedQuery += ` (sentimentos: ${context.sentiments.join(', ')})`;
        }

        return await searchInMoments(enrichedQuery, resultCount);
      } catch (error) {
        log.error('[useJourneyFileSearch] searchWithContext error:', error);
        throw error;
      }
    },
    [searchInMoments]
  );

  /**
   * Encontra momentos com uma emoção específica
   *
   * @param emotion - Emoção a buscar (ex: "happy", "sad")
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findByEmotion = useCallback(
    async (emotion: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = `Encontre momentos onde me senti ${emotion}`;
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Encontra momentos com uma tag específica
   *
   * @param tag - Tag a buscar (ex: "trabalho", "saúde")
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findByTag = useCallback(
    async (tag: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      // Remove # se presente
      const cleanTag = tag.replace('#', '');
      const query = `Encontre momentos relacionados a ${cleanTag}`;
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Encontra momentos por sentimento
   *
   * @param sentiment - Sentimento ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findBySentiment = useCallback(
    async (
      sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative',
      resultCount: number = 10
    ): Promise<FileSearchResult[]> => {
      const sentimentLabels = {
        very_positive: 'muito positivos',
        positive: 'positivos',
        neutral: 'neutros',
        negative: 'negativos',
        very_negative: 'muito negativos',
      };
      const query = `Encontre momentos ${sentimentLabels[sentiment]}`;
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Busca insights ou padrões nas memórias
   *
   * @param question - Pergunta sobre padrões
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const findInsights = useCallback(
    async (question: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      return await searchInMoments(question, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Busca momentos em um período específico
   *
   * @param startDate - Data inicial
   * @param endDate - Data final
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findByPeriod = useCallback(
    async (startDate: Date, endDate: Date, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const start = startDate.toLocaleDateString('pt-BR');
      const end = endDate.toLocaleDateString('pt-BR');
      const query = `Mostre momentos entre ${start} e ${end}`;
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Busca momentos relacionados a crescimento pessoal
   *
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findGrowthMoments = useCallback(
    async (resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = 'Encontre momentos de aprendizado, crescimento pessoal, insights ou vitórias';
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Busca momentos desafiadores ou difíceis
   *
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findChallengingMoments = useCallback(
    async (resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = 'Encontre momentos desafiadores, difíceis ou que exigiram superação';
      return await searchInMoments(query, resultCount);
    },
    [searchInMoments]
  );

  /**
   * Lista todos os documentos indexados (momentos)
   */
  const loadMoments = useCallback(async () => {
    try {
      if (!corpus) {
        await ensureCorpus();
      }
      return await baseHook.loadDocuments(corpus?.id);
    } catch (error) {
      log.error('[useJourneyFileSearch] loadMoments error:', error);
      throw error;
    }
  }, [corpus, ensureCorpus, baseHook]);

  /**
   * Remove um momento indexado
   */
  const removeMoment = useCallback(
    async (documentId: string) => {
      try {
        await baseHook.removeDocument(documentId);
      } catch (error) {
        log.error('[useJourneyFileSearch] removeMoment error:', error);
        throw error;
      }
    },
    [baseHook]
  );

  /**
   * Verifica se há momentos indexados
   */
  const hasIndexedMoments = useCallback(() => {
    return baseHook.documents.length > 0;
  }, [baseHook.documents]);

  /**
   * Auto-load ao montar (se autoLoad=true)
   */
  useEffect(() => {
    if (autoLoad && (userId || momentId)) {
      ensureCorpus().catch((error) => {
        log.warn('[useJourneyFileSearch] Auto-load failed:', error);
      });
    }
  }, [autoLoad, userId, momentId, ensureCorpus]);

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

    // Ações específicas do Journey
    indexMoment,
    indexMoments,
    searchInMoments,
    searchWithContext,
    findByEmotion,
    findByTag,
    findBySentiment,
    findInsights,
    findByPeriod,
    findGrowthMoments,
    findChallengingMoments,
    loadMoments,
    removeMoment,
    hasIndexedMoments,

    // Ações do base hook (se necessário)
    clearSearchResults: baseHook.clearSearchResults,
    clearError: baseHook.clearError,

    // Metadados
    userId,
    momentId,
    moduleType: 'journey' as const,
  };
}

/**
 * Hook simplificado para busca rápida em momentos
 *
 * @example
 * ```tsx
 * const { quickSearch } = useJourneyQuickSearch('user-123');
 * const results = await quickSearch('Quando me senti grato?');
 * ```
 */
export function useJourneyQuickSearch(userId: string) {
  const { searchInMoments, ensureCorpus } = useJourneyFileSearch({
    userId,
    autoLoad: true,
  });

  const quickSearch = useCallback(
    async (query: string, resultCount: number = 5) => {
      try {
        await ensureCorpus();
        return await searchInMoments(query, resultCount);
      } catch (error) {
        log.error('[useJourneyQuickSearch] error:', error);
        throw error;
      }
    },
    [searchInMoments, ensureCorpus]
  );

  return { quickSearch };
}
