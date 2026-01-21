# Health Score n8n Workflows

**Issue:** #144 - [WhatsApp AI] feat: Automated Relationship Health Score Calculation

This document describes the n8n workflows for automated health score calculation.

---

## Overview

Two workflows manage health score calculations:

1. **Scheduled Batch Calculation** - Daily cron job at 3 AM UTC
2. **Real-time Trigger** - On new message via webhook (optional, for premium users)

---

## 1. Scheduled Batch Calculation

### Purpose
Recalculates health scores for all contacts with stale data:
- Never calculated
- Not calculated in 7+ days
- Have received new messages since last calculation

### Workflow Setup

#### Step 1: Create Workflow
1. Open n8n dashboard
2. Click "New Workflow"
3. Name it: `Health Score - Batch Calculation`

#### Step 2: Add Schedule Trigger
1. Add node: **Schedule Trigger**
2. Configure:
   - **Trigger Type:** Cron
   - **Expression:** `0 3 * * *` (3:00 AM UTC daily)

#### Step 3: Add HTTP Request
1. Add node: **HTTP Request**
2. Configure:
   ```
   Method: POST
   URL: https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores

   Headers:
   - Authorization: Bearer {{ $credentials.supabaseServiceRoleKey }}
   - Content-Type: application/json

   Body: {}
   ```

#### Step 4: Add Success Handler (Optional)
1. Add node: **IF**
2. Condition: `{{ $json.success }} == true`

If success:
1. Add node: **Slack** (or Discord/Email)
2. Configure:
   ```
   Channel: #health-score-logs
   Message: ✅ Health Score batch completed
            Contacts processed: {{ $json.contactsProcessed }}
            Duration: {{ $json.durationMs }}ms
   ```

If failure:
1. Add node: **Slack** (or Discord/Email)
2. Configure:
   ```
   Channel: #alerts
   Message: ❌ Health Score batch FAILED
            Error: {{ $json.error }}
   ```

### Response Format

Success:
```json
{
  "success": true,
  "mode": "batch",
  "contactsProcessed": 501,
  "startedAt": "2026-01-21T03:00:00.000Z",
  "completedAt": "2026-01-21T03:00:01.029Z",
  "durationMs": 1029
}
```

Failure:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 2. Real-time Trigger Workflow

### Purpose
Recalculates health score immediately when a new message is received.
Useful for premium users who want instant score updates.

### When to Use
- Premium/VIP users with real-time requirements
- Critical relationship monitoring
- Demo/testing scenarios

### Implementation Options

#### Option A: Via Supabase Database Webhook

1. **Create Database Function:**
   ```sql
   -- Function to trigger n8n webhook on new message
   CREATE OR REPLACE FUNCTION notify_new_message()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Only trigger for incoming messages (not outgoing)
     IF NEW.direction = 'incoming' THEN
       PERFORM net.http_post(
         url := 'https://your-n8n.com/webhook/health-score-trigger',
         headers := '{"Content-Type": "application/json"}'::jsonb,
         body := json_build_object(
           'user_id', NEW.user_id,
           'contact_phone', NEW.contact_phone,
           'message_timestamp', NEW.message_timestamp
         )::jsonb
       );
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Create trigger
   CREATE TRIGGER trigger_new_message_notification
   AFTER INSERT ON whatsapp_messages
   FOR EACH ROW
   EXECUTE FUNCTION notify_new_message();
   ```

2. **n8n Workflow:**
   - Add **Webhook** node as trigger
   - URL: `/webhook/health-score-trigger`
   - Add **HTTP Request** to calculate-health-scores Edge Function
   - Pass `contactId` from webhook payload

#### Option B: Via webhook-evolution Integration

The webhook-evolution Edge Function already handles new messages. We can add an optional call to calculate-health-scores after storing a message.

See: `supabase/functions/webhook-evolution/index.ts` - `handleMessagesUpsert()`

Configuration via environment variable:
```
HEALTH_SCORE_REALTIME_ENABLED=true
```

---

## 3. Workflow: Health Score Alerts

### Purpose
Send notifications when contacts have critical or declining health scores.

### Setup

#### Step 1: Schedule Trigger
- Cron: `0 9 * * *` (9 AM daily)

#### Step 2: HTTP Request - Get At Risk Contacts
```
Method: GET
URL: https://uzywajqzbdbrfammshdg.supabase.co/rest/v1/v_contacts_at_risk?limit=20

Headers:
- apikey: {{ $credentials.supabaseAnonKey }}
- Authorization: Bearer {{ $credentials.supabaseServiceRoleKey }}
```

#### Step 3: Filter Critical Only
```javascript
// Code node
return items.filter(item => item.json.risk_level === 'critical');
```

#### Step 4: Send Alert Email/Slack
```
Subject: ⚠️ {{ $json.length }} relacionamentos críticos precisam de atenção

Body:
{{ $json.map(c => `- ${c.contact_name}: Score ${c.health_score}`).join('\n') }}
```

---

## 4. Credentials Setup

### Supabase Service Role Key
1. Go to n8n Credentials
2. Add new: **Header Auth**
3. Name: `Supabase Service Role`
4. Header Name: `Authorization`
5. Header Value: `Bearer <YOUR_SERVICE_ROLE_KEY>`

### Supabase Anon Key (for REST API)
1. Add new: **Header Auth**
2. Name: `Supabase Anon`
3. Header Name: `apikey`
4. Header Value: `<YOUR_ANON_KEY>`

---

## 5. Monitoring & Logging

### Recommended Alerts

1. **Batch Failure Alert**
   - Trigger: `success === false`
   - Channel: #alerts
   - Priority: High

2. **Long Duration Warning**
   - Trigger: `durationMs > 60000` (1 minute)
   - Channel: #health-score-logs
   - Priority: Medium

3. **Zero Contacts Processed**
   - Trigger: `contactsProcessed === 0`
   - Channel: #health-score-logs
   - Priority: Low (might be expected if all contacts are fresh)

### Workflow Execution History
- Keep 30 days of execution history in n8n
- Log errors to external service (Sentry, LogTail) for long-term analysis

---

## 6. Environment Variables

Required in Supabase Edge Functions (auto-injected):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional for real-time mode:
```
HEALTH_SCORE_REALTIME_ENABLED=false  # Set to true for real-time updates
HEALTH_SCORE_DEBOUNCE_MS=60000       # Debounce window (1 minute default)
```

---

## 7. Testing

### Test Batch Mode
```bash
curl -X POST \
  'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Test Single Mode
```bash
curl -X POST \
  'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/calculate-health-scores' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"contactId": "uuid-here"}'
```

---

## Related Documentation

- `supabase/functions/calculate-health-scores/README.md` - Edge Function docs
- `src/types/healthScore.ts` - TypeScript types
- `src/services/healthScoreService.ts` - Frontend service
- `20260121_contact_health_history.sql` - Database migration
