/**
 * Auth Cache Service
 *
 * Deduplicates concurrent calls to supabase.auth.getSession() and getUser().
 *
 * Problem: When the app loads, many hooks simultaneously call getSession/getUser,
 * each acquiring the Supabase auth lock. This causes lock contention warnings:
 *   "Lock was not released within 5000ms"
 *   "Lock broken by another request with the 'steal' option"
 *
 * Solution: Cache the in-flight promise so concurrent callers share one request.
 * Results are cached for a short TTL (2s) to avoid stale data while preventing
 * lock storms on page load.
 *
 * Issues: #602, #603
 */

import { supabase } from '@/services/supabaseClient'
import type { Session, User } from '@/services/supabaseClient'

const CACHE_TTL_MS = 2000

// --- getSession cache ---
let sessionPromise: Promise<{ session: Session | null; error: Error | null }> | null = null
let sessionCacheTime = 0

/**
 * Cached version of supabase.auth.getSession().
 * Concurrent calls within CACHE_TTL_MS share one request.
 */
export async function getCachedSession(): Promise<{ session: Session | null; error: Error | null }> {
  const now = Date.now()

  if (sessionPromise && now - sessionCacheTime < CACHE_TTL_MS) {
    return sessionPromise
  }

  sessionCacheTime = now
  sessionPromise = supabase.auth.getSession().then(
    ({ data, error }) => ({
      session: data.session,
      error: error as Error | null,
    }),
    (err) => ({
      session: null,
      error: err instanceof Error ? err : new Error(String(err)),
    })
  )

  // Clear cache after TTL so next batch gets fresh data
  sessionPromise.finally(() => {
    setTimeout(() => {
      if (sessionCacheTime === now) {
        sessionPromise = null
      }
    }, CACHE_TTL_MS)
  })

  return sessionPromise
}

// --- getUser cache ---
let userPromise: Promise<{ user: User | null; error: Error | null }> | null = null
let userCacheTime = 0

/**
 * Cached version of supabase.auth.getUser().
 * Concurrent calls within CACHE_TTL_MS share one request.
 */
export async function getCachedUser(): Promise<{ user: User | null; error: Error | null }> {
  const now = Date.now()

  if (userPromise && now - userCacheTime < CACHE_TTL_MS) {
    return userPromise
  }

  userCacheTime = now
  userPromise = supabase.auth.getUser().then(
    ({ data, error }) => ({
      user: data.user,
      error: error as Error | null,
    }),
    (err) => ({
      user: null,
      error: err instanceof Error ? err : new Error(String(err)),
    })
  )

  // Clear cache after TTL
  userPromise.finally(() => {
    setTimeout(() => {
      if (userCacheTime === now) {
        userPromise = null
      }
    }, CACHE_TTL_MS)
  })

  return userPromise
}

/**
 * Invalidate both caches immediately (e.g., on sign-out).
 */
export function invalidateAuthCache(): void {
  sessionPromise = null
  userPromise = null
  sessionCacheTime = 0
  userCacheTime = 0
}
