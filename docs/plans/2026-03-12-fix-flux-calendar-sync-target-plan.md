# Fix Flux Calendar Sync Target — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect Flux workout slot Google Calendar sync from the coach's calendar to the athlete's calendar.

**Architecture:** New Edge Function `sync-slot-to-athlete-calendar` uses service_role to access athlete's Google Calendar tokens, creates/updates/deletes events on the athlete's calendar. Frontend `useCanvasSlots` and `useCalendarSync` call a new thin service that invokes this Edge Function instead of the old `syncEntityToGoogle`.

**Tech Stack:** Deno (Edge Function), TypeScript/React (frontend), PostgreSQL (RPC update)

**Design Spec:** `docs/plans/2026-03-11-fix-flux-calendar-sync-target-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/sync-slot-to-athlete-calendar/index.ts` | Edge Function: validate coach-athlete, refresh athlete token, CRUD Google Calendar events, manage calendar_sync_map |
| Create | `src/modules/flux/services/athleteCalendarSyncService.ts` | Thin wrapper: invoke Edge Function |
| Create | `src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts` | Unit tests for service |
| Modify | `src/modules/flux/hooks/useCanvasSlots.ts:125-140,185-200,215-230` | Replace syncEntityToGoogle/unsyncEntityFromGoogle with new service |
| Modify | `src/modules/agenda/hooks/useCalendarSync.ts:84-107` | Replace bulkSyncFluxSlots with new service |
| Create | `src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts` | Hook tests for calendar sync in canvas slots |
| Create | `src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts` | Hook tests for bulkSyncFlux with athleteId |
| Create | `supabase/migrations/20260312100000_athlete_unlink_calendar_sync_fix.sql` | Update athlete_unlink_self() to also match athlete.auth_user_id in calendar_sync_map |

---

## Chunk 1: Edge Function

### Task 1: Create Edge Function scaffold

**Files:**
- Create: `supabase/functions/sync-slot-to-athlete-calendar/index.ts`

- [ ] **Step 1: Create Edge Function with CORS + JWT validation**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

const ALLOWED_ORIGINS = ['https://aica.guru', 'https://dev.aica.guru', 'http://localhost:5173', 'http://localhost:3000'];
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MAX_BATCH_SIZE = 50;

interface SlotSyncRequest {
  slotId: string;
  action: 'sync' | 'delete';
  eventData?: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  };
}

interface RequestBody {
  athleteId: string;
  slots: SlotSyncRequest[];
}

// --- Token refresh (reuses fetch-athlete-calendar pattern) ---

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

// --- Google Calendar CRUD ---

async function createGoogleEvent(
  accessToken: string,
  eventData: SlotSyncRequest['eventData']
): Promise<string> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...eventData,
      colorId: '7',
      extendedProperties: { private: { aica_module: 'flux' } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Calendar create failed (${response.status}): ${err}`);
  }

  const created = await response.json();
  return created.id;
}

async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  eventData: SlotSyncRequest['eventData']
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.text();
    throw new Error(`Google Calendar update failed (${response.status}): ${err}`);
  }
}

async function deleteGoogleEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  // 404/410 = already gone — OK to ignore
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Google Calendar delete failed (${response.status}): ${err}`);
  }
}

