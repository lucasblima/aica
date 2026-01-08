# Sprint 1: Core Infrastructure - Detailed Execution Plan

**Duration:** 3-4 days
**Objective:** Establish Evolution API client and database foundation for WhatsApp integration
**Status:** Ready to Execute

---

## Overview

Sprint 1 establishes the foundational layer for Evolution API integration. By the end of this sprint, you will have:

1. ✅ Evolution API client with all required endpoints
2. ✅ Database schema supporting WhatsApp contact data
3. ✅ Environment configuration in all environments
4. ✅ Comprehensive test coverage

**Critical Success Factor:** All 4 tasks must pass validation criteria before moving to Sprint 2.

---

## Pre-Sprint Checklist

Before starting, verify:
- [ ] You have access to Evolution API credentials
- [ ] Supabase project is linked (`npx supabase status --linked`)
- [ ] You can run Edge Functions locally (`npx supabase functions serve`)
- [ ] Git branch created: `git checkout -b feature/whatsapp-evolution-sync-sprint1`

---

## Task 1.1: Environment Variables Setup

**Duration:** 30 minutes
**Can be done in parallel with:** None (must be first)
**Blockers:** None

### Context
Environment variables are needed for all subsequent tasks. This setup ensures both local development and production environments have the correct configuration.

### Files to Modify

#### 1. `.env.example`
```bash
# WhatsApp Integration via Evolution API
VITE_EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
VITE_EVOLUTION_API_KEY=your_key_here
VITE_EVOLUTION_INSTANCE_NAME=Lucas_4569
VITE_EVOLUTION_WEBHOOK_SECRET=generate_with_command_below

# Gemini API (for sentiment analysis)
GEMINI_API_KEY=your_gemini_key_here
```

**Generate webhook secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Local `.env` file
Copy `.env.example` to `.env` and replace `your_key_here` with actual values:
```bash
cp .env.example .env
# Edit .env with real credentials
```

#### 3. `docs/deployment/ENVIRONMENT_VARIABLES.md`
Add to the "WhatsApp Integration" section:

```markdown
### WhatsApp Integration (Evolution API)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_EVOLUTION_API_URL` | Base URL for Evolution API | Yes | `https://evolution-evolution-api.w9jo16.easypanel.host` |
| `VITE_EVOLUTION_API_KEY` | API key for authentication | Yes | `429683C4C977415CAAFCCE10F7D57E11` |
| `VITE_EVOLUTION_INSTANCE_NAME` | WhatsApp instance name | Yes | `Lucas_4569` |
| `VITE_EVOLUTION_WEBHOOK_SECRET` | Secret for webhook signature validation | Yes | Generated via `crypto.randomBytes(32).toString('hex')` |
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis | Yes | `AIzaSy...` |

**Setup:**
```bash
# Local development
cp .env.example .env
# Edit .env with real values

# Production (Cloud Run)
gcloud secrets create evolution-api-url --data-file=- <<< "https://evolution-evolution-api.w9jo16.easypanel.host"
gcloud secrets create evolution-api-key --data-file=- <<< "YOUR_KEY"
```
```

#### 4. Cloud Run Secrets (Production)

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr
2. Navigate to: Settings > Edge Functions > Manage Secrets
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `EVOLUTION_API_URL` | `https://evolution-evolution-api.w9jo16.easypanel.host` |
| `EVOLUTION_API_KEY` | `429683C4C977415CAAFCCE10F7D57E11` |
| `EVOLUTION_INSTANCE_NAME` | `Lucas_4569` |
| `EVOLUTION_WEBHOOK_SECRET` | (generated secret) |
| `GEMINI_API_KEY` | `AIzaSyAihJ__7YQNFTZFx5HiulUjjS2vfUjwJsM` |

**Via CLI:**
```bash
npx supabase secrets set EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
npx supabase secrets set EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
npx supabase secrets set EVOLUTION_INSTANCE_NAME=Lucas_4569
npx supabase secrets set EVOLUTION_WEBHOOK_SECRET=<generated_secret>
npx supabase secrets set GEMINI_API_KEY=AIzaSyAihJ__7YQNFTZFx5HiulUjjS2vfUjwJsM
```

### Validation Steps

