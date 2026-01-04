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

import { useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'

// Debug flag para produção - enabled by default to diagnose PKCE issues
const DEBUG = true // import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true'

function authLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[useAuth] ${message}`, data ?? '')
  }
}

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

  console.log(`[useAuth] 🍪 Cookies at ${context}:`, {
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

        authLog('🚀 Initializing auth', {
          hasCode: !!code,
          url: window.location.pathname,
          origin: window.location.origin
        })

        // =============================================================
        // STEP 1: Handle OAuth callback (ONLY if code exists and not yet attempted)
        // =============================================================
        if (code && !codeExchangeAttempted.current) {
          // Mark as attempted IMMEDIATELY to prevent race conditions
          codeExchangeAttempted.current = true

          authLog('🔐 OAuth callback detected')
          authLog('Code (first 10 chars):', code.substring(0, 10) + '...')

          logCookieState('before exchange')

          try {
            authLog('🔄 Calling exchangeCodeForSession...')

            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
              console.error('[useAuth] ❌ PKCE code exchange failed:', error.message)
              console.error('[useAuth] Error details:', {
                name: error.name,
                status: (error as any).status,
                message: error.message
              })

              logCookieState('after failed exchange')

              // Provide helpful hints based on error
              if (error.message.includes('code_verifier')) {
                console.error('[useAuth] 💡 Possible causes:')
                console.error('  1. Code was already used (browser back/forward)')
                console.error('  2. Multiple Supabase client instances')
                console.error('  3. Cookie storage adapter misconfigured')
                console.error('  4. Code expired (>5 min since authorization)')
              }

              cleanAuthParamsFromUrl()
            } else if (data.session) {
              authLog('✅ PKCE code exchange successful!')
              authLog('User:', data.session.user.email)

              if (isMounted) {
                setSession(data.session)
                setUser(data.session.user)
                setIsLoading(false)
              }

              cleanAuthParamsFromUrl()
              return // Early return, session is set
            }
          } catch (exchangeError) {
            console.error('[useAuth] ❌ Exception during code exchange:', exchangeError)
            if (exchangeError instanceof Error) {
              console.error('[useAuth] Stack:', exchangeError.stack)
            }
            cleanAuthParamsFromUrl()
          }
        }

        // =============================================================
        // STEP 2: Get existing session from storage (no OAuth callback)
        // =============================================================
        authLog('📦 Checking for existing session...')

        const { data: { session: existingSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[useAuth] Error getting session:', error.message)
        }

        if (isMounted) {
          setSession(existingSession)
          setUser(existingSession?.user ?? null)
          setIsLoading(false)

          if (existingSession) {
            authLog('✅ Existing session found:', existingSession.user.email)
          } else {
            authLog('ℹ️ No existing session')
          }
        }
      } catch (error) {
        console.error('[useAuth] Initialization error:', error)
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
      authLog('Auth state changed:', event)
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

  const signOut = async () => {
    authLog('👋 Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[useAuth] Sign out error:', error.message)
    } else {
      authLog('✅ Signed out successfully')
    }
  }

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  }
}
