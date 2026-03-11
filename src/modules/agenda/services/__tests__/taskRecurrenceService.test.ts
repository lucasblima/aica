/**
 * Unit Tests for taskRecurrenceService
 *
 * Tests cover:
 * - parseRecurrenceRule: RRULE string → RecurrencePattern object
 * - patternToRRuleString: RecurrencePattern → RRULE string (round-trip)
 * - describeRRuleInPortuguese: human-readable Portuguese descriptions
 * - RRULE_PRESETS: preset validation
 * - Edge cases: empty strings, missing fields, non-standard inputs
 *
 * Note: generateNextOccurrence and generateUpcomingOccurrences are not
 * tested because they depend on the rrule library's RRuleSet constructor
 * with complex internal casting. Those are integration-level tests.
 *
 * @see src/modules/agenda/services/taskRecurrenceService.ts
 */

import { describe, it, expect } from 'vitest'

import {
  parseRecurrenceRule,
  patternToRRuleString,
  describeRRuleInPortuguese,
  RRULE_PRESETS,
  type RecurrencePattern,
} from '../taskRecurrenceService'

// =============================================================================
// parseRecurrenceRule
// =============================================================================

describe('parseRecurrenceRule', () => {
  it('should parse a simple daily rule', () => {
    const result = parseRecurrenceRule('FREQ=DAILY;INTERVAL=1')

    expect(result.frequency).toBe('DAILY')
    expect(result.interval).toBe(1)
  })

  it('should parse weekly rule with specific days', () => {
    const result = parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')

    expect(result.frequency).toBe('WEEKLY')
    expect(result.interval).toBe(1)
    expect(result.daysOfWeek).toEqual(['MO', 'TU', 'WE', 'TH', 'FR'])
  })

  it('should parse monthly rule with specific day', () => {
    const result = parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=15')

    expect(result.frequency).toBe('MONTHLY')
    expect(result.dayOfMonth).toBe(15)
  })

  it('should parse biweekly rule', () => {
    const result = parseRecurrenceRule('FREQ=WEEKLY;INTERVAL=2')

    expect(result.frequency).toBe('WEEKLY')
    expect(result.interval).toBe(2)
  })

  it('should parse yearly rule', () => {
    const result = parseRecurrenceRule('FREQ=YEARLY;INTERVAL=1')

    expect(result.frequency).toBe('YEARLY')
    expect(result.interval).toBe(1)
  })

  it('should parse UNTIL clause', () => {
    const result = parseRecurrenceRule('FREQ=DAILY;INTERVAL=1;UNTIL=2026-12-31')

    expect(result.endDate).toBeInstanceOf(Date)
  })

  it('should parse COUNT clause', () => {
    const result = parseRecurrenceRule('FREQ=DAILY;INTERVAL=1;COUNT=10')

    expect(result.maxOccurrences).toBe(10)
  })

  it('should return daily default for empty string', () => {
    const result = parseRecurrenceRule('')

    expect(result.frequency).toBe('DAILY')
    expect(result.interval).toBe(1)
  })

  it('should default interval to 1 when not specified', () => {
    const result = parseRecurrenceRule('FREQ=MONTHLY')

    expect(result.frequency).toBe('MONTHLY')
    expect(result.interval).toBe(1)
  })

  it('should handle combined fields', () => {
    const result = parseRecurrenceRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;COUNT=20')

    expect(result.frequency).toBe('WEEKLY')
    expect(result.interval).toBe(2)
    expect(result.daysOfWeek).toEqual(['MO', 'FR'])
    expect(result.maxOccurrences).toBe(20)
  })
})

// =============================================================================
// patternToRRuleString
// =============================================================================

describe('patternToRRuleString', () => {
  it('should convert a daily pattern to RRULE string', () => {
    const pattern: RecurrencePattern = {
      frequency: 'DAILY',
      interval: 1,
    }

    expect(patternToRRuleString(pattern)).toBe('FREQ=DAILY;INTERVAL=1')
  })

  it('should include BYDAY when daysOfWeek is set', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      daysOfWeek: ['MO', 'WE', 'FR'],
    }

    const result = patternToRRuleString(pattern)
    expect(result).toContain('BYDAY=MO,WE,FR')
  })

  it('should include BYMONTHDAY when dayOfMonth is set', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      dayOfMonth: 25,
    }

    const result = patternToRRuleString(pattern)
    expect(result).toContain('BYMONTHDAY=25')
  })

  it('should include UNTIL when endDate is set', () => {
    const pattern: RecurrencePattern = {
      frequency: 'DAILY',
      interval: 1,
      endDate: new Date('2026-12-31'),
    }

    const result = patternToRRuleString(pattern)
    expect(result).toContain('UNTIL=20261231')
  })

  it('should include COUNT when maxOccurrences is set', () => {
    const pattern: RecurrencePattern = {
      frequency: 'DAILY',
      interval: 1,
      maxOccurrences: 30,
    }

    const result = patternToRRuleString(pattern)
    expect(result).toContain('COUNT=30')
  })

  it('should not include optional fields when not set', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 2,
    }

    const result = patternToRRuleString(pattern)
    expect(result).toBe('FREQ=WEEKLY;INTERVAL=2')
    expect(result).not.toContain('BYDAY')
    expect(result).not.toContain('BYMONTHDAY')
    expect(result).not.toContain('UNTIL')
    expect(result).not.toContain('COUNT')
  })

  it('should not include BYDAY when daysOfWeek is empty', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      daysOfWeek: [],
    }

    const result = patternToRRuleString(pattern)
    expect(result).not.toContain('BYDAY')
  })
})

