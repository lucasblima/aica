/**
 * Query Configuration & Caching Strategy
 *
 * Configurações otimizadas de cache para React Query
 * Diferentes estratégias baseadas na volatilidade dos dados
 */

export interface QueryConfig {
  staleTime: number;
  cacheTime: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  retry?: number | boolean;
}

/**
 * Configurações de cache por tipo de dados
 *
 * - Espaços: Cache longo (dados mudam raramente)
 * - Membros: Cache médio (adições/remoções ocasionais)
 * - Eventos: Cache curto (podem ser atualizados frequentemente)
 * - Transações: Cache médio (histórico estável)
 * - Inventário: Cache médio (atualizações ocasionais)
 * - Notas: Cache médio (edições frequentes)
 * - Discussões: Cache curto (conversas ativas)
 */
export const connectionQueryConfig = {
  // Espaços - cache longo, dados mudam pouco
  spaces: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as QueryConfig,

  // Membros - cache médio
  members: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
  } as QueryConfig,

  // Eventos - cache curto, podem mudar
  events: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  } as QueryConfig,

  // Transações - cache médio
  transactions: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
  } as QueryConfig,

  // Documentos - cache médio
  documents: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
  } as QueryConfig,

  // Inventário (Habitat) - cache médio
  inventory: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
  } as QueryConfig,

  // Manutenções (Habitat) - cache médio
  maintenance: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: true,
  } as QueryConfig,

  // Notas (Academia) - cache médio
  notes: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
  } as QueryConfig,

  // Discussões (Tribo) - cache curto
  discussions: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    cacheTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  } as QueryConfig,

  // Métricas (Ventures) - cache médio
  metrics: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: true,
  } as QueryConfig,

  // Busca - sem cache (sempre fresh)
  search: {
    staleTime: 0,
    cacheTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as QueryConfig,
};

/**
 * Prefetch helpers para carregar dados antecipadamente
 * Útil para melhorar perceived performance
 */

export interface PrefetchHelpers {
  prefetchSpaceData: (queryClient: any, spaceId: string) => Promise<void>;
  prefetchArchetypeData: (
    queryClient: any,
    archetype: string,
    spaceId: string
  ) => Promise<void>;
}

/**
 * Cria helpers de prefetch baseados nos services
 */
export function createPrefetchHelpers(services: {
  spaceService: any;
  memberService: any;
  eventService: any;
}): PrefetchHelpers {
  return {
    // Prefetch dados comuns de um espaço
    async prefetchSpaceData(queryClient: any, spaceId: string) {
      await Promise.all([
        queryClient.prefetchQuery(
          ['space', spaceId],
          () => services.spaceService.getSpaceById(spaceId),
          connectionQueryConfig.spaces
        ),
        queryClient.prefetchQuery(
          ['space-members', spaceId],
          () => services.memberService.getMembers(spaceId),
          connectionQueryConfig.members
        ),
        queryClient.prefetchQuery(
          ['space-events', spaceId],
          () => services.eventService.getEvents(spaceId),
          connectionQueryConfig.events
        ),
      ]);
    },

    // Prefetch dados específicos do arquétipo
    async prefetchArchetypeData(
      queryClient: any,
      archetype: string,
      spaceId: string
    ) {
      // Implementar baseado no arquétipo
      switch (archetype) {
        case 'habitat':
          // Prefetch inventory, maintenance
          break;
        case 'ventures':
          // Prefetch metrics, stakeholders
          break;
        case 'academia':
          // Prefetch notes, journeys
          break;
        case 'tribo':
          // Prefetch discussions, rituals
          break;
      }
    },
  };
}

/**
 * Hook para invalidar cache de forma inteligente
 */
export const createInvalidationHelpers = () => ({
  // Invalida tudo relacionado a um espaço
  invalidateSpace: (queryClient: any, spaceId: string) => {
    queryClient.invalidateQueries(['space', spaceId]);
    queryClient.invalidateQueries(['space-members', spaceId]);
    queryClient.invalidateQueries(['space-events', spaceId]);
    queryClient.invalidateQueries(['space-transactions', spaceId]);
    queryClient.invalidateQueries(['space-documents', spaceId]);
  },

  // Invalida apenas membros
  invalidateMembers: (queryClient: any, spaceId: string) => {
    queryClient.invalidateQueries(['space-members', spaceId]);
  },

  // Invalida apenas eventos
  invalidateEvents: (queryClient: any, spaceId: string) => {
    queryClient.invalidateQueries(['space-events', spaceId]);
  },

  // Invalida dados específicos do arquétipo
  invalidateArchetypeData: (
    queryClient: any,
    archetype: string,
    spaceId: string
  ) => {
    switch (archetype) {
      case 'habitat':
        queryClient.invalidateQueries(['habitat-inventory', spaceId]);
        queryClient.invalidateQueries(['habitat-maintenance', spaceId]);
        break;
      case 'ventures':
        queryClient.invalidateQueries(['ventures-metrics', spaceId]);
        queryClient.invalidateQueries(['ventures-stakeholders', spaceId]);
        break;
      case 'academia':
        queryClient.invalidateQueries(['academia-notes', spaceId]);
        queryClient.invalidateQueries(['academia-journeys', spaceId]);
        break;
      case 'tribo':
        queryClient.invalidateQueries(['tribo-discussions', spaceId]);
        queryClient.invalidateQueries(['tribo-rituals', spaceId]);
        break;
    }
  },
});

export default connectionQueryConfig;
