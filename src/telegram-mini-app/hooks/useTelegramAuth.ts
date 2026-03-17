// src/telegram-mini-app/hooks/useTelegramAuth.ts
import { useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  authenticateMiniApp,
  type AuthResult,
  type MiniAppUser,
} from '../services/miniAppAuthService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * NOTE: This file intentionally uses `createClient` from `@supabase/supabase-js`
 * instead of the project-standard `@supabase/ssr` client (`src/services/supabaseClient.ts`).
 *
 * Reason: The Telegram Mini App authenticates via Telegram initData, NOT browser
 * cookies or OAuth/PKCE. The Edge Function `telegram-mini-app-auth` validates the
 * initData and returns a JWT session_token. We inject that token as a static
 * Authorization header — a pattern supported by `@supabase/supabase-js` but not
 * by `@supabase/ssr`'s `createBrowserClient`, which manages its own cookie-based
 * auth state internally. Using the SSR client here would trigger unnecessary cookie
 * cleanup, PKCE listeners, and auth state conflicts.
 */

interface UseTelegramAuthReturn {
  isLoading: boolean
  isLinked: boolean
  user: MiniAppUser | null
  telegramUser: AuthResult['telegram_user'] | null
  supabase: SupabaseClient | null
  error: string | null
}

/**
 * Authenticates via Telegram initData, resolves linked AICA user,
 * and returns a Supabase client configured with the session JWT.
 */
export function useTelegramAuth(): UseTelegramAuthReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isLinked, setIsLinked] = useState(false)
  const [user, setUser] = useState<MiniAppUser | null>(null)
  const [telegramUser, setTelegramUser] = useState<AuthResult['telegram_user'] | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const result = await authenticateMiniApp()

        if (cancelled) return

        if (!result) {
          setError('Não foi possível autenticar com o Telegram')
          setIsLoading(false)
          return
        }

        if (result.linked && result.session_token && result.user) {
          // Create Supabase client with session JWT for RLS
          const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: `Bearer ${result.session_token}`,
              },
            },
          })
          setSupabase(client)
          setUser(result.user)
          setIsLinked(true)
        } else {
          setTelegramUser(result.telegram_user || null)
          setIsLinked(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro de autenticação')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  return { isLoading, isLinked, user, telegramUser, supabase, error }
}