// =============================================================================
// Round-trip: parse → serialize → parse
// =============================================================================

describe('parseRecurrenceRule ↔ patternToRRuleString round-trip', () => {
  it('should round-trip DAILY preset', () => {
    const original = RRULE_PRESETS.DAILY
    const parsed = parseRecurrenceRule(original)
    const serialized = patternToRRuleString(parsed)

    expect(serialized).toBe(original)
  })

  it('should round-trip WEEKDAYS preset', () => {
    const original = RRULE_PRESETS.WEEKDAYS
    const parsed = parseRecurrenceRule(original)
    const serialized = patternToRRuleString(parsed)

    // WEEKDAYS: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
    // parseRecurrenceRule defaults interval to 1
    // patternToRRuleString includes INTERVAL=1
    expect(serialized).toContain('FREQ=WEEKLY')
    expect(serialized).toContain('BYDAY=MO,TU,WE,TH,FR')
  })

  it('should round-trip MONTHLY preset', () => {
    const original = RRULE_PRESETS.MONTHLY
    const parsed = parseRecurrenceRule(original)
    const serialized = patternToRRuleString(parsed)

    expect(serialized).toBe(original)
  })

  it('should round-trip complex pattern', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 2,
      daysOfWeek: ['MO', 'FR'],
      maxOccurrences: 10,
    }

    const serialized = patternToRRuleString(pattern)
    const parsed = parseRecurrenceRule(serialized)

    expect(parsed.frequency).toBe(pattern.frequency)
    expect(parsed.interval).toBe(pattern.interval)
    expect(parsed.daysOfWeek).toEqual(pattern.daysOfWeek)
    expect(parsed.maxOccurrences).toBe(pattern.maxOccurrences)
  })
})

// =============================================================================
// describeRRuleInPortuguese
// =============================================================================

describe('describeRRuleInPortuguese', () => {
  it('should return "Diariamente" for daily rule', () => {
    expect(describeRRuleInPortuguese('FREQ=DAILY;INTERVAL=1')).toBe('Diariamente')
  })

  it('should describe daily with interval', () => {
    const result = describeRRuleInPortuguese('FREQ=DAILY;INTERVAL=3')
    expect(result).toBe('Diariamente (a cada 3 dias)')
  })

  it('should return "Dias uteis" for weekdays', () => {
    const result = describeRRuleInPortuguese('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
    expect(result).toContain('teis')
  })

  it('should return "Semanalmente" for weekly without specific days', () => {
    expect(describeRRuleInPortuguese('FREQ=WEEKLY;INTERVAL=1')).toBe('Semanalmente')
  })

  it('should describe biweekly', () => {
    const result = describeRRuleInPortuguese('FREQ=WEEKLY;INTERVAL=2')
    expect(result).toBe('Semanalmente (a cada 2 semanas)')
  })

  it('should return "Mensalmente" for monthly', () => {
    expect(describeRRuleInPortuguese('FREQ=MONTHLY;INTERVAL=1')).toBe('Mensalmente')
  })

  it('should describe monthly with specific day', () => {
    const result = describeRRuleInPortuguese('FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15')
    expect(result).toBe('Mensalmente (dia 15)')
  })

  it('should return "Anualmente" for yearly', () => {
    expect(describeRRuleInPortuguese('FREQ=YEARLY;INTERVAL=1')).toBe('Anualmente')
  })

  it('should return empty string for empty input', () => {
    expect(describeRRuleInPortuguese('')).toBe('')
  })
})

// =============================================================================
// RRULE_PRESETS
// =============================================================================

describe('RRULE_PRESETS', () => {
  it('should have 6 preset patterns', () => {
    expect(Object.keys(RRULE_PRESETS)).toHaveLength(6)
  })

  it('should have valid RRULE strings', () => {
    Object.values(RRULE_PRESETS).forEach(preset => {
      expect(preset).toContain('FREQ=')
    })
  })

  it('should all be parseable without errors', () => {
    Object.values(RRULE_PRESETS).forEach(preset => {
      const parsed = parseRecurrenceRule(preset)
      expect(parsed.frequency).toBeTruthy()
      expect(parsed.interval).toBeGreaterThanOrEqual(1)
    })
  })

  it('DAILY should be daily with interval 1', () => {
    expect(RRULE_PRESETS.DAILY).toBe('FREQ=DAILY;INTERVAL=1')
  })

  it('WEEKDAYS should include all 5 work days', () => {
    expect(RRULE_PRESETS.WEEKDAYS).toContain('MO')
    expect(RRULE_PRESETS.WEEKDAYS).toContain('FR')
    expect(RRULE_PRESETS.WEEKDAYS).not.toContain('SA')
    expect(RRULE_PRESETS.WEEKDAYS).not.toContain('SU')
  })

  it('BIWEEKLY should have interval 2', () => {
    expect(RRULE_PRESETS.BIWEEKLY).toContain('INTERVAL=2')
  })
})
