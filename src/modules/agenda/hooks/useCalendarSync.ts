/**
 * useCalendarSync Hook
 *
 * React hook for bidirectional Google Calendar sync.
 * Wraps calendarSyncService with React state management.
 * Non-blocking: sync failures never break module CRUD operations.
 */

import { useState, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { syncEntityToGoogle, unsyncEntityFromGoogle, bulkSyncAtlasTasks } from '../services/calendarSyncService';
import { connectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import { syncSlotsToAthleteCalendar } from '@/modules/flux/services/athleteCalendarSyncService';
import { fluxSlotToGoogleEvent } from '../services/calendarSyncTransforms';
import { supabase } from '@/services/supabaseClient';
import type { SyncModule } from '../services/calendarSyncTransforms';
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
  bulkSyncFlux: (microcycleId: string, microcycleStartDate: string, athleteId: string) => Promise<void>;
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
    microcycleStartDate: string,
    athleteId: string
  ) => {
    setIsSyncing(true);
    setSyncStats(null);
    try {
      // Fetch slots from DB
      const { data: slots } = await supabase
        .from('workout_slots')
        .select('id, name, day_of_week, week_number, start_time, duration, modality, intensity')
        .eq('microcycle_id', microcycleId);

      if (!slots?.length) {
        setSyncStats({ synced: 0, skipped: 0, failed: 0 });
        return;
      }

      // Transform to sync requests
      const syncRequests = slots
        .map((slot) => {
          const eventData = fluxSlotToGoogleEvent(slot, microcycleStartDate);
          if (!eventData) return null;
          return {
            slotId: slot.id,
            action: 'sync' as const,
            eventData: {
              summary: eventData.summary,
              description: eventData.description || '',
              start: { dateTime: eventData.start.dateTime!, timeZone: eventData.start.timeZone! },
              end: { dateTime: eventData.end.dateTime!, timeZone: eventData.end.timeZone! },
            },
          };
        })
        .filter(Boolean) as Array<{ slotId: string; action: 'sync'; eventData: { summary: string; description: string; start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string } } }>;

      if (!syncRequests.length) {
        setSyncStats({ synced: 0, skipped: slots.length, failed: 0 });
        return;
      }

      const result = await syncSlotsToAthleteCalendar(athleteId, syncRequests);
      setSyncStats({ synced: result.synced, skipped: result.skipped, failed: 0 });
    } catch (error) {
      log.error('[bulkSyncFlux] Bulk sync failed (non-blocking):', error);
      setSyncStats({ synced: 0, skipped: 0, failed: 1 });
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
