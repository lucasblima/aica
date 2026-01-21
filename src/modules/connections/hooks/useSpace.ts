/**
 * useSpace Hook
 *
 * Manages a single connection space with CRUD operations.
 * Includes members data and update/delete functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { spaceService } from '../services/spaceService';
import type { ConnectionSpace, UpdateSpacePayload, ConnectionMember } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useSpace');

interface UseSpaceReturn {
  space: (ConnectionSpace & { members: ConnectionMember[] }) | null;
  loading: boolean;
  error: Error | null;
  updateSpace: (payload: UpdateSpacePayload) => Promise<ConnectionSpace>;
  deleteSpace: () => Promise<void>;
  updateLastAccessed: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing a single connection space
 *
 * @example
 * ```tsx
 * const { space, loading, updateSpace, deleteSpace } = useSpace(spaceId);
 *
 * // Update space
 * await updateSpace({
 *   name: 'Updated Name',
 *   description: 'New description'
 * });
 *
 * // Delete space
 * await deleteSpace();
 * ```
 */
export function useSpace(spaceId: string | undefined): UseSpaceReturn {
  const { user } = useAuth();
  const [space, setSpace] = useState<(ConnectionSpace & { members: ConnectionMember[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch space
  const fetchSpace = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await spaceService.getSpaceById(spaceId);
      setSpace(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching space:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId]);

  // Update space
  const updateSpace = useCallback(
    async (payload: UpdateSpacePayload): Promise<ConnectionSpace> => {
      if (!user?.id || !spaceId) throw new Error('User not authenticated or space ID missing');

      try {
        setLoading(true);
        setError(null);

        const updatedSpace = await spaceService.updateSpace(spaceId, payload);

        // Update local state
        if (space) {
          setSpace({
            ...space,
            ...updatedSpace,
          });
        }

        return updatedSpace;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId, space]
  );

  // Delete space
  const deleteSpace = useCallback(async (): Promise<void> => {
    if (!user?.id || !spaceId) throw new Error('User not authenticated or space ID missing');

    try {
      setLoading(true);
      setError(null);

      await spaceService.deleteSpace(spaceId);
      setSpace(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId]);

  // Update last accessed timestamp
  const updateLastAccessed = useCallback(async (): Promise<void> => {
    if (!spaceId) return;

    try {
      await spaceService.updateLastAccessed(spaceId);
    } catch (err) {
      log.error('Error updating last accessed:', err);
      // Don't throw - this is a background operation
    }
  }, [spaceId]);

  // Refresh space
  const refresh = useCallback(async () => {
    await fetchSpace();
  }, [fetchSpace]);

  // Auto-fetch on mount and when spaceId changes
  useEffect(() => {
    if (user?.id && spaceId) {
      fetchSpace();
    }
  }, [user?.id, spaceId, fetchSpace]);

  // Update last accessed when component mounts
  useEffect(() => {
    if (user?.id && spaceId && space) {
      updateLastAccessed();
    }
  }, [user?.id, spaceId, space, updateLastAccessed]);

  return {
    space,
    loading,
    error,
    updateSpace,
    deleteSpace,
    updateLastAccessed,
    refresh,
  };
}

export default useSpace;
