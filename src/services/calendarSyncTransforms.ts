// Shim re-export — canonical location: src/modules/agenda/services/calendarSyncTransforms.ts
export type { SyncModule, FluxSlotData, AtlasTaskData, StudioEpisodeData, GrantDeadlineData } from '@/modules/agenda/services/calendarSyncTransforms';
export {
  fluxSlotToGoogleEvent,
  atlasTaskToGoogleEvent,
  studioEpisodeToGoogleEvent,
  grantDeadlineToGoogleEvent,
} from '@/modules/agenda/services/calendarSyncTransforms';