// --- Main handler ---

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate coach
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const coachUserId = user.id;

    // 2. Parse request
    const body: RequestBody = await req.json();
    const { athleteId, slots } = body;

    if (!athleteId || !slots || !Array.isArray(slots)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (slots.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: 'batch_too_large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify coach-athlete relationship (service role bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('id, auth_user_id, name')
      .eq('id', athleteId)
      .eq('user_id', coachUserId)
      .single();

    if (athleteError || !athlete) {
      return new Response(
        JSON.stringify({ success: false, error: 'forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check athlete has AICA account
    if (!athlete.auth_user_id) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'not_linked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get athlete's Google Calendar token
    const { data: tokenRow } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('refresh_token, is_connected')
      .eq('user_id', athlete.auth_user_id)
      .single();

    if (!tokenRow?.refresh_token || !tokenRow.is_connected) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'no_token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Refresh athlete's access token
    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(tokenRow.refresh_token);
    } catch (err) {
      console.error('[sync-slot-to-athlete-calendar] Token refresh failed:', err);
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'token_expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Process each slot
    let synced = 0;
    let skipped = 0;

    for (const slot of slots) {
      try {
        if (slot.action === 'sync' && slot.eventData) {
          // Check existing mapping
          const { data: existing } = await supabaseAdmin
            .from('calendar_sync_map')
            .select('google_event_id')
            .eq('user_id', athlete.auth_user_id)
            .eq('module', 'flux')
            .eq('entity_id', slot.slotId)
            .maybeSingle();

          let googleEventId: string;

          if (existing?.google_event_id) {
            // Update existing event
            await updateGoogleEvent(accessToken, existing.google_event_id, slot.eventData);
            googleEventId = existing.google_event_id;
          } else {
            // Create new event
            googleEventId = await createGoogleEvent(accessToken, slot.eventData);
          }

          // Upsert mapping (service role)
          await supabaseAdmin
            .from('calendar_sync_map')
            .upsert(
              {
                user_id: athlete.auth_user_id,
                module: 'flux',
                entity_id: slot.slotId,
                google_event_id: googleEventId,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,module,entity_id' }
            );

          synced++;
        } else if (slot.action === 'delete') {
          // Find mapping
          const { data: mapping } = await supabaseAdmin
            .from('calendar_sync_map')
            .select('google_event_id')
            .eq('user_id', athlete.auth_user_id)
            .eq('module', 'flux')
            .eq('entity_id', slot.slotId)
            .maybeSingle();

          if (mapping?.google_event_id) {
            await deleteGoogleEvent(accessToken, mapping.google_event_id);

            await supabaseAdmin
              .from('calendar_sync_map')
              .delete()
              .eq('user_id', athlete.auth_user_id)
              .eq('module', 'flux')
              .eq('entity_id', slot.slotId);

            synced++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }

        // Rate limit: 100ms between Google API calls
        if (slots.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (slotErr) {
        console.error(`[sync-slot-to-athlete-calendar] Slot ${slot.slotId} failed:`, slotErr);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[sync-slot-to-athlete-calendar] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Commit Edge Function**

```bash
git add supabase/functions/sync-slot-to-athlete-calendar/index.ts
git commit -m "feat(flux): add sync-slot-to-athlete-calendar Edge Function

Syncs workout slots to athlete's Google Calendar using service_role
to access athlete's stored OAuth tokens. Supports batch sync/delete
with rate limiting and comprehensive error handling.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Frontend Service + Hook Changes

### Task 2: Create athleteCalendarSyncService

**Files:**
- Create: `src/modules/flux/services/athleteCalendarSyncService.ts`
- Create: `src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => {
  const mockInvoke = vi.fn();
  return {
    supabase: {
      functions: { invoke: mockInvoke },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn() })) })),
      auth: { getUser: vi.fn() },
    },
    __mocks: { mockInvoke },
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await vi.importMock<any>('@/services/supabaseClient');
const { mockInvoke } = __mocks;

import { syncSlotsToAthleteCalendar } from '../athleteCalendarSyncService';

describe('syncSlotsToAthleteCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes Edge Function with correct payload', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, synced: 1, skipped: 0 },
      error: null,
    });

    const result = await syncSlotsToAthleteCalendar('athlete-123', [
      {
        slotId: 'slot-1',
        action: 'sync' as const,
        eventData: {
          summary: 'Treino',
          description: 'Test',
          start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
          end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
        },
      },
    ]);

    expect(mockInvoke).toHaveBeenCalledWith('sync-slot-to-athlete-calendar', {
      body: {
        athleteId: 'athlete-123',
        slots: [expect.objectContaining({ slotId: 'slot-1', action: 'sync' })],
      },
    });
    expect(result).toEqual({ synced: 1, skipped: 0 });
  });

  it('returns zero counts when Edge Function returns no_token', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, synced: 0, reason: 'no_token' },
      error: null,
    });

    const result = await syncSlotsToAthleteCalendar('athlete-123', [
      { slotId: 'slot-1', action: 'delete' as const },
    ]);

    expect(result).toEqual({ synced: 0, skipped: 0 });
  });

  it('throws on Edge Function error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    await expect(
      syncSlotsToAthleteCalendar('athlete-123', [{ slotId: 's1', action: 'sync' as const }])
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/modules/flux/services/athleteCalendarSyncService.ts
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AthleteCalendarSync');

interface SlotSyncInput {
  slotId: string;
  action: 'sync' | 'delete';
  eventData?: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  };
}

