export {
  syncEntityToGoogle,
  unsyncEntityFromGoogle,
  getUserSyncMappings,
  bulkSyncFluxSlots,
  bulkSyncAtlasTasks,
} from './calendarSyncService';

export type { SyncModule, FluxSlotData, AtlasTaskData, StudioEpisodeData, GrantDeadlineData } from './calendarSyncTransforms';
export {
  fluxSlotToGoogleEvent,
  atlasTaskToGoogleEvent,
  studioEpisodeToGoogleEvent,
  grantDeadlineToGoogleEvent,
} from './calendarSyncTransforms';

export type { FetchEventsOptions } from './googleCalendarService';
export type { TimelineEvent as GoogleTimelineEvent } from './googleCalendarService';
export {
  fetchCalendarEvents,
  fetchTodayEvents,
  fetchWeekEvents,
  fetchDateRangeEvents,
  transformGoogleEvent,
  fetchAndTransformEvents,
  fetchAvailableCalendars,
  fetchGoogleUserInfo,
} from './googleCalendarService';

export type { RecurrencePattern } from './taskRecurrenceService';
export {
  parseRecurrenceRule,
  patternToRRuleString,
  generateNextOccurrence,
  generateUpcomingOccurrences,
  RRULE_PRESETS,
  describeRRuleInPortuguese,
} from './taskRecurrenceService';

// Routine Templates
export type { RoutineTemplate, RoutineTemplateItem } from './templateService';
export {
  getSystemTemplates,
  getTemplateById,
  applyTemplate,
} from './templateService';

// calendar_events CRUD (created in Task 5)
export {
  fetchCalendarEvents as fetchCalendarEventsFromDB,
  createCalendarEvent as createCalendarEventInDB,
  updateCalendarEvent as updateCalendarEventInDB,
  deleteCalendarEvent as deleteCalendarEventFromDB,
  upsertExternalEvent,
} from './calendarEventService';

// AI Agent Service (pure functions for scheduling, conflicts, prep)
export type { AgendaCalendarEvent, ConflictPair, AgendaWorkItem, TimeBlockSuggestion, ContactInfo } from './agendaAIService';
export {
  detectConflicts,
  suggestTimeBlocks,
  generatePrepContext,
} from './agendaAIService';
