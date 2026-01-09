# Evolution API Integration - Troubleshooting Guide

**Project:** Aica Life OS - WhatsApp Contact Network Integration
**Audience:** Developers implementing the integration
**Last Updated:** 2026-01-08

---

## Quick Diagnostic Commands

```bash
# Check environment variables
cat .env | grep EVOLUTION
npx supabase secrets list | grep EVOLUTION

# Test Evolution API connectivity
curl https://evolution-evolution-api.w9jo16.easypanel.host/instance/info/Lucas_4569 \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"

# Check database schema
psql -c "\d contact_network" | grep whatsapp

# Test Edge Function locally
npx supabase functions serve
curl http://localhost:54321/functions/v1/sync-whatsapp-contacts \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "test"}'

# View recent logs
npx supabase functions logs sync-whatsapp-contacts --limit 50
```

---

## Common Issues by Sprint

### Sprint 1: Core Infrastructure

#### Issue: "EVOLUTION_API_URL environment variable is not set"

**Symptoms:**
- Edge Functions throw error on startup
- Tests fail with "undefined" errors

**Diagnosis:**
```bash
# Check if .env exists
ls -la .env

# Check Supabase secrets
npx supabase secrets list
```

**Solution:**
```bash
# Local development
cp .env.example .env
# Edit .env with real values

# Production
npx supabase secrets set EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
npx supabase secrets set EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
```

**Prevention:**
- Always verify environment setup first (Sprint 1 Task 1.1)
- Add to `.env.example` before committing

---

#### Issue: "Migration fails with 'column already exists'"

**Symptoms:**
- SQL error when running migration
- `contact_network` already has `whatsapp_phone` column

**Diagnosis:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contact_network' AND column_name = 'whatsapp_phone';
```

**Solution:**
```sql
-- Option 1: Use IF NOT EXISTS (already in migration)
-- Just re-run the migration, it's idempotent

-- Option 2: Drop and recreate (dangerous!)
ALTER TABLE contact_network DROP COLUMN IF EXISTS whatsapp_phone CASCADE;
-- Then re-run migration
```

**Prevention:**
- Always use `IF NOT EXISTS` in migrations
- Test locally before applying to production

---

#### Issue: "Tests fail with 'fetch failed'"

**Symptoms:**
- `deno test` fails with network errors
- `fetchAllContacts()` throws exception

**Diagnosis:**
```bash
# Check Evolution API is reachable
curl -I https://evolution-evolution-api.w9jo16.easypanel.host

# Check API key is correct
curl https://evolution-evolution-api.w9jo16.easypanel.host/instance/info/Lucas_4569 \
  -H "apikey: WRONG_KEY"
# Should return 401 if key is wrong
```

**Solution:**
```bash
# If API is down, skip integration tests
SKIP_INTEGRATION_TESTS=1 deno test tests/evolution-client.test.ts

# If API key is wrong, update .env
echo "VITE_EVOLUTION_API_KEY=correct_key_here" >> .env
```

**Prevention:**
- Run `curl` test before running Deno tests
- Add health check to test suite

---

### Sprint 2: Contact Synchronization

#### Issue: "Sync returns 0 contacts"

**Symptoms:**
- Sync completes successfully but no contacts created
- `contactsFetched: 0` in response

**Diagnosis:**
```bash
# Test Evolution API directly
curl https://evolution-evolution-api.w9jo16.easypanel.host/chat/fetchAllContacts/Lucas_4569 \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"

# Check Edge Function logs
npx supabase functions logs sync-whatsapp-contacts --limit 20
```

**Possible Causes:**
1. **Wrong endpoint:** Evolution API changed
2. **Empty contact list:** WhatsApp has no contacts
3. **Authentication issue:** API key invalid

**Solution:**
```typescript
// Add debug logging to sync-whatsapp-contacts/index.ts
console.log('[sync] API response:', JSON.stringify(whatsappContacts, null, 2))

// Verify API endpoint format
const response = await fetchAllContacts(instanceName)
console.log('[sync] Fetched contacts count:', response.length)
```

**Prevention:**
- Test Evolution API directly before implementing Edge Function
- Add logging to all API calls

---

#### Issue: "Duplicate contacts created"

**Symptoms:**
- Same contact appears multiple times
- `whatsapp_phone` not unique

**Diagnosis:**
```sql
SELECT whatsapp_phone, COUNT(*)
FROM contact_network
GROUP BY whatsapp_phone
HAVING COUNT(*) > 1;
```

**Solution:**
```sql
-- Remove duplicates (keep most recent)
DELETE FROM contact_network
WHERE id NOT IN (
  SELECT DISTINCT ON (whatsapp_phone) id
  FROM contact_network
  ORDER BY whatsapp_phone, whatsapp_synced_at DESC NULLS LAST
);