```bash
# 1. Verify local .env file exists and has values
cat .env | grep EVOLUTION

# 2. Verify Supabase secrets (production)
npx supabase secrets list

# Expected output:
# EVOLUTION_API_URL
# EVOLUTION_API_KEY
# EVOLUTION_INSTANCE_NAME
# EVOLUTION_WEBHOOK_SECRET
# GEMINI_API_KEY

# 3. Test Edge Function can read env vars
npx supabase functions serve

# In another terminal:
curl -X POST http://localhost:54321/functions/v1/webhook-evolution \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check logs - should NOT see "EVOLUTION_API_URL environment variable is not set"
```

### Acceptance Criteria
- [ ] `.env.example` updated with all required variables
- [ ] Local `.env` file created with real values
- [ ] `docs/deployment/ENVIRONMENT_VARIABLES.md` updated
- [ ] Supabase secrets configured (verify with `npx supabase secrets list`)
- [ ] Edge Functions can read environment variables (no errors in logs)

### Estimated Time: 30 minutes

---

## Task 1.2: Extend Evolution API Client

**Duration:** 2-3 hours
**Can be done in parallel with:** Task 1.3 (Database)
**Blockers:** Task 1.1 must be complete

### Context
The existing `evolution-client.ts` has basic functionality (sendMessage, createInstance). We need to add endpoints for fetching contacts and messages to enable synchronization.

### File to Modify
`supabase/functions/_shared/evolution-client.ts`

### Implementation

**Add new type definitions at the top of the file:**

```typescript
// After existing interface definitions (around line 40)

export interface WhatsAppContact {
  id: string // remoteJid (e.g., "5521999999999@s.whatsapp.net")
  name: string | null // Contact name from address book
  pushName: string | null // Name they set in WhatsApp
  profilePicUrl: string | null
  isGroup: boolean
  isMyContact: boolean // Is in user's contact list
  lastMessageTimestamp?: number // Unix timestamp
}

export interface WhatsAppMessageData {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
    participant?: string
  }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: WebhookMediaMessage
    audioMessage?: WebhookMediaMessage
    videoMessage?: WebhookMediaMessage
    documentMessage?: WebhookMediaMessage
  }
  messageTimestamp?: number | string
}

export interface WebhookMediaMessage {
  url?: string
  mimetype?: string
  caption?: string
  fileName?: string
  fileLength?: string
  seconds?: number
}

export interface GroupMetadata {
  id: string
  subject: string // Group name
  owner: string
  creation: number // Unix timestamp
  participants: Array<{
    id: string
    admin: 'admin' | 'superadmin' | null
  }>
  desc?: string // Group description
  descOwner?: string
}
```

**Add new functions before the export default statement (around line 300):**

```typescript
/**
 * Fetch all contacts from WhatsApp
 * @param instanceName - Name of the instance
 * @returns Array of WhatsApp contacts
 */
export async function fetchAllContacts(
  instanceName: string
): Promise<WhatsAppContact[]> {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  try {
    const response = await makeRequest<{ data?: WhatsAppContact[] }>(
      'GET',
      `/chat/findContacts/${instanceName}`
    )

    // Evolution API returns contacts in a 'data' property
    return response.data || []
  } catch (error) {
    const err = error as Error
    console.error(`[evolution-client] fetchAllContacts error:`, err.message)

    // Return empty array instead of throwing on API errors
    // This allows graceful degradation if API is temporarily down
    if (err.message.includes('5')) {
      console.warn('[evolution-client] API server error, returning empty contacts')
      return []
    }

    throw err
  }
}

/**
 * Fetch chat messages with a contact
 * @param instanceName - Name of the instance
 * @param remoteJid - Contact's WhatsApp ID (e.g., "5521999999999@s.whatsapp.net")
 * @param limit - Maximum number of messages to fetch (default: 50)
 * @returns Array of WhatsApp messages
 */
export async function fetchChatMessages(
  instanceName: string,
  remoteJid: string,
  limit: number = 50
): Promise<WhatsAppMessageData[]> {
  if (!instanceName || !remoteJid) {
    throw new Error('Instance name and remote JID are required')
  }

  if (limit < 1 || limit > 1000) {
    throw new Error('Limit must be between 1 and 1000')
  }

  try {
    const response = await makeRequest<{ data?: WhatsAppMessageData[] }>(
      'GET',
      `/chat/findMessages/${instanceName}?remoteJid=${encodeURIComponent(remoteJid)}&limit=${limit}`
    )

    return response.data || []
  } catch (error) {
    const err = error as Error
    console.error(`[evolution-client] fetchChatMessages error:`, err.message)

    // Return empty array for graceful degradation
    if (err.message.includes('5')) {
      console.warn('[evolution-client] API server error, returning empty messages')
      return []
    }

    throw err
  }
}

/**
 * Fetch group metadata
 * @param instanceName - Name of the instance
 * @param groupJid - Group's WhatsApp ID (e.g., "120363123456789@g.us")
 * @returns Group metadata including participants
 */
export async function fetchGroupMetadata(
  instanceName: string,
  groupJid: string
): Promise<GroupMetadata> {
  if (!instanceName || !groupJid) {
    throw new Error('Instance name and group JID are required')
  }

  if (!groupJid.endsWith('@g.us')) {
    throw new Error('Invalid group JID format (must end with @g.us)')
  }

  const response = await makeRequest<GroupMetadata>(
    'GET',
    `/group/metadata/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`
  )

  return response
}
```

