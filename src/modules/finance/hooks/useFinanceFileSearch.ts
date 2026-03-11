/**
 * Hook especializado para File Search no módulo Finance
 *
 * Fornece interface otimizada para:
 * - Indexar extratos bancários (statements) automaticamente
 * - Buscar semanticamente em transações e statements
 * - Gerenciar corpus por período ou conta bancária
 * - Buscar por categorias de despesa e padrões financeiros
 */

import { useCallback, useEffect, useState } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { useModuleFileSearch } from '../../../hooks/useFileSearch';

const log = createNamespacedLogger('FinanceFileSearch');
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchResult,
} from '../../../types/fileSearch';
import type { FinanceStatement, FinanceTransaction } from '../types';

export interface UseFinanceFileSearchOptions {
  /** ID do usuário (module_id) para corpus compartilhado */
  userId?: string;
  /** ID do statement específico */
  statementId?: string;
  /** Auto-carregar corpora ao montar */
  autoLoad?: boolean;
}

export interface FinanceSearchContext {
  periodStart?: string;
  periodEnd?: string;
  bankName?: string;
  accountType?: string;
  categories?: string[];
}

/**
 * Hook especializado para File Search no módulo Finance
 *
 * @example
 * ```tsx
 * const {
 *   corpus,
 *   indexStatement,
 *   searchInStatements,
 *   findByCategory,
 *   findExpensePatterns,
 *   isIndexing
 * } = useFinanceFileSearch({ userId: 'user-123', autoLoad: true });
 *
 * // Indexar extrato bancário
 * await indexStatement(statement, statementMarkdown);
 *
 * // Buscar por categoria
 * const results = await findByCategory('alimentação');
 *
 * // Encontrar padrões de despesa
 * const patterns = await findExpensePatterns('transporte');
 * ```
 */
