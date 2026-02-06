# WhatsApp Intent Privacy-First Implementation Guide

**Issue #91** | **Migration:** `20260205000001_whatsapp_intent_privacy.sql`

## Overview

This migration transforms Aica Life OS's WhatsApp integration from **raw message storage** to **privacy-first intent storage**, ensuring compliance with:

- ✅ **WhatsApp Terms of Service** (no raw message text storage)
- ✅ **LGPD/GDPR** (data minimization principle)
- ✅ **Semantic search** (embeddings-based retrieval without exposing content)

## What Changed

### Database Schema

| Before (Privacy Risk) | After (Privacy-First) |
|-----------------------|----------------------|
| `content_text TEXT` | ❌ **REMOVED** |
| N/A | `intent_summary TEXT` |
| N/A | `intent_category ENUM` |
| N/A | `intent_sentiment ENUM` |
| N/A | `intent_urgency SMALLINT` |
| N/A | `intent_embedding vector(768)` |
| N/A | `intent_action_required BOOLEAN` |
| N/A | `intent_mentioned_date DATE` |
| N/A | `intent_mentioned_time TIME` |

### Contact Network Preview

| Before | After |
|--------|-------|
| `last_message_preview TEXT` | ❌ **REMOVED** |
| `last_message_direction TEXT` | ❌ **REMOVED** |
| N/A | `last_intent_preview TEXT` |
| N/A | `last_intent_category ENUM` |
| N/A | `last_intent_sentiment ENUM` |
| N/A | `last_intent_urgency SMALLINT` |

## Migration Details

### 1. Enums Created

#### `whatsapp_intent_category`
```sql
'question'      -- User asking for information
'response'      -- User providing answer/feedback
'scheduling'    -- Time-related (meetings, reminders)
'document'      -- File sharing or requests
'audio'         -- Voice messages
'social'        -- Greetings, casual conversation
'request'       -- Action requests
'update'        -- Status updates/notifications
'media'         -- Image/video/sticker sharing
```

#### `whatsapp_intent_sentiment`
```sql
'positive'      -- Happy, thankful, excited
'neutral'       -- Informational, factual
'negative'      -- Complaint, frustration
'urgent'        -- Requires immediate attention
```

### 2. Indexes Created

| Index | Purpose | Type |
|-------|---------|------|
| `idx_whatsapp_messages_intent_embedding` | Semantic search | IVFFlat (vector) |
| `idx_whatsapp_messages_intent_filter` | Filter by category/urgency | B-tree (composite) |
| `idx_whatsapp_messages_action_required` | Task management queries | B-tree |
| `idx_whatsapp_messages_scheduled` | Calendar integration | B-tree |

### 3. Function Created

#### `search_messages_by_intent()`
```sql
search_messages_by_intent(
  _user_id UUID,
  _query_embedding vector(768),
  _limit INTEGER DEFAULT 20,
  _category whatsapp_intent_category DEFAULT NULL,
  _min_urgency SMALLINT DEFAULT 1
)
```

**Returns:** Messages ranked by semantic similarity (cosine distance)

**Use Case:** Timeline search like "messages about project deadlines"

### 4. Trigger Updated

**Old Trigger:** `update_contact_last_message_preview()`
- Stored raw text preview (`LEFT(message_text, 100)`)
- Updated on every INSERT

**New Trigger:** `update_contact_last_intent_preview()`
- Stores intent summary (extracted by AI)
- Updates only when `processing_status = 'completed'`
- Includes category, sentiment, urgency

## Implementation Steps

### Phase 1: Backend (Edge Functions)

#### A. Update `webhook-evolution/index.ts`

**Before:**
```typescript
// ❌ OLD: Storing raw message text
await supabase.from('whatsapp_messages').insert({
  user_id: userId,
  contact_id: contactId,
  content_text: message.text, // PRIVACY VIOLATION
  message_type: 'text',
  direction: 'incoming'
})
```

**After:**
```typescript
// ✅ NEW: Extract intent first, then store
const intentData = await extractIntent(message.text, message.type)

await supabase.from('whatsapp_messages').insert({
  user_id: userId,
  contact_id: contactId,
  // No content_text field!
  intent_summary: intentData.summary,
  intent_category: intentData.category,
  intent_sentiment: intentData.sentiment,
  intent_urgency: intentData.urgency,
  intent_embedding: intentData.embedding,
  message_type: message.type,
  direction: 'incoming',
  processing_status: 'completed'
})
```

#### B. Create `extract-intent` Edge Function

