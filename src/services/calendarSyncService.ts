/**
 * Calendar Sync Service — Orchestrator
 *
 * Manages bidirectional sync between AICA entities and Google Calendar events.
 * Uses calendar_sync_map table to track entity ↔ event mappings.
 *
 * AICA → Google: syncEntityToGoogle() on entity create/update
 * AICA → Google: unsyncEntityFromGoogle() on entity delete
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from './supabaseClient';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  ScopeUpgradeRequired,
  type GoogleCalendarEventInput,
} from './googleCalendarWriteService';
import type { SyncModule } from './calendarSyncTransforms';
import { fluxSlotToGoogleEvent, type FluxSlotData } from './calendarSyncTransforms';
import { atlasTaskToGoogleEvent, type AtlasTaskData } from './calendarSyncTransforms';

const log = createNamespacedLogger('CalendarSyncService');

interface SyncMapping {
  id: string;
  user_id: string;
  module: SyncModule;
  entity_id: string;
  google_event_id: string;
  last_synced_at: string;
}

// ─── Internal helpers ─────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

async function getMapping(
  userId: string,
  module: SyncModule,
  entityId: string
): Promise<SyncMapping | null> {
  const { data, error } = await supabase
    .from('calendar_sync_map')
    .select('*')
    .eq('user_id', userId)
    .eq('module', module)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) {
    log.error('[getMapping] Error:', error);
    return null;
  }
  return data as SyncMapping | null;
}

async function upsertMapping(
  userId: string,
  module: SyncModule,
  entityId: string,
  googleEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_sync_map')
    .upsert(
      {
        user_id: userId,
        module,
        entity_id: entityId,
        google_event_id: googleEventId,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,module,entity_id' }
    );

  if (error) {
    log.error('[upsertMapping] Error:', error);
    throw error;
  }
}

async function removeMappingAndGetEventId(
  userId: string,
  module: SyncModule,
  entityId: string
): Promise<string | null> {
  const mapping = await getMapping(userId, module, entityId);
  if (!mapping) return null;

  const { error } = await supabase
    .from('calendar_sync_map')
    .delete()
    .eq('user_id', userId)
    .eq('module', module)
    .eq('entity_id', entityId);

  if (error) {
    log.error('[removeMappingAndGetEventId] Error:', error);
    throw error;
  }

  return mapping.google_event_id;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Sync an AICA entity to Google Calendar (create or update).
 * Returns the Google event ID on success, or null if sync was skipped.
 */
export async function syncEntityToGoogle(
  module: SyncModule,
  entityId: string,
  eventData: GoogleCalendarEventInput | null
): Promise<{ googleEventId: string | null; scopeUpgradeNeeded: boolean }> {
  if (!eventData) {
    log.debug('[syncEntityToGoogle] No event data (entity has no time), skipping');
    return { googleEventId: null, scopeUpgradeNeeded: false };
  }

  try {
    const userId = await getUserId();
    const existing = await getMapping(userId, module, entityId);

    let googleEventId: string;

    if (existing) {
      log.debug('[syncEntityToGoogle] Updating existing event:', existing.google_event_id);
      const updated = await updateCalendarEvent(existing.google_event_id, eventData);
      googleEventId = updated.id;
    } else {
      log.debug('[syncEntityToGoogle] Creating new event for:', { module, entityId });
      const created = await createCalendarEvent(eventData);
      googleEventId = created.id;
    }

    await upsertMapping(userId, module, entityId, googleEventId);
    return { googleEventId, scopeUpgradeNeeded: false };
  } catch (error) {
    if (error instanceof ScopeUpgradeRequired) {
      log.warn('[syncEntityToGoogle] Write scope not available, user must re-consent');
      return { googleEventId: null, scopeUpgradeNeeded: true };
    }
    log.error('[syncEntityToGoogle] Error:', error);
    throw error;
  }
}

/**
 * Remove an AICA entity's Google Calendar event and clean up the mapping.
 */
export async function unsyncEntityFromGoogle(
  module: SyncModule,
  entityId: string
): Promise<{ scopeUpgradeNeeded: boolean }> {
  try {
    const userId = await getUserId();
    const googleEventId = await removeMappingAndGetEventId(userId, module, entityId);

    if (googleEventId) {
      log.debug('[unsyncEntityFromGoogle] Deleting Google event:', googleEventId);
      try {
        await deleteCalendarEvent(googleEventId);
      } catch (deleteError) {
        // Event may already be deleted from Google — that's fine
        log.warn('[unsyncEntityFromGoogle] Could not delete Google event (may already be gone):', deleteError);
      }
    }

    return { scopeUpgradeNeeded: false };
  } catch (error) {
    if (error instanceof ScopeUpgradeRequired) {
      return { scopeUpgradeNeeded: true };
    }
    log.error('[unsyncEntityFromGoogle] Error:', error);
    throw error;
  }
}

