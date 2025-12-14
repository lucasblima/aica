import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarSyncService, CalendarConflict, SpaceSyncConfig } from '../services/calendarSyncService';

/**
 * Configuration options for the useCalendarSync hook.
 */
export interface UseCalendarSyncOptions {
  /** The ID of the connection space to sync */
  spaceId: string;
  /** Enable automatic periodic syncing (default: true) */
  autoSync?: boolean;
  /** Sync interval in seconds (default: 300 / 5 minutes) */
  syncInterval?: number;
  /** Enable/disable the hook entirely (default: true) */
  enabled?: boolean;
}

/**
 * Return type for the useCalendarSync hook.
 * Provides sync operations, conflict detection, and status management.
 */
export interface UseCalendarSyncReturn {
  // Sync operations
  syncEvent: {
    mutate: (eventId: string) => void;
    mutateAsync: (eventId: string) => Promise<string>;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };

  syncMultipleEvents: {
    mutate: (eventIds: string[]) => void;
    mutateAsync: (eventIds: string[]) => Promise<Map<string, string>>;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };

  updateEvent: {
    mutate: (eventId: string) => void;
    mutateAsync: (eventId: string) => Promise<string>;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };

  removeFromGoogle: {
    mutate: (eventId: string) => void;
    mutateAsync: (eventId: string) => Promise<void>;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };

  // Conflict detection
  checkConflicts: (starts_at: string, ends_at: string, excludeEventId?: string) => Promise<CalendarConflict[]>;
  conflicts: {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };

  // Sync status and configuration
  syncStatus: SpaceSyncConfig | null | undefined;
  syncStatusLoading: boolean;
  syncStatusError: Error | null;

  // Auto-sync management
  enableAutoSync: (intervalMinutes?: number) => Promise<void>;
  disableAutoSync: () => Promise<void>;
  isAutoSyncEnabled: boolean;

  // Manual triggers
  manualSync: () => Promise<void>;
  isManualSyncing: boolean;

  // Cache clearing
  clearCache: () => void;
}

/**
 * Hook for managing Connection Events calendar synchronization with Google Calendar
 *
 * Features:
 * - Manual and automatic event sync to Google Calendar
 * - Conflict detection between events
 * - Auto-sync configuration management
 * - Caching and error handling
 *
 * @example
 * ```tsx
 * const { syncEvent, checkConflicts, syncStatus } = useCalendarSync({
 *   spaceId: 'habitat-123',
 *   autoSync: true,
 *   syncInterval: 300,
 * });
 *
 * // Sync a single event
 * await syncEvent.mutateAsync(eventId);
 *
 * // Check for conflicts
 * const conflicts = await checkConflicts(startTime, endTime);
 *
 * // Enable auto-sync
 * await enableAutoSync(600); // 10 minutes
 * ```
 */
