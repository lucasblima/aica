/**
 * Lógica de retry padronizada para chamadas ao Gemini
 *
 * Implementa exponential backoff e lida com rate limiting
 */

import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('GeminiRetry')

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  onRetry: () => {},
}

/**
 * Executa uma função com retry automático
 *
 * @example
 * ```ts
 * const result = await callWithRetry(
 *   () => fetch('/api/gemini'),
 *   { maxRetries: 3 }
 * )
 * ```
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Se for o último attempt, lançar erro
      if (attempt === opts.maxRetries - 1) {
        break
      }

      // Verificar se erro é recuperável
      if (!isRetryableError(error)) {
        throw error
      }

      // Calcular delay com exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt),
        opts.maxDelay
      )

      // Callback de retry
      opts.onRetry(attempt + 1, lastError)

      // Aguardar antes de tentar novamente
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Determina se um erro é recuperável com retry
 */
function isRetryableError(error: any): boolean {
  // Erro de rede
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true
  }

  // Rate limiting (429)
  if (error.statusCode === 429) {
    return true
  }

  // Erros de servidor (500-599)
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true
  }

  // Timeout
  if (error.name === 'TimeoutError') {
    return true
  }

  return false
}

/**
 * Utilitário para aguardar um tempo em ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry específico para rate limiting
 * Aguarda o tempo sugerido no header Retry-After
 */
export async function retryAfterRateLimit<T>(
  fn: () => Promise<T>,
  retryAfterSeconds?: number
): Promise<T> {
  const delay = (retryAfterSeconds || 60) * 1000

  log.warn(`Rate limited. Retrying after ${retryAfterSeconds}s...`)

  await sleep(delay)

  return fn()
}
