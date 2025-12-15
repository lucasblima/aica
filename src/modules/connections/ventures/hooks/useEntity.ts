import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { entityService } from '../services';
import type { VenturesEntity, CreateEntityPayload, UpdateEntityPayload } from '../types';

interface UseEntityReturn {
  entity: VenturesEntity | null;
  loading: boolean;
  error: Error | null;
  updateEntity: (payload: UpdateEntityPayload) => Promise<VenturesEntity>;
  deleteEntity: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing a single ventures entity
 *
 * @example
 * ```tsx
 * const { entity, loading, updateEntity } = useEntity(entityId);
 * ```
 */
export function useEntity(entityId: string | undefined): UseEntityReturn {
  const { user } = useAuth();
  const [entity, setEntity] = useState<VenturesEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch entity
  const fetchEntity = useCallback(async () => {
    if (!user?.id || !entityId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await entityService.getEntityById(entityId);
      setEntity(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching entity:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Update entity
  const updateEntity = useCallback(
    async (payload: UpdateEntityPayload): Promise<VenturesEntity> => {
      if (!user?.id || !entityId) throw new Error('User not authenticated or entity ID missing');

      try {
        setLoading(true);
        setError(null);

        const updatedEntity = await entityService.updateEntity(entityId, payload);
        setEntity(updatedEntity);

        return updatedEntity;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, entityId]
  );

  // Delete entity
  const deleteEntity = useCallback(async (): Promise<void> => {
    if (!user?.id || !entityId) throw new Error('User not authenticated or entity ID missing');

    try {
      setLoading(true);
      setError(null);

      await entityService.deleteEntity(entityId);
      setEntity(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, entityId]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchEntity();
  }, [fetchEntity]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && entityId) {
      fetchEntity();
    }
  }, [user?.id, entityId, fetchEntity]);

  return {
    entity,
    loading,
    error,
    updateEntity,
    deleteEntity,
    refresh,
  };
}

interface UseEntitiesBySpaceReturn {
  entities: VenturesEntity[];
  loading: boolean;
  error: Error | null;
  createEntity: (payload: CreateEntityPayload) => Promise<VenturesEntity>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing all entities in a space
 *
 * @example
 * ```tsx
 * const { entities, loading, createEntity } = useEntitiesBySpace(spaceId);
 * ```
 */
export function useEntitiesBySpace(spaceId: string | undefined): UseEntitiesBySpaceReturn {
  const { user } = useAuth();
  const [entities, setEntities] = useState<VenturesEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch entities
  const fetchEntities = useCallback(async () => {
    if (!user?.id || !spaceId) {
      setEntities([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await entityService.getEntitiesBySpace(spaceId);
      // Ensure we always set an array, even if API returns null/undefined
      setEntities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching entities:', err);
      // On error, ensure entities is still a valid empty array
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId]);

  // Create entity
  const createEntity = useCallback(
    async (payload: CreateEntityPayload): Promise<VenturesEntity> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newEntity = await entityService.createEntity(payload);
        setEntities((prev) => [newEntity, ...prev]);

        return newEntity;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await fetchEntities();
  }, [fetchEntities]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id && spaceId) {
      fetchEntities();
    }
  }, [user?.id, spaceId, fetchEntities]);

  return {
    entities,
    loading,
    error,
    createEntity,
    refresh,
  };
}