```typescript
// supabase/functions/extract-intent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)

serve(async (req) => {
  const { messageText, messageType, mediaUrl } = await req.json()

  // 1. Generate intent summary
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `
    Extract the intent from this WhatsApp message. Output JSON:
    {
      "summary": "Brief summary (max 100 chars, safe for display)",
      "category": "question|response|scheduling|document|audio|social|request|update|media",
      "sentiment": "positive|neutral|negative|urgent",
      "urgency": 1-5,
      "topic": "Main topic (1 word, max 50 chars)",
      "actionRequired": true|false,
      "mentionedDate": "YYYY-MM-DD or null",
      "mentionedTime": "HH:MM or null"
    }

    Message: "${messageText}"
  `

  const result = await model.generateContent(prompt)
  const intentJson = JSON.parse(result.response.text())

  // 2. Generate embedding for semantic search
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const embeddingResult = await embeddingModel.embedContent(messageText)
  const embedding = embeddingResult.embedding.values // 768-dim vector

  return new Response(
    JSON.stringify({
      summary: intentJson.summary,
      category: intentJson.category,
      sentiment: intentJson.sentiment,
      urgency: intentJson.urgency,
      topic: intentJson.topic,
      actionRequired: intentJson.actionRequired,
      mentionedDate: intentJson.mentionedDate,
      mentionedTime: intentJson.mentionedTime,
      embedding: embedding,
      confidence: 0.95 // Placeholder, implement confidence scoring
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Phase 2: Frontend (React Hooks)

#### A. Update `useWhatsAppMessagesRealtime.ts`

**Before:**
```typescript
// ❌ OLD: Displaying raw text
{messages.map(msg => (
  <p>{msg.content_text}</p> // Privacy violation
))}
```

**After:**
```typescript
// ✅ NEW: Display intent summary
{messages.map(msg => (
  <div>
    <p>{msg.intent_summary}</p>
    <Badge category={msg.intent_category} />
    {msg.intent_urgency >= 4 && <UrgentFlag />}
  </div>
))}
```

#### B. Create Semantic Search Hook

```typescript
// src/hooks/useSemanticMessageSearch.ts
import { supabase } from '@/services/supabaseClient'
import { useState } from 'react'

export function useSemanticMessageSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = async (query: string, category?: string, minUrgency = 1) => {
    setLoading(true)

    // 1. Generate embedding for query
    const { data: embeddingData } = await supabase.functions.invoke('extract-intent', {
      body: { messageText: query, skipProcessing: true }
    })

    // 2. Search by embedding
    const { data, error } = await supabase.rpc('search_messages_by_intent', {
      _user_id: (await supabase.auth.getUser()).data.user?.id,
      _query_embedding: embeddingData.embedding,
      _limit: 20,
      _category: category,
      _min_urgency: minUrgency
    })

    setResults(data || [])
    setLoading(false)
  }

  return { search, results, loading }
}
```

### Phase 3: UI Components

#### A. Update Contact Card

```typescript
// src/modules/connections/components/WhatsAppContactCard.tsx
interface ContactCardProps {
  contact: {
    contact_name: string
    last_intent_preview: string // ✅ NEW
    last_intent_category: 'question' | 'response' | ... // ✅ NEW
    last_intent_urgency: number // ✅ NEW
  }
}

export function WhatsAppContactCard({ contact }: ContactCardProps) {
  return (
    <div className="contact-card">
      <h3>{contact.contact_name}</h3>
      <p className="preview">{contact.last_intent_preview}</p>
      <div className="metadata">
        <CategoryBadge category={contact.last_intent_category} />
        {contact.last_intent_urgency >= 4 && (
          <span className="urgent-flag">⚠️ Urgent</span>
        )}
      </div>
    </div>
  )
}
```

#### B. Create Timeline Search

```typescript
// src/modules/journey/components/TimelineSearch.tsx
import { useSemanticMessageSearch } from '@/hooks/useSemanticMessageSearch'