-- Ensure unique constraint exists
ALTER TABLE contact_network
ADD CONSTRAINT contact_network_whatsapp_phone_unique
UNIQUE (whatsapp_phone);
```

**Prevention:**
- Always check for existing contact before insert
- Use `UNIQUE` constraint on `whatsapp_phone`
- Implement proper merge logic in sync function

---

#### Issue: "Phone number format mismatch"

**Symptoms:**
- Google Contacts phone: `(21) 99999-9999`
- WhatsApp phone: `5521999999999`
- Contacts not matched

**Diagnosis:**
```sql
SELECT
  google_phone,
  whatsapp_phone
FROM contact_network
WHERE google_phone IS NOT NULL
  AND whatsapp_phone IS NOT NULL
LIMIT 10;
```

**Solution:**
```typescript
// Normalize to E.164 everywhere
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Already has country code
  if (digits.length >= 11) {
    return `+${digits}`
  }

  // Assume Brazil (+55)
  return `+55${digits}`
}

// Apply to all phone numbers
const normalizedPhone = formatPhoneE164(contact.phone)
```

**Prevention:**
- Normalize ALL phone numbers to E.164 format
- Add database check constraint
- Test with various phone formats

---

### Sprint 3: AI Analysis

#### Issue: "Gemini API quota exceeded"

**Symptoms:**
- Analysis fails with 429 error
- "Resource has been exhausted" message

**Diagnosis:**
```bash
# Check Gemini API usage
# Visit: https://makersuite.google.com/app/apikey

# Check logs
npx supabase functions logs analyze-whatsapp-contact | grep "429"
```

**Solution:**
```typescript
// Reduce batch size
const BATCH_SIZE = 3 // Instead of 5

// Increase delay between requests
await new Promise(resolve => setTimeout(resolve, 5000)) // 5 seconds

// Cache analysis results
if (contact.whatsapp_synced_at) {
  const hoursSince = (Date.now() - new Date(contact.whatsapp_synced_at).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 24) {
    return cachedAnalysis // Don't re-analyze
  }
}
```

**Prevention:**
- Use `gemini-1.5-flash` (cheaper) instead of Pro
- Cache analysis results for 24 hours
- Implement exponential backoff

---

#### Issue: "Health score always 50"

**Symptoms:**
- All contacts have health_score = 50
- No variation based on activity

**Diagnosis:**
```sql
SELECT
  whatsapp_phone,
  health_score,
  whatsapp_sentiment_avg,
  whatsapp_message_count,
  whatsapp_last_message_at
FROM contact_network
WHERE whatsapp_phone IS NOT NULL
LIMIT 10;
```

**Possible Causes:**
1. **No messages:** `whatsapp_message_count = 0`
2. **Analysis not running:** Edge Function not called
3. **Gemini response invalid:** JSON parsing fails

**Solution:**
```typescript
// Add debug logging
console.log('[analyze] Sentiment:', analysis.sentiment_avg)
console.log('[analyze] Days since last message:', analysis.last_interaction_days)
console.log('[analyze] Calculated score:', healthScore)

// Verify calculation logic
const score = calculateHealthScore({
  sentimentAvg: 0.5,      // Should add +10
  daysSinceLastMessage: 5, // Should add +30
  messageFrequency: 'weekly', // Should add +5
  engagementTrend: 'stable'   // Should add 0
})
// Expected: 50 + 10 + 30 + 5 = 95
```

**Prevention:**
- Test `calculateHealthScore()` with unit tests
- Add validation to ensure score between 0-100
- Log all score components for debugging

---

#### Issue: "Gemini returns invalid JSON"

**Symptoms:**
- Analysis fails with "Unexpected token"
- JSON parsing error

**Diagnosis:**
```bash
# Check Gemini response format
npx supabase functions logs analyze-whatsapp-contact | grep "AI response"
```

**Solution:**
```typescript
// Robust JSON extraction
const responseText = result.response.text()

// Handle markdown code blocks
const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                  responseText.match(/\{[\s\S]*\}/)

if (!jsonMatch) {
  console.error('[analyze] Invalid AI response:', responseText)
  throw new Error('AI response is not valid JSON')
}

const analysis = JSON.parse(jsonMatch[1] || jsonMatch[0])

// Validate required fields
if (!analysis.sentiment_avg || !analysis.message_frequency) {
  throw new Error('AI response missing required fields')
}
```

**Prevention:**
- Add explicit JSON format to Gemini prompt
- Use schema validation (Zod)
- Fallback to default values if parsing fails

---

### Sprint 4: Real-time & UI

#### Issue: "Webhook not receiving messages"

**Symptoms:**
- Send WhatsApp message → nothing happens
- No logs in Edge Function

**Diagnosis:**
```bash
# Check webhook configuration
curl https://evolution-evolution-api.w9jo16.easypanel.host/webhook/find/Lucas_4569 \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"

