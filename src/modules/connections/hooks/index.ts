// Space hooks
export { useSpace } from './useSpace';
export { useSpaceMembers } from './useSpaceMembers';
export { useConnectionSpaces } from './useConnectionSpaces';

// Navigation
export { useConnectionNavigation } from './useConnectionNavigation';

// Contact & WhatsApp hooks
export { useContactDossier, useContactDossierBatch } from './useContactDossier';
export type { ContactDossier, DossierContext, UseContactDossierReturn } from './useContactDossier';

export { useConversationThreads, useRecentThreads } from './useConversationThreads';
export type { ConversationThread, UseConversationThreadsReturn } from './useConversationThreads';

export { useExtractedEntities } from './useExtractedEntities';
export type { ExtractedEntity, EntityStats, UseExtractedEntitiesReturn } from './useExtractedEntities';

export { useContactFilters } from './useContactFilters';
export type {
  ContactFilterType,
  ContactSortField,
  ContactSortOrder,
  ContactFiltersState,
  UseContactFiltersOptions,
  UseContactFiltersReturn,
} from './useContactFilters';

export { useContactSearch } from './useContactSearch';

// Network Science hooks (Sprint 4)
export { useRelationshipScore } from './useRelationshipScore';
export type { UseRelationshipScoreReturn } from './useRelationshipScore';

export { useNetworkMetrics } from './useNetworkMetrics';
export type { UseNetworkMetricsReturn } from './useNetworkMetrics';

export { useDunbarLayers } from './useDunbarLayers';
export type { UseDunbarLayersReturn } from './useDunbarLayers';

// Re-export types for convenience
export type {
  ConnectionSpace,
  ConnectionMember,
  ArchetypeType,
  MemberRole,
} from '../types';
