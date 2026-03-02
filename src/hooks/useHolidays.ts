/**
 * useHolidays Hook
 *
 * Fetches and caches Brazilian public holidays for a given year.
 * Provides convenience helpers to check if a date is a holiday
 * and to find the next upcoming holiday.
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getHolidays, isHoliday as checkIsHoliday, getNextHoliday } from '@/services/holidayService'
import type { HolidayData } from '@/lib/external-api'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

export function useHolidays(year?: number) {
  const targetYear = year ?? new Date().getFullYear()

  const { data: holidays = [], isLoading, error } = useQuery({
    queryKey: ['holidays', targetYear],
    queryFn: () => getHolidays(targetYear),
    staleTime: ONE_DAY_MS,
    gcTime: SEVEN_DAYS_MS,
    retry: 1,
  })

  const nextHoliday = useMemo(
    () => getNextHoliday(holidays),
    [holidays]
  )

  const isHoliday = useMemo(
    () => (date: string): HolidayData | null => checkIsHoliday(date, holidays),
    [holidays]
  )

  return {
    holidays,
    isLoading,
    error,
    isHoliday,
    nextHoliday,
  }
}
