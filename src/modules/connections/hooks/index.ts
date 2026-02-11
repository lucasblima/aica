/**
 * Connections Module - Hooks
 *
 * Barrel export file for all connection hooks
 */

// Space hooks
export { useSpaces, default as useSpacesDefault } from './useSpaces';
export { useSpace, default as useSpaceDefault } from './useSpace';

// Member hooks
export { useSpaceMembers, default as useSpaceMembersDefault } from './useSpaceMembers';

// Event hooks
export { useSpaceEvents, useUpcomingEvents, default as useSpaceEventsDefault } from './useSpaceEvents';

// Navigation hooks
export { useConnectionNavigation, default as useConnectionNavigationDefault } from './useConnectionNavigation';

// Finance Integration hooks
export {
  useSpaceFinanceSummary,
  useUserBalance,
  useSyncToPersonalFinance,
  useImportFromPersonalFinance,
  useMarkSplitAsPaid,
  useSplitPaymentStatus,
  useFinanceIntegration,
} from './useFinanceIntegration';

// Calendar Sync hooks
export { useCalendarSync } from './useCalendarSync';
export type { UseCalendarSyncOptions, UseCalendarSyncReturn } from './useCalendarSync';

// Connection Spaces hooks (unified)
export { useConnectionSpaces } from './useConnectionSpaces';
export { useConnectionMembers } from './useConnectionMembers';

// Search hooks
export { useDebouncedSearch } from './useDebouncedSearch';

// Contact Dossier hooks (Conversation Intelligence Phase 1)
export { useContactDossier, useContactDossierBatch } from './useContactDossier';
export type { ContactDossier, DossierContext, UseContactDossierReturn } from './useContactDossier';

// Conversation Threading hooks (Conversation Intelligence Phase 2)
export { useConversationThreads, useRecentThreads } from './useConversationThreads';
export type { ConversationThread, UseConversationThreadsReturn } from './useConversationThreads';

// Entity Extraction hooks (Conversation Intelligence Phase 3)
export { useExtractedEntities } from './useExtractedEntities';
export type { ExtractedEntity, EntityStats, UseExtractedEntitiesReturn } from './useExtractedEntities';

// Contact Filter hooks (Issue #92)
export { useContactFilters } from './useContactFilters';
export type {
  ContactFilterType,
  ContactSortField,
  ContactSortOrder,
  ContactFiltersState,
  UseContactFiltersOptions,
  UseContactFiltersReturn,
} from './useContactFilters';

// Re-export types for convenience
export type {
  ConnectionSpace,
  ConnectionMember,
  ConnectionEvent,
  CreateSpacePayload,
  UpdateSpacePayload,
  AddMemberPayload,
  CreateEventPayload,
  Archetype,
  MemberRole,
} from '../types';
