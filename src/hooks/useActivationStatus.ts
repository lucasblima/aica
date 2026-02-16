/**
 * useActivationStatus Hook
 *
 * Checks if the current user has been activated via invite.
 * Used by ActivationGuard to gate access to the app.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  checkActivationStatus,
  activateWithCode,
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

  // Activate with invite code
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
