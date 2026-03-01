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
          setError('Nao foi possivel autenticar com o Telegram')
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
          setError(err instanceof Error ? err.message : 'Erro de autenticacao')
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
