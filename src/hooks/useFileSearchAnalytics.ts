/**
 * Hook para analytics e estatísticas do File Search
 *
 * Fornece métricas de uso, custos e performance do File Search
 * em todos os módulos do sistema.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Estatísticas por módulo
 */
export interface ModuleStats {
  module_type: string;
  document_count: number;
  total_size_bytes: number;
  avg_size_bytes: number;
  corpus_count: number;
  last_indexed_at?: string;
}

/**
 * Estatísticas gerais do File Search
 */
export interface FileSearchStats {
  total_corpora: number;
  total_documents: number;
  total_size_mb: number;
  module_stats: ModuleStats[];
  documents_by_status: {
    pending: number;
    active: number;
    failed: number;
  };
}

/**
 * Documento recente
 */
export interface RecentDocument {
  id: string;
  display_name: string;
  module_type: string;
  module_id: string;
  created_at: string;
  indexing_status: string;
  file_size_bytes?: number;
}

/**
 * Estatísticas de busca
 */
export interface SearchStats {
  total_searches: number;
  avg_result_count: number;
  most_searched_modules: {
    module: string;
    count: number;
  }[];
}

export interface UseFileSearchAnalyticsOptions {
  userId?: string;
  autoLoad?: boolean;
}

/**
 * Hook para analytics do File Search
 *
 * @example
 * ```tsx
 * const {
 *   stats,
 *   recentDocuments,
 *   isLoading,
 *   refresh
 * } = useFileSearchAnalytics({ userId: 'user-123', autoLoad: true });
 *
 * // Exibir estatísticas
 * console.log(`Total de documentos: ${stats?.total_documents}`);
 * console.log(`Uso em Grants: ${stats?.module_stats.find(m => m.module_type === 'grants')?.document_count}`);
 * ```
 */
