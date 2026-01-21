# Calculate Health Scores Edge Function

**Issue:** #144 - [WhatsApp AI] feat: Automated Relationship Health Score Calculation

## Overview

Dual-mode Edge Function for calculating contact relationship health scores:

1. **Batch Mode** (service role): Recalculates all contacts with stale data
2. **Single Mode** (authenticated): Recalculates a specific contact on demand

## API Specification

### Endpoint

```
POST /functions/v1/calculate-health-scores
```

### Batch Mode

Recalculates health scores for all contacts that:
- Have never been calculated
- Haven't been calculated in 7+ days
- Have received new messages since last calculation

**Authentication:** Service Role Key

```bash
curl -X POST \
  'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores' \
  -H 'Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Response:**

```json
{
  "success": true,
  "mode": "batch",
  "contactsProcessed": 150,
  "startedAt": "2026-01-21T03:00:00.000Z",
  "completedAt": "2026-01-21T03:00:12.345Z",
  "durationMs": 12345
}
```

### Single Mode

Recalculates health score for a specific contact owned by the authenticated user.

**Authentication:** User JWT Token

```bash
curl -X POST \
  'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores' \
  -H 'Authorization: Bearer ${USER_JWT_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{"contactId": "uuid-here"}'
```

**Response:**

```json
{
  "success": true,
  "mode": "single",
  "contactId": "uuid-here",
  "healthScore": 72,
  "previousScore": 68,
  "scoreDelta": 4,
  "trend": "improving",
  "components": {
    "frequency_score": 18.5,
    "recency_score": 22.0,
    "sentiment_score": 10.0,
    "reciprocity_score": 12.5,
    "depth_score": 9.0,
    "total_score": 72,
    "messages_analyzed": 87,
    "days_since_last_message": 2.5,
    "calculated_at": "2026-01-21T15:30:00.000Z"
  },
  "messagesAnalyzed": 87,
  "durationMs": 234
}
```

## Health Score Formula

```
health_score = frequency (0-25) + recency (0-25) + sentiment (0-20)
             + reciprocity (0-15) + depth (0-15) = 0-100
```

| Component | Max Points | Description |
|-----------|------------|-------------|
| Frequency | 25 | Message count in last 30 days |
| Recency | 25 | Exponential decay from last message |
| Sentiment | 20 | Average sentiment (placeholder: neutral 10) |
| Reciprocity | 15 | Balance between incoming/outgoing |
| Depth | 15 | Conversation volume as depth proxy |

## n8n Integration

### Scheduled Workflow (Daily at 3 AM)

1. **Create new workflow** in n8n
2. **Add Schedule Trigger:**
   - Trigger Type: Cron
   - Expression: `0 3 * * *` (3 AM UTC daily)

3. **Add HTTP Request node:**
   - Method: POST
   - URL: `https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores`
   - Headers:
     - `Authorization`: `Bearer {{$credentials.supabaseServiceRoleKey}}`
     - `Content-Type`: `application/json`
   - Body: `{}`

4. **Add Error Handling (optional):**
   - Send Slack/Discord notification on failure

### Webhook Trigger (Real-time)

For real-time recalculation when new messages arrive:

1. **Supabase Webhook** on `whatsapp_messages` INSERT
2. **n8n Webhook node** receives the event
3. **HTTP Request** to calculate-health-scores with:
   - User token (from session)
   - `{ "contactId": "{{$json.contact_id}}" }`

## Environment Variables

Required in Supabase Edge Functions:

- `SUPABASE_URL` - Auto-injected
- `SUPABASE_ANON_KEY` - Auto-injected
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected

## Database Functions Called

| Function | Mode | Description |
|----------|------|-------------|
| `batch_recalculate_health_scores()` | Batch | Processes up to 1000 stale contacts |
| `record_health_score(user_id, contact_id)` | Single | Calculates and records score |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Invalid contactId format | UUID format required |
| 401 | Missing authorization header | No auth header |
| 401 | Unauthorized | Invalid token |
| 403 | Batch mode requires service role | User token on batch request |
| 404 | Contact not found | Contact doesn't exist or not owned |
| 500 | RPC error | Database function failed |

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy calculate-health-scores

# Test locally
supabase functions serve calculate-health-scores --env-file .env.local
```

## Related

- **Phase 1 Migration:** `20260121_contact_health_history.sql`
- **View:** `v_contacts_at_risk` - Contacts needing attention
- **Table:** `contact_health_history` - Score history for trends