/**
 * Get all sync mappings for the current user.
 */
export async function getUserSyncMappings(module?: SyncModule): Promise<SyncMapping[]> {
  try {
    const userId = await getUserId();
    let query = supabase
      .from('calendar_sync_map')
      .select('*')
      .eq('user_id', userId);

    if (module) {
      query = query.eq('module', module);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SyncMapping[];
  } catch (error) {
    log.error('[getUserSyncMappings] Error:', error);
    return [];
  }
}

/**
 * Bulk sync all workout slots from a microcycle to Google Calendar.
 * Syncs sequentially to respect Google API rate limits.
 */
export async function bulkSyncFluxSlots(
  microcycleId: string,
  microcycleStartDate: string
): Promise<{ synced: number; skipped: number; failed: number; scopeUpgradeNeeded: boolean }> {
  const stats = { synced: 0, skipped: 0, failed: 0, scopeUpgradeNeeded: false };

  try {
    const userId = await getUserId();

    const { data: slots, error } = await supabase
      .from('workout_slots')
      .select('id, name, day_of_week, week_number, start_time, duration, modality, intensity')
      .eq('microcycle_id', microcycleId)
      .eq('user_id', userId);

    if (error) {
      log.error('[bulkSyncFluxSlots] Error fetching slots:', error);
      throw error;
    }

    if (!slots || slots.length === 0) {
      log.debug('[bulkSyncFluxSlots] No workout slots found for microcycle:', microcycleId);
      return stats;
    }

    log.debug(`[bulkSyncFluxSlots] Syncing ${slots.length} slots for microcycle:`, microcycleId);

    for (const slot of slots) {
      try {
        const eventData = fluxSlotToGoogleEvent(slot as FluxSlotData, microcycleStartDate);

        if (!eventData) {
          stats.skipped++;
          continue;
        }

        const result = await syncEntityToGoogle('flux', slot.id, eventData);

        if (result.scopeUpgradeNeeded) {
          stats.scopeUpgradeNeeded = true;
          stats.failed += slots.length - stats.synced - stats.skipped;
          break;
        }

        if (result.googleEventId) {
          stats.synced++;
        } else {
          stats.skipped++;
        }
      } catch (slotError) {
        log.error(`[bulkSyncFluxSlots] Failed to sync slot ${slot.id}:`, slotError);
        stats.failed++;
      }
    }

    log.debug('[bulkSyncFluxSlots] Complete:', stats);
    return stats;
  } catch (error) {
    log.error('[bulkSyncFluxSlots] Error:', error);
    throw error;
  }
}

/**
 * Bulk sync all scheduled Atlas tasks to Google Calendar.
 * Only syncs tasks with a scheduled_time that are not yet completed.
 * Syncs sequentially to respect Google API rate limits (500 req/100s).
 */
export async function bulkSyncAtlasTasks(): Promise<{ synced: number; skipped: number; failed: number; scopeUpgradeNeeded: boolean }> {
  const stats = { synced: 0, skipped: 0, failed: 0, scopeUpgradeNeeded: false };

  try {
    const userId = await getUserId();

    // Fetch tasks that have scheduled_time OR due_date (supports timed + all-day events)
    const { data: tasks, error } = await supabase
      .from('work_items')
      .select('id, title, description, scheduled_time, due_date, estimated_duration')
      .eq('user_id', userId)
      .is('completed_at', null)
      .or('scheduled_time.not.is.null,due_date.not.is.null');

    if (error) {
      log.error('[bulkSyncAtlasTasks] Error fetching tasks:', error);
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      log.debug('[bulkSyncAtlasTasks] No syncable tasks found');
      return stats;
    }

    log.debug(`[bulkSyncAtlasTasks] Syncing ${tasks.length} tasks`);

    for (const task of tasks) {
      try {
        const eventData = atlasTaskToGoogleEvent(task as AtlasTaskData);

        if (!eventData) {
          stats.skipped++;
          continue;
        }

        const result = await syncEntityToGoogle('atlas', task.id, eventData);

        if (result.scopeUpgradeNeeded) {
          stats.scopeUpgradeNeeded = true;
          stats.failed += tasks.length - stats.synced - stats.skipped;
          break;
        }

        if (result.googleEventId) {
          stats.synced++;
        } else {
          stats.skipped++;
        }
      } catch (taskError) {
        log.error(`[bulkSyncAtlasTasks] Failed to sync task ${task.id}:`, taskError);
        stats.failed++;
      }
    }

    log.debug('[bulkSyncAtlasTasks] Complete:', stats);
    return stats;
  } catch (error) {
    log.error('[bulkSyncAtlasTasks] Error:', error);
    throw error;
  }
}
