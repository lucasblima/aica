# Spec: Athlete Leave Training (Flux Module)

**Date:** 2026-03-11
**Session:** feat-flux-leave-training
**Status:** Approved

## Problem

Athletes currently cannot leave a training program prescribed by their coach. Once linked via `athletes.auth_user_id`, there is no self-service way to disconnect. The athlete's Google Calendar retains synced workout events even if the relationship should end.

## Solution

Add a "Sair do treino" (Leave training) flow to the Athlete Portal (`/meu-treino`) that:

1. Removes all Flux workout events from the athlete's Google Calendar
2. Unlinks the athlete from their AICA user account
3. Redirects to home

The coach retains the athlete record (for history) but the athlete loses portal access.

## User Flow

1. Athlete is on `/meu-treino` (`AthletePortalView`)
2. Clicks "Sair do treino" button (in the header area)
3. Confirmation dialog appears: "Tem certeza que deseja sair do treino? Os exercicios serao removidos da sua agenda do Google Calendar."
4. Athlete confirms -> loading state shown
5. System executes:
   a. Batch delete `calendar_sync_map` entries where `user_id = auth.uid()` AND `module = 'flux'`
   b. For each deleted mapping, call Google Calendar API to delete the event
   c. Update `athletes` record: `auth_user_id = NULL`, `invitation_status = 'none'`, `status = 'churned'`
6. Success toast: "Voce saiu do treino. Os exercicios foram removidos da sua agenda."
7. Redirect to `/` (home)

## Architecture

### Components

| Layer | File | Change |
|-------|------|--------|
| **UI** | `src/modules/flux/views/AthletePortalView.tsx` | Add "Sair do treino" button + confirmation dialog |
| **Hook** | `src/modules/flux/hooks/useLeaveTraining.ts` (new) | Orchestrates unsync + unlink flow |
| **Service** | `src/modules/flux/services/athleteService.ts` | New `unlinkSelf()` method (no params, uses auth.uid()) |
| **Calendar** | `src/modules/agenda/services/calendarSyncService.ts` | New `unsyncAllFluxEvents(userId)` method (pre-existing cross-module pattern) |
| **Migration** | `supabase/migrations/NNNN_athlete_self_unlink.sql` | RLS policy + update `link_athlete_on_signup` trigger |

### Data Changes

**No new tables or columns.** Only new RLS policy + service methods.

#### calendar_sync_map cleanup
```sql
-- Delete all Flux sync mappings for this user
DELETE FROM calendar_sync_map
WHERE user_id = $1 AND module = 'flux'
RETURNING google_event_id;
-- For each returned google_event_id, call Google Calendar API to delete
```

#### athletes unlink
```sql
UPDATE athletes
SET auth_user_id = NULL,
    invitation_status = 'none',
    status = 'churned',
    updated_at = now()
WHERE auth_user_id = $1;
```

### RLS Policy (New Migration)

The athlete needs permission to UPDATE their own `athletes` record (currently only coaches can update). A scoped policy:

```sql
-- RLS: athlete can unlink themselves (USING checks pre-update row, WITH CHECK checks post-update row)
CREATE POLICY "Athletes can unlink themselves"
ON athletes FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth_user_id IS NULL
  AND invitation_status = 'none'
  AND status = 'churned'
);
```

This policy scopes the athlete's UPDATE to exactly the unlink operation: `auth_user_id = NULL`, `invitation_status = 'none'`, `status = 'churned'`. PostgreSQL evaluates `USING` against the pre-update row (where `auth_user_id` still matches `auth.uid()`) and `WITH CHECK` against the post-update row. No conflict.

**Note:** This coexists with the existing coach UPDATE policy (`user_id = auth.uid()`), which uses the coach's `user_id` column. The two policies target different principals and do not conflict.

### Trigger Guard: Prevent Re-Link After Leave

The existing `link_athlete_on_signup` trigger auto-links athletes by email on signup. Without a guard, a churned athlete could be silently re-linked if the coach updates the athlete record. The migration adds a guard:

```sql
-- Update trigger to skip churned athletes
CREATE OR REPLACE FUNCTION public.link_athlete_on_signup()
RETURNS trigger AS $$
BEGIN
  -- Skip athletes that explicitly left (churned)
  IF NEW.status = 'churned' THEN
    RETURN NEW;
  END IF;
  -- ... existing linking logic ...
END;
$$ LANGUAGE plpgsql;
```

This ensures leaving is durable — the athlete won't be re-linked until the coach explicitly changes their status back to `active`/`trial`.

### Timeline Provider

`fluxProvider.ts` already queries workout slots via `get_my_athlete_profile()` RPC, which finds the athlete by `auth.uid() = auth_user_id`. Once `auth_user_id` is NULL, the RPC returns nothing — timeline events auto-clear.

### Google Calendar Cleanup

The `unsyncAllFluxEvents()` method:
1. Queries `calendar_sync_map` for all entries where `module = 'flux'` and `user_id = auth.uid()`
2. Collects all `google_event_id` values
3. Deletes the `calendar_sync_map` rows
4. For each `google_event_id`, calls `googleCalendarService.deleteEvent()` **sequentially** (matching existing `bulkSyncFluxSlots` pattern to respect Google API rate limits)
5. If Google API fails for individual events, logs warning but continues

**Cross-module note:** `calendarSyncService.ts` is in the `agenda` module but is already imported by flux hooks (`useCanvasCalendar`, `useFluxAgendaEvents`). This is a pre-existing cross-module pattern — `calendarSyncService` acts as a shared calendar sync service. Adding `unsyncAllFluxEvents` follows this established pattern.

### Error Handling

- If Google Calendar cleanup fails partially: log warnings, proceed with unlink. Orphaned Google Calendar events are acceptable (athlete can delete manually).
- If athlete unlink fails: show error toast, do NOT redirect. Athlete can retry.
- If athlete is not connected to Google Calendar: skip calendar cleanup entirely, just unlink.

## Security

- Athlete can only unlink themselves (`auth.uid() = auth_user_id`)
- RLS policy is scoped: only allows setting `auth_user_id = NULL` + `invitation_status = 'none'` + `status = 'churned'`
- Trigger guard prevents silent re-link of churned athletes
- Coach retains athlete record (no data loss for coach)
- No API keys exposed (Google Calendar uses athlete's OAuth token via frontend)

## Edge Cases

1. **Athlete not connected to Google Calendar**: Skip calendar cleanup, just unlink
2. **No active microcycle**: Still allow leaving (cleanup sync map entries if any)
3. **Browser closed during cleanup**: Partial state — Google events may remain but athlete is unlinked on next DB write. Acceptable tradeoff.
4. **Coach prescribes new workout after leave**: Coach sees athlete as `churned`, should not prescribe. If they do, athlete won't see it (no `auth_user_id` link).

## Out of Scope

- Coach-initiated removal (already exists via `deleteAthlete`)
- "Pause" functionality (different from leaving)
- Re-joining after leaving (coach would need to change status from `churned` back to `active` and re-invite)
- Notification to coach when athlete leaves (future enhancement)