export function useCalendarSync(options: UseCalendarSyncOptions): UseCalendarSyncReturn {
  const { spaceId, autoSync = true, syncInterval = 300, enabled = true } = options;
  const queryClient = useQueryClient();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [conflictErrors, setConflictErrors] = useState<Error | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Fetch sync status
  const {
    data: syncStatus,
    isLoading: syncStatusLoading,
    error: syncStatusError,
    refetch: refetchSyncStatus,
  } = useQuery({
    queryKey: ['calendar-sync-status', spaceId],
    queryFn: () => calendarSyncService.getSpaceSyncStatus(spaceId),
    enabled: enabled,
    staleTime: 60000, // 1 minute
  });

  // Sync single event mutation
  const syncEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      console.log('[useCalendarSync] Syncing event:', { eventId });
      return await calendarSyncService.syncEventToGoogle(eventId);
    },
    onSuccess: () => {
      console.log('[useCalendarSync] Event synced successfully');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['space-events', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['connection-events'] });
    },
    onError: (error) => {
      console.error('[useCalendarSync] Error syncing event:', error);
    },
  });

  // Sync multiple events mutation
  const syncMultipleEventsMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      console.log('[useCalendarSync] Syncing multiple events:', { count: eventIds.length });
      return await calendarSyncService.syncMultipleEvents(eventIds);
    },
    onSuccess: () => {
      console.log('[useCalendarSync] Multiple events synced');
      queryClient.invalidateQueries({ queryKey: ['space-events', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['connection-events'] });
    },
    onError: (error) => {
      console.error('[useCalendarSync] Error syncing multiple events:', error);
    },
  });

  // Update event in Google Calendar mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      console.log('[useCalendarSync] Updating Google event:', { eventId });
      return await calendarSyncService.updateGoogleEvent(eventId);
    },
    onSuccess: () => {
      console.log('[useCalendarSync] Event updated in Google Calendar');
      queryClient.invalidateQueries({ queryKey: ['space-events', spaceId] });
    },
    onError: (error) => {
      console.error('[useCalendarSync] Error updating event:', error);
    },
  });

  // Remove from Google Calendar mutation
  const removeFromGoogleMutation = useMutation({
    mutationFn: async (eventId: string) => {
      console.log('[useCalendarSync] Removing event from Google Calendar:', { eventId });
      return await calendarSyncService.removeFromGoogle(eventId);
    },
    onSuccess: () => {
      console.log('[useCalendarSync] Event removed from Google Calendar');
      queryClient.invalidateQueries({ queryKey: ['space-events', spaceId] });
    },
    onError: (error) => {
      console.error('[useCalendarSync] Error removing event:', error);
    },
  });

  // Conflict checking function with loading state
  const checkConflicts = useCallback(
    async (starts_at: string, ends_at: string, excludeEventId?: string): Promise<CalendarConflict[]> => {
      try {
        setConflictLoading(true);
        setConflictErrors(null);
        const conflicts = await calendarSyncService.checkConflicts(starts_at, ends_at, excludeEventId);
        return conflicts;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setConflictErrors(err);
        console.error('[useCalendarSync] Error checking conflicts:', err);
        throw err;
      } finally {
        setConflictLoading(false);
      }
    },
    []
  );

  // Enable auto-sync
  const enableAutoSync = useCallback(
    async (intervalMinutes: number = 30) => {
      try {
        console.log('[useCalendarSync] Enabling auto-sync:', { intervalMinutes });
        await calendarSyncService.enableAutoSync(spaceId, intervalMinutes);
        await refetchSyncStatus();
      } catch (error) {
        console.error('[useCalendarSync] Error enabling auto-sync:', error);
        throw error;
      }
    },
    [spaceId, refetchSyncStatus]
  );

  // Disable auto-sync
  const disableAutoSync = useCallback(
    async () => {
      try {
        console.log('[useCalendarSync] Disabling auto-sync');
        await calendarSyncService.disableAutoSync(spaceId);
        await refetchSyncStatus();
      } catch (error) {
        console.error('[useCalendarSync] Error disabling auto-sync:', error);
        throw error;
      }
    },
    [spaceId, refetchSyncStatus]
  );

  // Manual sync trigger
  const manualSync = useCallback(
    async () => {
      try {
        setIsManualSyncing(true);
        console.log('[useCalendarSync] Starting manual sync');
        await refetchSyncStatus();
        // Note: In a real scenario, this would fetch and sync events
        // For now, just refresh the status
      } catch (error) {
        console.error('[useCalendarSync] Error during manual sync:', error);
        throw error;
      } finally {
        setIsManualSyncing(false);
      }
    },
    [refetchSyncStatus]
  );

  // Clear the sync cache
  const clearCache = useCallback(() => {
    console.log('[useCalendarSync] Clearing conflict cache');
    calendarSyncService.clearConflictCache();
  }, []);

  // Auto-sync effect (if enabled)
  useEffect(() => {
    if (!enabled || !autoSync || !syncStatus?.auto_sync_enabled) {
      return;
    }

    console.log('[useCalendarSync] Setting up auto-sync interval:', {
      interval: syncInterval,
    });

    const interval = setInterval(() => {
      refetchSyncStatus().catch((error) => {
        console.error('[useCalendarSync] Auto-sync error:', error);
      });
    }, syncInterval * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, autoSync, syncStatus?.auto_sync_enabled, syncInterval, refetchSyncStatus]);

  return {
    syncEvent: {
      mutate: (eventId) => syncEventMutation.mutate(eventId),
      mutateAsync: (eventId) => syncEventMutation.mutateAsync(eventId),
      isPending: syncEventMutation.isPending,
      isError: syncEventMutation.isError,
      error: syncEventMutation.error,
    },

    syncMultipleEvents: {
      mutate: (eventIds) => syncMultipleEventsMutation.mutate(eventIds),
      mutateAsync: (eventIds) => syncMultipleEventsMutation.mutateAsync(eventIds),
      isPending: syncMultipleEventsMutation.isPending,
      isError: syncMultipleEventsMutation.isError,
      error: syncMultipleEventsMutation.error,
    },

    updateEvent: {
      mutate: (eventId) => updateEventMutation.mutate(eventId),
      mutateAsync: (eventId) => updateEventMutation.mutateAsync(eventId),
      isPending: updateEventMutation.isPending,
      isError: updateEventMutation.isError,
      error: updateEventMutation.error,
    },

    removeFromGoogle: {
      mutate: (eventId) => removeFromGoogleMutation.mutate(eventId),
      mutateAsync: (eventId) => removeFromGoogleMutation.mutateAsync(eventId),
      isPending: removeFromGoogleMutation.isPending,
      isError: removeFromGoogleMutation.isError,
      error: removeFromGoogleMutation.error,
    },

    checkConflicts,
    conflicts: {
      isLoading: conflictLoading,
      isError: conflictErrors !== null,
      error: conflictErrors,
    },

    syncStatus,
    syncStatusLoading,
    syncStatusError: syncStatusError instanceof Error ? syncStatusError : null,

    enableAutoSync,
    disableAutoSync,
    isAutoSyncEnabled: syncStatus?.auto_sync_enabled ?? false,

    manualSync,
    isManualSyncing,

    clearCache,
  };
}
