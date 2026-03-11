# Spec: Athlete Leave Training (Flux Module)

**Date:** 2026-03-11
**Session:** feat-flux-leave-training
**Status:** Approved

## Problem

Athletes currently cannot leave a training program prescribed by their coach. Once linked via `athletes.auth_user_id`, there is no self-service way to disconnect. Workout exercises continue to appear in the athlete's AICA agenda (via the Flux timeline provider).

## Solution

Add a "Sair do treino" (Leave training) flow to the Athlete Portal (`/meu-treino`) that:

1. Unlinks the athlete from their AICA user account
2. Automatically clears workout events from the AICA agenda (timeline provider returns nothing for unlinked athletes)
3. Redirects to home

The coach retains the athlete record (for history) but the athlete loses portal access.

### Why No Google Calendar Cleanup

Google Calendar sync is **coach-owned**: only `useCanvasSlots` (coach canvas view) calls `syncEntityToGoogle`. The athlete portal has no calendar sync logic. Therefore:
- `calendar_sync_map` entries for Flux are under the **coach's** `user_id`
- The athlete has no Google Calendar events to clean up
- The AICA agenda uses a timeline provider (`fluxProvider.ts`) that computes events on-demand from `get_my_athlete_profile()` — once `auth_user_id` is NULL, it returns nothing

## User Flow

1. Athlete is on `/meu-treino` (`AthletePortalView`)
2. Clicks "Sair do treino" button (in the header area)
3. Confirmation dialog appears: "Tem certeza que deseja sair do treino? Os exercicios serao removidos da sua agenda."
4. Athlete confirms -> loading state shown
5. System executes:
   - Update `athletes` record: `auth_user_id = NULL`, `invitation_status = 'none'`, `status = 'churned'`
6. Success toast: "Voce saiu do treino com sucesso."
7. Redirect to `/` (home)

## Architecture

### Components

| Layer | File | Change |
|-------|------|--------|
| **UI** | `src/modules/flux/views/AthletePortalView.tsx` | Add "Sair do treino" button + confirmation dialog |
| **Hook** | `src/modules/flux/hooks/useLeaveTraining.ts` (new) | Orchestrates unlink flow |
| **Service** | `src/modules/flux/services/athleteService.ts` | New `unlinkSelf()` method (no params, uses auth.uid()) |
| **Migration** | `supabase/migrations/NNNN_athlete_self_unlink.sql` | RLS policy + guard `athlete_email_status_sync` trigger |

### Data Changes

**No new tables or columns.** Only new RLS policy + trigger guard + service method.

#### athletes unlink
```sql
UPDATE athletes
SET auth_user_id = NULL,
    invitation_status = 'none',
    status = 'churned',
    updated_at = now()
WHERE auth_user_id = auth.uid();
```

### RLS Policy (New Migration)

The athlete needs permission to UPDATE their own `athletes` record (currently only coaches can update). A scoped policy:

```sql
CREATE POLICY "Athletes can unlink themselves"
ON athletes FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth_user_id IS NULL
  AND invitation_status = 'none'
  AND status = 'churned'
);
```

PostgreSQL evaluates `USING` against the pre-update row (where `auth_user_id` still matches `auth.uid()`) and `WITH CHECK` against the post-update row. No conflict.

**Coexistence:** The existing coach UPDATE policy uses `user_id = auth.uid()` (coach's column). The new athlete policy uses `auth_user_id = auth.uid()` (athlete's column). Different principals, no conflict.

### Trigger Guard: Prevent Re-Link After Leave

Two triggers can auto-link athletes. After leaving, we must prevent silent re-linking:

**`link_athlete_on_signup`** (fires on `auth.users` INSERT): Already safe — has `AND invitation_status = 'pending'` guard. After unlink, `invitation_status = 'none'`, so it won't match.

**`athlete_email_status_sync`** (fires on `athletes` UPDATE OF email): **Vulnerable** — if the coach edits the athlete's email, this trigger checks `auth.users` for a matching email and re-links without checking status. The migration adds a guard:

```sql
CREATE OR REPLACE FUNCTION public.athlete_email_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Skip athletes that explicitly left (churned)
  IF NEW.status = 'churned' THEN
    RETURN NEW;
  END IF;

  -- Email was removed
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'none';
    END IF;
    RETURN NEW;
  END IF;

  -- Check if a user with this email already exists
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    NEW.auth_user_id := v_auth_user_id;
    NEW.linked_at := NOW();
    NEW.invitation_status := 'connected';
  ELSE
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'athlete_email_status_sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This ensures leaving is durable — the athlete won't be re-linked until the coach explicitly changes their status from `churned` back to `active`/`trial`.

### Timeline Provider (Auto-Clears)

`fluxProvider.ts` queries workout slots via `get_my_athlete_profile()` RPC, which finds the athlete by `auth.uid() = auth_user_id`. Once `auth_user_id` is NULL, the RPC returns nothing — timeline events auto-clear with zero additional code.

### Error Handling

- If athlete unlink fails: show error toast, do NOT redirect. Athlete can retry.
- Network errors: standard Supabase error handling via the hook.

## Security

- Athlete can only unlink themselves (`auth.uid() = auth_user_id`)
- RLS policy is tightly scoped: only allows setting `auth_user_id = NULL` + `invitation_status = 'none'` + `status = 'churned'`
- Trigger guard on `athlete_email_status_sync` prevents silent re-link of churned athletes
- Coach retains athlete record (no data loss for coach)

## Edge Cases

1. **No active microcycle**: Still allow leaving — the unlink is about the athlete-coach link, not a specific microcycle
2. **Coach prescribes new workout after leave**: Coach sees athlete as `churned`. If they prescribe anyway, athlete won't see it (no `auth_user_id` link).
3. **Coach changes status back to active**: This enables re-linking via `athlete_email_status_sync` trigger — intentional behavior for re-invitation.

## Out of Scope

- Coach-initiated removal (already exists via `deleteAthlete`)
- "Pause" functionality (different from leaving)
- Re-joining after leaving (coach would need to change status from `churned` back to `active` and re-invite)
- Notification to coach when athlete leaves (future enhancement)
