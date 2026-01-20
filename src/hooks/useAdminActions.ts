/**
 * useAdminActions Hook
 *
 * Provides admin actions for WhatsApp instance management.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useCallback } from 'react'
import {
  adminDisconnectInstance,
  adminResetInstanceErrors,
} from '@/services/adminWhatsAppService'
import type { AdminActionResponse } from '@/types/adminWhatsApp'

interface UseAdminActionsReturn {
  /** Disconnect an instance */
  disconnectInstance: (instanceName: string) => Promise<AdminActionResponse>
  /** Reset instance errors */
  resetInstanceErrors: (instanceName: string) => Promise<AdminActionResponse>
  /** Whether an action is in progress */
  isActioning: boolean
  /** Current action being performed */
  currentAction: string | null
  /** Action error */
  actionError: Error | null
  /** Clear action error */
  clearError: () => void
}

export function useAdminActions(): UseAdminActionsReturn {
  const [isActioning, setIsActioning] = useState(false)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<Error | null>(null)

  const disconnectInstance = useCallback(async (instanceName: string): Promise<AdminActionResponse> => {
    setIsActioning(true)
    setCurrentAction(`disconnect:${instanceName}`)
    setActionError(null)

    try {
      const result = await adminDisconnectInstance(instanceName)

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to disconnect instance')
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setActionError(error)
      return { success: false, error: error.message }
    } finally {
      setIsActioning(false)
      setCurrentAction(null)
    }
  }, [])

  const resetInstanceErrors = useCallback(async (instanceName: string): Promise<AdminActionResponse> => {
    setIsActioning(true)
    setCurrentAction(`reset:${instanceName}`)
    setActionError(null)

    try {
      const result = await adminResetInstanceErrors(instanceName)

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to reset instance errors')
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setActionError(error)
      return { success: false, error: error.message }
    } finally {
      setIsActioning(false)
      setCurrentAction(null)
    }
  }, [])

  const clearError = useCallback(() => {
    setActionError(null)
  }, [])

  return {
    disconnectInstance,
    resetInstanceErrors,
    isActioning,
    currentAction,
    actionError,
    clearError,
  }
}

export default useAdminActions
