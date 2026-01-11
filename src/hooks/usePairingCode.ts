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
  expiresAt: string
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Calcular tempo restante
  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(0)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      setSecondsRemaining(remaining)

      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [expiresAt])

  const generateCode = useCallback(async (phoneNumber: string): Promise<PairingCodeResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Usuário não autenticado')
      }

      const response = await supabase.functions.invoke('generate-pairing-code', {
        body: { phoneNumber },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Falha ao gerar código de pareamento')
      }

      const result = response.data as {
        success: boolean
        code?: string
        expiresAt?: string
        error?: string
      }

      if (!result.success || !result.code) {
        throw new Error(result.error || 'Falha ao gerar código de pareamento')
      }

      // Formatar código para exibição (XXXX-XXXX)
      const formattedCode = result.code.includes('-')
        ? result.code
        : `${result.code.slice(0, 4)}-${result.code.slice(4)}`

      setCode(formattedCode)
      setExpiresAt(result.expiresAt || new Date(Date.now() + 60000).toISOString())

      return {
        code: formattedCode,
        expiresAt: result.expiresAt || '',
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
