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
      location_city: data.city,
      location_lat: data.latitude,
      location_lng: data.longitude,
      location_timezone: data.timezone ?? null,
      location_source: 'manual' as const,
    })
    .eq('id', userId)

  return !error
}