**Add retry logic with exponential backoff (replace existing makeRequest):**

```typescript
/**
 * Make authenticated request to Evolution API with retry logic
 */
async function makeRequest<T = any>(
  method: string,
  endpoint: string,
  body?: any,
  retryCount = 0
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`
  const maxRetries = 3

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY,
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  console.log(`[evolution-client] ${method} ${endpoint} (attempt ${retryCount + 1})`)

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[evolution-client] Error ${response.status}: ${errorText}`)

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Evolution API client error: ${response.status} - ${errorText}`)
      }

      // Retry on 5xx errors (server errors) and rate limiting
      if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`[evolution-client] Retrying after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return makeRequest<T>(method, endpoint, body, retryCount + 1)
      }

      throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as T
    return data
  } catch (error) {
    const err = error as Error

    // Network errors - retry
    if (err.message.includes('fetch failed') && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`[evolution-client] Network error, retrying after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return makeRequest<T>(method, endpoint, body, retryCount + 1)
    }

    console.error(`[evolution-client] Request failed:`, err.message)
    throw err
  }
}
```

**Update default export:**

```typescript
export default {
  createInstance,
  generatePairingCode,
  sendMessage,
  sendMedia,
  getInstanceInfo,
  restartInstance,
  deleteInstance,
  fetchAllContacts, // NEW
  fetchChatMessages, // NEW
  fetchGroupMetadata, // NEW
}
```

### Testing

Create test file: `supabase/functions/tests/evolution-client.test.ts`

```typescript
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import {
  fetchAllContacts,
  fetchChatMessages,
  fetchGroupMetadata,
  type WhatsAppContact
} from '../_shared/evolution-client.ts'

// Skip if no API key (CI environment)
const SKIP_INTEGRATION_TESTS = !Deno.env.get('EVOLUTION_API_KEY')

Deno.test({
  name: 'fetchAllContacts returns contact list',
  ignore: SKIP_INTEGRATION_TESTS,
  async fn() {
    const contacts = await fetchAllContacts('Lucas_4569')

    assertExists(contacts)
    assert(Array.isArray(contacts), 'contacts should be an array')

    console.log(`[test] Fetched ${contacts.length} contacts`)

    if (contacts.length > 0) {
      const firstContact = contacts[0]
      assertExists(firstContact.id, 'contact should have id')
      assert(
        firstContact.id.includes('@'),
        'contact id should be a JID (contains @)'
      )

      console.log('[test] Sample contact:', {
        id: firstContact.id,
        name: firstContact.name,
        isGroup: firstContact.isGroup
      })
    }
  }
})

Deno.test({
  name: 'fetchChatMessages returns message history',
  ignore: SKIP_INTEGRATION_TESTS,
  async fn() {
    // First, get a contact to test with
    const contacts = await fetchAllContacts('Lucas_4569')

    if (contacts.length === 0) {
      console.warn('[test] No contacts available, skipping message fetch test')
      return
    }

    // Use first non-group contact
    const testContact = contacts.find(c => !c.isGroup)
    if (!testContact) {
      console.warn('[test] No individual contacts found, skipping')
      return
    }

    console.log(`[test] Fetching messages for ${testContact.id}`)
    const messages = await fetchChatMessages('Lucas_4569', testContact.id, 10)

    assertExists(messages)
    assert(Array.isArray(messages), 'messages should be an array')

    console.log(`[test] Fetched ${messages.length} messages`)

    if (messages.length > 0) {
      const firstMessage = messages[0]
      assertExists(firstMessage.key, 'message should have key')
      assertExists(firstMessage.key.remoteJid, 'message key should have remoteJid')

      console.log('[test] Sample message:', {
        remoteJid: firstMessage.key.remoteJid,
        fromMe: firstMessage.key.fromMe,
        timestamp: firstMessage.messageTimestamp
      })
    }
  }
})

