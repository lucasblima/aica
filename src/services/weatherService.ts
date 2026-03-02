/**
 * Weather Service
 *
 * Fetches weather forecast data via the ExternalApiClient.
 * Requires latitude/longitude coordinates.
 */

import { ExternalApiClient } from '@/lib/external-api'
import type { WeatherData } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

/**
 * Fetches a weather forecast for the given coordinates.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param city - Optional city name for AI insight context
 */
export async function getWeatherForecast(
  lat: number,
  lng: number,
  city?: string
): Promise<WeatherData | null> {
  const response = await client.call<WeatherData>('weather', {
    latitude: lat,
    longitude: lng,
    ...(city ? { city } : {}),
  })

  if (!response.success || !response.data) {
    return null
  }

  return response.data
}
