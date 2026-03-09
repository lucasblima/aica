// Shim re-export — canonical location: src/modules/agenda/services/taskRecurrenceService.ts
export type { RecurrencePattern } from '@/modules/agenda/services/taskRecurrenceService';
export {
  parseRecurrenceRule,
  patternToRRuleString,
  generateNextOccurrence,
  generateUpcomingOccurrences,
  RRULE_PRESETS,
  describeRRuleInPortuguese,
} from '@/modules/agenda/services/taskRecurrenceService';
