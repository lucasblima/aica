/**
 * Task Recurrence Service
 * Handles parsing and generation of recurring tasks using iCalendar RRULE format (RFC 5545)
 */

import { RRule, RRuleSet, Frequency, Weekday } from 'rrule';
import type { Options, WeekdayStr } from 'rrule';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('TaskRecurrenceService');


/**
 * Interface for recurring task patterns
 */
export interface RecurrencePattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  daysOfWeek?: string[]; // For weekly: ['MO', 'TU', 'WE', 'TH', 'FR']
  dayOfMonth?: number; // For monthly: 1-31
  endDate?: Date; // When recurrence ends
  maxOccurrences?: number; // Max number of instances
}

/**
 * Parse iCalendar RRULE string into a RecurrencePattern
 *
 * Examples:
 * - "FREQ=DAILY;INTERVAL=1" → Daily
 * - "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" → Weekdays
 * - "FREQ=MONTHLY;BYMONTHDAY=15" → 15th of each month
 */
export function parseRecurrenceRule(rrule: string): RecurrencePattern {
  if (!rrule) {
    return { frequency: 'DAILY', interval: 1 };
  }

  const parts = rrule.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const validFrequencies: RecurrencePattern['frequency'][] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  const freqValue = parts.FREQ || 'DAILY';
  const frequency: RecurrencePattern['frequency'] = validFrequencies.includes(freqValue as RecurrencePattern['frequency'])
    ? (freqValue as RecurrencePattern['frequency'])
    : 'DAILY';

  const pattern: RecurrencePattern = {
    frequency,
    interval: parseInt(parts.INTERVAL || '1', 10),
  };

  if (parts.BYDAY) {
    pattern.daysOfWeek = parts.BYDAY.split(',');
  }

  if (parts.BYMONTHDAY) {
    pattern.dayOfMonth = parseInt(parts.BYMONTHDAY, 10);
  }

  if (parts.UNTIL) {
    pattern.endDate = new Date(parts.UNTIL);
  }

  if (parts.COUNT) {
    pattern.maxOccurrences = parseInt(parts.COUNT, 10);
  }

  return pattern;
}

/**
 * Convert RecurrencePattern back to RRULE string
 */
export function patternToRRuleString(pattern: RecurrencePattern): string {
  const parts: string[] = [
    `FREQ=${pattern.frequency}`,
    `INTERVAL=${pattern.interval}`,
  ];

  if (pattern.daysOfWeek?.length) {
    parts.push(`BYDAY=${pattern.daysOfWeek.join(',')}`);
  }

  if (pattern.dayOfMonth !== undefined) {
    parts.push(`BYMONTHDAY=${pattern.dayOfMonth}`);
  }

  if (pattern.endDate) {
    parts.push(`UNTIL=${pattern.endDate.toISOString().split('T')[0].replace(/-/g, '')}`);
  }

  if (pattern.maxOccurrences !== undefined) {
    parts.push(`COUNT=${pattern.maxOccurrences}`);
  }

  return parts.join(';');
}

/**
 * Generate next occurrence date from current date using RRULE
 *
 * Example:
 * - Task starts Monday, "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 * - Current: Wednesday
 * - Returns: Friday (next occurrence)
 */
export function generateNextOccurrence(
  startDate: Date,
  rruleString: string
): Date | null {
  if (!rruleString) return null;

  try {
    // Create RRULE with start date
    const rruleSet = new RRuleSet();
    const ruleOptions = parseRRuleToObject(rruleString);
    ruleOptions.dtstart = startDate;
    rruleSet.rrule(new RRule(ruleOptions));

    // Get next occurrence after now
    const now = new Date();
    const nextOccurrence = rruleSet.after(now);

    return nextOccurrence;
  } catch (error) {
    log.error('[taskRecurrenceService] Error generating next occurrence:', { error: error });
    return null;
  }
}

/**
 * Generate multiple upcoming occurrences
 * Useful for preview in UI
 */
export function generateUpcomingOccurrences(
  startDate: Date,
  rruleString: string,
  count: number = 5
): Date[] {
  if (!rruleString) return [];

  try {
    const rruleSet = new RRuleSet();
    const ruleOptions = parseRRuleToObject(rruleString);
    ruleOptions.dtstart = startDate;
    ruleOptions.count = count;
    rruleSet.rrule(new RRule(ruleOptions));

    const now = new Date();
    return rruleSet.all().filter(date => date > now);
  } catch (error) {
    log.error('[taskRecurrenceService] Error generating upcoming occurrences:', { error: error });
    return [];
  }
}

/**
 * Preset RRULE strings for common patterns
 */
export const RRULE_PRESETS = {
  DAILY: 'FREQ=DAILY;INTERVAL=1',
  WEEKDAYS: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  WEEKLY: 'FREQ=WEEKLY;INTERVAL=1',
  BIWEEKLY: 'FREQ=WEEKLY;INTERVAL=2',
  MONTHLY: 'FREQ=MONTHLY;INTERVAL=1',
  YEARLY: 'FREQ=YEARLY;INTERVAL=1',
};

/**
 * Get human-readable description of RRULE
 *
 * Example: "FREQ=DAILY;INTERVAL=1" → "Diariamente"
 */
export function describeRRuleInPortuguese(rrule: string): string {
  if (!rrule) return '';

  const pattern = parseRecurrenceRule(rrule);

  switch (pattern.frequency) {
    case 'DAILY':
      return `Diariamente${pattern.interval > 1 ? ` (a cada ${pattern.interval} dias)` : ''}`;
    case 'WEEKLY':
      if (pattern.daysOfWeek?.includes('MO') &&
          pattern.daysOfWeek?.includes('FR') &&
          pattern.daysOfWeek?.length === 5) {
        return 'Dias úteis';
      }
      return `Semanalmente${pattern.interval > 1 ? ` (a cada ${pattern.interval} semanas)` : ''}`;
    case 'MONTHLY':
      return `Mensalmente${pattern.dayOfMonth ? ` (dia ${pattern.dayOfMonth})` : ''}`;
    case 'YEARLY':
      return 'Anualmente';
    default:
      return 'Recorrente';
  }
}

/**
 * Map from RRULE FREQ string values to rrule library Frequency enum
 */
const FREQ_MAP: Record<string, Frequency> = {
  YEARLY: Frequency.YEARLY,
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
  HOURLY: Frequency.HOURLY,
  MINUTELY: Frequency.MINUTELY,
  SECONDLY: Frequency.SECONDLY,
};

/**
 * Valid WeekdayStr values for type-safe lookup
 */
const VALID_WEEKDAYS: WeekdayStr[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function isWeekdayStr(value: string): value is WeekdayStr {
  return VALID_WEEKDAYS.includes(value as WeekdayStr);
}

/**
 * Helper to convert RRULE string to rrule library Options object
 */
function parseRRuleToObject(rruleString: string): Partial<Options> {
  const obj: Partial<Options> = {};
  const parts = rruleString.split(';');

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'FREQ') {
      obj.freq = FREQ_MAP[value] ?? Frequency.DAILY;
    } else if (key === 'INTERVAL') {
      obj.interval = parseInt(value, 10);
    } else if (key === 'BYDAY') {
      obj.byweekday = value.split(',')
        .filter(isWeekdayStr)
        .map(day => Weekday.fromStr(day));
    } else if (key === 'BYMONTHDAY') {
      obj.bymonthday = parseInt(value, 10);
    } else if (key === 'UNTIL') {
      obj.until = new Date(value);
    } else if (key === 'COUNT') {
      obj.count = parseInt(value, 10);
    }
  }

  return obj;
}
