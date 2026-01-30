/**
 * usePairingCode Hook
 *
 * Hook para gerenciar geração e estado do código de pareamento WhatsApp.
 *
 * @example
 * const { generateCode, code, isLoading, error } = usePairingCode()
 * await generateCode('5511987654321')
 *
 * Issue: #87
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'

interface PairingCodeResult {
  code: string
  expiresAt: string | null
}

interface UsePairingCodeReturn {
  /** Gera novo código de pareamento */
  generateCode: (phoneNumber: string) => Promise<PairingCodeResult | null>
  /** Indica se está gerando código */
  isLoading: boolean
  /** Mensagem de erro, se houver */
  error: string | null
  /** Código de pareamento atual */
  code: string | null
  /** Timestamp de expiração do código */
  expiresAt: string | null
  /** Segundos restantes até expiração */
  secondsRemaining: number
  /** Indica se o código expirou */
  isExpired: boolean
  /** Limpa o erro atual */
  clearError: () => void
  /** Limpa o código e reseta estado */
  reset: () => void
}

export function usePairingCode(): UsePairingCodeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const expiredCallbackFired = useRef<boolean>(false)

  // Calculate time remaining with server time correction
  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(0)
      return
    }

    const updateTimer = () => {
      // Use server-corrected time to avoid clock desync issues
      const correctedNow = Date.now() + serverTimeOffset
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiry - correctedNow) / 1000))
      setSecondsRemaining(remaining)

      // F7: Fire expiration callback once when timer reaches zero
      if (remaining <= 0 && code && !expiredCallbackFired.current) {
        expiredCallbackFired.current = true
        // Dispatch custom event for components to handle expiration
        window.dispatchEvent(new CustomEvent('pairing-code-expired', {
          detail: { code }
        }))
      }

      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    // Reset expiration callback flag when new code is set
    expiredCallbackFired.current = false

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [expiresAt, serverTimeOffset, code])

  const generateCode = useCallback(async (phoneNumber: string): Promise<PairingCodeResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      let accessToken: string | null = null

      // STEP 1: Always try refresh first to get a fresh token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshData?.session?.access_token) {
        // Refresh succeeded, use the new token
        accessToken = refreshData.session.access_token
      } else if (refreshError) {
        // STEP 2: Refresh failed - determine if it's a network error or auth error
        const errorMessage = refreshError.message?.toLowerCase() || ''
        const isNetworkError =
          errorMessage.includes('network') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('networkerror') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection')

        if (!isNetworkError) {
          // Auth error (invalid refresh token, session revoked, etc.) - force re-login
          throw new Error('Sessão expirada. Por favor, faça login novamente.')
        }

        // Network error - check if cached session is still valid with buffer
        const { data: { session: cachedSession } } = await supabase.auth.getSession()

        if (cachedSession?.access_token && cachedSession?.expires_at) {
          const expiresAtMs = cachedSession.expires_at * 1000 // Convert to milliseconds
          const now = Date.now()
          const bufferMs = 60 * 1000 // 1 minute buffer for safety

          if (expiresAtMs > now + bufferMs) {
            // Token is valid with sufficient buffer, safe to use
            accessToken = cachedSession.access_token
          } else {
            // Token is expired or expiring too soon
            throw new Error('Sessão expirada. Por favor, faça login novamente.')
          }
        } else {
          // No cached session available
          throw new Error('Não foi possível autenticar. Verifique sua conexão ou faça login novamente.')
        }
      } else {
        // No refresh error but also no session - user not authenticated
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.')
      }

      // STEP 3: Verify we have a valid token before proceeding
      if (!accessToken) {
        throw new Error('Não foi possível obter token de autenticação. Faça login novamente.')
      }

      // CRITICAL FIX: @supabase/ssr with cookie-based auth does NOT automatically
      // include user JWT in Edge Function calls. We MUST pass it explicitly.
      // Without this, the request is sent with only the anon key (role: "anon")
      // and the Edge Function returns 401 Unauthorized.
      const response = await supabase.functions.invoke('generate-pairing-code', {
        body: { phoneNumber },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Falha ao gerar código de pareamento')
      }

      const result = response.data as {
        success: boolean
        code?: string
        expiresAt?: string
        serverTime?: string
        error?: string
      }

      if (!result.success || !result.code) {
        throw new Error(result.error || 'Falha ao gerar código de pareamento')
      }

      // Calculate server-client time offset for accurate countdown
      if (result.serverTime) {
        const serverNow = new Date(result.serverTime).getTime()
        const clientNow = Date.now()
        const offset = serverNow - clientNow
        setServerTimeOffset(offset)

        // Log significant clock skew for debugging
        if (Math.abs(offset) > 5000) {
          console.warn(`[usePairingCode] Clock skew detected: ${Math.round(offset / 1000)}s`)
        }
      }

      // Formatar código para exibição (XXXX-XXXX)
      const formattedCode = result.code.includes('-')
        ? result.code
        : `${result.code.slice(0, 4)}-${result.code.slice(4)}`

      setCode(formattedCode)
      setExpiresAt(result.expiresAt || new Date(Date.now() + 60000).toISOString())

      return {
        code: formattedCode,
        expiresAt: result.expiresAt ?? null,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setCode(null)
    setExpiresAt(null)
    setError(null)
    setSecondsRemaining(0)
    setServerTimeOffset(0)
    expiredCallbackFired.current = false
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    generateCode,
    isLoading,
    error,
    code,
    expiresAt,
    secondsRemaining,
    isExpired: secondsRemaining === 0 && code !== null,
    clearError,
    reset,
  }
}

export default usePairingCode
