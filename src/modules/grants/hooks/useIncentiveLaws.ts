/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * useIncentiveLaws - React Hook for Incentive Laws
 * Issue #96 - Cadastro de leis de incentivo fiscal
 *
 * Hook para gerenciamento de leis de incentivo fiscal no frontend.
 * - Listagem com filtros
 * - Busca por ID ou short_name
 * - Cache e loading states
 * - Formatacao para contexto de IA
 *
 * @module modules/grants/hooks/useIncentiveLaws
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as lawService from '../services/incentiveLawService';
import type {
  IncentiveLaw,
  IncentiveLawFilters,
  IncentiveLawSortOptions,
  IncentiveLawSummary,
  IncentiveLawCardData,
  toCardData,
} from '../types/incentiveLaws';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

interface UseIncentiveLawsOptions {
  /** Se deve buscar automaticamente ao montar (default: true) */
  autoFetch?: boolean;
  /** Filtros iniciais */
  filters?: IncentiveLawFilters;
  /** Ordenacao inicial */
  sort?: IncentiveLawSortOptions;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

interface UseIncentiveLawsReturn {
  /** Lista de leis de incentivo */
  laws: IncentiveLaw[];
  /** Estado de carregamento */
  isLoading: boolean;
  /** Mensagem de erro (se houver) */
  error: string | null;

  // Actions
  /** Recarrega a lista de leis */
  refresh: () => Promise<void>;
  /** Aplica novos filtros */
  applyFilters: (filters: IncentiveLawFilters) => Promise<void>;
  /** Busca uma lei por ID */
  getById: (id: string) => Promise<IncentiveLaw | null>;
  /** Busca uma lei por short_name */
  getByShortName: (shortName: string) => Promise<IncentiveLaw | null>;
  /** Busca contexto formatado para IA */
  getAIContext: (lawId: string) => Promise<string | null>;

