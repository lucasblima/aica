# Athlete Leave Training — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow athletes to self-service leave their coach's training program, automatically clearing workouts from their AICA agenda.

**Architecture:** Single UPDATE on `athletes` table (set `auth_user_id=NULL`, `invitation_status='none'`, `status='churned'`). Timeline provider auto-clears because `get_my_athlete_profile()` RPC returns nothing for unlinked athletes. New RLS policy scopes the athlete's UPDATE. Trigger guard on `athlete_email_status_sync` prevents silent re-link.

**Tech Stack:** Supabase (PostgreSQL migration + RLS), React 18, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-flux-leave-training-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/NNNN_athlete_self_unlink.sql` | RLS policy + trigger guard |
| Modify | `src/modules/flux/services/athleteService.ts:427` | Add `unlinkSelf()` static method |
| Create | `src/modules/flux/hooks/useLeaveTraining.ts` | Orchestrates unlink + error state + redirect |
| Modify | `src/modules/flux/views/AthletePortalView.tsx:463-469` | Add button + confirmation dialog in header |
| Create | `src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts` | Unit test for `unlinkSelf()` |
| Create | `src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts` | Unit test for hook |

---

## Chunk 1: Database Migration

### Task 1: Create migration — RLS policy + trigger guard

**Files:**
- Create: `supabase/migrations/20260311100000_athlete_self_unlink.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================================
-- Athlete Self-Unlink
--
-- Allows athletes to leave their coach's training program via self-service.
-- 1. RLS policy: athlete can UPDATE own record (scoped to unlink fields only)
-- 2. Trigger guard: athlete_email_status_sync skips churned athletes
-- ============================================================================

-- =====================
-- 1. RLS POLICY: athlete can unlink themselves
-- =====================

CREATE POLICY "Athletes can unlink themselves"
ON public.athletes FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth_user_id IS NULL
  AND invitation_status = 'none'
  AND status = 'churned'
);

-- =====================
-- 2. TRIGGER GUARD: skip churned athletes in athlete_email_status_sync
-- =====================

