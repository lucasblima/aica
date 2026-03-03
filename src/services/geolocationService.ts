/**
 * Geolocation Service
 *
 * Provides multiple strategies to determine the user's location:
 * 1. IP-based (via Edge Function)
 * 2. Browser Geolocation API
 * 3. Manual save to profiles table
 */

import { ExternalApiClient } from '@/lib/external-api'
import type { GeolocationData } from '@/lib/external-api'
import { supabase } from '@/services/supabaseClient'

const client = ExternalApiClient.getInstance()

/**
 * Detects location from the user's IP address via the Edge Function.
 */
export async function detectLocationFromIp(): Promise<GeolocationData | null> {
  const response = await client.call<GeolocationData>('geolocation')

  if (!response.success || !response.data) {
    return null
  }

  return response.data
}

/**
 * Detects location using the browser's Geolocation API.
 * Returns coordinates or null if the user denies permission or
 * the API is unavailable.
 */
export function detectLocationFromBrowser(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    )
  })
}

/**
 * Estimates approximate location from the browser's timezone.
 * Last-resort fallback when IP-based and browser geolocation both fail.
 * Maps common Brazilian timezones to their major city coordinates.
 */
export function estimateLocationFromTimezone(): GeolocationData | null {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const TIMEZONE_MAP: Record<string, { city: string; latitude: number; longitude: number }> = {
    'America/Sao_Paulo': { city: 'São Paulo', latitude: -23.55, longitude: -46.63 },
    'America/Fortaleza': { city: 'Fortaleza', latitude: -3.72, longitude: -38.52 },
    'America/Manaus': { city: 'Manaus', latitude: -3.12, longitude: -60.02 },
    'America/Recife': { city: 'Recife', latitude: -8.05, longitude: -34.87 },
    'America/Bahia': { city: 'Salvador', latitude: -12.97, longitude: -38.51 },
    'America/Cuiaba': { city: 'Cuiabá', latitude: -15.60, longitude: -56.10 },
    'America/Belem': { city: 'Belém', latitude: -1.46, longitude: -48.50 },
    'America/Porto_Velho': { city: 'Porto Velho', latitude: -8.76, longitude: -63.90 },
    'America/Rio_Branco': { city: 'Rio Branco', latitude: -9.97, longitude: -67.81 },
    'America/Araguaina': { city: 'Palmas', latitude: -10.18, longitude: -48.33 },
    'America/Campo_Grande': { city: 'Campo Grande', latitude: -20.44, longitude: -54.65 },
    'America/Maceio': { city: 'Maceió', latitude: -9.67, longitude: -35.74 },
    'America/Noronha': { city: 'Fernando de Noronha', latitude: -3.85, longitude: -32.42 },
    'America/Boa_Vista': { city: 'Boa Vista', latitude: 2.82, longitude: -60.67 },
    'America/Santarem': { city: 'Santarém', latitude: -2.44, longitude: -54.71 },
  }

  const match = TIMEZONE_MAP[tz]
  if (!match) return null

  return {
    city: match.city,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: tz,
    source: 'timezone',
  }
}

/**
 * Saves a manually-entered or auto-detected location to the user's profile.
 */
export async function saveManualLocation(
  userId: string,
  data: {
    city: string
    latitude: number
    longitude: number
    timezone?: string
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      detected_city: data.city,
      detected_latitude: data.latitude,
      detected_longitude: data.longitude,
      detected_timezone: data.timezone ?? null,
      location_source: 'manual' as const,
    })
    .eq('id', userId)

  return !error
}