  // Derived data
  /** Leis formatadas para cards */
  cardsData: IncentiveLawCardData[];
  /** Resumos para selectors */
  summaries: IncentiveLawSummary[];
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook para gerenciar lista de leis de incentivo fiscal
 *
 * @param options - Opcoes de configuracao
 * @returns Estado e acoes para gerenciar leis
 *
 * @example
 * ```tsx
 * const { laws, isLoading, cardsData } = useIncentiveLaws();
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <div>
 *     {cardsData.map(card => (
 *       <IncentiveLawCard key={card.id} data={card} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useIncentiveLaws(
  options: UseIncentiveLawsOptions = {}
): UseIncentiveLawsReturn {
  const { autoFetch = true, filters: initialFilters, sort: initialSort } = options;

  const [laws, setLaws] = useState<IncentiveLaw[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<IncentiveLawFilters | undefined>(initialFilters);
  const [currentSort, setCurrentSort] = useState<IncentiveLawSortOptions | undefined>(initialSort);

  // Fetch laws
  const fetchLaws = useCallback(async (
    filters?: IncentiveLawFilters,
    sort?: IncentiveLawSortOptions
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await lawService.getIncentiveLaws(filters, sort);
      setLaws(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar leis de incentivo';
      setError(message);
      console.error('[useIncentiveLaws] Erro:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchLaws(currentFilters, currentSort);
  }, [fetchLaws, currentFilters, currentSort]);

  // Apply filters
  const applyFilters = useCallback(async (filters: IncentiveLawFilters) => {
    setCurrentFilters(filters);
    await fetchLaws(filters, currentSort);
  }, [fetchLaws, currentSort]);

  // Get by ID
  const getById = useCallback(async (id: string) => {
    try {
      return await lawService.getIncentiveLawById(id);
    } catch (err) {
      console.error('[useIncentiveLaws] Erro ao buscar por ID:', err);
      return null;
    }
  }, []);

  // Get by short name
  const getByShortName = useCallback(async (shortName: string) => {
    try {
      return await lawService.getIncentiveLawByShortName(shortName);
    } catch (err) {
      console.error('[useIncentiveLaws] Erro ao buscar por short_name:', err);
      return null;
    }
  }, []);

  // Get AI context
  const getAIContext = useCallback(async (lawId: string) => {
    try {
      return await lawService.getIncentiveLawAIContext(lawId);
    } catch (err) {
      console.error('[useIncentiveLaws] Erro ao buscar contexto AI:', err);
      return null;
    }
  }, []);

  // Derived data: cards
  const cardsData = useMemo((): IncentiveLawCardData[] => {
    // Import utility from types
    const { toCardData } = require('../types/incentiveLaws');
    return laws.map(law => toCardData(law));
  }, [laws]);

  // Derived data: summaries
  const summaries = useMemo((): IncentiveLawSummary[] => {
    const { toSummary } = require('../types/incentiveLaws');
    return laws.map(law => toSummary(law));
  }, [laws]);

  // Auto-fetch on mount and when initial params change
  useEffect(() => {
    if (autoFetch) {
      fetchLaws(initialFilters, initialSort);
    }
  }, [autoFetch, fetchLaws, initialFilters, initialSort]);

  return {
    laws,
    isLoading,
    error,
    refresh,
    applyFilters,
    getById,
    getByShortName,
    getAIContext,
    cardsData,
    summaries,
  };
}

// =============================================================================
// HOOK FOR SINGLE LAW
// =============================================================================

interface UseIncentiveLawReturn {
  /** Lei de incentivo */
  law: IncentiveLaw | null;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Mensagem de erro */
  error: string | null;
  /** Recarrega a lei */
  refresh: () => Promise<void>;
  /** Contexto formatado para IA */
  aiContext: string | null;
  /** Carrega o contexto de IA */
  loadAIContext: () => Promise<void>;
}

/**
 * Hook para gerenciar uma lei de incentivo especifica
 *
 * @param id - ID da lei (ou null)
 * @returns Estado e acoes para a lei
 *
 * @example
 * ```tsx
 * const { law, isLoading, aiContext, loadAIContext } = useIncentiveLaw(lawId);
 *
 * useEffect(() => {
 *   loadAIContext();
 * }, [lawId]);
 *
 * if (isLoading) return <Loading />;
 * if (!law) return <NotFound />;
 *
 * return <IncentiveLawDetail law={law} context={aiContext} />;
 * ```
 */
export function useIncentiveLaw(id: string | null): UseIncentiveLawReturn {
  const [law, setLaw] = useState<IncentiveLaw | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiContext, setAIContext] = useState<string | null>(null);

  // Fetch law
  const fetchLaw = useCallback(async () => {
    if (!id) {
      setLaw(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await lawService.getIncentiveLawById(id);
      setLaw(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lei';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load AI context
  const loadAIContext = useCallback(async () => {
    if (!id) {
      setAIContext(null);
      return;
    }

    try {
      const context = await lawService.getIncentiveLawAIContext(id);
      setAIContext(context);
    } catch (err) {
      console.error('[useIncentiveLaw] Erro ao carregar contexto AI:', err);
    }
  }, [id]);

  // Auto-fetch on mount and ID change
  useEffect(() => {
    fetchLaw();
  }, [fetchLaw]);

  return {
    law,
    isLoading,
    error,
    refresh: fetchLaw,
    aiContext,
    loadAIContext,
  };
}

// =============================================================================
// HOOK FOR SUMMARIES (optimized for selectors)
// =============================================================================

interface UseIncentiveLawSummariesReturn {
  /** Lista de resumos */
  summaries: IncentiveLawSummary[];
  /** Estado de carregamento */
  isLoading: boolean;
  /** Mensagem de erro */
  error: string | null;
  /** Recarrega os resumos */
  refresh: () => Promise<void>;
}

/**
 * Hook otimizado para selectors e dropdowns
 *
 * Carrega apenas os campos necessarios para exibicao em listas.
 *
 * @returns Lista de resumos de leis
 *
 * @example
 * ```tsx
 * const { summaries, isLoading } = useIncentiveLawSummaries();
 *
 * return (
 *   <Select>
 *     {summaries.map(summary => (
 *       <Option key={summary.id} value={summary.id}>
 *         {summary.short_name} - {summary.name}
 *       </Option>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export function useIncentiveLawSummaries(): UseIncentiveLawSummariesReturn {
  const [summaries, setSummaries] = useState<IncentiveLawSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await lawService.getIncentiveLawSummaries();
      setSummaries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar resumos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return {
    summaries,
    isLoading,
    error,
    refresh: fetchSummaries,
  };
}

// =============================================================================
// HOOK FOR AI CONTEXT
// =============================================================================

interface UseIncentiveLawAIContextReturn {
  /** Contexto formatado para IA */
  context: string | null;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Mensagem de erro */
  error: string | null;
  /** Carrega o contexto */
  load: () => Promise<void>;
}

/**
 * Hook para carregar contexto de IA de uma lei
 *
 * @param lawId - ID da lei
 * @returns Contexto formatado para prompts de IA
 *
 * @example
 * ```tsx
 * const { context, isLoading, load } = useIncentiveLawAIContext(selectedLawId);
 *
 * useEffect(() => {
 *   if (selectedLawId) load();
 * }, [selectedLawId]);
 *
 * // Usar context em prompts
 * const prompt = `${context}\n\nGere uma apresentacao comercial...`;
 * ```
 */
export function useIncentiveLawAIContext(
  lawId: string | null
): UseIncentiveLawAIContextReturn {
  const [context, setContext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!lawId) {
      setContext(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await lawService.getIncentiveLawAIContext(lawId);
      setContext(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar contexto';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [lawId]);

  // Auto-load when lawId changes
  useEffect(() => {
    if (lawId) {
      load();
    } else {
      setContext(null);
    }
  }, [lawId, load]);

  return {
    context,
    isLoading,
    error,
    load,
  };
}
