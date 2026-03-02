/**
 * useUserLocation Hook
 *
 * Resolves the authenticated user's location through a cascade:
 * 1. Check the profiles table for a previously stored location
 * 2. If not found, auto-detect from IP via the Edge Function
 *
 * The result is cached for 24 hours to avoid repeated lookups.
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'
import { detectLocationFromIp } from '@/services/geolocationService'
import type { GeolocationData } from '@/lib/external-api'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

/**
 * Attempts to load location from the profiles table first,
 * then falls back to IP-based detection.
 */
async function resolveLocation(userId: string): Promise<GeolocationData | null> {
  // 1. Check profiles table for stored location
  const { data: profile } = await supabase
    .from('profiles')
    .select('location_city, location_lat, location_lng, location_timezone, location_source')
    .eq('id', userId)
    .single()

  if (profile?.location_lat && profile?.location_lng) {
    return {
      city: profile.location_city ?? '',
      latitude: profile.location_lat,
      longitude: profile.location_lng,
      timezone: profile.location_timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: (profile.location_source as GeolocationData['source']) ?? 'manual',
    }
  }

  // 2. Fall back to IP-based detection
  const ipLocation = await detectLocationFromIp()
  return ipLocation
}

export function useUserLocation() {
  const { user } = useAuth()

  const { data: location = null, isLoading, error } = useQuery({
    queryKey: ['user-location', user?.id],
    queryFn: () => resolveLocation(user!.id),
    enabled: !!user?.id,
    staleTime: ONE_DAY_MS,
    gcTime: SEVEN_DAYS_MS,
    retry: 1,
  })

  return {
    location,
    hasLocation: !!location,
    isLoading,
    error,
  }
}
