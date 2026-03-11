/**
 * useWeatherInsight Hook
 *
 * Fetches weather forecast data for the user's current location.
 * Depends on useUserLocation — only fires when coordinates are available.
 */

import { useQuery } from '@tanstack/react-query'
import { useUserLocation } from '@/hooks/useUserLocation'
import { getWeatherForecast } from '@/services/weatherService'
import type { WeatherData } from '@/lib/external-api'

const THIRTY_MIN_MS = 30 * 60 * 1000
const THREE_HOURS_MS = 3 * 60 * 60 * 1000

export function useWeatherInsight() {
  const { location, hasLocation } = useUserLocation()

  const { data: weather = null, isLoading, error } = useQuery<WeatherData | null>({
    queryKey: ['weather', location?.latitude, location?.longitude],
    queryFn: () => {
      if (!location) throw new Error('Location not available');
      return getWeatherForecast(
        location.latitude,
        location.longitude,
        location.city
      );
    },
    enabled: hasLocation,
    staleTime: THIRTY_MIN_MS,
    gcTime: THREE_HOURS_MS,
    retry: 1,
  })

  return {
    weather,
    insight: weather?.insight ?? null,
    hasLocation,
    isLoading,
    error,
  }
}
