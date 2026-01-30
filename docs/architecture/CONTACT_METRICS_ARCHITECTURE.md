# Contact Metrics Architecture: Message Count & Last Activity

**Issue**: Improve WhatsApp Contacts page ordering with message metrics
**Date**: 2026-01-29
**Status**: Design Phase
**Author**: Master Architect Agent

---

## 1. Executive Summary

This document outlines the architecture for implementing contact message metrics in the Aica Life OS Contacts page. The feature enables users to sort contacts by:
- **Volume of messages** (total message count)
- **Recent activity** (date of last message)

### Key Design Decisions
1. **Hybrid approach**: Aggregate metrics from local DB (primary) + Evolution API sync (supplement)
2. **Privacy-first**: Count-only metrics, no message content analysis required
3. **Database-centric**: Leverage existing `whatsapp_messages` table for aggregation
4. **Incremental sync**: Update metrics on webhook events, with periodic batch refresh

---

## 2. Investigation Findings

### 2.1 Evolution API Capabilities

Based on [Evolution API documentation](https://doc.evolution-api.com) and [GitHub issues](https://github.com/EvolutionAPI/evolution-api/issues/925):

| Endpoint | Returns | Metrics Available |
|----------|---------|-------------------|
| `GET /chat/findChats/{instance}` | Chat list | `conversationTimestamp`, `lastMessage` (partial support) |
| `POST /chat/findContacts/{instance}` | Contact list | `lastMessageTimestamp` (some versions) |
| `POST /chat/findMessages/{instance}` | Messages | Full message list (requires pagination) |

**Limitations Identified**:
- `unreadCount` and `msgCount` are **feature requests**, not universally implemented
- `lastMessage` field has **known bugs** in some versions ([#1437](https://github.com/EvolutionAPI/evolution-api/issues/1437))
- No direct "message count per contact" endpoint exists

**Recommendation**: Do NOT rely solely on Evolution API for metrics. Use local database aggregation.

### 2.2 Current Database Schema

The `contact_network` table already has relevant columns:

```sql
-- From 20260127_contact_network_complete_schema.sql
whatsapp_message_count INTEGER DEFAULT 0,  -- Already exists!
whatsapp_sentiment_avg NUMERIC,
last_whatsapp_message_at TIMESTAMPTZ,      -- Already exists!
interaction_count INTEGER DEFAULT 0,
last_interaction_at TIMESTAMPTZ,
```

The `whatsapp_messages` table stores message history:

```sql
-- Key columns for aggregation
user_id UUID,
contact_id UUID REFERENCES contact_network(id),
message_direction TEXT,  -- 'incoming' or 'outgoing'
message_timestamp TIMESTAMPTZ,
```

### 2.3 Existing Health Score System

The `calculate_health_score_components` function (Issue #144) already performs message aggregation:

```sql
SELECT
  COUNT(*),
  COUNT(*) FILTER (WHERE message_direction = 'incoming'),
  COUNT(*) FILTER (WHERE message_direction = 'outgoing')
FROM whatsapp_messages wm
WHERE wm.user_id = _user_id
  AND wm.contact_id = _contact_id
  AND wm.message_timestamp >= (now() - make_interval(days => _lookback_days));
```

**Insight**: We can extend this pattern for contact-level metrics caching.

---

## 3. Proposed Architecture

### 3.1 Data Flow Diagram

```
                                    +-------------------+
                                    |  Evolution API    |
                                    | (WhatsApp Source) |
                                    +--------+----------+
                                             |
                              webhook: MESSAGES_UPSERT
                                             |
                                             v
+------------------+              +---------------------+
|    Frontend      |   fetch      |  webhook-evolution  |
| ConnectionsWA    | <--------+   |   Edge Function     |
|   Contacts Tab   |          |   +----------+----------+
+------------------+          |              |
         |                    |              | storeMessage()
         | useWhatsAppContacts|              v
         v                    |   +---------------------+
+------------------+          |   |  whatsapp_messages  |
| contact_network  | <--------+   |       Table         |
| (cached metrics) |              +----------+----------+
+------------------+                         |
         ^                                   |
         |                        record_contact_metrics()
         |                                   |
         +-----------------------------------+
                    Trigger / RPC
```

### 3.2 Component Design

#### A. Database Layer (New RPC Function)

Create `update_contact_message_metrics` function:

```sql
CREATE OR REPLACE FUNCTION update_contact_message_metrics(
  _contact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _result JSONB;
  _total_count INTEGER;
  _incoming_count INTEGER;
  _outgoing_count INTEGER;
  _last_message_at TIMESTAMPTZ;
BEGIN
  -- Aggregate from whatsapp_messages
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE message_direction = 'incoming'),
    COUNT(*) FILTER (WHERE message_direction = 'outgoing'),
    MAX(message_timestamp)
  INTO
    _total_count,
    _incoming_count,
    _outgoing_count,
    _last_message_at
  FROM whatsapp_messages
  WHERE contact_id = _contact_id;

  -- Update contact_network cache
  UPDATE contact_network
  SET
    whatsapp_message_count = _total_count,
    last_whatsapp_message_at = _last_message_at,
    interaction_count = _total_count,
    last_interaction_at = _last_message_at,
    updated_at = now()
  WHERE id = _contact_id;

  RETURN jsonb_build_object(
    'total', _total_count,
    'incoming', _incoming_count,
    'outgoing', _outgoing_count,
    'last_message_at', _last_message_at
  );
END;
$$;
```

#### B. Webhook Handler Update

In `webhook-evolution/index.ts`, after `storeMessage()`:

```typescript
// After storing message successfully
if (result) {
  // Update contact metrics (non-blocking)
  supabase.rpc('update_contact_message_metrics', {
    _contact_id: result.contactId
  }).then(() => {
    log('DEBUG', 'Contact metrics updated', { contactId: result.contactId });
  }).catch(err => {
    log('WARN', 'Failed to update metrics (non-critical)', err.message);
  });
}
```

#### C. Batch Refresh Function

For historical data and recovery:

```sql
CREATE OR REPLACE FUNCTION batch_update_contact_metrics(
  _user_id UUID,
  _limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _contact RECORD;
  _processed INTEGER := 0;
BEGIN
  FOR _contact IN
    SELECT id FROM contact_network
    WHERE user_id = _user_id
      AND sync_source = 'whatsapp'
      AND (
        whatsapp_message_count IS NULL
        OR whatsapp_message_count = 0
        OR updated_at < now() - INTERVAL '1 day'
      )
    LIMIT _limit
  LOOP
    PERFORM update_contact_message_metrics(_contact.id);
    _processed := _processed + 1;
  END LOOP;

  RETURN _processed;
END;
$$;
```

#### D. Frontend Integration

Update `useWhatsAppContacts.ts`:

```typescript
export interface WhatsAppContact {
  // ... existing fields
  whatsapp_message_count: number;
  last_whatsapp_message_at: string | null;
}

export type ContactSortField = 'name' | 'message_count' | 'last_activity';
export type ContactSortOrder = 'asc' | 'desc';

interface UseWhatsAppContactsOptions {
  sortBy?: ContactSortField;
  sortOrder?: ContactSortOrder;
}

// In fetchContacts:
const query = supabase
  .from('contact_network')
  .select('*', { count: 'exact' })
  .eq('user_id', session.user.id)
  .eq('sync_source', 'whatsapp');

// Apply sorting
switch (sortBy) {
  case 'message_count':
    query.order('whatsapp_message_count', { ascending: sortOrder === 'asc', nullsFirst: false });
    break;
  case 'last_activity':
    query.order('last_whatsapp_message_at', { ascending: sortOrder === 'asc', nullsFirst: false });
    break;
  default:
    query.order('whatsapp_name', { ascending: true });
}
```

#### E. UI Component

In `ConnectionsWhatsAppTab.tsx`, add sort controls:

```tsx
const [sortBy, setSortBy] = useState<ContactSortField>('last_activity');
const [sortOrder, setSortOrder] = useState<ContactSortOrder>('desc');

// Sort selector component
<div className="flex gap-2 items-center">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as ContactSortField)}
    className="ceramic-inset px-3 py-2 rounded-xl text-sm"
  >
    <option value="name">Nome</option>
    <option value="message_count">Volume de mensagens</option>
    <option value="last_activity">Atividade recente</option>
  </select>

  <button
    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
    className="ceramic-card p-2 rounded-xl"
  >
    {sortOrder === 'asc' ? <ArrowUp /> : <ArrowDown />}
  </button>
</div>
```

---

## 4. Migration Plan

### 4.1 New Migration: `20260130_contact_message_metrics.sql`

```sql
-- =============================================================================
-- Migration: Contact Message Metrics
-- Issue: WhatsApp Contacts sorting by volume and recency
-- =============================================================================

-- 1. Ensure columns exist (idempotent)
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0;

ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS last_whatsapp_message_at TIMESTAMPTZ;

-- 2. Create indexes for sorting performance
CREATE INDEX IF NOT EXISTS idx_contact_network_message_count
ON contact_network(user_id, whatsapp_message_count DESC NULLS LAST)
WHERE sync_source = 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_contact_network_last_message
ON contact_network(user_id, last_whatsapp_message_at DESC NULLS LAST)
WHERE sync_source = 'whatsapp';

-- 3. Create metrics update function
CREATE OR REPLACE FUNCTION update_contact_message_metrics(
  _contact_id UUID
) RETURNS JSONB
-- [Full function as shown in Section 3.2.A]

-- 4. Create batch update function
CREATE OR REPLACE FUNCTION batch_update_contact_metrics(
  _user_id UUID,
  _limit INTEGER DEFAULT 500
) RETURNS INTEGER
-- [Full function as shown in Section 3.2.C]

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION update_contact_message_metrics TO service_role;
GRANT EXECUTE ON FUNCTION batch_update_contact_metrics TO service_role;
GRANT EXECUTE ON FUNCTION batch_update_contact_metrics TO authenticated;
```

### 4.2 Data Backfill

After migration, run one-time backfill via Edge Function or SQL:

```sql
-- Backfill existing contacts with message counts
SELECT batch_update_contact_metrics(id, 1000)
FROM auth.users;
```

---

## 5. Edge Function Changes

### 5.1 `webhook-evolution/index.ts`

**Location**: `storeMessage()` function return
**Change**: Add RPC call to update metrics

```diff
+ // After successful message store
+ if (result) {
+   // Fire-and-forget metrics update
+   supabase.rpc('update_contact_message_metrics', {
+     _contact_id: result.contactId
+   }).catch(err => {
+     log('WARN', 'Metrics update failed (non-critical)', err.message);
+   });
+ }
```

### 5.2 `sync-whatsapp-contacts/index.ts`

**Location**: After contact upsert
**Change**: Trigger metrics calculation for new contacts

```diff
+ // After syncing all contacts
+ if (sessionId) {
+   // Batch update metrics for this user
+   await supabase.rpc('batch_update_contact_metrics', {
+     _user_id: userId,
+     _limit: 500
+   });
+ }
```

### 5.3 New Edge Function: `refresh-contact-metrics`

Optional: For manual refresh or scheduled jobs.

---

## 6. Complexity Estimates

| Component | Complexity | Estimate |
|-----------|------------|----------|
| Migration SQL | Low | 2h |
| RPC Functions | Medium | 3h |
| Webhook update | Low | 1h |
| useWhatsAppContacts hook update | Medium | 2h |
| UI Sort controls | Low | 2h |
| Testing & validation | Medium | 3h |
| **Total** | | **13h** |

---

## 7. Privacy Considerations

- **No content access**: Only counts and timestamps, never message text
- **Aggregate only**: No per-message analysis for sorting
- **LGPD compliant**: Metrics respect existing consent system
- **User-scoped**: RLS ensures users see only their own metrics

---

## 8. Alternative Approaches (Not Recommended)

### A. Real-time Evolution API Fetch
- **Pros**: Always current
- **Cons**: API rate limits, latency, unreliable `msgCount` field

### B. Client-side Aggregation
- **Pros**: No backend changes
- **Cons**: Slow, inefficient, can't paginate properly

### C. Materialized View
- **Pros**: Pre-computed, fast reads
- **Cons**: Stale data, refresh overhead, Supabase limitations

---

## 9. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Sort latency | <200ms | Browser DevTools |
| Metric accuracy | >99% | Compare to manual count |
| Webhook overhead | <50ms | Edge Function logs |

---

## 10. Next Steps

1. [ ] Review architecture with backend-architect-supabase agent
2. [ ] Create migration file
3. [ ] Update webhook-evolution Edge Function
4. [ ] Update useWhatsAppContacts hook
5. [ ] Add sort UI to ConnectionsWhatsAppTab
6. [ ] Run backfill for existing users
7. [ ] Test with production-like data volume

---

## 11. Related Issues & Documents

- **Issue #92**: Contacts list integration (base implementation)
- **Issue #122**: Multi-Instance WhatsApp Architecture
- **Issue #144**: Automated Relationship Health Score (reuses aggregation patterns)
- **Migration**: `20260127_contact_network_complete_schema.sql`
- **Hook**: `src/hooks/useWhatsAppContacts.ts`
- **View**: `src/modules/connections/views/ConnectionsWhatsAppTab.tsx`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-29
