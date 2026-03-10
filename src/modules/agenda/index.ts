export * from './types';
export * from './providers';
export * from './components';
export * from './hooks';
// Re-export services explicitly to avoid RecurrencePattern name collision
// (hooks exports UI RecurrencePattern, services exports service RecurrencePattern)
export {
  syncEntityToGoogle,
  unsyncEntityFromGoogle,
  getUserSyncMappings,
  bulkSyncFluxSlots,
  bulkSyncAtlasTasks,
  fluxSlotToGoogleEvent,
  atlasTaskToGoogleEvent,
  studioEpisodeToGoogleEvent,
  grantDeadlineToGoogleEvent,
  fetchCalendarEvents,
  fetchTodayEvents,
  fetchWeekEvents,
  fetchDateRangeEvents,
  transformGoogleEvent,
  fetchAndTransformEvents,
  fetchAvailableCalendars,
  fetchGoogleUserInfo,
  parseRecurrenceRule,
  patternToRRuleString,
  generateNextOccurrence,
  generateUpcomingOccurrences,
  RRULE_PRESETS,
  describeRRuleInPortuguese,
  getSystemTemplates,
  getTemplateById,
  applyTemplate,
  fetchCalendarEventsFromDB,
  createCalendarEventInDB,
  updateCalendarEventInDB,
  deleteCalendarEventFromDB,
  upsertExternalEvent,
} from './services';
export type {
  SyncModule,
  FluxSlotData,
  AtlasTaskData,
  StudioEpisodeData,
  GrantDeadlineData,
  FetchEventsOptions,
  GoogleTimelineEvent,
  RoutineTemplate,
  RoutineTemplateItem,
} from './services';
export type { RecurrencePattern as ServiceRecurrencePattern } from './services';
