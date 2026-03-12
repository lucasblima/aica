# Fix Flux Calendar Sync Target — Design Spec

**Goal:** Workout slots created by the coach must sync to the athlete's Google Calendar, not the coach's.

**Status:** Approved
**Date:** 2026-03-11
**Session:** fix-flux-calendar-sync-target

---

## Problem

When a coach creates workout slots in the Flux Canvas, `useCanvasSlots` calls `syncEntityToGoogle()` which uses the current authenticated user's (coach's) Google Calendar token. Events appear on the coach's personal Google Calendar instead of the athlete's.

## Decisions

| Decision | Choice |
|----------|--------|
| Sync target | Athlete's Google Calendar only |
| Athlete without Google Calendar | Silent — no sync, no error |
| Existing coach events | Remove all flux events from coach's Google Calendar |
| Approach | New Edge Function (server-side, uses athlete's stored tokens) |

## Architecture

### Current Flow (Wrong)

```
Coach creates slot → syncEntityToGoogle() → coach's token → event in COACH's Google Calendar
```

### New Flow

```
Coach creates slot → Edge Function sync-slot-to-athlete-calendar → athlete's token → event in ATHLETE's Google Calendar
```

### Key Change

- `useCanvasSlots` stops calling `syncEntityToGoogle('flux', ...)` / `unsyncEntityFromGoogle('flux', ...)`
- Remove `isGoogleCalendarConnected()` guard in `useCanvasSlots` — the Edge Function handles all validation (coach's Google Calendar status is irrelevant)
- Instead calls a new thin service `athleteCalendarSyncService.ts` that invokes the Edge Function
- `calendar_sync_map.user_id` for flux entries becomes `athlete.auth_user_id` (the event owner)
- The **Edge Function** writes/updates/deletes `calendar_sync_map` rows server-side (using service_role). The frontend `athleteCalendarSyncService.ts` does NOT touch `calendar_sync_map` at all.
- Atlas, Studio, Grants sync is unchanged (they correctly sync to the current user)

### Additional Call Sites to Update

Beyond `useCanvasSlots.ts`, two other call sites use the old sync path for flux:

- **`calendarSyncService.ts` → `bulkSyncFluxSlots()`** (~line 215): Syncs all slots in a microcycle using coach's token. Must be replaced with a batch call to the new Edge Function.
- **`useCalendarSync.ts` → `bulkSyncFlux()`** (~line 84): UI-facing wrapper. Must call the new Edge Function instead of `bulkSyncFluxSlots()`.

Both will use the same `syncSlotsToAthleteCalendar()` service helper with the full slot array.

## Edge Function: `sync-slot-to-athlete-calendar`

**Endpoint:** `POST /functions/v1/sync-slot-to-athlete-calendar`

### Request

```typescript
{
  athleteId: string;       // athletes.id
  slots: {                 // batch support (1 or N slots, max 50)
    slotId: string;
    action: 'sync' | 'delete';
    eventData?: {          // required when action = 'sync'
      summary: string;
      description: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
    };
  }[];
}
```

**Batch size limit:** Max 50 slots per request. Edge Function rejects requests exceeding this with 400.

### Validation (in order)

1. JWT valid → extract `coach_id`
2. `athletes.user_id = coach_id AND athletes.id = athleteId` → verify relationship
3. `athletes.auth_user_id IS NOT NULL` → athlete has AICA account
4. `google_calendar_tokens WHERE user_id = athlete.auth_user_id` → athlete has token

### Responses

| Scenario | Status | Body |
|----------|--------|------|
| Success | 200 | `{ success: true, synced: N, skipped: M }` |
| Athlete without Google Calendar | 200 | `{ success: true, synced: 0, reason: 'no_token' }` |
| Athlete without AICA account | 200 | `{ success: true, synced: 0, reason: 'not_linked' }` |
| Coach not owner | 403 | `{ success: false, error: 'forbidden' }` |
| Not authenticated | 401 | `{ success: false, error: 'unauthorized' }` |
| Batch too large (>50) | 400 | `{ success: false, error: 'batch_too_large' }` |

### Token Pattern

Reuses `fetch-athlete-calendar` pattern:
1. Service role client bypasses RLS
2. Fetches athlete's `refresh_token` from `google_calendar_tokens`
3. Refreshes to get `access_token`
4. Calls Google Calendar API as the athlete

### calendar_sync_map Ownership

The Edge Function manages `calendar_sync_map` rows directly (service_role bypasses RLS):
- On `sync`: upsert row with `user_id = athlete.auth_user_id`, `module = 'flux'`, `entity_id = slotId`
- On `delete`: delete row and Google Calendar event
- The frontend NEVER writes to `calendar_sync_map` for flux

### Rate Limiting

Google Calendar API: 500 requests/100s. For batches of 20+ slots, process sequentially with 100ms delay.

## Frontend Changes

### `useCanvasSlots.ts` — 3 change points

1. **createSlot** (~line 130): Remove `isGoogleCalendarConnected()` check and `syncEntityToGoogle('flux', ...)`. Replace with `syncSlotsToAthleteCalendar()` call.
2. **updateSlot** (~line 190): Same replacement.
3. **deleteSlot** (~line 222): Remove `unsyncEntityFromGoogle('flux', ...)`. Replace with `syncSlotsToAthleteCalendar()` call with `action: 'delete'`.

### `useCalendarSync.ts` — bulk sync change

- **`bulkSyncFlux()`** (~line 84): Replace `bulkSyncFluxSlots()` call with `syncSlotsToAthleteCalendar()` passing all slots.
- `bulkSyncFluxSlots()` in `calendarSyncService.ts` can be deleted or deprecated (only used by flux).

### New Service: `src/modules/flux/services/athleteCalendarSyncService.ts`

```typescript
export async function syncSlotsToAthleteCalendar(
  athleteId: string,
  slots: { slotId: string; action: 'sync' | 'delete'; eventData?: GoogleCalendarEventInput }[]
): Promise<{ synced: number; skipped: number }>
```

Thin wrapper around `supabase.functions.invoke('sync-slot-to-athlete-calendar', ...)`.

### Timezone Handling

`fluxSlotToGoogleEvent()` runs client-side (in the coach's browser) and calls `getUserTimezone()` which returns the browser's timezone. Since the coach and athlete are typically in the same timezone (Brazilian fitness market), this is acceptable. The `start.timeZone` and `end.timeZone` fields in the request payload carry the timezone to the Edge Function, which passes them through to Google Calendar API unchanged.

If coach and athlete are in different timezones (rare case), the event will display at the correct absolute time but with the coach's timezone label. This is acceptable for MVP — a future enhancement could store the athlete's timezone preference.

### `athleteId` source

`useCanvasSlots` already has access to `activeMicrocycle.athlete_id`. Pass it to the sync service.

### Non-blocking behavior preserved

All Edge Function calls remain fire-and-forget with `.catch()`. Sync failure does not block slot creation/editing. No error shown to coach — sync is best-effort, transparent. The `ScopeUpgradeRequired` error handling in `useCanvasSlots` is removed (no longer relevant — the coach's Google Calendar scope is not used for flux).

## Cleanup: Existing Coach Events

### When and Where

A one-time cleanup script executed manually from this session via:
1. SQL query to get `google_event_id` values from `calendar_sync_map`
2. Browser console script (or temporary UI button) to call `deleteCalendarEvent()` for each ID using the coach's token
3. SQL `DELETE` to clean up the database rows

### Step 1 — Delete from Google Calendar (frontend, one-time)

- Query `calendar_sync_map WHERE user_id = coach_id AND module = 'flux'`
- For each `google_event_id`, call `deleteCalendarEvent(googleEventId)` using coach's token (current user is the coach)
- Removes events from the actual Google Calendar

### Step 2 — Clean database

- `DELETE FROM calendar_sync_map WHERE user_id = coach_id AND module = 'flux'`
- Removes orphaned sync mappings

### Prevention

- New `useCanvasSlots` code never syncs to coach's calendar
- `athlete_unlink_self()` RPC (PR #856) cleans up `calendar_sync_map` when athlete leaves

### Dependency: Update `athlete_unlink_self()` RPC

After this change, new `calendar_sync_map` rows for flux will have `user_id = athlete.auth_user_id` (not the coach's). The current `athlete_unlink_self()` RPC (PR #856) joins on `csm.user_id = a.user_id` (coach's ID), which would miss the new rows. The unlink RPC must be updated to also match `csm.user_id = a.auth_user_id` (the athlete's own ID) OR use `csm.user_id IN (a.user_id, a.auth_user_id)`.

## Error Handling

### Edge Function

- Athlete token expired + refresh fails → `{ synced: 0, reason: 'token_expired' }`
- Google Calendar API 404 on delete → ignore (already deleted)
- Google Calendar API 403 → `{ reason: 'token_revoked' }`
- Timeout: 10s per slot, 30s total for batch

### Frontend

- Edge Function failure → `log.warn()`, slot already saved in DB
- No error shown to coach — sync is best-effort, transparent
- `ScopeUpgradeRequired` handling removed from flux sync paths (only relevant for coach's own calendar)

## Tests

| Test | Type | Validates |
|------|------|-----------|
| `athleteCalendarSyncService.test.ts` | Unit | Edge Function call, response parsing |
| `useCanvasSlots` sync calls | Unit | Calls `syncSlotsToAthleteCalendar` on create/update/delete |
| `useCalendarSync` bulk sync | Unit | `bulkSyncFlux` calls new service instead of old `bulkSyncFluxSlots` |
| Edge Function handler | Unit | JWT validation, coach-athlete relationship, no-token scenarios |
| Edge Function Google API | Integration | Creates/deletes event with mocked token |
| Edge Function batch limit | Unit | Rejects >50 slots with 400 |

## Out of Scope (YAGNI)

- Automatic retry on sync failure
- Coach notification when athlete has no Google Calendar
- Bidirectional sync (athlete edits Google event → reflects in AICA)
- Google Calendar webhook for external deletion detection
- Different timezone handling for coach vs athlete (acceptable for MVP)
- Moving `fluxSlotToGoogleEvent` to flux module (stays in agenda transforms for now)
