// Shim re-export — canonical location: src/modules/agenda/services/googleCalendarService.ts
export type { FetchEventsOptions, TimelineEvent } from '@/modules/agenda/services/googleCalendarService';
export {
  fetchCalendarEvents,
  fetchTodayEvents,
  fetchWeekEvents,
  fetchDateRangeEvents,
  transformGoogleEvent,
  fetchAndTransformEvents,
  fetchAvailableCalendars,
  fetchGoogleUserInfo,
} from '@/modules/agenda/services/googleCalendarService';