# Expected response:
# {
#   "enabled": true,
#   "url": "https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/webhook-evolution",
#   "events": ["MESSAGES_UPSERT", ...]
# }
```

**Solution:**
```bash
# Reconfigure webhook
curl -X POST "https://evolution-evolution-api.w9jo16.easypanel.host/webhook/set/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/webhook-evolution",
      "webhookByEvents": true,
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      "webhookBase64": true
    }
  }'
```

**Prevention:**
- Verify webhook URL is correct (no typos)
- Test webhook with `curl` POST to Edge Function URL
- Add monitoring for webhook failures

---

#### Issue: "Insights card not loading"

**Symptoms:**
- Card shows loading spinner forever
- Console error: "Failed to fetch"

**Diagnosis:**
```javascript
// Browser console
console.log('Contact ID:', contactId)
console.log('WhatsApp Phone:', whatsappPhone)

// Network tab: Check if API call is made
// Look for: /functions/v1/analyze-whatsapp-contact
```

**Solution:**
```typescript
// Add error boundary
const [error, setError] = useState<string | null>(null)

try {
  const result = await analyzeContact(contactId)
  setAnalysis(result)
} catch (err) {
  console.error('[WhatsAppInsightsCard] Error:', err)
  setError(err instanceof Error ? err.message : 'Unknown error')
  toast.error('Failed to load WhatsApp insights')
}

// Show error state
if (error) {
  return (
    <div className="bg-red-50 p-4 rounded-lg">
      <p className="text-red-800">Error: {error}</p>
      <button onClick={loadAnalysis}>Retry</button>
    </div>
  )
}
```

**Prevention:**
- Always handle loading and error states
- Add timeout to API calls (10s max)
- Show user-friendly error messages

---

## Performance Issues

### Issue: "Sync is too slow (> 2 minutes)"

**Symptoms:**
- Sync takes forever for 100 contacts
- User complains about UI freezing

**Diagnosis:**
```typescript
// Add performance logging
const startTime = Date.now()

// ... sync logic ...

const duration = Date.now() - startTime
console.log(`[sync] Completed in ${duration}ms`)
console.log(`[sync] Average per contact: ${duration / contacts.length}ms`)
```

**Solution:**
```typescript
// Batch inserts instead of one-by-one
const contactsToInsert = []
const contactsToUpdate = []

for (const contact of whatsappContacts) {
  // Skip groups
  if (contact.isGroup) continue

  const existing = await checkExisting(contact.phone)
  if (existing) {
    contactsToUpdate.push({ id: existing.id, ...contactData })
  } else {
    contactsToInsert.push(contactData)
  }
}

// Bulk insert
if (contactsToInsert.length > 0) {
  await supabase.from('contact_network').insert(contactsToInsert)
}

// Bulk update
if (contactsToUpdate.length > 0) {
  // Use upsert for updates
  await supabase.from('contact_network').upsert(contactsToUpdate)
}
```

**Prevention:**
- Always batch database operations
- Use indexes on frequently queried columns
- Profile slow queries with `EXPLAIN ANALYZE`

---

### Issue: "Analysis batch times out (> 10 minutes)"

**Symptoms:**
- Edge Function timeout error
- Only some contacts analyzed

**Diagnosis:**
```bash
# Check Edge Function timeout limit
# Supabase default: 10 minutes

# Check Gemini API latency
time curl -X POST https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts": [{"text": "test"}]}]}'
```

**Solution:**
```typescript
// Reduce batch size
const BATCH_SIZE = 3 // Instead of 5

// Process in background (fire-and-forget)
for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
  const batch = contacts.slice(i, i + BATCH_SIZE)

  // Queue instead of await
  queueAnalysisBatch(batch) // Non-blocking
}

// Return immediately
return { success: true, queued: contacts.length }
```

**Prevention:**
- Use job queue for long-running tasks (PGMQ)
- Process in smaller batches
- Increase Edge Function timeout if possible

---

## Database Issues

### Issue: "RLS policy denies access"

**Symptoms:**
- Query returns empty array
- Insert fails with "permission denied"

**Diagnosis:**
```sql
-- Check RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'contact_network';

-- Test as user
SET ROLE authenticated;
SELECT * FROM contact_network WHERE user_id = 'test-user-id';
```

**Solution:**
```sql
-- Add missing policy
CREATE POLICY "Users can view their own contacts"
ON contact_network FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
ON contact_network FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
ON contact_network FOR UPDATE
USING (auth.uid() = user_id);
```

**Prevention:**
- Always test RLS policies with non-admin user
- Document all policies in migration
- Use `SECURITY DEFINER` functions for privileged operations

---

### Issue: "Index not being used"

**Symptoms:**
- Queries slow despite indexes
- `EXPLAIN` shows "Seq Scan"

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM contact_network
WHERE whatsapp_phone = '+5521999999999';

-- Expected: "Index Scan using idx_contact_network_whatsapp_phone"
-- Actual: "Seq Scan on contact_network"
```

