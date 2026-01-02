/**
 * useAuth Hook
 * React hook for accessing authentication state with PKCE support
 *
 * Handles:
 * - Initial session retrieval from cookies
 * - OAuth PKCE code exchange on callback
 * - Auth state change subscriptions
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

/**
 * Checks if the current URL contains an OAuth callback code
 */
function hasAuthCodeInUrl(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('code')
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const codeExchangeAttempted = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      try {
        // Step 1: Check if this is an OAuth callback with a code
        // PKCE flow: The authorization server returns a 'code' that must be
        // exchanged for tokens using the stored 'code_verifier'
        if (hasAuthCodeInUrl() && !codeExchangeAttempted.current) {
          codeExchangeAttempted.current = true
          console.log('[useAuth] OAuth callback detected, exchanging code for session...')

          try {
            // exchangeCodeForSession uses the code_verifier stored in cookies
            // to complete the PKCE exchange
            const { data, error } = await supabase.auth.exchangeCodeForSession(
              new URLSearchParams(window.location.search).get('code')!
            )

            if (error) {
              console.error('[useAuth] PKCE code exchange failed:', error.message)
              // Clean URL even on error to prevent retry loops
              cleanAuthParamsFromUrl()
            } else if (data.session) {
              console.log('[useAuth] PKCE code exchange successful')
              if (isMounted) {
                setSession(data.session)
                setUser(data.session.user)
                setIsLoading(false)
              }
              // Clean the URL after successful exchange
              cleanAuthParamsFromUrl()
              return // Early return, session is set
            }
          } catch (exchangeError) {
            console.error('[useAuth] Error during code exchange:', exchangeError)
            cleanAuthParamsFromUrl()
          }
        }

        // Step 2: Get existing session from storage (cookies)
        const { data: { session: existingSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[useAuth] Error getting session:', error.message)
        }

        if (isMounted) {
          setSession(existingSession)
          setUser(existingSession?.user ?? null)
          setIsLoading(false)
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
      console.log('[useAuth] Auth state changed:', event)
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

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
  }
}
