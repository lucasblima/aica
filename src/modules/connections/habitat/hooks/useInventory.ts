/**
 * HABITAT INVENTORY HOOK
 * React hook for managing inventory items
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getInventoryByProperty,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getWarrantyAlerts,
  getInventoryByCategory,
  getInventoryByStatus,
  searchInventory,
} from '../services/inventoryService';
import type {
  InventoryItem,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  WarrantyAlert,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useInventory');

interface UseInventoryReturn {
  items: InventoryItem[];
  loading: boolean;
  error: Error | null;
  refreshInventory: () => Promise<void>;
  createItem: (payload: CreateInventoryItemPayload) => Promise<InventoryItem>;
  updateItem: (payload: UpdateInventoryItemPayload) => Promise<InventoryItem>;
  deleteItem: (itemId: string) => Promise<void>;
  filterByCategory: (category: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;
  searchItems: (searchTerm: string) => Promise<void>;
  clearFilters: () => Promise<void>;
}

/**
 * Hook to manage inventory for a property
 */
export function useInventory(propertyId: string): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshInventory = useCallback(async () => {
    if (!propertyId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryByProperty(propertyId);
      setItems(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const createItem = useCallback(
    async (payload: CreateInventoryItemPayload) => {
      const newItem = await createInventoryItem(payload);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  const updateItem = useCallback(async (payload: UpdateInventoryItemPayload) => {
    const updatedItem = await updateInventoryItem(payload);
    setItems((prev) => prev.map((item) => (item.id === payload.id ? updatedItem : item)));
    return updatedItem;
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    await deleteInventoryItem(itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const filterByCategory = useCallback(
    async (category: string) => {
      try {
        setLoading(true);
        const data = await getInventoryByCategory(propertyId, category);
        setItems(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  const filterByStatus = useCallback(
    async (status: string) => {
      try {
        setLoading(true);
        const data = await getInventoryByStatus(propertyId, status);
        setItems(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  const searchItems = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        await refreshInventory();
        return;
      }

      try {
        setLoading(true);
        const data = await searchInventory(propertyId, searchTerm);
        setItems(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId, refreshInventory]
  );

  const clearFilters = useCallback(async () => {
    await refreshInventory();
  }, [refreshInventory]);

  return {
    items,
    loading,
    error,
    refreshInventory,
    createItem,
    updateItem,
    deleteItem,
    filterByCategory,
    filterByStatus,
    searchItems,
    clearFilters,
  };
}

/**
 * Hook to get a single inventory item by ID
 */
export function useInventoryItem(itemId: string | null) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshItem = useCallback(async () => {
    if (!itemId) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryItemById(itemId);
      setItem(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error loading inventory item:', err);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    refreshItem();
  }, [refreshItem]);

  return {
    item,
    loading,
    error,
    refreshItem,
  };
}

/**
 * Hook to get warranty alerts
 */
export function useWarrantyAlerts(propertyId: string, daysThreshold: number = 30) {
  const [alerts, setAlerts] = useState<WarrantyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshAlerts = useCallback(async () => {
    if (!propertyId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getWarrantyAlerts(propertyId, daysThreshold);
      setAlerts(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error loading warranty alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, daysThreshold]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  return {
    alerts,
    loading,
    error,
    refreshAlerts,
  };
}
