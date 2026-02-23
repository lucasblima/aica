/**
 * useEntityInventory — Load and manage inventory for a persona
 */

import { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  InventoryService,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type InventoryFilters,
} from '../services/inventoryService';
import type { InventoryItem } from '../types/liferpg';

const log = createNamespacedLogger('useEntityInventory');

interface UseEntityInventoryOptions {
  personaId?: string;
  autoLoad?: boolean;
}

interface UseEntityInventoryReturn {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
  setFilters: (filters: InventoryFilters) => void;
  stats: {
    totalItems: number;
    totalValue: number;
    lowConditionCount: number;
    categories: string[];
    locations: string[];
  };
  reload: () => Promise<void>;
  createItem: (input: Omit<CreateInventoryItemInput, 'persona_id'>) => Promise<boolean>;
  updateItem: (itemId: string, input: UpdateInventoryItemInput) => Promise<boolean>;
  deleteItem: (itemId: string, itemName: string) => Promise<boolean>;
}

export function useEntityInventory({
  personaId,
  autoLoad = true,
}: UseEntityInventoryOptions = {}): UseEntityInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowConditionCount: 0,
    categories: [] as string[],
    locations: [] as string[],
  });

  const loadItems = useCallback(async () => {
    if (!personaId) return;
    setLoading(true);
    setError(null);

    try {
      const [itemsResult, statsResult] = await Promise.all([
        InventoryService.getItems(personaId, filters),
        InventoryService.getStats(personaId),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      setItems(itemsResult.data || []);
      setStats(statsResult);
    } catch (err) {
      log.error('Failed to load inventory', { err });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [personaId, filters]);

  const createItem = useCallback(
    async (input: Omit<CreateInventoryItemInput, 'persona_id'>): Promise<boolean> => {
      if (!personaId) return false;
      const { data, error: createError } = await InventoryService.createItem({
        ...input,
        persona_id: personaId,
      });
      if (createError || !data) return false;
      setItems((prev) => [data, ...prev]);
      // Reload stats
      InventoryService.getStats(personaId)
        .then(setStats)
        .catch((err) => log.error('Failed to refresh stats', { err }));
      return true;
    },
    [personaId]
  );

  const updateItem = useCallback(
    async (itemId: string, input: UpdateInventoryItemInput): Promise<boolean> => {
      const { data, error: updateError } = await InventoryService.updateItem(itemId, input);
      if (updateError || !data) return false;
      setItems((prev) => prev.map((i) => (i.id === itemId ? data : i)));
      return true;
    },
    []
  );

  const deleteItem = useCallback(
    async (itemId: string, itemName: string): Promise<boolean> => {
      if (!personaId) return false;
      const { success } = await InventoryService.deleteItem(itemId, personaId, itemName);
      if (success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        InventoryService.getStats(personaId)
          .then(setStats)
          .catch((err) => log.error('Failed to refresh stats', { err }));
      }
      return success;
    },
    [personaId]
  );

  useEffect(() => {
    if (autoLoad && personaId) {
      loadItems();
    }
  }, [autoLoad, personaId, loadItems]);

  return {
    items,
    loading,
    error,
    filters,
    setFilters,
    stats,
    reload: loadItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
