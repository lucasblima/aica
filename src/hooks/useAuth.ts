/**
 * useAuth Hook
 * React hook for accessing authentication state with PKCE support
 *
 * Handles:
 * - Initial session retrieval from cookies
 * - OAuth PKCE code exchange on callback
 * - Auth state change subscriptions
 *
 * Enhanced with comprehensive logging for production debugging
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/services/supabaseClient'
import type { Session, User } from '@/services/supabaseClient'
import { invalidateAuthCache } from '@/services/authCacheService'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useAuth')

// Debug flag para produção - enabled by default to diagnose PKCE issues
const DEBUG = false // import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true'

/**
 * Gets the auth code from URL if present
 */
function getAuthCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('code')
}

/**
 * Cleans auth parameters from URL after processing
 */
function cleanAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

/**
 * Logs cookie state for debugging
 */
function logCookieState(context: string): void {
  if (!DEBUG) return

  const allCookies = document.cookie.split(';').map(c => c.trim())
  const authCookies = allCookies.filter(c =>
    c.startsWith('sb-') || c.includes('auth') || c.includes('code-verifier')
  )

  log.debug(`🍪 Cookies at ${context}:`, {
    total: allCookies.length,
    authRelated: authCookies.length,
    names: authCookies.map(c => c.split('=')[0])
  })
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function initializeAuth(retryCount = 0) {
      const MAX_RETRIES = 2
      const RETRY_DELAY = 200

      try {
        const code = getAuthCodeFromUrl()

        if (DEBUG) {
          log.debug('🚀 Initializing auth', {
            hasCode: !!code,
            url: window.location.pathname,
            origin: window.location.origin,
            retryCount
          })
        }

        // =============================================================
        // FIX: Let Supabase handle OAuth callback automatically
        // With detectSessionInUrl: true, Supabase processes the callback
        // and stores the session. We just need to get the session.
        // =============================================================
        if (code) {
          if (DEBUG) {
            log.debug('🔐 OAuth callback detected - letting Supabase handle it')
          }
          logCookieState('OAuth callback')
        }

        // =============================================================
        // Get session from storage (includes OAuth callback processing)
        // =============================================================
        if (DEBUG) {
          log.debug('📦 Checking for session...')
        }

        const { data: { session: existingSession }, error } = await supabase.auth.getSession()

        if (error) {
          // Handle AbortError gracefully - it's a transient error from Supabase's lock mechanism
          if (error.message?.includes('AbortError') || error.name === 'AbortError') {
            if (retryCount < MAX_RETRIES) {
              log.warn(`Auth lock aborted, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
              if (isMounted) {
                return initializeAuth(retryCount + 1)
              }
              return
            }
            log.warn('Auth initialization aborted after retries - user may need to refresh')
          } else {
            log.error('Error getting session:', { error: error.message })
          }
        }

        if (isMounted) {
          setSession(existingSession)
          setUser(existingSession?.user ?? null)
          setIsLoading(false)

          // Clean stale OAuth code from URL if exchange failed (no session despite code present)
          if (code && !existingSession) {
            cleanAuthParamsFromUrl()
          }

          if (DEBUG) {
            if (existingSession) {
              log.debug('✅ Existing session found:', existingSession.user.email)
            } else {
              log.debug('ℹ️ No existing session')
            }
          }
        }
      } catch (error: any) {
        // Handle AbortError thrown as exception
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError') || error?.message?.includes('signal is aborted')) {
          if (retryCount < MAX_RETRIES) {
            log.warn(`Auth lock aborted (exception), retrying (${retryCount + 1}/${MAX_RETRIES})...`)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
            if (isMounted) {
              return initializeAuth(retryCount + 1)
            }
            return
          }
          log.warn('Auth initialization aborted after retries - continuing without session')
        } else {
          log.error('Initialization error:', { error })
        }
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes (sign in, sign out, token refresh)
    // CRITICAL: For TOKEN_REFRESHED, only update state if the session actually changed.
    // Without this check, every tab-focus triggers TOKEN_REFRESHED → new object reference
    // → AppRouter re-renders → ContactsView unmounts → all local state (pairing code, etc.) lost.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (DEBUG) {
        log.debug('Auth state changed:', event)
      }
      if (isMounted) {
        if (event === 'TOKEN_REFRESHED') {
          // Only update if access_token or user actually changed
          setSession(prev => {
            if (prev?.access_token === newSession?.access_token &&
                prev?.user?.id === newSession?.user?.id) {
              return prev // Same reference — no re-render
            }
            return newSession
          })
          setUser(prev => {
            const newUser = newSession?.user ?? null
            if (prev?.id === newUser?.id) return prev
            return newUser
          })
        } else {
          // For SIGNED_IN, SIGNED_OUT, etc. — always update
          setSession(newSession)
          setUser(newSession?.user ?? null)
        }
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // CRITICAL: Memoize signOut to prevent unnecessary re-renders
  // Without useCallback, signOut reference changes on every render
  const signOut = useCallback(async () => {
    if (DEBUG) {
      log.debug('Signing out...')
    }
    invalidateAuthCache()
    const { error } = await supabase.auth.signOut()
    if (error) {
      log.error('Sign out error:', { error: error.message })
    } else {
      if (DEBUG) {
        log.debug('✅ Signed out successfully')
      }
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/landing` },
    })
    return { error: error?.message ?? null }
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }, [])

  // CRITICAL: Memoize return object to prevent cascading re-renders
  // Without useMemo, the entire object reference changes on every render,
  // causing all consumers to re-render even if values haven't changed.
  // This was causing the multiple initialization issue reported in #44.
  const returnValue = useMemo(() => ({
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    signInWithEmail,
    sendMagicLink,
    sendPasswordReset,
  }), [user, session, isLoading, signOut, signInWithEmail, sendMagicLink, sendPasswordReset])

  return returnValue
}
