/**
 * HolidayBadge — Inline amber pill badge shown when a date is a public holiday.
 *
 * Returns null for non-holidays.
 * Displays: 🎌 {holiday local_name or name}
 */

import React from 'react'
import { useHolidays } from '@/hooks/useHolidays'

interface HolidayBadgeProps {
  date: Date | string
}

/**
 * Converts a Date or string to YYYY-MM-DD format.
 */
function toDateString(date: Date | string): string {
  if (typeof date === 'string') {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    // Parse and format
    return new Date(date).toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export const HolidayBadge: React.FC<HolidayBadgeProps> = ({ date }) => {
  const { isHoliday } = useHolidays()
  const dateStr = toDateString(date)
  const holiday = isHoliday(dateStr)

  if (!holiday) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
      🎌 {holiday.local_name || holiday.name}
    </span>
  )
}
