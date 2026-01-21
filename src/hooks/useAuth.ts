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

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'
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

  // CRITICAL: Use ref to prevent double exchange attempts
  const codeExchangeAttempted = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      try {
        const code = getAuthCodeFromUrl()

        if (DEBUG) {
          log.debug('🚀 Initializing auth', {
            hasCode: !!code,
            url: window.location.pathname,
            origin: window.location.origin
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
          log.error('Error getting session:', { error: error.message })
        }

        if (isMounted) {
          setSession(existingSession)
          setUser(existingSession?.user ?? null)
          setIsLoading(false)

          if (DEBUG) {
            if (existingSession) {
              log.debug('✅ Existing session found:', existingSession.user.email)
            } else {
              log.debug('ℹ️ No existing session')
            }
          }
        }
      } catch (error) {
        log.error('Initialization error:', { error })
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (DEBUG) {
        log.debug('Auth state changed:', event)
      }
      if (isMounted) {
        setSession(newSession)
        setUser(newSession?.user ?? null)
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
      log.debug('👋 Signing out...')
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      log.error('Sign out error:', { error: error.message })
    } else {
      if (DEBUG) {
        log.debug('✅ Signed out successfully')
      }
    }
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
  }), [user, session, isLoading, signOut])

  return returnValue
}
