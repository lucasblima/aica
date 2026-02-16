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
      // STEP 1: Process any pending invite from localStorage FIRST
      // This handles the case where user entered a code on the landing page
      // or clicked an invite link, then logged in.
      const pendingResult = await processPendingInvite();
      if (pendingResult?.success) {
        console.log('[useActivationStatus] Pending invite processed:', pendingResult);
        setIsActivated(true);
        setLoading(false);
        return;
      }

      // STEP 2: Check activation status from database
      const status = await checkActivationStatus();
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