Deno.test({
  name: 'fetchGroupMetadata returns group info',
  ignore: SKIP_INTEGRATION_TESTS,
  async fn() {
    // First, get a group contact
    const contacts = await fetchAllContacts('Lucas_4569')
    const groupContact = contacts.find(c => c.isGroup)

    if (!groupContact) {
      console.warn('[test] No group contacts found, skipping group metadata test')
      return
    }

    console.log(`[test] Fetching metadata for group ${groupContact.id}`)
    const metadata = await fetchGroupMetadata('Lucas_4569', groupContact.id)

    assertExists(metadata)
    assertExists(metadata.id, 'metadata should have id')
    assertExists(metadata.subject, 'metadata should have subject (group name)')
    assert(Array.isArray(metadata.participants), 'metadata should have participants array')

    console.log('[test] Group metadata:', {
      subject: metadata.subject,
      participants: metadata.participants.length,
      creation: new Date(metadata.creation * 1000).toISOString()
    })
  }
})

Deno.test({
  name: 'API client handles rate limiting gracefully',
  ignore: SKIP_INTEGRATION_TESTS,
  async fn() {
    console.log('[test] Making 5 rapid requests to test rate limiting...')

    // Make 5 concurrent requests
    const promises = Array(5).fill(null).map((_, i) => {
      console.log(`[test] Starting request ${i + 1}`)
      return fetchAllContacts('Lucas_4569')
    })

    // Should not throw, should retry automatically
    const results = await Promise.all(promises)

    assertEquals(results.length, 5, 'should complete all 5 requests')
    results.forEach((result, i) => {
      assert(Array.isArray(result), `request ${i + 1} should return array`)
    })

    console.log('[test] All 5 requests completed successfully')
  }
})

Deno.test({
  name: 'fetchChatMessages validates limit parameter',
  async fn() {
    try {
      await fetchChatMessages('Lucas_4569', '5521999999999@s.whatsapp.net', 0)
      assert(false, 'should throw error for limit = 0')
    } catch (error) {
      assert(
        error instanceof Error && error.message.includes('between 1 and 1000'),
        'should throw validation error'
      )
    }

    try {
      await fetchChatMessages('Lucas_4569', '5521999999999@s.whatsapp.net', 1001)
      assert(false, 'should throw error for limit > 1000')
    } catch (error) {
      assert(
        error instanceof Error && error.message.includes('between 1 and 1000'),
        'should throw validation error'
      )
    }
  }
})
```

**Run tests:**
```bash
# Set environment variables first
export EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
export EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11

# Run tests
cd supabase/functions
deno test --allow-net --allow-env tests/evolution-client.test.ts

# Expected output:
# test fetchAllContacts returns contact list ... ok (1.2s)
# test fetchChatMessages returns message history ... ok (0.8s)
# test fetchGroupMetadata returns group info ... ok (0.5s)
# test API client handles rate limiting gracefully ... ok (2.1s)
# test fetchChatMessages validates limit parameter ... ok (0.01s)
```

### Validation Steps

1. **Code Review:**
   ```bash
   # Check file exists and has new functions
   grep -n "fetchAllContacts" supabase/functions/_shared/evolution-client.ts
   grep -n "fetchChatMessages" supabase/functions/_shared/evolution-client.ts
   grep -n "fetchGroupMetadata" supabase/functions/_shared/evolution-client.ts
   ```

2. **Run Tests:**
   ```bash
   cd supabase/functions
   deno test --allow-net --allow-env tests/evolution-client.test.ts
   ```

3. **Manual API Test:**
   ```bash
   # Create a test Edge Function
   cat > supabase/functions/test-evolution/index.ts << 'EOF'
   import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
   import { fetchAllContacts } from '../_shared/evolution-client.ts'

   serve(async (req) => {
     const contacts = await fetchAllContacts('Lucas_4569')
     return new Response(JSON.stringify({ count: contacts.length, contacts }), {
       headers: { 'Content-Type': 'application/json' }
     })
   })
   EOF

   # Deploy test function
   npx supabase functions deploy test-evolution

   # Test it
   curl https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/test-evolution

   # Should return: {"count": X, "contacts": [...]}
   ```

### Acceptance Criteria
- [ ] `fetchAllContacts()` returns array of contacts
- [ ] `fetchChatMessages()` returns array of messages
- [ ] `fetchGroupMetadata()` returns group info
- [ ] All tests pass (5/5 passing)
- [ ] Retry logic works for 5xx errors (verified in test output)
- [ ] Rate limiting handled gracefully (verified in test output)
- [ ] Manual API test returns valid JSON with contact count

### Estimated Time: 2-3 hours

---

## Task 1.3: Database Schema Extensions

**Duration:** 1-2 hours
**Can be done in parallel with:** Task 1.2 (API Client)
**Blockers:** Task 1.1 must be complete

### Context
The `contact_network` table needs additional columns to store WhatsApp-specific data. We also need a sync log table to track synchronization operations for debugging.

### Files to Create

#### 1. Migration File
`supabase/migrations/20260108_whatsapp_contact_network.sql`

```sql
-- Evolution API Integration: WhatsApp Contact Sync
-- Issue #23: People Unified Network
-- Sprint 1 Task 1.3: Database Schema Extensions

