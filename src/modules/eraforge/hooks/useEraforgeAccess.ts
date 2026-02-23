/**
 * useEraforgeAccess Hook
 *
 * Checks if the current user has approved access to EraForge.
 * Used by EraForgeAccessGuard to gate entry to the module.
 *
 * Follows useActivationStatus pattern:
 * - Fail open on error (don't block if RPC doesn't exist / migration not applied)
 * - useCallback for refresh
 * - { data, error } tuple from service
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { EraforgeAccessService } from '../services/eraforgeAccessService';

export interface UseEraforgeAccessReturn {
  hasAccess: boolean | null;
  status: string | null;
  loading: boolean;
  requesting: boolean;
  requestAccess: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useEraforgeAccess(): UseEraforgeAccessReturn {
  const { user, isAuthenticated } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setHasAccess(null);
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await EraforgeAccessService.checkAccess();
      if (error || !data) {
        // Fail open — don't block if RPC doesn't exist (migration not applied)
        setHasAccess(true);
        setStatus(null);
      } else {
        setHasAccess(data.has_access);
        setStatus(data.status);
      }
    } catch {
      setHasAccess(true); // Fail open
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestAccess = useCallback(async () => {
    setRequesting(true);
    try {
      await EraforgeAccessService.requestAccess();
      await refresh();
    } finally {
      setRequesting(false);
    }
  }, [refresh]);

  return { hasAccess, status, loading, requesting, requestAccess, refresh };
}