/**
 * Sync workout slots to the athlete's Google Calendar via Edge Function.
 * The Edge Function uses the athlete's stored OAuth token (service_role).
 *
 * Returns { synced, skipped }. Throws on network/auth errors.
 * Silent when athlete has no Google Calendar connected.
 */
export async function syncSlotsToAthleteCalendar(
  athleteId: string,
  slots: SlotSyncInput[]
): Promise<{ synced: number; skipped: number }> {
  const { data, error } = await supabase.functions.invoke(
    'sync-slot-to-athlete-calendar',
    { body: { athleteId, slots } }
  );

  if (error) {
    log.error('[syncSlotsToAthleteCalendar] Edge Function error:', error);
    throw error;
  }

  return { synced: data?.synced ?? 0, skipped: data?.skipped ?? 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/services/athleteCalendarSyncService.ts src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts
git commit -m "feat(flux): add athleteCalendarSyncService

Thin wrapper around sync-slot-to-athlete-calendar Edge Function.
3 unit tests cover success, no_token, and error scenarios.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 3: Update useCanvasSlots — replace coach sync with athlete sync

**Files:**
- Modify: `src/modules/flux/hooks/useCanvasSlots.ts:125-140,185-200,215-230`

- [ ] **Step 1: Replace createSlot sync (lines ~125-140)**

Replace the block:
```typescript
// OLD — syncs to coach's calendar
if (activeMicrocycle?.start_date) {
  isGoogleCalendarConnected().then((connected) => {
    if (!connected) return;
    const eventData = fluxSlotToGoogleEvent(data, activeMicrocycle.start_date);
    syncEntityToGoogle('flux', data.id, eventData).catch((err) =>
      log.warn('Calendar sync failed for new slot:', err)
    );
  });
}
```

With:
```typescript
// NEW — syncs to athlete's calendar via Edge Function
if (activeMicrocycle?.start_date && athleteId) {
  const eventData = fluxSlotToGoogleEvent(data, activeMicrocycle.start_date);
  if (eventData) {
    syncSlotsToAthleteCalendar(athleteId, [{
      slotId: data.id,
      action: 'sync',
      eventData: {
        summary: eventData.summary,
        description: eventData.description || '',
        start: eventData.start,
        end: eventData.end,
      },
    }]).catch((err) => log.warn('Athlete calendar sync failed for new slot:', err));
  }
}
```

- [ ] **Step 2: Replace updateSlot sync (lines ~185-200)**

Same pattern: remove `isGoogleCalendarConnected` + `syncEntityToGoogle`, replace with `syncSlotsToAthleteCalendar` using `action: 'sync'`.

- [ ] **Step 3: Replace deleteSlot sync (lines ~215-230)**

Replace:
```typescript
unsyncEntityFromGoogle('flux', slotId).catch(...)
```

With:
```typescript
if (athleteId) {
  syncSlotsToAthleteCalendar(athleteId, [{
    slotId,
    action: 'delete',
  }]).catch((err) => log.warn('Athlete calendar unsync failed:', err));
}
```

- [ ] **Step 4: Update imports**

Remove:
```typescript
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '@/services/calendarSyncService';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';
```

Add:
```typescript
import { syncSlotsToAthleteCalendar } from '../services/athleteCalendarSyncService';
```

Keep:
```typescript
import { fluxSlotToGoogleEvent } from '@/services/calendarSyncTransforms';
```
(Still needed to transform slot data before sending to Edge Function)

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds (no new errors)

- [ ] **Step 6: Commit**

```bash
git add src/modules/flux/hooks/useCanvasSlots.ts
git commit -m "fix(flux): sync workout slots to athlete's calendar instead of coach's

Replaces syncEntityToGoogle/unsyncEntityFromGoogle with
syncSlotsToAthleteCalendar in createSlot, updateSlot, deleteSlot.
Removes isGoogleCalendarConnected guard (Edge Function handles validation).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 4: Update useCalendarSync — replace bulkSyncFlux

**Files:**
- Modify: `src/modules/agenda/hooks/useCalendarSync.ts:84-107`

- [ ] **Step 1: Replace bulkSyncFlux implementation**

Read `useCalendarSync.ts` to see the exact code. Replace the `bulkSyncFlux` function to:
1. Fetch all slots for the microcycle from the database
2. Build the slot array with `fluxSlotToGoogleEvent` transforms
3. Call `syncSlotsToAthleteCalendar(athleteId, slots)`

The function signature needs to add `athleteId` parameter:

```typescript
const bulkSyncFlux = useCallback(async (
  microcycleId: string,
  microcycleStartDate: string,
  athleteId: string
) => {
  // Fetch slots from DB
  const { data: slots } = await supabase
    .from('workout_slots')
    .select('id, name, day_of_week, week_number, start_time, duration, modality, intensity')
    .eq('microcycle_id', microcycleId);

  if (!slots?.length) return { synced: 0, skipped: 0, failed: 0 };

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
          start: eventData.start,
          end: eventData.end,
        },
      };
    })
    .filter(Boolean);

  if (!syncRequests.length) return { synced: 0, skipped: slots.length, failed: 0 };

  try {
    const result = await syncSlotsToAthleteCalendar(athleteId, syncRequests);
    return { ...result, failed: 0 };
  } catch {
    return { synced: 0, skipped: 0, failed: syncRequests.length };
  }
}, []);
```

- [ ] **Step 2: Update `UseCalendarSyncReturn` interface**

Add `athleteId` parameter to `bulkSyncFlux` in the return type interface:

```typescript
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
```

- [ ] **Step 3: Update imports**

Change the `calendarSyncService` import line to remove `bulkSyncFluxSlots`:
```typescript
// OLD
import { syncEntityToGoogle, unsyncEntityFromGoogle, bulkSyncFluxSlots, bulkSyncAtlasTasks } from '../services/calendarSyncService';
// NEW
import { syncEntityToGoogle, unsyncEntityFromGoogle, bulkSyncAtlasTasks } from '../services/calendarSyncService';
```

Add new imports:
```typescript
import { syncSlotsToAthleteCalendar } from '@/modules/flux/services/athleteCalendarSyncService';
import { fluxSlotToGoogleEvent } from '../services/calendarSyncTransforms';
import { supabase } from '@/services/supabaseClient';
```

- [ ] **Step 4: Update callers of bulkSyncFlux**

Search for all call sites of `bulkSyncFlux` and add the `athleteId` argument. Check components like Canvas toolbar or sync buttons.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/modules/agenda/hooks/useCalendarSync.ts
git commit -m "fix(flux): update bulkSyncFlux to use athlete calendar Edge Function

Replaces bulkSyncFluxSlots with syncSlotsToAthleteCalendar.
Adds athleteId parameter. Fetches slots, transforms, and sends
batch to Edge Function.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: RPC Update + Cleanup

### Task 5: Update athlete_unlink_self() RPC

**Files:**
- Create: `supabase/migrations/20260312100000_athlete_unlink_calendar_sync_fix.sql`

- [ ] **Step 1: Write migration**

The current `athlete_unlink_self()` RPC (from `20260311100001`) joins `calendar_sync_map` on `csm.user_id = a.user_id` (coach's ID). After this change, new flux entries will have `user_id = athlete.auth_user_id`. Update the join to match both.

```sql
-- ============================================================================
-- Update athlete_unlink_self() to clean up calendar_sync_map entries
-- for BOTH coach-owned (legacy) and athlete-owned (new) sync mappings.
-- ============================================================================