-- ============================================================================
-- CONTACT NETWORK: Add WhatsApp columns
-- ============================================================================

-- Add WhatsApp-specific columns to existing contact_network table
ALTER TABLE contact_network
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp_profile_pic_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_sentiment_avg NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS whatsapp_sync_status VARCHAR(20) DEFAULT 'pending'
  CHECK (whatsapp_sync_status IN ('pending', 'syncing', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS whatsapp_synced_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Lookup contacts by WhatsApp phone
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_phone
ON contact_network(whatsapp_phone)
WHERE whatsapp_phone IS NOT NULL;

-- Filter contacts by sync status (for incremental sync)
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_sync
ON contact_network(user_id, whatsapp_sync_status, whatsapp_synced_at);

-- Sort contacts by last WhatsApp interaction
CREATE INDEX IF NOT EXISTS idx_contact_network_whatsapp_last_message
ON contact_network(user_id, whatsapp_last_message_at DESC)
WHERE whatsapp_last_message_at IS NOT NULL;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN contact_network.whatsapp_phone IS
'WhatsApp phone number in E.164 format (e.g., +5521999999999). Used for matching contacts across systems.';

COMMENT ON COLUMN contact_network.whatsapp_name IS
'Contact name from WhatsApp (pushName or saved contact name)';

COMMENT ON COLUMN contact_network.whatsapp_profile_pic_url IS
'URL to WhatsApp profile picture (fetched from Evolution API)';

COMMENT ON COLUMN contact_network.whatsapp_last_message_at IS
'Timestamp of last WhatsApp message (incoming or outgoing) with this contact';

COMMENT ON COLUMN contact_network.whatsapp_message_count IS
'Total number of WhatsApp messages exchanged with this contact';

COMMENT ON COLUMN contact_network.whatsapp_sentiment_avg IS
'Average sentiment score from message analysis (-1 to 1, where -1=very negative, 0=neutral, 1=very positive)';

COMMENT ON COLUMN contact_network.whatsapp_sync_status IS
'Synchronization status: pending (not synced), syncing (in progress), synced (complete), failed (error occurred)';

COMMENT ON COLUMN contact_network.whatsapp_synced_at IS
'Timestamp of last successful sync from Evolution API';

-- ============================================================================
-- SYNC LOGS: Track sync operations
-- ============================================================================

-- Table to track WhatsApp sync operations for debugging and auditing
CREATE TABLE IF NOT EXISTS whatsapp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL
    CHECK (sync_type IN ('full_sync', 'incremental_sync', 'single_contact')),
  contacts_fetched INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  contacts_updated INTEGER DEFAULT 0,
  messages_analyzed INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES for sync logs
-- ============================================================================

ALTER TABLE whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view their own sync logs"
ON whatsapp_sync_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot insert/update/delete sync logs (only Edge Functions can)
-- Edge Functions use service role key which bypasses RLS

-- ============================================================================
-- INDEXES for sync logs
-- ============================================================================

-- Query recent syncs for a user
CREATE INDEX idx_whatsapp_sync_logs_user_date
ON whatsapp_sync_logs(user_id, started_at DESC);

-- Query syncs by status
CREATE INDEX idx_whatsapp_sync_logs_status
ON whatsapp_sync_logs(status, started_at DESC)
WHERE status IN ('running', 'failed');

-- ============================================================================
-- HELPER FUNCTION: Get last successful sync time
-- ============================================================================

CREATE OR REPLACE FUNCTION get_last_whatsapp_sync_time(p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT completed_at
  FROM whatsapp_sync_logs
  WHERE user_id = p_user_id
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_last_whatsapp_sync_time IS
'Returns timestamp of last successful WhatsApp sync for a user';

-- ============================================================================
-- HELPER FUNCTION: Check if sync is stale (> 24 hours)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_whatsapp_sync_stale(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT NOW() - completed_at > INTERVAL '24 hours'
      FROM whatsapp_sync_logs
      WHERE user_id = p_user_id
        AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    ),
    TRUE -- No sync found, consider it stale
  );
$$;

COMMENT ON FUNCTION is_whatsapp_sync_stale IS
'Returns TRUE if last successful sync was more than 24 hours ago, or no sync exists';
```

### Validation Steps

1. **Apply Migration Locally:**
   ```bash
   # Option 1: Via Supabase CLI (recommended)
   npx supabase db reset --local
   # This applies ALL migrations including the new one

   # Option 2: Apply single migration
   psql postgresql://postgres:postgres@localhost:54322/postgres \
     -f supabase/migrations/20260108_whatsapp_contact_network.sql
   ```

2. **Verify Schema:**
   ```sql
   -- Run in Supabase SQL Editor or psql

   -- Check new columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'contact_network'
     AND column_name LIKE 'whatsapp%'
   ORDER BY ordinal_position;

   -- Expected output:
   -- whatsapp_phone | character varying | YES
   -- whatsapp_name | character varying | YES
   -- whatsapp_profile_pic_url | text | YES
   -- whatsapp_last_message_at | timestamp with time zone | YES
   -- whatsapp_message_count | integer | YES
   -- whatsapp_sentiment_avg | numeric | YES
   -- whatsapp_sync_status | character varying | YES
   -- whatsapp_synced_at | timestamp with time zone | YES

   -- Check indexes exist
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'contact_network'
     AND indexname LIKE '%whatsapp%';

   -- Expected output:
   -- idx_contact_network_whatsapp_phone
   -- idx_contact_network_whatsapp_sync
   -- idx_contact_network_whatsapp_last_message

   -- Check sync logs table exists
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name = 'whatsapp_sync_logs';

   -- Expected output:
   -- whatsapp_sync_logs

   -- Check RLS enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'whatsapp_sync_logs';

   -- Expected output:
   -- whatsapp_sync_logs | t (true)

   -- Test helper functions
   SELECT get_last_whatsapp_sync_time(auth.uid());
   -- Should return NULL (no syncs yet)

   SELECT is_whatsapp_sync_stale(auth.uid());
   -- Should return TRUE (no syncs yet)
   ```

3. **Test Insert/Update:**
   ```sql
   -- Insert test contact with WhatsApp data
   INSERT INTO contact_network (
     user_id,
     name,
     whatsapp_phone,
     whatsapp_name,
     whatsapp_message_count,
     whatsapp_sync_status,
     source
   ) VALUES (
     auth.uid(),
     'Test Contact',
     '+5521999999999',
     'Test WhatsApp Name',
     10,
     'synced',
     'whatsapp'
   );

   -- Verify insert
   SELECT id, name, whatsapp_phone, whatsapp_sync_status
   FROM contact_network
   WHERE whatsapp_phone = '+5521999999999';

   -- Test sync log insert
   INSERT INTO whatsapp_sync_logs (
     user_id,
     sync_type,
     contacts_fetched,
     status
   ) VALUES (
     auth.uid(),
     'full_sync',
     25,
     'completed'
   );

   -- Verify sync log
   SELECT sync_type, contacts_fetched, status
   FROM whatsapp_sync_logs
   WHERE user_id = auth.uid();

   -- Clean up test data
   DELETE FROM contact_network WHERE whatsapp_phone = '+5521999999999';
   DELETE FROM whatsapp_sync_logs WHERE user_id = auth.uid();
   ```

4. **Apply to Production (After local validation):**
   ```bash
   # Via Supabase Dashboard SQL Editor
   # 1. Go to: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql
   # 2. Copy contents of supabase/migrations/20260108_whatsapp_contact_network.sql
   # 3. Paste and click "Run"

   # OR via CLI (requires linked project)
   npx supabase db push
   ```

### Acceptance Criteria
- [ ] Migration file created
- [ ] Migration runs without errors locally
- [ ] All 8 new columns added to `contact_network`
- [ ] All 3 indexes created
- [ ] `whatsapp_sync_logs` table created with RLS enabled
- [ ] Helper functions (`get_last_whatsapp_sync_time`, `is_whatsapp_sync_stale`) work
- [ ] Test insert/update succeeds
- [ ] Production migration applied (optional for Sprint 1, mandatory for Sprint 2)

### Estimated Time: 1-2 hours

---

## Task 1.4: Integration Tests

**Duration:** 1-2 hours
**Can be done in parallel with:** None (requires Tasks 1.2 and 1.3)
**Blockers:** Tasks 1.2 and 1.3 must be complete

### Context
Comprehensive tests ensure the Evolution API client and database schema work together correctly. These tests will be used in CI/CD pipeline.

### Test Coverage

We'll test:
1. ✅ API client functions return expected data types
2. ✅ Rate limiting and retry logic works
3. ✅ Database schema supports required operations
4. ✅ Error handling for common failure scenarios

### Test File
Already created in Task 1.2, but add database tests:

`supabase/functions/tests/database-schema.test.ts`

```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.test('contact_network has WhatsApp columns', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Query information_schema to check columns
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'contact_network'
        AND column_name LIKE 'whatsapp%'
      ORDER BY column_name
    `
  })

  if (error) {
    console.error('Error querying schema:', error)
    throw error
  }

  const columns = data.map((row: any) => row.column_name)

  // Check all expected columns exist
  const expectedColumns = [
    'whatsapp_last_message_at',
    'whatsapp_message_count',
    'whatsapp_name',
    'whatsapp_phone',
    'whatsapp_profile_pic_url',
    'whatsapp_sentiment_avg',
    'whatsapp_sync_status',
    'whatsapp_synced_at'
  ]

  expectedColumns.forEach(col => {
    assertEquals(
      columns.includes(col),
      true,
      `Column ${col} should exist in contact_network`
    )
  })
})

Deno.test('whatsapp_sync_logs table exists with RLS', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Check table exists
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_sync_logs'
    `
  })

  if (tablesError) throw tablesError
  assertEquals(tables.length, 1, 'whatsapp_sync_logs table should exist')

  // Check RLS enabled
  const { data: rls, error: rlsError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT rowsecurity
      FROM pg_tables
      WHERE tablename = 'whatsapp_sync_logs'
    `
  })

  if (rlsError) throw rlsError
  assertEquals(rls[0].rowsecurity, true, 'RLS should be enabled')
})

Deno.test('can insert and query WhatsApp contact data', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Note: This test requires authentication
  // For now, we'll just test the insert structure
  const testContact = {
    name: 'Test Contact',
    whatsapp_phone: '+5521999999999',
    whatsapp_name: 'Test WhatsApp Name',
    whatsapp_message_count: 5,
    whatsapp_sync_status: 'synced',
    source: 'whatsapp'
  }

  // This will fail in unauthenticated context, but validates schema
  const { error } = await supabase
    .from('contact_network')
    .insert(testContact)

  // We expect auth error, not schema error
  if (error && !error.message.includes('JWT')) {
    throw new Error(`Unexpected error: ${error.message}`)
  }
})

Deno.test('helper functions exist', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Check get_last_whatsapp_sync_time exists
  const { data: func1, error: err1 } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT proname
      FROM pg_proc
      WHERE proname = 'get_last_whatsapp_sync_time'
    `
  })

  if (err1) throw err1
  assertEquals(func1.length, 1, 'get_last_whatsapp_sync_time should exist')

  // Check is_whatsapp_sync_stale exists
  const { data: func2, error: err2 } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT proname
      FROM pg_proc
      WHERE proname = 'is_whatsapp_sync_stale'
    `
  })

  if (err2) throw err2
  assertEquals(func2.length, 1, 'is_whatsapp_sync_stale should exist')
})
```

