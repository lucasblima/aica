/**
 * useSpaces Hook
 *
 * Manages connection spaces with filtering and CRUD operations.
 * Supports filtering by archetype and favorite status.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { spaceService } from '../services/spaceService';
import type { ConnectionSpace, CreateSpacePayload, Archetype } from '../types';

interface UseSpacesOptions {
  archetype?: Archetype;
  autoFetch?: boolean;
}

interface UseSpacesReturn {
  spaces: ConnectionSpace[];
  loading: boolean;
  error: Error | null;
  createSpace: (payload: CreateSpacePayload) => Promise<ConnectionSpace>;
  toggleFavorite: (spaceId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing multiple connection spaces
 *
 * @example
 * ```tsx
 * const { spaces, loading, createSpace, toggleFavorite } = useSpaces({ archetype: 'habitat' });
 *
 * // Create a new space
 * await createSpace({
 *   archetype: 'habitat',
 *   name: 'My House',
 *   subtitle: 'Family home'
 * });
 *
 * // Toggle favorite
 * await toggleFavorite(spaceId);
 * ```
 */
export function useSpaces(options: UseSpacesOptions = {}): UseSpacesReturn {
  const { user } = useAuth();
  const { archetype, autoFetch = true } = options;

  const [spaces, setSpaces] = useState<ConnectionSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch spaces
  const fetchSpaces = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = archetype
        ? await spaceService.getSpacesByArchetype(archetype)
        : await spaceService.getSpaces();

      setSpaces(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching spaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, archetype]);

  // Create new space
  const createSpace = useCallback(
    async (payload: CreateSpacePayload): Promise<ConnectionSpace> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newSpace = await spaceService.createSpace(payload);

        // Add to beginning of list if it matches current filter
        if (!archetype || newSpace.archetype === archetype) {
          setSpaces((prev) => [newSpace, ...prev]);
        }

        return newSpace;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, archetype]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (spaceId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // Optimistically update UI
        setSpaces((prev) =>
          prev.map((space) =>
            space.id === spaceId
              ? { ...space, is_favorite: !space.is_favorite }
              : space
          )
        );

        await spaceService.toggleFavorite(spaceId);
      } catch (err) {
        // Revert on error
        setError(err as Error);
        await fetchSpaces();
        throw err;
      }
    },
    [user?.id, fetchSpaces]
  );

  // Refresh spaces
  const refresh = useCallback(async () => {
    await fetchSpaces();
  }, [fetchSpaces]);

  // Auto-fetch on mount and filter change
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchSpaces();
    }
  }, [autoFetch, user?.id, fetchSpaces]);

  return {
    spaces,
    loading,
    error,
    createSpace,
    toggleFavorite,
    refresh,
  };
}

export default useSpaces;
