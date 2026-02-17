/**
 * useCalendarSync Hook
 *
 * React hook for bidirectional Google Calendar sync.
 * Wraps calendarSyncService with React state management.
 * Non-blocking: sync failures never break module CRUD operations.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { syncEntityToGoogle, unsyncEntityFromGoogle, bulkSyncFluxSlots, bulkSyncAtlasTasks } from '@/services/calendarSyncService';
import { connectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import type { SyncModule } from '@/services/calendarSyncTransforms';
import type { GoogleCalendarEventInput } from '@/services/googleCalendarWriteService';

const log = createNamespacedLogger('useCalendarSync');

export interface BulkSyncStats {
  synced: number;
  skipped: number;
  failed: number;
}

export interface UseCalendarSyncReturn {
  syncToGoogle: (module: SyncModule, entityId: string, eventData: GoogleCalendarEventInput | null) => Promise<void>;
  unsyncFromGoogle: (module: SyncModule, entityId: string) => Promise<void>;
  bulkSyncFlux: (microcycleId: string, microcycleStartDate: string) => Promise<void>;
  bulkSyncAtlas: () => Promise<void>;
  isSyncing: boolean;
  syncStats: BulkSyncStats | null;
  scopeUpgradeNeeded: boolean;
  requestScopeUpgrade: () => void;
}

export function useCalendarSync(): UseCalendarSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [scopeUpgradeNeeded, setScopeUpgradeNeeded] = useState(false);
  const [syncStats, setSyncStats] = useState<BulkSyncStats | null>(null);

  const syncToGoogle = useCallback(async (
    module: SyncModule,
    entityId: string,
    eventData: GoogleCalendarEventInput | null
  ) => {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      log.debug('[syncToGoogle] Google Calendar not connected, skipping');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncEntityToGoogle(module, entityId, eventData);
      if (result.scopeUpgradeNeeded) {
        setScopeUpgradeNeeded(true);
      }
    } catch (error) {
      log.error('[syncToGoogle] Sync failed (non-blocking):', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const unsyncFromGoogle = useCallback(async (
    module: SyncModule,
    entityId: string
  ) => {
    const connected = await isGoogleCalendarConnected();
    if (!connected) return;

    setIsSyncing(true);
    try {
      const result = await unsyncEntityFromGoogle(module, entityId);
      if (result.scopeUpgradeNeeded) {
        setScopeUpgradeNeeded(true);
      }
    } catch (error) {
      log.error('[unsyncFromGoogle] Unsync failed (non-blocking):', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const bulkSyncFlux = useCallback(async (
    microcycleId: string,
    microcycleStartDate: string
  ) => {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      log.debug('[bulkSyncFlux] Google Calendar not connected, skipping');
      return;
    }

    setIsSyncing(true);
    setSyncStats(null);
    try {
      const result = await bulkSyncFluxSlots(microcycleId, microcycleStartDate);
      setSyncStats({ synced: result.synced, skipped: result.skipped, failed: result.failed });
      if (result.scopeUpgradeNeeded) {
        setScopeUpgradeNeeded(true);
      }
    } catch (error) {
      log.error('[bulkSyncFlux] Bulk sync failed (non-blocking):', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const bulkSyncAtlas = useCallback(async () => {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      log.debug('[bulkSyncAtlas] Google Calendar not connected, skipping');
      return;
    }

    setIsSyncing(true);
    setSyncStats(null);
    try {
      const result = await bulkSyncAtlasTasks();
      setSyncStats({ synced: result.synced, skipped: result.skipped, failed: result.failed });
      if (result.scopeUpgradeNeeded) {
        setScopeUpgradeNeeded(true);
      }
    } catch (error) {
      log.error('[bulkSyncAtlas] Bulk sync failed (non-blocking):', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const requestScopeUpgrade = useCallback(() => {
    connectGoogleCalendar();
  }, []);

  return {
    syncToGoogle,
    unsyncFromGoogle,
    bulkSyncFlux,
    bulkSyncAtlas,
    isSyncing,
    syncStats,
    scopeUpgradeNeeded,
    requestScopeUpgrade,
  };
}