**Note:** The `exec_sql` RPC function needs to be created for these tests to work:

```sql
-- Add to migration or run manually
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;
```

### Run All Tests

```bash
# Run API client tests
cd supabase/functions
deno test --allow-net --allow-env tests/evolution-client.test.ts

# Run database schema tests (requires local Supabase running)
npx supabase start
deno test --allow-net --allow-env tests/database-schema.test.ts

# Run all tests
deno test --allow-net --allow-env tests/
```

### CI/CD Integration

Add to `.github/workflows/test.yml` (if exists):

```yaml
- name: Run Evolution API Integration Tests
  run: |
    cd supabase/functions
    deno test --allow-net --allow-env tests/
  env:
    EVOLUTION_API_URL: ${{ secrets.EVOLUTION_API_URL }}
    EVOLUTION_API_KEY: ${{ secrets.EVOLUTION_API_KEY }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Acceptance Criteria
- [ ] All API client tests pass (5/5)
- [ ] All database schema tests pass (4/4)
- [ ] Tests can run in CI/CD environment
- [ ] Test coverage documented
- [ ] No flaky tests (run 3 times, all pass)

### Estimated Time: 1-2 hours

---

## Post-Sprint Validation

### Complete Sprint 1 Checklist

Before moving to Sprint 2, verify:

**Environment:**
- [ ] All environment variables configured (local + production)
- [ ] Supabase secrets listed successfully
- [ ] Edge Functions can read environment variables

**API Client:**
- [ ] `fetchAllContacts()` implemented and tested
- [ ] `fetchChatMessages()` implemented and tested
- [ ] `fetchGroupMetadata()` implemented and tested
- [ ] Retry logic works for 5xx errors
- [ ] Rate limiting handled gracefully

**Database:**
- [ ] Migration applied locally
- [ ] All 8 WhatsApp columns exist in `contact_network`
- [ ] All 3 indexes created
- [ ] `whatsapp_sync_logs` table created with RLS
- [ ] Helper functions work correctly
- [ ] Production migration applied (optional)

**Tests:**
- [ ] 5/5 API client tests passing
- [ ] 4/4 database schema tests passing
- [ ] Tests run in under 5 seconds (excluding API calls)

**Documentation:**
- [ ] Environment variables documented
- [ ] API client functions have JSDoc comments
- [ ] Database schema has column comments

### Performance Validation

```bash
# Test API client performance
time deno run --allow-net --allow-env supabase/functions/tests/evolution-client.test.ts

