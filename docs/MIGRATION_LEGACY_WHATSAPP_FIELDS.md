# Migration Guide: Legacy WhatsApp Fields Deprecation

**Epic:** #122 - Multi-Instance WhatsApp Architecture
**Issue:** F3 - Eliminate Dual Source of Truth
**Status:** Phase 1 Complete (Backend), Phase 2 Pending (Frontend)

---

## Overview

WhatsApp connection state was previously stored in TWO places:
1. **Primary:** `whatsapp_sessions` table (multi-instance architecture)
2. **Legacy:** `users` table (`whatsapp_connected`, `whatsapp_phone`, etc.)

This dual storage caused state inconsistencies when the webhook updated both tables.

---

## Phase 1: Backend Migration (COMPLETE ✅)

### 1.1 Database Migration
**File:** `supabase/migrations/20260130000002_deprecate_legacy_whatsapp_fields.sql`

**Changes:**
- ✅ Marked legacy columns as `@deprecated` via SQL comments
- ✅ Created `users_whatsapp_compat` view for backward compatibility
- ✅ Granted RLS permissions on view
- ⏸️ Columns NOT removed yet (breaking change deferred to v2.0)

**Deprecated columns:**
- `users.whatsapp_connected` → Use `whatsapp_sessions.status = 'connected'`
- `users.whatsapp_connected_at` → Use `whatsapp_sessions.connected_at`
- `users.whatsapp_disconnected_at` → Use `whatsapp_sessions.disconnected_at`
- `users.whatsapp_phone` → Use `whatsapp_sessions.phone_number`
- `users.instance_name` → Use `whatsapp_sessions.instance_name`

### 1.2 Webhook Migration
**File:** `supabase/functions/webhook-evolution/index.ts` (line 1777-1796)

**Changes:**
- ✅ Removed dual write to `users` table
- ✅ Webhook now ONLY updates `whatsapp_sessions` table
- ✅ Added deprecation comment with migration timeline

**Before:**
```typescript
// Updated BOTH tables on CONNECTION_UPDATE event
await supabase.from('whatsapp_sessions').update(...)
await supabase.from('users').update(...) // REMOVED
```

**After:**
```typescript
// Only updates whatsapp_sessions table
await supabase.from('whatsapp_sessions').update(...)
// Legacy users table update removed (Issue F3)
```

---

## Phase 2: Frontend Migration (PENDING ⚠️)

### 2.1 Files Requiring Migration

#### ❌ **High Priority:** `src/hooks/useWhatsAppConnection.ts`
**Current behavior:** Reads from `users` table (lines 119-123, 329-383)

**Migration required:**
```typescript
// OLD (lines 119-123)
const { data } = await supabase
  .from('users')
  .select('whatsapp_connected, whatsapp_connected_at, whatsapp_disconnected_at, instance_name')
  .eq('id', user.id)
  .single()

// NEW (use whatsapp_sessions)
const { data } = await supabase
  .from('whatsapp_sessions')
  .select('status, connected_at, disconnected_at, instance_name, phone_number')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

// Map fields
const status: WhatsAppConnectionStatus = {
  isConnected: data?.status === 'connected',
  state: data?.status === 'connected' ? 'open' : 'disconnected',
  instanceName: data?.instance_name || EVOLUTION_INSTANCE_NAME,
  lastConnectedAt: data?.connected_at || null,
  lastDisconnectedAt: data?.disconnected_at || null,
  phone: data?.phone_number || null,
}
```

**Real-time subscription (lines 335-373):**
```typescript
// OLD (subscribes to users table)
supabase
  .channel('whatsapp-connection-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'users',
    filter: `id=eq.${user.id}`,
  }, ...)

// NEW (subscribe to whatsapp_sessions)
supabase
  .channel('whatsapp-connection-status')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'whatsapp_sessions',
    filter: `user_id=eq.${user.id}`,
  }, (payload) => {
    const session = payload.new as WhatsAppSession
    const newStatus: WhatsAppConnectionStatus = {
      isConnected: session.status === 'connected',
      state: session.status === 'connected' ? 'open' : 'disconnected',
      instanceName: session.instance_name,
      lastConnectedAt: session.connected_at,
      lastDisconnectedAt: session.disconnected_at,
      phone: session.phone_number,
    }
    setStatus(newStatus)
  })
```

---

#### ❌ **High Priority:** `src/services/whatsappService.ts`
**Current behavior:** Reads from `users` table (lines 289-316)

**Migration required:**
```typescript
// OLD (getConnectionStatus function, lines 289-316)
const { data } = await supabase
  .from('users')
  .select('whatsapp_connected, whatsapp_connected_at, whatsapp_disconnected_at, instance_name')
  .eq('id', user.id)
  .single()

return {
  isConnected: data?.whatsapp_connected || false,
  state: data?.whatsapp_connected ? 'open' : 'disconnected',
  instanceName: data?.instance_name || EVOLUTION_INSTANCE_NAME,
  lastConnectedAt: data?.whatsapp_connected_at || null,
  lastDisconnectedAt: data?.whatsapp_disconnected_at || null,
}

// NEW (use whatsapp_sessions)
const { data } = await supabase
  .from('whatsapp_sessions')
  .select('status, connected_at, disconnected_at, instance_name, phone_number')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

return {
  isConnected: data?.status === 'connected',
  state: data?.status === 'connected' ? 'open' : 'disconnected',
  instanceName: data?.instance_name || EVOLUTION_INSTANCE_NAME,
  lastConnectedAt: data?.connected_at || null,
  lastDisconnectedAt: data?.disconnected_at || null,
  phone: data?.phone_number || null,
}
```

---

