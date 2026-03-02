/**
 * Holiday Service
 *
 * Fetches Brazilian public holidays via the ExternalApiClient
 * and provides helper functions for date checks.
 */

import { ExternalApiClient } from '@/lib/external-api'
import type { HolidayData } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

/**
 * Fetches public holidays for a given year (defaults to current year)
 */
export async function getHolidays(year?: number): Promise<HolidayData[]> {
  const targetYear = year ?? new Date().getFullYear()
  const response = await client.call<HolidayData[]>('holidays', { year: targetYear })

  if (!response.success || !response.data) {
    return []
  }

  return response.data
}

/**
 * Checks whether a date string (YYYY-MM-DD) matches any holiday in the list.
 * Returns the matching HolidayData or null.
 */
export function isHoliday(
  date: string,
  holidays: HolidayData[]
): HolidayData | null {
  return holidays.find((h) => h.date === date) ?? null
}

/**
 * Returns the next upcoming holiday from today, or null if none remain this year.
 */
export function getNextHoliday(
  holidays: HolidayData[]
): HolidayData | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = holidays
    .filter((h) => new Date(h.date + 'T00:00:00') >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return upcoming[0] ?? null
}