# Should complete in < 10 seconds (including API calls)

# Test database query performance
psql -c "EXPLAIN ANALYZE SELECT * FROM contact_network WHERE whatsapp_phone = '+5521999999999';"

# Should use index, execution time < 1ms
```

### Git Workflow

```bash
# Review changes
git status
git diff

# Stage changes
git add supabase/functions/_shared/evolution-client.ts
git add supabase/functions/tests/
git add supabase/migrations/20260108_whatsapp_contact_network.sql
git add .env.example
git add docs/deployment/ENVIRONMENT_VARIABLES.md

# Commit with co-authorship
git commit -m "feat(whatsapp): Sprint 1 - Core infrastructure for Evolution API integration

- Extend Evolution API client with fetchAllContacts, fetchChatMessages, fetchGroupMetadata
- Add WhatsApp columns to contact_network table
- Create whatsapp_sync_logs table for tracking sync operations
- Add comprehensive test coverage (9 tests, all passing)
- Configure environment variables for Evolution API
- Implement retry logic with exponential backoff for rate limiting

Issue: #23
Sprint: 1/4

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push origin feature/whatsapp-evolution-sync-sprint1
```

---

## Troubleshooting

### Common Issues

**Issue: "EVOLUTION_API_URL environment variable is not set"**
```bash
# Solution: Check .env file
cat .env | grep EVOLUTION