#### ✅ **Already Correct:** `src/hooks/useWhatsAppSessionSubscription.ts`
**Status:** ✅ Uses `whatsapp_sessions` table correctly (line 54-66)

**No changes needed.** This hook is the reference implementation for how others should migrate.

---

### 2.2 Gamification Service
**File:** `src/services/gamificationService.ts` (line 254)

**Current behavior:**
```typescript
unlock_condition: 'whatsapp_connected',
```

**Migration required:**
This is a gamification achievement trigger. Need to:
1. Create new achievement condition: `whatsapp_session_connected`
2. Update unlock logic to check `whatsapp_sessions.status = 'connected'`
3. Migrate existing achievements to new condition

**Migration query:**
```sql
-- Update achievement unlock condition
UPDATE achievements
SET unlock_condition = 'whatsapp_session_connected'
WHERE unlock_condition = 'whatsapp_connected';
```

---

### 2.3 Grants Wizard Component
**File:** `src/modules/grants/components/wizard/OrganizationWizard.tsx` (lines 539-541)

**Current behavior:**
```typescript
awardFieldXp('whatsapp_connected', xp);
isAlreadyConnected={state.fieldXpMap['whatsapp_connected'] || false}
```

**Migration required:**
Change field name from `whatsapp_connected` to `whatsapp_session_connected`:
```typescript
awardFieldXp('whatsapp_session_connected', xp);
isAlreadyConnected={state.fieldXpMap['whatsapp_session_connected'] || false}
```

---

## Phase 3: Cleanup (v2.0 - Future)

### 3.1 Remove Deprecated Columns
**Migration:** `supabase/migrations/YYYYMMDD_remove_legacy_whatsapp_fields.sql`

```sql
-- Drop deprecated columns from users table
ALTER TABLE public.users
  DROP COLUMN IF EXISTS whatsapp_connected,
  DROP COLUMN IF EXISTS whatsapp_connected_at,
  DROP COLUMN IF EXISTS whatsapp_disconnected_at,
  DROP COLUMN IF EXISTS whatsapp_phone,
  DROP COLUMN IF EXISTS instance_name;

-- Drop backward-compatible view
DROP VIEW IF EXISTS public.users_whatsapp_compat;
```

**Prerequisites:**
- ✅ All frontend code migrated to `whatsapp_sessions`
- ✅ No direct queries to `users` table for WhatsApp fields
- ✅ Backward-compatible view no longer used
- ✅ All E2E tests passing with new schema

---

## Testing Checklist

### Backend Tests (Phase 1)
- [x] Migration applies without errors
- [x] View `users_whatsapp_compat` returns correct data
- [x] Webhook updates ONLY `whatsapp_sessions` table
- [x] RLS policies allow SELECT on view
- [ ] Load test: 1000 CONNECTION_UPDATE events (verify no users table writes)

### Frontend Tests (Phase 2 - Pending)
- [ ] `useWhatsAppConnection` reads from `whatsapp_sessions`
- [ ] Real-time subscription detects status changes
- [ ] QR code flow works end-to-end
- [ ] Pairing code flow works end-to-end
- [ ] Disconnect flow updates correct table
- [ ] Gamification achievements trigger correctly
- [ ] Grants wizard XP awards work

### E2E Tests (Phase 3 - Future)
- [ ] Fresh user connection flow
- [ ] Reconnection after disconnect
- [ ] Multi-tab synchronization
- [ ] Webhook → frontend real-time latency <2s

---

## Migration Timeline

| Phase | Status | Target Date | Owner |
|-------|--------|-------------|-------|
| **Phase 1: Backend** | ✅ Complete | 2026-01-30 | Backend Architect |
| **Phase 2: Frontend** | ⚠️ Pending | 2026-02-15 | Frontend Core |
| **Phase 3: Cleanup** | 📅 Scheduled | v2.0 (TBD) | Backend Architect |

---

## Rollback Plan

If issues arise in Phase 2 (frontend migration):

### Option A: Revert webhook to dual-write (temporary)
```typescript
// In webhook-evolution/index.ts, restore dual write:
await supabase.from('whatsapp_sessions').update(...)
await supabase.from('users').update(...) // Restore temporarily
```

### Option B: Use compatibility view
Frontend can query `users_whatsapp_compat` instead of migrating immediately:
```typescript
// Temporary bridge solution
const { data } = await supabase
  .from('users_whatsapp_compat')
  .select('whatsapp_connected, whatsapp_connected_at, instance_name')
  .eq('id', user.id)
  .single()
```

**Note:** Rollback should be temporary. Goal is full migration to `whatsapp_sessions`.

---

## References

- **Epic:** #122 - Multi-Instance WhatsApp Architecture
- **Issue:** F3 - Eliminate Dual Source of Truth
- **Migration:** `supabase/migrations/20260130000002_deprecate_legacy_whatsapp_fields.sql`
- **Webhook:** `supabase/functions/webhook-evolution/index.ts` (lines 1777-1796)
- **Reference Hook:** `src/hooks/useWhatsAppSessionSubscription.ts`

---

## Questions & Decisions

### Q: Why not remove columns immediately in Phase 1?
**A:** Removing columns is a breaking change. Deprecation-first allows:
1. Gradual frontend migration without breaking existing code
2. Rollback option if issues arise
3. Monitoring period to catch any missed consumers

### Q: How long will the compatibility view exist?
**A:** Until v2.0 release, estimated 2-3 months. All frontend code should migrate to `whatsapp_sessions` by then.

### Q: What happens to existing user data?
**A:** Legacy fields remain in `users` table until Phase 3. The compatibility view merges old + new data, prioritizing `whatsapp_sessions` values.

---

**Last Updated:** 2026-01-30
**Next Review:** 2026-02-15 (Phase 2 completion check)
