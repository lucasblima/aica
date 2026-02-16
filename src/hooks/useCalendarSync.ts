/**
 * useCalendarSync Hook
 *
 * React hook for bidirectional Google Calendar sync.
 * Wraps calendarSyncService with React state management.
 * Non-blocking: sync failures never break module CRUD operations.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '@/services/calendarSyncService';
import { connectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import type { SyncModule } from '@/services/calendarSyncTransforms';
import type { GoogleCalendarEventInput } from '@/services/googleCalendarWriteService';

const log = createNamespacedLogger('useCalendarSync');

export interface UseCalendarSyncReturn {
  syncToGoogle: (module: SyncModule, entityId: string, eventData: GoogleCalendarEventInput | null) => Promise<void>;
  unsyncFromGoogle: (module: SyncModule, entityId: string) => Promise<void>;
  isSyncing: boolean;
  scopeUpgradeNeeded: boolean;
  requestScopeUpgrade: () => void;
}

export function useCalendarSync(): UseCalendarSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [scopeUpgradeNeeded, setScopeUpgradeNeeded] = useState(false);

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

  const requestScopeUpgrade = useCallback(() => {
    connectGoogleCalendar();
  }, []);

  return {
    syncToGoogle,
    unsyncFromGoogle,
    isSyncing,
    scopeUpgradeNeeded,
    requestScopeUpgrade,
  };
}