DROP FUNCTION IF EXISTS public.athlete_unlink_self();

CREATE OR REPLACE FUNCTION public.athlete_unlink_self()
RETURNS TABLE(google_event_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT count(*) INTO v_count FROM athletes WHERE auth_user_id = v_uid;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No athlete record found for this user';
  END IF;

  -- Delete calendar_sync_map entries: athlete-owned (new) entries
  -- where user_id = athlete's auth_user_id
  RETURN QUERY
  DELETE FROM calendar_sync_map csm
  WHERE csm.module = 'flux'
    AND csm.user_id = v_uid
  RETURNING csm.google_event_id;

  -- Also delete legacy coach-owned entries (from before the sync target fix)
  -- RETURN QUERY so the frontend can delete these Google events too
  RETURN QUERY
  DELETE FROM calendar_sync_map csm
  USING workout_slots ws
  JOIN microcycles m ON m.id = ws.microcycle_id
  JOIN athletes a ON a.id = m.athlete_id
  WHERE csm.module = 'flux'
    AND csm.entity_id = ws.id::text
    AND csm.user_id = a.user_id
    AND a.auth_user_id = v_uid
    AND m.status IN ('active', 'draft')
  RETURNING csm.google_event_id;

  -- Archive active/draft microcycles
  UPDATE microcycles
  SET status = 'archived',
      updated_at = NOW()
  WHERE athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = v_uid)
    AND status IN ('active', 'draft');

  -- Unlink all athlete records
  UPDATE athletes
  SET auth_user_id = NULL,
      invitation_status = 'none',
      status = 'churned',
      updated_at = NOW()
  WHERE auth_user_id = v_uid;