export function useFileSearchAnalytics(options: UseFileSearchAnalyticsOptions = {}) {
  const { userId, autoLoad = true } = options;

  const [stats, setStats] = useState<FileSearchStats | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca estatísticas gerais do File Search
   */
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar estatísticas por módulo usando função SQL
      const { data: moduleData, error: moduleError } = await supabase.rpc(
        'get_module_file_search_stats',
        userId ? { p_user_id: userId } : {}
      );

      if (moduleError) {
        throw new Error(`Erro ao buscar stats por módulo: ${moduleError.message}`);
      }

      const moduleStats: ModuleStats[] = moduleData || [];

      // 2. Buscar contagens por status
      let query = supabase
        .from('file_search_documents')
        .select('indexing_status', { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: statusData, error: statusError } = await query;

      if (statusError) {
        throw new Error(`Erro ao buscar status: ${statusError.message}`);
      }

      // Contar documentos por status
      const statusCounts = (statusData || []).reduce(
        (acc, doc) => {
          const status = doc.indexing_status || 'pending';
          if (status === 'pending') acc.pending++;
          else if (status === 'active') acc.active++;
          else if (status === 'failed') acc.failed++;
          return acc;
        },
        { pending: 0, active: 0, failed: 0 }
      );

      // 3. Calcular totais
      const totalDocuments = moduleStats.reduce((sum, m) => sum + m.document_count, 0);
      const totalSizeBytes = moduleStats.reduce((sum, m) => sum + m.total_size_bytes, 0);
      const totalCorpora = moduleStats.reduce((sum, m) => sum + m.corpus_count, 0);

      // Montar estatísticas
      const fileSearchStats: FileSearchStats = {
        total_corpora: totalCorpora,
        total_documents: totalDocuments,
        total_size_mb: totalSizeBytes / (1024 * 1024),
        module_stats: moduleStats,
        documents_by_status: statusCounts,
      };

      setStats(fileSearchStats);
    } catch (err) {
      console.error('[useFileSearchAnalytics] fetchStats error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Busca documentos indexados recentemente
   */
  const fetchRecentDocuments = useCallback(
    async (limit: number = 10) => {
      try {
        let query = supabase
          .from('file_search_documents')
          .select('id, gemini_file_name, module_type, module_id, created_at, indexing_status, custom_metadata')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw new Error(`Erro ao buscar documentos recentes: ${queryError.message}`);
        }

        const documents: RecentDocument[] = (data || []).map((doc) => ({
          id: doc.id,
          display_name: doc.custom_metadata?.display_name || doc.gemini_file_name,
          module_type: doc.module_type || 'unknown',
          module_id: doc.module_id || '',
          created_at: doc.created_at,
          indexing_status: doc.indexing_status || 'pending',
          file_size_bytes: doc.custom_metadata?.file_size_bytes,
        }));

        setRecentDocuments(documents);
      } catch (err) {
        console.error('[useFileSearchAnalytics] fetchRecentDocuments error:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar documentos recentes');
      }
    },
    [userId]
  );

  /**
   * Busca estatísticas de um módulo específico
   */
  const getModuleStats = useCallback(
    (moduleType: string): ModuleStats | undefined => {
      return stats?.module_stats.find((m) => m.module_type === moduleType);
    },
    [stats]
  );

  /**
   * Calcula porcentagem de uso de um módulo
   */
  const getModuleUsagePercentage = useCallback(
    (moduleType: string): number => {
      if (!stats || stats.total_documents === 0) return 0;

      const moduleStats = stats.module_stats.find((m) => m.module_type === moduleType);
      if (!moduleStats) return 0;

      return (moduleStats.document_count / stats.total_documents) * 100;
    },
    [stats]
  );

  /**
   * Retorna o módulo mais usado
   */
  const getMostUsedModule = useCallback((): ModuleStats | null => {
    if (!stats || stats.module_stats.length === 0) return null;

    return stats.module_stats.reduce((max, current) =>
      current.document_count > max.document_count ? current : max
    );
  }, [stats]);

  /**
   * Retorna módulos ordenados por uso
   */
  const getModulesByUsage = useCallback((): ModuleStats[] => {
    if (!stats) return [];

    return [...stats.module_stats].sort((a, b) => b.document_count - a.document_count);
  }, [stats]);

  /**
   * Calcula taxa de sucesso de indexação
   */
  const getIndexingSuccessRate = useCallback((): number => {
    if (!stats) return 0;

    const { active, failed } = stats.documents_by_status;
    const total = active + failed;

    if (total === 0) return 0;

    return (active / total) * 100;
  }, [stats]);

  /**
   * Atualiza todas as estatísticas
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchStats(), fetchRecentDocuments()]);
  }, [fetchStats, fetchRecentDocuments]);

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
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    // Estados
    stats,
    recentDocuments,
    isLoading,
    error,

    // Funções de query
    getModuleStats,
    getModuleUsagePercentage,
    getMostUsedModule,
    getModulesByUsage,
    getIndexingSuccessRate,

    // Ações
    refresh,
    fetchStats,
    fetchRecentDocuments,
    clearError,

    // Metadados
    userId,
  };
}

/**
 * Hook simplificado para exibir card de estatísticas
 *
 * @example
 * ```tsx
 * const { totalDocuments, totalSize, mostUsedModule } = useFileSearchQuickStats('user-123');
 *
 * return (
 *   <div>
 *     <p>Documentos: {totalDocuments}</p>
 *     <p>Tamanho: {totalSize} MB</p>
 *     <p>Módulo favorito: {mostUsedModule}</p>
 *   </div>
 * );
 * ```
 */
export function useFileSearchQuickStats(userId?: string) {
  const { stats, isLoading } = useFileSearchAnalytics({ userId, autoLoad: true });

  return {
    totalDocuments: stats?.total_documents || 0,
    totalCorpora: stats?.total_corpora || 0,
    totalSize: stats?.total_size_mb.toFixed(2) || '0.00',
    mostUsedModule: stats?.module_stats[0]?.module_type || 'N/A',
    isLoading,
  };
}
