/**
 * HABITAT PROPERTY HOOK
 * React hook for managing property data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPropertiesBySpace,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  calculateFinancialSummary,
  formatPropertyAddress,
} from '../services/propertyService';
import type {
  HabitatProperty,
  CreateHabitatPropertyPayload,
  UpdateHabitatPropertyPayload,
  PropertyFinancialSummary,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useProperty');

interface UsePropertyReturn {
  properties: HabitatProperty[];
  loading: boolean;
  error: Error | null;
  refreshProperties: () => Promise<void>;
  createNewProperty: (payload: CreateHabitatPropertyPayload) => Promise<HabitatProperty>;
  updateExistingProperty: (payload: UpdateHabitatPropertyPayload) => Promise<HabitatProperty>;
  deleteExistingProperty: (propertyId: string) => Promise<void>;
  getFinancialSummary: (property: HabitatProperty) => PropertyFinancialSummary;
  getFormattedAddress: (property: HabitatProperty) => string;
}

/**
 * Hook to manage properties for a space
 */
export function useProperty(spaceId: string): UsePropertyReturn {
  const [properties, setProperties] = useState<HabitatProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshProperties = useCallback(async () => {
    if (!spaceId) {
      setProperties([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPropertiesBySpace(spaceId);
      setProperties(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    refreshProperties();
  }, [refreshProperties]);

  const createNewProperty = useCallback(
    async (payload: CreateHabitatPropertyPayload) => {
      const newProperty = await createProperty(payload);
      setProperties((prev) => [newProperty, ...prev]);
      return newProperty;
    },
    []
  );

  const updateExistingProperty = useCallback(
    async (payload: UpdateHabitatPropertyPayload) => {
      const updatedProperty = await updateProperty(payload);
      setProperties((prev) => prev.map((p) => (p.id === payload.id ? updatedProperty : p)));
      return updatedProperty;
    },
    []
  );

  const deleteExistingProperty = useCallback(async (propertyId: string) => {
    await deleteProperty(propertyId);
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  return {
    properties,
    loading,
    error,
    refreshProperties,
    createNewProperty,
    updateExistingProperty,
    deleteExistingProperty,
    getFinancialSummary: calculateFinancialSummary,
    getFormattedAddress: formatPropertyAddress,
  };
}

/**
 * Hook to get a single property by ID
 */
export function usePropertyById(propertyId: string | null) {
  const [property, setProperty] = useState<HabitatProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPropertyById(propertyId);
      setProperty(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error loading property:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refreshProperty();
  }, [refreshProperty]);

  return {
    property,
    loading,
    error,
    refreshProperty,
  };
}