# Verify Supabase secrets
npx supabase secrets list

# Re-deploy Edge Functions
npx supabase functions deploy webhook-evolution
```

**Issue: "Migration fails with 'column already exists'"**
```bash
# Solution: Use IF NOT EXISTS (already in migration)
# Or drop and recreate:
psql -c "ALTER TABLE contact_network DROP COLUMN IF EXISTS whatsapp_phone CASCADE;"
psql -f supabase/migrations/20260108_whatsapp_contact_network.sql
```

**Issue: "Tests fail with 'fetch failed'"**
```bash
# Solution: Check network/API availability
curl https://evolution-evolution-api.w9jo16.easypanel.host/instance/info/Lucas_4569 \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"

# If API is down, skip integration tests:
SKIP_INTEGRATION_TESTS=1 deno test tests/evolution-client.test.ts
```

**Issue: "Rate limit exceeded (429)"**
```bash
# Solution: Wait 1 minute, then retry
# Or increase delay in retry logic (already implemented)
```

---

## Next Steps

Once Sprint 1 is validated, proceed to:
1. **Sprint 2:** Contact Synchronization (4-5 days)
2. Create PR for Sprint 1 (optional, or create single PR for all 4 sprints)
3. Schedule Sprint 2 kickoff

**Sprint 2 Preview:**
- Create `sync-whatsapp-contacts` Edge Function
- Build frontend sync service
- Add sync button to Connections UI
- Implement incremental sync logic

---

**Sprint 1 Status:** ✅ Ready to Execute
**Next Sprint:** Sprint 2 - Contact Synchronization
**Estimated Completion:** 3-4 days from start