export function useFinanceFileSearch(options: UseFinanceFileSearchOptions = {}) {
  const { userId, statementId, autoLoad = true } = options;

  // Base hook com filtro de módulo 'finance'
  const baseHook = useModuleFileSearch('finance', userId || statementId);

  // Estados específicos do Finance
  const [corpus, setCorpus] = useState<FileSearchCorpus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [context, setContext] = useState<FinanceSearchContext>({});

  /**
   * Carrega ou cria corpus para o usuário/statement
   */
  const ensureCorpus = useCallback(async (): Promise<FileSearchCorpus> => {
    try {
      if (!userId && !statementId) {
        throw new Error('userId or statementId is required to create or load corpus');
      }

      // Tentar carregar corpus existente
      const existingCorpora = await baseHook.loadCorpora();
      const existingCorpus = existingCorpora.find(
        (c) =>
          c.module_type === 'finance' &&
          (userId ? c.module_id === userId : c.module_id === statementId)
      );

      if (existingCorpus) {
        setCorpus(existingCorpus);
        return existingCorpus;
      }

      // Criar novo corpus
      const id = userId || statementId!;
      const corpusName = userId
        ? `finance-user-${userId}`
        : `finance-statement-${statementId}`;
      const displayName = userId
        ? `Finance - User ${userId}`
        : `Finance Statement ${statementId}`;

      const newCorpus = await baseHook.createNewCorpus(corpusName, displayName);
      setCorpus(newCorpus);
      return newCorpus;
    } catch (error) {
      log.error('[useFinanceFileSearch] ensureCorpus error:', error);
      throw error;
    }
  }, [userId, statementId, baseHook]);

  /**
   * Indexa um extrato bancário (statement)
   *
   * @param statement - Dados do statement
   * @param markdownContent - Conteúdo em markdown do statement (opcional se já estiver no statement)
   * @param metadata - Metadados adicionais
   */
  const indexStatement = useCallback(
    async (
      statement: FinanceStatement,
      markdownContent?: string,
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        // Usar markdown do statement ou fornecido
        const content = markdownContent || statement.markdown_content;

        if (!content || content.trim().length < 100) {
          throw new Error('Conteúdo do statement muito curto. Mínimo: 100 caracteres');
        }

        // Garantir que corpus existe
        const targetCorpus = await ensureCorpus();

        // Criar um "arquivo virtual" com o markdown
        const markdownBlob = new Blob([content], { type: 'text/markdown' });
        const markdownFile = new File(
          [markdownBlob],
          `${statement.file_name.replace(/[^a-z0-9]/gi, '_')}_statement.md`,
          { type: 'text/markdown' }
        );

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file: markdownFile,
          corpus_id: targetCorpus.id,
          display_name: `${statement.bank_name || 'Extrato'} - ${statement.statement_period_start} a ${statement.statement_period_end}`,
          module_type: 'finance',
          module_id: userId || statement.id,
          custom_metadata: {
            document_type: 'bank_statement',
            statement_id: statement.id,
            bank_name: statement.bank_name,
            account_type: statement.account_type,
            period_start: statement.statement_period_start,
            period_end: statement.statement_period_end,
            transaction_count: statement.transaction_count,
            total_credits: statement.total_credits,
            total_debits: statement.total_debits,
            currency: statement.currency,
            character_count: content.length,
            ...metadata,
          },
        });

        log.debug('[useFinanceFileSearch] Statement indexado:', document.id);
        return document;
      } catch (error) {
        log.error('[useFinanceFileSearch] indexStatement error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [userId, ensureCorpus, baseHook]
  );

  /**
   * Indexa lista de transações como documento consolidado
   *
   * @param transactions - Lista de transações
   * @param title - Título do documento
   * @param metadata - Metadados adicionais
   */
  const indexTransactions = useCallback(
    async (
      transactions: FinanceTransaction[],
      title: string,
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        if (transactions.length === 0) {
          throw new Error('Lista de transações vazia');
        }

        // Garantir corpus
        const targetCorpus = await ensureCorpus();

        // Criar markdown com as transações
        const transactionsMarkdown = transactions
          .map(
            (t) =>
              `**${t.transaction_date}** | ${t.description} | ${t.type === 'income' ? '+' : '-'} R$ ${Math.abs(t.amount).toFixed(2)} | ${t.category}${t.notes ? ` | Notas: ${t.notes}` : ''}`
          )
          .join('\n');

        const content = `# ${title}\n\n${transactionsMarkdown}`;

        // Criar arquivo virtual
        const markdownBlob = new Blob([content], { type: 'text/markdown' });
        const markdownFile = new File(
          [markdownBlob],
          `transactions_${Date.now()}.md`,
          { type: 'text/markdown' }
        );

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file: markdownFile,
          corpus_id: targetCorpus.id,
          display_name: title,
          module_type: 'finance',
          module_id: userId || 'transactions',
          custom_metadata: {
            document_type: 'transactions_list',
            transaction_count: transactions.length,
            total_amount: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
            ...metadata,
          },
        });

        log.debug('[useFinanceFileSearch] Transações indexadas:', document.id);
        return document;
      } catch (error) {
        log.error('[useFinanceFileSearch] indexTransactions error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [userId, ensureCorpus, baseHook]
  );

  /**
   * Busca semântica em statements
   *
   * @param query - Pergunta ou termo de busca
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const searchInStatements = useCallback(
    async (query: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      try {
        if (!corpus) {
          log.warn('[FileSearch] Corpus null, attempting re-creation');
          await ensureCorpus();
        }
        if (!corpus) {
          throw new Error('Nao foi possivel criar o corpus de busca');
        }

        const results = await baseHook.search({
          corpus_id: corpus.id,
          query,
          result_count: resultCount,
        });

        return results;
      } catch (error) {
        log.error('[useFinanceFileSearch] searchInStatements error:', error);
        throw error;
      }
    },
    [corpus, baseHook, ensureCorpus]
  );

  /**
   * Busca com contexto adicional do período/conta
   *
   * Útil para fazer perguntas contextualizadas como:
   * "Quanto gastei com alimentação em janeiro?"
   */
  const searchWithContext = useCallback(
    async (
      query: string,
      context: FinanceSearchContext,
      resultCount: number = 5
    ): Promise<FileSearchResult[]> => {
      try {
        setContext(context);

        // Enriquecer query com contexto
        let enrichedQuery = query;

        if (context.periodStart && context.periodEnd) {
          enrichedQuery += ` (período: ${context.periodStart} a ${context.periodEnd})`;
        }

        if (context.bankName) {
          enrichedQuery += ` (banco: ${context.bankName})`;
        }

        if (context.accountType) {
          enrichedQuery += ` (tipo de conta: ${context.accountType})`;
        }

        if (context.categories && context.categories.length > 0) {
          enrichedQuery += ` (categorias: ${context.categories.join(', ')})`;
        }

        return await searchInStatements(enrichedQuery, resultCount);
      } catch (error) {
        log.error('[useFinanceFileSearch] searchWithContext error:', error);
        throw error;
      }
    },
    [searchInStatements]
  );

  /**
   * Encontra transações de uma categoria específica
   *
   * @param category - Categoria a buscar (ex: "alimentação", "transporte")
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findByCategory = useCallback(
    async (category: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = `Encontre todas as transações da categoria "${category}"`;
      return await searchInStatements(query, resultCount);
    },
    [searchInStatements]
  );

  /**
   * Encontra padrões de despesa
   *
   * @param pattern - Padrão a buscar (ex: "gastos recorrentes", "despesas altas")
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findExpensePatterns = useCallback(
    async (pattern: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = `Identifique padrões de despesa relacionados a: ${pattern}`;
      return await searchInStatements(query, resultCount);
    },
    [searchInStatements]
  );

  /**
   * Busca anomalias ou transações suspeitas
   *
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const findAnomalies = useCallback(
    async (resultCount: number = 5): Promise<FileSearchResult[]> => {
      const query = 'Encontre transações anômalas, suspeitas ou fora do padrão habitual';
      return await searchInStatements(query, resultCount);
    },
    [searchInStatements]
  );

  /**
   * Busca transações por descrição ou merchant
   *
   * @param searchTerm - Termo de busca (ex: "Uber", "iFood")
   * @param resultCount - Número de resultados (padrão: 10)
   */
  const findByMerchant = useCallback(
    async (searchTerm: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
      const query = `Encontre todas as transações com "${searchTerm}"`;
      return await searchInStatements(query, resultCount);
    },
    [searchInStatements]
  );

  /**
   * Busca insights sobre gastos em um período
   *
   * @param question - Pergunta sobre os gastos
   * @param resultCount - Número de resultados (padrão: 5)
   */
  const askAboutExpenses = useCallback(
    async (question: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      return await searchInStatements(question, resultCount);
    },
    [searchInStatements]
  );

  /**
   * Lista todos os documentos indexados (statements)
   */
  const loadStatements = useCallback(async () => {
    try {
      if (!corpus) {
        await ensureCorpus();
      }
      return await baseHook.loadDocuments(corpus?.id);
    } catch (error) {
      log.error('[useFinanceFileSearch] loadStatements error:', error);
      throw error;
    }
  }, [corpus, ensureCorpus, baseHook]);

  /**
   * Remove um statement indexado
   */
  const removeStatement = useCallback(
    async (documentId: string) => {
      try {
        await baseHook.removeDocument(documentId);
      } catch (error) {
        log.error('[useFinanceFileSearch] removeStatement error:', error);
        throw error;
      }
    },
    [baseHook]
  );

  /**
   * Verifica se há statements indexados
   */
  const hasIndexedStatements = useCallback(() => {
    return baseHook.documents.length > 0;
  }, [baseHook.documents]);

  /**
   * Auto-load ao montar (se autoLoad=true)
   */
  useEffect(() => {
    let isMounted = true;

    if (autoLoad && (userId || statementId)) {
      ensureCorpus().then((result) => {
        if (isMounted) {
          setCorpus(result);
        }
      }).catch((error) => {
        if (isMounted) {
          log.warn('[useFinanceFileSearch] Auto-load failed:', error);
        }
      });
    }

    return () => { isMounted = false; };
  }, [autoLoad, userId, statementId, ensureCorpus]);

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

    // Ações específicas do Finance
    indexStatement,
    indexTransactions,
    searchInStatements,
    searchWithContext,
    findByCategory,
    findExpensePatterns,
    findAnomalies,
    findByMerchant,
    askAboutExpenses,
    loadStatements,
    removeStatement,
    hasIndexedStatements,

    // Corpus management
    ensureCorpus,

    // Ações do base hook (se necessário)
    clearSearchResults: baseHook.clearSearchResults,
    clearError: baseHook.clearError,

    // Metadados
    userId,
    statementId,
    moduleType: 'finance' as const,
  };
}

/**
 * Hook simplificado para busca rápida em statements
 *
 * @example
 * ```tsx
 * const { quickSearch } = useFinanceQuickSearch('user-123');
 * const results = await quickSearch('Quanto gastei com alimentação?');
 * ```
 */
export function useFinanceQuickSearch(userId: string) {
  const { searchInStatements, ensureCorpus } = useFinanceFileSearch({
    userId,
    autoLoad: true,
  });

  const quickSearch = useCallback(
    async (query: string, resultCount: number = 5) => {
      try {
        await ensureCorpus();
        return await searchInStatements(query, resultCount);
      } catch (error) {
        log.error('[useFinanceQuickSearch] error:', error);
        throw error;
      }
    },
    [searchInStatements, ensureCorpus]
  );

  return { quickSearch };
}
