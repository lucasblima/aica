/**
 * useRecurrence Hook
 * Manages recurrence state for task/event editors.
 * Bridges UI-friendly patterns with RRULE string format via taskRecurrenceService.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  RRULE_PRESETS,
  parseRecurrenceRule,
  patternToRRuleString,
  describeRRuleInPortuguese,
  type RecurrencePattern as ServiceRecurrencePattern,
} from '../services/taskRecurrenceService';

/**
 * UI-friendly recurrence pattern with end-condition support.
 */
export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  endType: 'never' | 'count' | 'date';
  endCount?: number;
  endDate?: string; // ISO date string (YYYY-MM-DD)
}

export interface UseRecurrenceReturn {
  pattern: RecurrencePattern | null;
  rruleString: string | null;
  description: string;
  setPreset: (preset: 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'none') => void;
  setPattern: (pattern: RecurrencePattern) => void;
  updateField: <K extends keyof RecurrencePattern>(field: K, value: RecurrencePattern[K]) => void;
  isCustom: boolean;
}

// Maps between service day codes (MO, TU...) and numeric day indices (0=Sun...6=Sat)
const DAY_CODE_TO_NUM: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};
const NUM_TO_DAY_CODE: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};

/**
 * Convert a service RecurrencePattern to a UI RecurrencePattern.
 */
function servicePatternToUI(sp: ServiceRecurrencePattern): RecurrencePattern {
  const pattern: RecurrencePattern = {
    frequency: sp.frequency.toLowerCase() as RecurrencePattern['frequency'],
    interval: sp.interval,
    endType: 'never',
  };

  if (sp.daysOfWeek?.length) {
    pattern.daysOfWeek = sp.daysOfWeek.map(code => DAY_CODE_TO_NUM[code] ?? 1);
  }

  if (sp.maxOccurrences !== undefined) {
    pattern.endType = 'count';
    pattern.endCount = sp.maxOccurrences;
  } else if (sp.endDate) {
    pattern.endType = 'date';
    pattern.endDate = sp.endDate.toISOString().split('T')[0];
  }

  return pattern;
}

/**
 * Convert a UI RecurrencePattern to a service RecurrencePattern and then to RRULE string.
 */
function uiPatternToRRule(pattern: RecurrencePattern): string {
  const sp: ServiceRecurrencePattern = {
    frequency: pattern.frequency.toUpperCase() as ServiceRecurrencePattern['frequency'],
    interval: pattern.interval,
  };

  if (pattern.daysOfWeek?.length) {
    sp.daysOfWeek = pattern.daysOfWeek.map(num => NUM_TO_DAY_CODE[num] ?? 'MO');
  }

  if (pattern.endType === 'count' && pattern.endCount) {
    sp.maxOccurrences = pattern.endCount;
  } else if (pattern.endType === 'date' && pattern.endDate) {
    sp.endDate = new Date(pattern.endDate);
  }

  return patternToRRuleString(sp);
}

/**
 * Determine if an RRULE string matches a known preset.
 */
function matchesPreset(rrule: string): string | null {
  for (const [key, value] of Object.entries(RRULE_PRESETS)) {
    if (rrule === value) return key;
  }
  return null;
}

/**
 * Hook to manage recurrence state with preset and custom support.
 *
 * @param initialRRule - Initial RRULE string from existing task/event, or null.
 */
export function useRecurrence(initialRRule?: string | null): UseRecurrenceReturn {
  const [pattern, setPatternState] = useState<RecurrencePattern | null>(() => {
    if (!initialRRule) return null;
    const parsed = parseRecurrenceRule(initialRRule);
    return servicePatternToUI(parsed);
  });

  const rruleString = useMemo(() => {
    if (!pattern) return null;
    return uiPatternToRRule(pattern);
  }, [pattern]);

  const description = useMemo(() => {
    if (!rruleString) return 'Sem recorrência';
    return describeRRuleInPortuguese(rruleString);
  }, [rruleString]);

  const isCustom = useMemo(() => {
    if (!rruleString) return false;
    return matchesPreset(rruleString) === null;
  }, [rruleString]);

  const setPreset = useCallback((preset: 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'none') => {
    if (preset === 'none') {
      setPatternState(null);
      return;
    }

    const presetMap: Record<string, string> = {
      daily: RRULE_PRESETS.DAILY,
      weekly: RRULE_PRESETS.WEEKLY,
      monthly: RRULE_PRESETS.MONTHLY,
      weekdays: RRULE_PRESETS.WEEKDAYS,
    };

    const rrule = presetMap[preset];
    if (rrule) {
      const parsed = parseRecurrenceRule(rrule);
      setPatternState(servicePatternToUI(parsed));
    }
  }, []);

  const setPattern = useCallback((newPattern: RecurrencePattern) => {
    setPatternState(newPattern);
  }, []);

  const updateField = useCallback(<K extends keyof RecurrencePattern>(
    field: K,
    value: RecurrencePattern[K],
  ) => {
    setPatternState(prev => {
      if (!prev) {
        // If no pattern yet, create a default one with the updated field
        const defaults: RecurrencePattern = {
          frequency: 'daily',
          interval: 1,
          endType: 'never',
        };
        return { ...defaults, [field]: value };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  return {
    pattern,
    rruleString,
    description,
    setPreset,
    setPattern,
    updateField,
    isCustom,
  };
}
