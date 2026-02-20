/**
 * useActivationStatus Hook
 *
 * Checks if the current user has been activated via invite.
 * Used by ActivationGuard to gate access to the app.
 *
 * CRITICAL: This hook processes pending invites (from localStorage)
 * BEFORE checking activation status. This prevents a race condition
 * where ActivationGuard blocks the app before useInviteSystem can
 * process the stored invite token/code.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  checkActivationStatus,
  activateWithCode,
  processPendingInvite,
  type ActivateWithCodeResult
} from '../services/inviteSystemService';

interface UseActivationStatusReturn {
  isActivated: boolean | null; // null = loading
  loading: boolean;
  activate: (code: string) => Promise<ActivateWithCodeResult>;
  refresh: () => Promise<void>;
}

export function useActivationStatus(): UseActivationStatusReturn {
  const { user, isAuthenticated } = useAuth();
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsActivated(null);
      setLoading(false);
      return;
    }

    try {
      // Run both checks in parallel to save ~500-1000ms
      // If pending invite succeeds, use that; otherwise fall back to activation status
      const [inviteResult, statusResult] = await Promise.allSettled([
        processPendingInvite(),
        checkActivationStatus(),
      ]);

      // Prefer pending invite result if it succeeded
      if (inviteResult.status === 'fulfilled' && inviteResult.value?.success) {
        console.log('[useActivationStatus] Pending invite processed:', inviteResult.value);
        setIsActivated(true);
        setLoading(false);
        return;
      }

      // Fall back to activation status from database
      const status = statusResult.status === 'fulfilled' ? statusResult.value : null;
      setIsActivated(status?.is_activated ?? true); // Default to true if check fails
    } catch (error) {
      console.error('[useActivationStatus] Error:', error);
      setIsActivated(true); // Fail open — don't block users if check errors
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Check on mount and auth change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Activate with invite code (from WaitingRoom manual input)
  const activate = useCallback(async (code: string): Promise<ActivateWithCodeResult> => {
    const result = await activateWithCode(code);
    if (result.success) {
      setIsActivated(true);
    }
    return result;
  }, []);

  return { isActivated, loading, activate, refresh };
}

export default useActivationStatus;