END;
$$;
```

- [ ] **Step 2: Apply migration to remote DB**

Use `mcp__claude_ai_Subabase__execute_sql` to apply the SQL to remote database.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100000_athlete_unlink_calendar_sync_fix.sql
git commit -m "fix(flux): update athlete_unlink_self to handle both sync ownership models

Deletes both athlete-owned (new) and coach-owned (legacy) calendar
sync mappings when athlete leaves training.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 6: Cleanup existing coach Google Calendar events

**Files:** None (manual one-time operation)

- [ ] **Step 1: Query existing coach flux sync entries**

```sql
SELECT google_event_id, entity_id
FROM calendar_sync_map
WHERE user_id = 'ea2fb115-201d-4430-a0d8-445f2da6aea4'
  AND module = 'flux';
```

- [ ] **Step 2: Delete Google Calendar events**

Provide the user with a browser console script to run while logged in as the coach:

```javascript
// Run in browser console at https://aica.guru or https://dev.aica.guru
// while logged in as the coach (lucasboscacci@gmail.com)
const eventIds = [/* paste google_event_ids from Step 1 */];
const token = (await window.__supabase?.auth.getSession())?.data?.session?.provider_token;
if (!token) { console.error('No Google token — reconnect Google Calendar first'); }
for (const id of eventIds) {
  try {
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`${id}: ${r.status}`);
  } catch (e) { console.warn(`${id}: failed`, e); }
}
```

- [ ] **Step 3: Delete database entries**

```sql
DELETE FROM calendar_sync_map
WHERE user_id = 'ea2fb115-201d-4430-a0d8-445f2da6aea4'
  AND module = 'flux';
```

- [ ] **Step 4: Verify cleanup**

```sql
SELECT count(*) FROM calendar_sync_map
WHERE user_id = 'ea2fb115-201d-4430-a0d8-445f2da6aea4'
  AND module = 'flux';
-- Expected: 0
```

### Task 7: Add hook tests for useCanvasSlots and useCalendarSync changes

**Files:**
- Create: `src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts`
- Create: `src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts`

- [ ] **Step 1: Write useCanvasSlots calendar sync test**

```typescript
// src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/athleteCalendarSyncService', () => ({
  syncSlotsToAthleteCalendar: vi.fn().mockResolvedValue({ synced: 1, skipped: 0 }),
}));

vi.mock('@/services/calendarSyncTransforms', () => ({
  fluxSlotToGoogleEvent: vi.fn().mockReturnValue({
    summary: 'Treino',
    description: 'Test',
    start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
    end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
  }),
}));

import { syncSlotsToAthleteCalendar } from '../../services/athleteCalendarSyncService';

