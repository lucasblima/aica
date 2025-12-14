/**
 * HABITAT MAINTENANCE HOOK
 * React hook for managing maintenance records
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMaintenanceByProperty,
  getMaintenanceById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  completeMaintenanceRecord,
  getMaintenanceByStatus,
  getUrgentMaintenance,
  getUpcomingMaintenance,
  getMaintenanceSummary,
  getMaintenanceByItem,
} from '../services/maintenanceService';
import type {
  MaintenanceRecord,
  CreateMaintenanceRecordPayload,
  UpdateMaintenanceRecordPayload,
  MaintenanceSummary,
} from '../types';

interface UseMaintenanceReturn {
  records: MaintenanceRecord[];
  loading: boolean;
  error: Error | null;
  refreshMaintenance: () => Promise<void>;
  createRecord: (payload: CreateMaintenanceRecordPayload) => Promise<MaintenanceRecord>;
  updateRecord: (payload: UpdateMaintenanceRecordPayload) => Promise<MaintenanceRecord>;
  deleteRecord: (recordId: string) => Promise<void>;
  completeRecord: (recordId: string, actualCost?: number) => Promise<MaintenanceRecord>;
  filterByStatus: (status: string) => Promise<void>;
  getUrgent: () => Promise<void>;
  getUpcoming: (daysAhead?: number) => Promise<void>;
  clearFilters: () => Promise<void>;
}

/**
 * Hook to manage maintenance records for a property
 */
export function useMaintenance(propertyId: string): UseMaintenanceReturn {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshMaintenance = useCallback(async () => {
    if (!propertyId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMaintenanceByProperty(propertyId);
      setRecords(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading maintenance:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refreshMaintenance();
  }, [refreshMaintenance]);

  const createRecord = useCallback(
    async (payload: CreateMaintenanceRecordPayload) => {
      const newRecord = await createMaintenanceRecord(payload);
      setRecords((prev) => [newRecord, ...prev]);
      return newRecord;
    },
    []
  );

  const updateRecord = useCallback(async (payload: UpdateMaintenanceRecordPayload) => {
    const updatedRecord = await updateMaintenanceRecord(payload);
    setRecords((prev) => prev.map((r) => (r.id === payload.id ? updatedRecord : r)));
    return updatedRecord;
  }, []);

  const deleteRecord = useCallback(async (recordId: string) => {
    await deleteMaintenanceRecord(recordId);
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  }, []);

  const completeRecord = useCallback(async (recordId: string, actualCost?: number) => {
    const completedRecord = await completeMaintenanceRecord(recordId, actualCost);
    setRecords((prev) => prev.map((r) => (r.id === recordId ? completedRecord : r)));
    return completedRecord;
  }, []);

  const filterByStatus = useCallback(
    async (status: string) => {
      try {
        setLoading(true);
        const data = await getMaintenanceByStatus(propertyId, status);
        setRecords(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  const getUrgent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUrgentMaintenance(propertyId);
      setRecords(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const getUpcoming = useCallback(
    async (daysAhead: number = 30) => {
      try {
        setLoading(true);
        const data = await getUpcomingMaintenance(propertyId, daysAhead);
        setRecords(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  const clearFilters = useCallback(async () => {
    await refreshMaintenance();
  }, [refreshMaintenance]);

  return {
    records,
    loading,
    error,
    refreshMaintenance,
    createRecord,
    updateRecord,
    deleteRecord,
    completeRecord,
    filterByStatus,
    getUrgent,
    getUpcoming,
    clearFilters,
  };
}

/**
 * Hook to get a single maintenance record by ID
 */
export function useMaintenanceById(recordId: string | null) {
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshRecord = useCallback(async () => {
    if (!recordId) {
      setRecord(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMaintenanceById(recordId);
      setRecord(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading maintenance record:', err);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    refreshRecord();
  }, [refreshRecord]);

  return {
    record,
    loading,
    error,
    refreshRecord,
  };
}

/**
 * Hook to get maintenance summary
 */
export function useMaintenanceSummary(propertyId: string) {
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshSummary = useCallback(async () => {
    if (!propertyId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMaintenanceSummary(propertyId);
      setSummary(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading maintenance summary:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  return {
    summary,
    loading,
    error,
    refreshSummary,
  };
}

/**
 * Hook to get maintenance by inventory item
 */
export function useMaintenanceByItem(itemId: string | null) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshRecords = useCallback(async () => {
    if (!itemId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMaintenanceByItem(itemId);
      setRecords(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading maintenance by item:', err);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  return {
    records,
    loading,
    error,
    refreshRecords,
  };
}