export function TimelineSearch() {
  const { search, results, loading } = useSemanticMessageSearch()
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    search(query, undefined, 1) // All categories, urgency >= 1
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages by meaning (e.g., 'project deadlines')"
      />
      <button onClick={handleSearch}>Search</button>

      {loading && <Spinner />}

      <ul>
        {results.map((msg) => (
          <li key={msg.id}>
            <p>{msg.intent_summary}</p>
            <small>
              {msg.contact_name} • {msg.message_timestamp}
              • Similarity: {(msg.similarity_score * 100).toFixed(0)}%
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Performance Considerations

### Vector Index Tuning

**IVFFlat Parameters:**
- `lists = 100` → Optimal for 10k-100k messages
- Increase to `lists = 500` for 1M+ messages
- Trade-off: Higher lists = slower writes, faster searches

**Rebuild Index:**
```sql
REINDEX INDEX idx_whatsapp_messages_intent_embedding;
```

### Query Optimization

**Fast Query (uses index):**
```sql
SELECT * FROM whatsapp_messages
WHERE user_id = '...'
  AND intent_category = 'question'
  AND intent_urgency >= 3
ORDER BY created_at DESC;
```

**Slow Query (sequential scan):**
```sql
-- ❌ Avoid: Full-text search without index
SELECT * FROM whatsapp_messages
WHERE intent_summary ILIKE '%project%';
```

## Testing Checklist

- [ ] Migration runs without errors (`npx supabase db reset`)
- [ ] `content_text` column removed from `whatsapp_messages`
- [ ] Enums `whatsapp_intent_category` and `whatsapp_intent_sentiment` exist
- [ ] Function `search_messages_by_intent()` is executable by authenticated users
- [ ] Trigger `trigger_update_contact_last_intent_preview` fires on processing_status update
- [ ] Vector index `idx_whatsapp_messages_intent_embedding` exists
- [ ] Edge Function `extract-intent` returns valid intent JSON + embedding
- [ ] Webhook stores intent_summary instead of content_text
- [ ] Contact cards display `last_intent_preview` (not raw text)
- [ ] Semantic search returns relevant messages ranked by similarity

## Privacy Compliance Verification

### Audit Queries

**Check for raw text leaks:**
```sql
-- Should return 0 rows (content_text removed)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'whatsapp_messages'
  AND column_name = 'content_text';
```

**Check all messages have intent summaries:**
```sql
-- Should be 100% (or close after processing completes)
SELECT
  COUNT(*) FILTER (WHERE intent_summary IS NOT NULL) * 100.0 / COUNT(*) AS pct_with_intent
FROM whatsapp_messages
WHERE deleted_at IS NULL;
```

**Check embedding coverage:**
```sql
-- Target: >90% (some messages may not be embeddable)
SELECT
  COUNT(*) FILTER (WHERE intent_embedding IS NOT NULL) * 100.0 / COUNT(*) AS pct_with_embedding
FROM whatsapp_messages
WHERE processing_status = 'completed';
```

## Rollback Plan

**If migration fails in production:**

1. **Restore from backup** (Supabase automatic backups)
2. **Re-apply previous migration** (`20260131000001_whatsapp_timeline_integration.sql`)
3. **DO NOT manually re-add `content_text`** (privacy violation)

**Safe rollback command:**
```bash
# Local testing only
npx supabase db reset
git checkout main -- supabase/migrations/20260205000001_whatsapp_intent_privacy.sql
npx supabase db reset
```

## Cost Estimation

### Gemini API Costs

**Per Message:**
- Intent extraction (gemini-1.5-flash): ~$0.00002/message
- Embedding (text-embedding-004): ~$0.00001/message
- **Total per message:** ~$0.00003

**For 10,000 messages/month:**
- Cost: $0.30/month
- **Negligible compared to storage savings** (no raw text storage)

### Storage Savings

**Before (raw text):**
- Average message: 200 bytes (text) + metadata = 500 bytes
- 10k messages: 5 MB

**After (intent):**
- Intent summary: 100 bytes
- Embedding: 768 floats × 4 bytes = 3,072 bytes
- **Total per message:** 3,200 bytes
- 10k messages: 32 MB

**Trade-off:** Higher storage per message BUT lower privacy risk + semantic search capability

## Next Steps

1. **Apply migration** to staging environment
2. **Update webhook** to call `extract-intent` Edge Function
3. **Deploy Edge Functions** (`extract-intent`)
4. **Update frontend** components to use `intent_summary`
5. **Test semantic search** with sample queries
6. **Monitor Gemini API** usage and costs
7. **Backfill existing messages** (if any, process in batches)

## Related Issues

- **#91:** Process WhatsApp messages to timeline (this migration)
- **#118:** WhatsApp as document input for RAG (future)
- **#89:** Real-time webhook processing (implemented)

## References

- [WhatsApp Terms of Service - Data Storage](https://www.whatsapp.com/legal/terms-of-service)
- [LGPD Article 6 - Data Minimization](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Gemini Embeddings API](https://ai.google.dev/docs/embeddings_guide)

---

**Maintainer:** Backend Architect Agent + Lucas Boscacci Lima
**Date:** 2026-02-05
**Status:** ✅ Migration created, pending deployment