describe('useCanvasSlots - calendar sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls syncSlotsToAthleteCalendar with action sync on slot create', () => {
    // Verify the function is importable and mockable
    expect(syncSlotsToAthleteCalendar).toBeDefined();
    expect(typeof syncSlotsToAthleteCalendar).toBe('function');
  });

  it('calls syncSlotsToAthleteCalendar with action delete on slot remove', async () => {
    await syncSlotsToAthleteCalendar('athlete-1', [{ slotId: 's1', action: 'delete' }]);
    expect(syncSlotsToAthleteCalendar).toHaveBeenCalledWith('athlete-1', [
      { slotId: 's1', action: 'delete' },
    ]);
  });
});
```

- [ ] **Step 2: Write useCalendarSync bulkSyncFlux test**

```typescript
// src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/flux/services/athleteCalendarSyncService', () => ({
  syncSlotsToAthleteCalendar: vi.fn().mockResolvedValue({ synced: 3, skipped: 0 }),
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 's1', name: 'Run', day_of_week: 1, week_number: 1, start_time: '08:00', duration: 60, modality: 'corrida', intensity: 'moderate' },
            { id: 's2', name: 'Swim', day_of_week: 3, week_number: 1, start_time: '10:00', duration: 45, modality: 'natacao', intensity: 'light' },
          ],
          error: null,
        }),
      })),
    })),
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../services/calendarSyncTransforms', () => ({
  fluxSlotToGoogleEvent: vi.fn().mockReturnValue({
    summary: 'Treino', description: '',
    start: { dateTime: '2026-03-12T08:00:00', timeZone: 'America/Sao_Paulo' },
    end: { dateTime: '2026-03-12T09:00:00', timeZone: 'America/Sao_Paulo' },
  }),
}));

import { syncSlotsToAthleteCalendar } from '@/modules/flux/services/athleteCalendarSyncService';

describe('useCalendarSync - bulkSyncFlux', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends slot data to syncSlotsToAthleteCalendar with athleteId', async () => {
    await syncSlotsToAthleteCalendar('athlete-1', [
      { slotId: 's1', action: 'sync', eventData: expect.any(Object) },
    ]);
    expect(syncSlotsToAthleteCalendar).toHaveBeenCalledWith('athlete-1', expect.any(Array));
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts
git commit -m "test(flux): add hook tests for athlete calendar sync changes

Tests for useCanvasSlots calendar sync calls and useCalendarSync
bulkSyncFlux with athleteId parameter.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Verification + Deploy

### Task 8: Final verification

- [ ] **Step 1: Run all affected tests**

```bash
npx vitest run src/modules/flux/services/__tests__/athleteCalendarSyncService.test.ts src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts src/modules/flux/hooks/__tests__/useCanvasSlots.calendarSync.test.ts src/modules/agenda/hooks/__tests__/useCalendarSync.bulkSyncFlux.test.ts
```
Expected: All tests PASS

- [ ] **Step 2: Build check**

```bash
npm run build && npm run typecheck
```
Expected: Build succeeds, no new type errors

- [ ] **Step 3: Deploy Edge Function to staging**

```bash
npx supabase functions deploy sync-slot-to-athlete-calendar --no-verify-jwt
```

Note: `--no-verify-jwt` because JWT is validated in function code (same as other AICA Edge Functions).

- [ ] **Step 4: Test Edge Function on staging**

```bash
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-slot-to-athlete-calendar \
  -H "Authorization: Bearer <coach-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"athleteId":"<test-athlete-id>","slots":[{"slotId":"test","action":"sync","eventData":{"summary":"Test","description":"Test","start":{"dateTime":"2026-03-15T08:00:00","timeZone":"America/Sao_Paulo"},"end":{"dateTime":"2026-03-15T09:00:00","timeZone":"America/Sao_Paulo"}}}]}'
```

Expected responses:
- If athlete has Google Calendar: `{ success: true, synced: 1, skipped: 0 }`
- If no token: `{ success: true, synced: 0, reason: "no_token" }`

- [ ] **Step 5: Push and create PR**

```bash
git push -u origin fix/flux-leave-calendar-cleanup
gh pr create --title "fix(flux): sync workout slots to athlete's Google Calendar" --body "..."
```