CREATE OR REPLACE FUNCTION public.athlete_email_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Skip athletes that explicitly left (churned) — prevent silent re-link
  IF NEW.status = 'churned' THEN
    RETURN NEW;
  END IF;

  -- Email was removed
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    -- Only reset if not already connected (don't break existing link)
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
    -- User exists → link immediately
    NEW.auth_user_id := v_auth_user_id;
    NEW.linked_at := NOW();
    NEW.invitation_status := 'connected';
  ELSE
    -- User doesn't exist yet → pending
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block athlete creation/update
    RAISE WARNING 'athlete_email_status_sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Verify migration syntax**

Run: `npx supabase db diff --local` (if local DB is available) or review SQL manually for syntax errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260311100000_athlete_self_unlink.sql
git commit -m "feat(flux): add RLS policy and trigger guard for athlete self-unlink"
```

---

## Chunk 2: Service + Tests

### Task 2: Write failing test for `unlinkSelf()`

**Files:**
- Create: `src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
/**
 * AthleteService.unlinkSelf() Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing service
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
    auth: {
      getUser: mockGetUser,
    },
  },
}));

// Must import AFTER mock setup
import { AthleteService } from '../athleteService';

describe('AthleteService.unlinkSelf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('updates athlete with auth_user_id=null, invitation_status=none, status=churned', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: null,
        invitation_status: 'none',
        status: 'churned',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'user-123');
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns error from supabase on failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    const dbError = new Error('RLS policy violation');
    mockEq.mockResolvedValue({ error: dbError });

    const result = await AthleteService.unlinkSelf();

    expect(result.error).toBe(dbError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts`
Expected: FAIL — `AthleteService.unlinkSelf is not a function`

### Task 3: Implement `unlinkSelf()`

**Files:**
- Modify: `src/modules/flux/services/athleteService.ts` (add after `getMyAthleteProfile()` at ~line 427)

- [ ] **Step 3: Write minimal implementation**

Add this method to the `AthleteService` class, after `getMyAthleteProfile()`:

```typescript
  /**
   * Unlink the current athlete from their coach's training program.
   * Sets auth_user_id=NULL, invitation_status='none', status='churned'.
   * No params — uses the authenticated user's ID (auth.uid()).
   */
  static async unlinkSelf(): Promise<{ error: Error | null }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('athletes')
        .update({
          auth_user_id: null,
          invitation_status: 'none',
          status: 'churned' as AthleteStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', userData.user.id);

      return { error };
    } catch (error) {
      console.error('[AthleteService] Error unlinking self:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/services/athleteService.ts src/modules/flux/services/__tests__/athleteService.unlinkSelf.test.ts
git commit -m "feat(flux): add AthleteService.unlinkSelf() with tests"
```

---

## Chunk 3: Hook + Tests

### Task 4: Write failing test for `useLeaveTraining` hook

**Files:**
- Create: `src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
/**
 * useLeaveTraining Hook Tests
 *
 * Run with:
 *   npx vitest run src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeaveTraining } from '../useLeaveTraining';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUnlinkSelf = vi.fn();
vi.mock('../../services/athleteService', () => ({
  AthleteService: {
    unlinkSelf: () => mockUnlinkSelf(),
  },
}));

describe('useLeaveTraining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with isLeaving=false, showConfirm=false, error=null', () => {
    const { result } = renderHook(() => useLeaveTraining());

    expect(result.current.isLeaving).toBe(false);
    expect(result.current.showConfirm).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('requestLeave opens confirmation', () => {
    const { result } = renderHook(() => useLeaveTraining());

    act(() => result.current.requestLeave());

    expect(result.current.showConfirm).toBe(true);
  });

  it('cancelLeave closes confirmation and clears error', () => {
    const { result } = renderHook(() => useLeaveTraining());

    act(() => result.current.requestLeave());
    act(() => result.current.cancelLeave());

    expect(result.current.showConfirm).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('confirmLeave calls unlinkSelf and navigates to / on success', async () => {
    mockUnlinkSelf.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useLeaveTraining());

    await act(async () => {
      await result.current.confirmLeave();
    });

    expect(mockUnlinkSelf).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(result.current.isLeaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('confirmLeave sets error on failure and does NOT navigate', async () => {
    mockUnlinkSelf.mockResolvedValue({ error: new Error('fail') });
    const { result } = renderHook(() => useLeaveTraining());

    await act(async () => {
      await result.current.confirmLeave();
    });

    expect(result.current.error).toBe('Erro ao sair do treino. Tente novamente.');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.isLeaving).toBe(false);
    expect(result.current.showConfirm).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts`
Expected: FAIL — cannot resolve `../useLeaveTraining`

### Task 5: Implement `useLeaveTraining` hook

**Files:**
- Create: `src/modules/flux/hooks/useLeaveTraining.ts`

- [ ] **Step 3: Write minimal implementation**

```typescript
/**
 * useLeaveTraining — orchestrates athlete self-unlink
 *
 * Provides: requestLeave() → showConfirm dialog → confirmLeave() → unlink + redirect
 * Error feedback is inline in the confirmation dialog (no toast library needed).
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AthleteService } from '../services/athleteService';

export function useLeaveTraining() {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLeave = useCallback(() => {
    setError(null);
    setShowConfirm(true);
  }, []);

  const cancelLeave = useCallback(() => {
    setShowConfirm(false);
    setError(null);
  }, []);

  const confirmLeave = useCallback(async () => {
    setIsLeaving(true);
    setError(null);

    const { error: unlinkError } = await AthleteService.unlinkSelf();

    if (unlinkError) {
      setError('Erro ao sair do treino. Tente novamente.');
      setIsLeaving(false);
      setShowConfirm(true);
      return;
    }

    setIsLeaving(false);
    navigate('/');
  }, [navigate]);

  return {
    isLeaving,
    showConfirm,
    error,
    requestLeave,
    cancelLeave,
    confirmLeave,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/hooks/useLeaveTraining.ts src/modules/flux/hooks/__tests__/useLeaveTraining.test.ts
git commit -m "feat(flux): add useLeaveTraining hook with tests"
```

---

## Chunk 4: UI Integration

### Task 6: Add "Sair do treino" button + confirmation dialog to AthletePortalView

**Files:**
- Modify: `src/modules/flux/views/AthletePortalView.tsx`

- [ ] **Step 1: Add import for useLeaveTraining and LogOut icon**

At the top of the file, add to the existing imports:

```typescript
// After: import { useMyAthleteProfile } from '../hooks/useMyAthleteProfile';
import { useLeaveTraining } from '../hooks/useLeaveTraining';

// Add LogOut to the lucide-react imports:
// existing: ArrowLeft, Clock, Eye, Leaf, ...
// add: LogOut
```

- [ ] **Step 2: Initialize the hook inside AthletePortalView**

Inside `AthletePortalView()`, after the existing hook declarations (around line 85):

```typescript
const { isLeaving, showConfirm, error: leaveError, requestLeave, cancelLeave, confirmLeave } = useLeaveTraining();
```

This must go BEFORE any early returns (before line 332 `if (isLoading)`).

- [ ] **Step 3: Add "Sair do treino" button in the header**

In the header section (around line 463-469), add the button after the existing back button, inside the `<div className="flex items-center justify-between mb-4">`:

```tsx
<button
  onClick={requestLeave}
  disabled={isLeaving}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-ceramic-error/80 hover:text-ceramic-error hover:bg-ceramic-error/10 transition-all disabled:opacity-50"
>
  <LogOut className="w-3.5 h-3.5" />
  Sair do treino
</button>
```

- [ ] **Step 4: Add confirmation dialog**

After the header `</header>` tag (after line 470), add the confirmation dialog:

```tsx
{/* Leave Training Confirmation */}
<AnimatePresence>
  {showConfirm && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-ceramic-base rounded-2xl shadow-lg p-6 max-w-sm w-full space-y-4"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <h2 className="text-lg font-black text-ceramic-text-primary">Sair do treino?</h2>
        <p className="text-sm text-ceramic-text-secondary leading-relaxed">
          Tem certeza que deseja sair do treino? Os exercicios serao removidos da sua agenda.
        </p>
        {leaveError && (
          <p className="text-sm text-ceramic-error font-medium">{leaveError}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={cancelLeave}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-ceramic-text-primary bg-ceramic-cool/60 hover:bg-ceramic-cool transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmLeave}
            disabled={isLeaving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-ceramic-error hover:bg-ceramic-error/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLeaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sair
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 5: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Build succeeds with 0 TypeScript errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run src/modules/flux/`
Expected: All flux tests pass

- [ ] **Step 7: Commit**

```bash
git add src/modules/flux/views/AthletePortalView.tsx
git commit -m "feat(flux): add 'Sair do treino' button with confirmation dialog"
```

---

## Final Verification

- [ ] **Step 1: Full build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, 0 errors

- [ ] **Step 2: Full test suite for modified files**

Run: `npx vitest run src/modules/flux/`
Expected: All pass (including new tests: 3 for unlinkSelf + 5 for useLeaveTraining)

- [ ] **Step 3: Visual check**

Open `http://localhost:5173/meu-treino` (as a linked athlete) and verify:
- "Sair do treino" button visible in header
- Click opens confirmation dialog
- Cancel closes dialog
- Confirm triggers unlink + redirect to home