**Solution:**
```sql
-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'contact_network'
  AND indexname = 'idx_contact_network_whatsapp_phone';

-- If missing, create it
CREATE INDEX idx_contact_network_whatsapp_phone
ON contact_network(whatsapp_phone)
WHERE whatsapp_phone IS NOT NULL;

-- Analyze table to update statistics
ANALYZE contact_network;
```

**Prevention:**
- Always create indexes in migration
- Use `WHERE` clause in partial indexes
- Run `ANALYZE` after bulk inserts

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In Edge Functions
const DEBUG = Deno.env.get('DEBUG') === 'true'

if (DEBUG) {
  console.log('[debug] Request body:', JSON.stringify(body, null, 2))
  console.log('[debug] API response:', JSON.stringify(response, null, 2))
}
```

```bash
# Set DEBUG flag
npx supabase secrets set DEBUG=true
```

### Monitor Edge Function Logs

```bash
# Real-time logs
npx supabase functions logs sync-whatsapp-contacts --follow

# Filter by error
npx supabase functions logs sync-whatsapp-contacts | grep "error"

# Last 100 logs
npx supabase functions logs sync-whatsapp-contacts --limit 100
```

### Test Evolution API Directly

```bash
# Fetch contacts
curl https://evolution-evolution-api.w9jo16.easypanel.host/chat/findContacts/Lucas_4569 \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  | jq '.data | length'

# Fetch messages
curl "https://evolution-evolution-api.w9jo16.easypanel.host/chat/findMessages/Lucas_4569?remoteJid=5521999999999@s.whatsapp.net&limit=10" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  | jq '.data | length'
```

### Database Query Profiling

```sql
-- Enable query timing
\timing

-- Slow query log
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM contact_network
WHERE user_id = 'test'
  AND whatsapp_sync_status = 'synced'
ORDER BY whatsapp_last_message_at DESC;

-- Check table size
SELECT
  pg_size_pretty(pg_total_relation_size('contact_network')) AS total_size,
  pg_size_pretty(pg_relation_size('contact_network')) AS table_size,
  pg_size_pretty(pg_indexes_size('contact_network')) AS indexes_size;
```

---

## Emergency Procedures

### Complete Rollback

```bash
# 1. Disable all features
npx supabase secrets set ENABLE_WHATSAPP_SYNC=false

# 2. Disable webhook
curl -X POST "https://evolution-evolution-api.w9jo16.easypanel.host/webhook/set/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{"webhook": {"enabled": false}}'

# 3. Delete Edge Functions
npx supabase functions delete sync-whatsapp-contacts
npx supabase functions delete analyze-whatsapp-contact
npx supabase functions delete analyze-all-whatsapp-contacts

# 4. Drop database columns (last resort)
psql -c "ALTER TABLE contact_network DROP COLUMN whatsapp_phone CASCADE;"
```

### Data Recovery

```sql
-- Restore from backup (before integration)
SELECT * FROM contact_network_backup;

-- Copy back
INSERT INTO contact_network
SELECT * FROM contact_network_backup
ON CONFLICT (id) DO NOTHING;
```

---

## FAQs

**Q: Can I run sync manually without UI?**
```bash
# Yes, via curl
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"syncType": "full"}'
```

**Q: How do I reset all WhatsApp data?**
```sql
UPDATE contact_network
SET whatsapp_phone = NULL,
    whatsapp_name = NULL,
    whatsapp_profile_pic_url = NULL,
    whatsapp_last_message_at = NULL,
    whatsapp_message_count = 0,
    whatsapp_sentiment_avg = NULL,
    whatsapp_sync_status = 'pending',
    whatsapp_synced_at = NULL
WHERE whatsapp_phone IS NOT NULL;
```

**Q: How do I force re-analysis of all contacts?**
```bash
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/analyze-all-whatsapp-contacts \
  -H "Authorization: Bearer <user_token>"
```

**Q: Can I sync contacts without analyzing them?**
Yes, just don't call the analysis Edge Function. Contacts will sync with health_score = null.

**Q: What happens if Evolution API is down?**
Sync will fail gracefully and return error. No data is lost. Retry when API is back.

**Q: Can I use this with a different WhatsApp instance?**
Yes, change `EVOLUTION_INSTANCE_NAME` environment variable.

---

## Contact & Support

**Questions?** Open an issue on GitHub: #23
**Bugs?** Check logs first, then report with reproduction steps
**Improvements?** Submit a PR or feature request

---

**Document Owner:** Development Team
**Last Updated:** 2026-01-08
**Version:** 1.0
