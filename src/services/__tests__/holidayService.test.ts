/**
 * Unit Tests for Holiday Service
 *
 * Tests cover:
 * - isHoliday: date matching against a holiday list
 * - getNextHoliday: finding the next upcoming holiday from today
 *
 * Uses vi.useFakeTimers to control "today" for deterministic tests.
 *
 * @see src/services/holidayService.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHoliday, getNextHoliday } from '../holidayService'
import type { HolidayData } from '@/lib/external-api'

/**
 * Mock holiday dataset for 2026
 */
const MOCK_HOLIDAYS: HolidayData[] = [
  {
    date: '2026-01-01',
    name: 'New Year',
    local_name: 'Confraternizacao Universal',
    year: 2026,
    holiday_type: 'public',
  },
  {
    date: '2026-04-21',
    name: 'Tiradentes',
    local_name: 'Tiradentes',
    year: 2026,
    holiday_type: 'public',
  },
  {
    date: '2026-09-07',
    name: 'Independence Day',
    local_name: 'Independencia do Brasil',
    year: 2026,
    holiday_type: 'public',
  },
  {
    date: '2026-12-25',
    name: 'Christmas',
    local_name: 'Natal',
    year: 2026,
    holiday_type: 'public',
  },
]

describe('holidayService', () => {
  describe('isHoliday', () => {
    it('should return the holiday when the date matches', () => {
      const result = isHoliday('2026-01-01', MOCK_HOLIDAYS)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('New Year')
      expect(result!.local_name).toBe('Confraternizacao Universal')
    })

    it('should return null when the date does not match any holiday', () => {
      const result = isHoliday('2026-03-15', MOCK_HOLIDAYS)

      expect(result).toBeNull()
    })

    it('should match the exact date string', () => {
      const result = isHoliday('2026-04-21', MOCK_HOLIDAYS)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Tiradentes')
    })

    it('should return null for an empty holiday list', () => {
      const result = isHoliday('2026-01-01', [])

      expect(result).toBeNull()
    })
  })

  describe('getNextHoliday', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return the next upcoming holiday from March 1, 2026', () => {
      vi.setSystemTime(new Date('2026-03-01T12:00:00'))

      const result = getNextHoliday(MOCK_HOLIDAYS)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Tiradentes')
      expect(result!.date).toBe('2026-04-21')
    })

    it('should return the holiday if today IS the holiday', () => {
      vi.setSystemTime(new Date('2026-09-07T00:00:00'))

      const result = getNextHoliday(MOCK_HOLIDAYS)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Independence Day')
    })

    it('should return null when no upcoming holidays remain (Dec 26)', () => {
      vi.setSystemTime(new Date('2026-12-26T12:00:00'))

      const result = getNextHoliday(MOCK_HOLIDAYS)

      expect(result).toBeNull()
    })

    it('should return the first holiday of the year on Jan 1', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00'))

      const result = getNextHoliday(MOCK_HOLIDAYS)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('New Year')
    })

    it('should return null for an empty holiday list', () => {
      vi.setSystemTime(new Date('2026-06-15T12:00:00'))

      const result = getNextHoliday([])

      expect(result).toBeNull()
    })
  })
})
