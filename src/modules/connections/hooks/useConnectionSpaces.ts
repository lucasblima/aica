import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import * as spaceService from '../services/connectionSpaceService';
import type {
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useConnectionSpaces');
  ConnectionSpace,
  CreateSpacePayload,
  UpdateSpacePayload,
  Archetype
} from '../types';

/**
 * Options for configuring the useConnectionSpaces hook.
 */
interface UseConnectionSpacesOptions {
  /** Optional archetype filter to only fetch spaces of a specific type */
  archetype?: Archetype;
  /** Whether to automatically fetch spaces on mount (default: true) */
  autoFetch?: boolean;
}

/**
 * Return type for the useConnectionSpaces hook.
 * Provides spaces data, loading state, and CRUD operations.
 */
interface UseConnectionSpacesReturn {
  spaces: ConnectionSpace[];
  isLoading: boolean;
  error: Error | null;

  // CRUD operations
  create: (input: CreateSpacePayload) => Promise<ConnectionSpace>;
  update: (spaceId: string, input: UpdateSpacePayload) => Promise<ConnectionSpace>;
  remove: (spaceId: string) => Promise<void>;
  toggleFavorite: (spaceId: string, isFavorite: boolean) => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
  getById: (spaceId: string) => ConnectionSpace | undefined;
  getByArchetype: (archetype: Archetype) => ConnectionSpace[];

  // Computed
  favorites: ConnectionSpace[];
  byArchetype: Record<Archetype, ConnectionSpace[]>;
  totalCount: number;
}

/**
 * React hook for managing connection spaces.
 * Provides CRUD operations, computed values, and automatic caching.
 *
 * Features:
 * - Automatic fetching on mount (configurable)
 * - Optimistic UI updates
 * - Filtering by archetype
 * - Computed favorites and archetype grouping
 * - Error handling and loading states
 *
 * @param options - Configuration options
 * @param options.archetype - Filter spaces by archetype (optional)
 * @param options.autoFetch - Auto-fetch on mount (default: true)
 * @returns Object containing spaces, operations, and computed values
 *
 * @example
 * // Fetch all spaces
 * const { spaces, isLoading, create, refresh } = useConnectionSpaces();
 *
 * @example
 * // Fetch only habitat spaces
 * const { spaces, favorites, byArchetype } = useConnectionSpaces({
 *   archetype: 'habitat'
 * });
 *
 * @example
 * // Create a new space
 * const { create } = useConnectionSpaces();
 * const newSpace = await create({
 *   name: 'My Apartment',
 *   archetype: 'habitat',
 *   description: 'Shared living expenses'
 * });
 *
 * @example
 * // Update and delete operations
 * const { update, remove, toggleFavorite } = useConnectionSpaces();
 * await update('space-123', { name: 'Updated Name' });
 * await toggleFavorite('space-123', true);
 * await remove('space-456');
 */
export function useConnectionSpaces(
  options: UseConnectionSpacesOptions = {}
): UseConnectionSpacesReturn {
  const { archetype, autoFetch = true } = options;
  const { user } = useAuth();

  const [spaces, setSpaces] = useState<ConnectionSpace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpaces = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = archetype
        ? await spaceService.getConnectionSpacesByArchetype(user.id, archetype)
        : await spaceService.getConnectionSpaces(user.id);
      setSpaces(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch spaces'));
      log.error('[useConnectionSpaces] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, archetype]);

  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchSpaces();
    }
  }, [autoFetch, user?.id, fetchSpaces]);

  const create = useCallback(async (input: CreateSpacePayload) => {
    if (!user?.id) throw new Error('User not authenticated');

    const newSpace = await spaceService.createConnectionSpace(user.id, input);
    setSpaces(prev => [newSpace, ...prev]);
    return newSpace;
  }, [user?.id]);

  const update = useCallback(async (spaceId: string, input: UpdateSpacePayload) => {
    const updatedSpace = await spaceService.updateConnectionSpace(spaceId, input);
    setSpaces(prev => prev.map(s => s.id === spaceId ? updatedSpace : s));
    return updatedSpace;
  }, []);

  const remove = useCallback(async (spaceId: string) => {
    await spaceService.deleteConnectionSpace(spaceId);
    setSpaces(prev => prev.filter(s => s.id !== spaceId));
  }, []);

  const toggleFavoriteHandler = useCallback(async (spaceId: string, isFavorite: boolean) => {
    await spaceService.toggleFavorite(spaceId, isFavorite);
    setSpaces(prev => prev.map(s =>
      s.id === spaceId ? { ...s, is_favorite: isFavorite } : s
    ));
  }, []);

  const getById = useCallback((spaceId: string) => {
    return spaces.find(s => s.id === spaceId);
  }, [spaces]);

  const getByArchetypeFilter = useCallback((arch: Archetype) => {
    return spaces.filter(s => s.archetype === arch);
  }, [spaces]);

  // Computed values
  const favorites = useMemo(() =>
    spaces.filter(s => s.is_favorite),
    [spaces]
  );

  const byArchetype = useMemo(() => ({
    habitat: spaces.filter(s => s.archetype === 'habitat'),
    ventures: spaces.filter(s => s.archetype === 'ventures'),
    academia: spaces.filter(s => s.archetype === 'academia'),
    tribo: spaces.filter(s => s.archetype === 'tribo'),
  }), [spaces]);

  return {
    spaces,
    isLoading,
    error,
    create,
    update,
    remove,
    toggleFavorite: toggleFavoriteHandler,
    refresh: fetchSpaces,
    getById,
    getByArchetype: getByArchetypeFilter,
    favorites,
    byArchetype,
    totalCount: spaces.length,
  };
}

export default useConnectionSpaces;
