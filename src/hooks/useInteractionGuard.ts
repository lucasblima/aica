/**
 * useInteractionGuard Hook
 *
 * Middleware hook that enforces interaction limits before AI calls.
 * Wraps any async function with limit-checking and usage logging.
 *
 * DESIGN PRINCIPLES:
 *   1. Non-blocking on error: If billing check fails, the interaction is ALLOWED
 *      (billing should never break core AI functionality)
 *   2. Transparent: Returns current limit status for UI indicators
 *   3. Integrated: Automatically logs usage after successful interactions
 *   4. User-friendly: Shows notification when limit is reached with upgrade CTA
 *
 * @example
 * const { canInteract, remaining, guardedInvoke } = useInteractionGuard()
 *
 * // Wrap an AI call
 * const result = await guardedInvoke(
 *   () => geminiClient.call({ action: 'analyze', payload }),
 *   'analyze',
 *   'journey',
 *   'gemini-2.5-flash'
 * )
 *
 * if (result === null) {
 *   // Interaction was blocked (limit reached, no credits)
 * }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'
import {
  checkInteractionLimit,
  logInteraction,
} from '@/services/billingService'
import type { InteractionLimitResult } from '@/services/billingService'
import { notificationService } from '@/services/notificationService'

const log = createNamespacedLogger('useInteractionGuard')

// ============================================================================
// TYPES
// ============================================================================

export interface UseInteractionGuardReturn {
  /** Whether the user can perform another interaction right now */
  canInteract: boolean
  /** Number of remaining interactions (plan limit + credits) */
  remaining: number
  /** Current plan ID */
  plan: string
  /** Whether limit data is loading */
  isLoading: boolean
  /**
   * Execute an async function with interaction guard.
   *
   * 1. Checks the interaction limit
   * 2. If blocked: shows a notification and returns null
   * 3. If allowed: executes the function
   * 4. After success: logs the interaction (fire-and-forget)
   *
   * @param fn The async function to execute (your AI call)
   * @param action The action type for logging (e.g., 'chat', 'analyze', 'generate')
   * @param module The AICA module (e.g., 'atlas', 'journey', 'studio')
   * @param model The AI model used (e.g., 'gemini-2.5-flash')
   * @param tokensIn Optional input token count for logging
   * @param tokensOut Optional output token count for logging
   * @returns The function result, or null if the interaction was blocked
   */
  guardedInvoke: <T>(
    fn: () => Promise<T>,
    action: string,
    module?: string,
    model?: string,
    tokensIn?: number,
    tokensOut?: number
  ) => Promise<T | null>
  /** Manually refresh the interaction limit status */
  refreshLimit: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** How often to refresh limit status automatically (5 minutes) */
const LIMIT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/** Throttle notifications to avoid spamming the user */
const NOTIFICATION_THROTTLE_MS = 30 * 1000

// ============================================================================
// HOOK
// ============================================================================

export function useInteractionGuard(): UseInteractionGuardReturn {
  const { user } = useAuth()

  const [limitStatus, setLimitStatus] = useState<InteractionLimitResult>({
    allowed: true,
    remaining: 999,
    plan: 'free',
    resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const lastNotificationRef = useRef<number>(0)

  /**
   * Fetch current interaction limit.
   */
  const refreshLimit = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const result = await checkInteractionLimit()
      setLimitStatus(result)
    } catch (err) {
      // On error, default to allowing (billing never blocks core)
      log.warn('Falha ao verificar limite, permitindo interação:', { error: err })
      setLimitStatus(prev => ({ ...prev, allowed: true }))
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch limit on mount and periodically refresh
  useEffect(() => {
    refreshLimit()

    const intervalId = setInterval(refreshLimit, LIMIT_REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [refreshLimit])

  /**
   * Show a throttled notification when the user hits the limit.
   */
  const showLimitReachedNotification = useCallback((plan: string, resetsAt: string) => {
    const now = Date.now()
    if (now - lastNotificationRef.current < NOTIFICATION_THROTTLE_MS) {
      return // Throttled
    }
    lastNotificationRef.current = now

    const resetDate = new Date(resetsAt)
    const resetTime = resetDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    notificationService.show({
      type: 'warning',
      title: 'Limite de interacoes atingido',
      message: `Seu plano ${plan} atingiu o limite diário. Renova as ${resetTime}. Adquira créditos extras ou faca upgrade do plano.`,
      duration: 8000,
    })
  }, [])

  /**
   * Guard wrapper for AI interactions.
   */
  const guardedInvoke = useCallback(async <T>(
    fn: () => Promise<T>,
    action: string,
    module?: string,
    model?: string,
    tokensIn?: number,
    tokensOut?: number
  ): Promise<T | null> => {
    // Step 1: Check limit (fresh check, not cached state)
    let currentLimit: InteractionLimitResult
    try {
      currentLimit = await checkInteractionLimit()
      setLimitStatus(currentLimit)
    } catch (err) {
      // Billing check failed — allow the interaction anyway
      log.warn('Verificacao de limite falhou, permitindo interação:', { error: err })
      currentLimit = { allowed: true, remaining: 999, plan: 'free', resetsAt: '' }
    }

    // Step 2: If blocked, show notification and return null
    if (!currentLimit.allowed) {
      showLimitReachedNotification(currentLimit.plan, currentLimit.resetsAt)
      log.info('Interação bloqueada: limite atingido', {
        plan: currentLimit.plan,
        remaining: currentLimit.remaining,
      })
      return null
    }

    // Step 3: Execute the AI function
    const result = await fn()

    // Step 4: Log interaction (fire-and-forget, never blocks)
    logInteraction(action, module, model, tokensIn, tokensOut)
      .then(logResult => {
        if (logResult.creditDeducted) {
          log.info('Credito extra deduzido para interação', {
            remaining: logResult.remaining,
          })
        }
        // Update local state with the remaining count from the log result
        setLimitStatus(prev => ({
          ...prev,
          remaining: logResult.remaining,
          allowed: logResult.remaining > 0,
        }))
      })
      .catch(err => {
        log.warn('Falha ao registrar interação (não-bloqueante):', { error: err })
      })

    return result
  }, [showLimitReachedNotification])

  return {
    canInteract: limitStatus.allowed,
    remaining: limitStatus.remaining,
    plan: limitStatus.plan,
    isLoading,
    guardedInvoke,
    refreshLimit,
  }
}

export default useInteractionGuard
