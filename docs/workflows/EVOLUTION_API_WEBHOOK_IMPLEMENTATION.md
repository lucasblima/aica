# Evolution API Webhook Implementation Guide

## Overview

This guide explains how to implement the webhook receiver for Evolution API, which is the entry point for the privacy-first message processing pipeline.

**Architecture:**
```
WhatsApp Message
       ↓
Evolution API Instance
       ↓
Webhook Receiver (this service)
       ↓
n8n Workflow (message processing)
       ↓
Gemini (AI extraction)
       ↓
Create Memory
       ↓
Update Contact Network
       ↓
DISCARD Raw Message
```

---

## Prerequisites

- Node.js 18+
- Express.js (already in your project)
- Evolution API instance configured
- Webhook URL accessible from internet (ngrok for local dev)
- n8n instance running
- Gemini API key

---

## Step 1: Create Webhook Receiver Service

Create a new service file for handling Evolution API webhooks:

**File:** `src/services/webhookService.ts`

```typescript
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../supabaseClient';
import { processMessageWithN8n } from './n8nService';
import { RawMessagePayload, ExtractedInsight } from '../types/memoryTypes';

/**
 * Evolution API Webhook Handler
 *
 * This service receives WhatsApp messages from Evolution API and:
 * 1. Validates webhook signature
 * 2. Extracts message metadata
 * 3. Queues for processing in n8n
 * 4. Does NOT store raw message content
 */

const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET || '';

// ============================================================================
// WEBHOOK VALIDATION
// ============================================================================

/**
 * Validates the webhook signature from Evolution API
 * Evolution API sends requests with an X-Signature header
 */
export const validateWebhookSignature = (
  body: string,
  signature: string
): boolean => {
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
};

// ============================================================================
// MESSAGE TYPES
// ============================================================================

interface EvolutionWebhookPayload {
  event: string; // 'messages.upsert', 'messages.update', 'connection.update'
  data: {
    key?: {
      remoteJid: string; // +55 11 98765-4321
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string; // Text message
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: {
        caption?: string;
      };
      // ... other message types
    };
    pushName?: string;
    timestamp?: number;
    status?: string; // 'ACK', 'PENDING', 'ERROR'
  };
}

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

/**
 * Main webhook handler
 * Called by Evolution API when a message is received
 */
export const handleEvolutionWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate signature
    const signature = req.headers['x-signature'] as string;
    const bodyString = JSON.stringify(req.body);

    if (!validateWebhookSignature(bodyString, signature)) {
      console.warn('Invalid webhook signature');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payload = req.body as EvolutionWebhookPayload;

    // Only process incoming messages (not sent by us)
    if (payload.event !== 'messages.upsert' || payload.data.key?.fromMe) {
      res.status(200).json({ success: true });
      return;
    }

    // Extract message data
    const messageData = await extractMessageData(payload);

    if (!messageData) {
      res.status(200).json({ success: true }); // Silent fail for unsupported types
      return;
    }

    // Queue for processing (n8n handles the AI extraction)
    await queueMessageForProcessing(messageData);

    // Respond immediately to Evolution API
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Extract message content from Evolution payload
 * Returns structured data without raw message content
 */
async function extractMessageData(
  payload: EvolutionWebhookPayload
): Promise<RawMessagePayload | null> {
  const { data } = payload;

  if (!data.key || !data.message) {
    return null;
  }

  const phoneNumber = data.key.remoteJid;
  const messageId = data.key.id;
  const timestamp = data.timestamp || Date.now();

  // Extract text content (handles various message types)
  let messageText = '';

  if (data.message.conversation) {
    messageText = data.message.conversation;
  } else if (data.message.extendedTextMessage?.text) {
    messageText = data.message.extendedTextMessage.text;
  } else if (data.message.imageMessage?.caption) {
    messageText = data.message.imageMessage.caption;
  } else {
    // Unsupported message type (media, location, contact, etc.)
    return null;
  }

  return {
    from: phoneNumber,
    to: process.env.EVOLUTION_BOT_PHONE || '',
    message: messageText,
    timestamp,
    message_id: messageId,
    webhook_id: `evolution-${messageId}`,
  };
}

/**
 * Queue message for processing in n8n
 * This prevents the webhook from blocking while we process
 */
async function queueMessageForProcessing(
  messageData: RawMessagePayload
): Promise<void> {
  try {
    // Get or create contact from phone number
    const contactId = await getOrCreateContactFromPhone(messageData.from);

    if (!contactId) {
      console.warn(`Could not create/find contact for ${messageData.from}`);
      return;
    }

    // Trigger n8n workflow
    const webhookUrl = `${process.env.N8N_BASE_URL}/webhook/message-processing`;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.N8N_API_KEY || '',
      },
      body: JSON.stringify({
        raw_message: messageData,
        contact_id: contactId,
        user_id: messageData.webhook_id, // Will be resolved from contact
        timestamp: new Date(messageData.timestamp * 1000).toISOString(),
      }),
    });
  } catch (error) {
    console.error('Error queuing message for processing:', error);
    throw error;
  }
}

/**
 * Get or create a contact from phone number
 * Used to link incoming messages to the contact_network
 */
async function getOrCreateContactFromPhone(
  phoneNumber: string
): Promise<string | null> {
  try {
    // Try to find existing contact
    let { data: contact, error } = await supabase
      .from('contact_network')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();

    if (contact) {
      return contact.id;
    }

    // If not found, create a new contact (with minimal info)
    // Note: This should be tied to the current user
    // In a real implementation, you'd need to determine the user_id
    const { data: newContact, error: createError } = await supabase
      .from('contact_network')
      .insert([
        {
          user_id: process.env.DEFAULT_USER_ID, // Should come from auth context
          name: phoneNumber, // Will be updated with actual name later
          phone_number: phoneNumber,
          engagement_level: 'low', // Will be updated as we interact
          interaction_count: 0,
          tags: ['auto_created_from_message'],
        },
      ])
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating contact:', createError);
      return null;
    }

    return newContact?.id || null;
  } catch (error) {
    console.error('Error in getOrCreateContactFromPhone:', error);
    return null;
  }
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Evolution API requires verification endpoint
 * Responds to GET requests with a challenge token
 */
export const verifyWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { mode, challenge, verify_token } = req.query;

    const token = process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN || 'aica_webhook';

    if (
      mode === 'subscribe' &&
      verify_token === token &&
      challenge
    ) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// IMPORTANT: RAW MESSAGE HANDLING
// ============================================================================

/*
KEY PRINCIPLES:
1. NO raw message content is stored in the database
2. Message text is extracted ONLY for AI processing
3. After n8n extracts insights, the raw message is discarded
4. Only structured data is stored: sentiment, triggers, summary, embedding

FLOW:
Raw Message → Extract Text → Queue to n8n → AI Processing → Create Memory → Discard Raw

The RawMessagePayload is NOT persisted to any table. It's only in-memory
during webhook processing and n8n workflow execution.
*/
```

---

## Step 2: Create n8n Service

Create a service to trigger n8n workflows:

**File:** `src/services/n8nService.ts`

```typescript
import { RawMessagePayload } from '../types/memoryTypes';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

/**
 * Trigger n8n workflow for message processing
 *
 * n8n handles:
 * 1. Gemini AI extraction (sentiment, triggers, summary)
 * 2. Embedding generation
 * 3. Memory insertion
 * 4. Contact network update
 * 5. Raw message discard
 */
export const processMessageWithN8n = async (payload: {
  raw_message: RawMessagePayload;
  contact_id: string;
  user_id: string;
  timestamp: string;
}): Promise<{ success: boolean; workflow_id?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/message-processing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${N8N_API_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, workflow_id: result.execution_id };
  } catch (error) {
    console.error('Error triggering n8n workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Trigger daily report generation
 * Called at end of each day
 */
export const triggerDailyReportGeneration = async (
  userId: string,
  reportDate: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/daily-report-generation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${N8N_API_KEY}`,
        },
        body: JSON.stringify({ user_id: userId, report_date: reportDate }),
      }
    );

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error triggering daily report generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

---

## Step 3: Register Webhook Routes

Update your Express server to register the webhook routes:

**File:** `src/routes/webhooks.ts` (create if doesn't exist)

```typescript
import express, { Router } from 'express';
import {
  handleEvolutionWebhook,
  verifyWebhook,
} from '../services/webhookService';

const router: Router = express.Router();

// Webhook verification endpoint (GET)
// Evolution API calls this when setting up the webhook
router.get('/evolution', verifyWebhook);

// Webhook handler endpoint (POST)
// Evolution API sends messages here
router.post('/evolution', express.json(), handleEvolutionWebhook);

export default router;
```

**File:** `src/server.ts` (or your main app file)

```typescript
import webhookRoutes from './routes/webhooks';

// Register webhook routes
app.use('/webhook', webhookRoutes);

// Make sure this is before other middleware
app.use(express.json({ limit: '10mb' }));
```

---

## Step 4: Environment Variables

Add these to your `.env` file:

```bash
# Evolution API Configuration
EVOLUTION_API_URL=https://your-evolution-instance.com
EVOLUTION_API_KEY=your-api-key
EVOLUTION_WEBHOOK_SECRET=your-webhook-secret
EVOLUTION_WEBHOOK_VERIFY_TOKEN=aica_webhook
EVOLUTION_BOT_PHONE=+55 11 99999-9999

# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# Default user ID (for webhook processing)
DEFAULT_USER_ID=550e8400-e29b-41d4-a716-446655440000
```

---

## Step 5: Configure Evolution API Instance

In your Evolution API dashboard:

1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Configure:
   - **URL:** `https://your-app-domain.com/webhook/evolution`
   - **Events:** Select `messages.upsert`
   - **Headers:** Add custom header if needed
4. Verify the webhook (Evolution API will call the GET endpoint)
5. Save the webhook secret to your `.env` file

---

## Step 6: Local Development with ngrok

For local testing, expose your local server to the internet:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# In one terminal, start your app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL in Evolution API webhook configuration
# https://xxxx-xx-xxx-xxx-xx.ngrok-free.app/webhook/evolution
```

---

## Step 7: Test the Webhook

### Using curl:

```bash
# Send a test message to your webhook
curl -X POST http://localhost:3000/webhook/evolution \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n '{payload}' | openssl dgst -sha256 -hmac 'your-webhook-secret')" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "+5511987654321",
        "fromMe": false,
        "id": "test-message-id"
      },
      "message": {
        "conversation": "Test message content"
      },
      "pushName": "João Silva",
      "timestamp": 1234567890
    }
  }'
```

### Using Postman:

1. Create a new POST request
2. URL: `http://localhost:3000/webhook/evolution`
3. Body (raw JSON):
```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "+5511987654321",
      "fromMe": false,
      "id": "test-message-id"
    },
    "message": {
      "conversation": "Test message from Postman"
    },
    "pushName": "João Silva",
    "timestamp": 1234567890
  }
}
```
4. Add header: `X-Signature: (calculated hash)`
5. Send

---

## Step 8: Monitor Webhook Activity

Create a monitoring endpoint to check webhook health:

```typescript
// Add to webhookService.ts

export interface WebhookMetrics {
  total_received: number;
  total_processed: number;
  total_failed: number;
  last_received_at?: string;
  last_error?: string;
}

let metrics: WebhookMetrics = {
  total_received: 0,
  total_processed: 0,
  total_failed: 0,
};

export const getWebhookMetrics = (): WebhookMetrics => metrics;

export const updateMetricsSuccess = () => {
  metrics.total_received++;
  metrics.total_processed++;
};

export const updateMetricsFailure = (error: string) => {
  metrics.total_received++;
  metrics.total_failed++;
  metrics.last_error = error;
};

// In routes:
router.get('/metrics', (req, res) => {
  res.json(getWebhookMetrics());
});
```

---

## Security Considerations

1. **Signature Verification:**
   - Always verify the webhook signature
   - Prevents spoofed requests

2. **Rate Limiting:**
   ```typescript
   import rateLimit from 'express-rate-limit';

   const webhookLimiter = rateLimit({
     windowMs: 60 * 1000, // 1 minute
     max: 100, // 100 requests per minute
   });

   router.post('/evolution', webhookLimiter, express.json(), handleEvolutionWebhook);
   ```

3. **Input Validation:**
   - Validate phone number format (E.164)
   - Validate message length
   - Check for injection attacks

4. **Privacy:**
   - Raw message is NEVER stored
   - NEVER log raw message content
   - ALWAYS process through AI extraction

---

## Troubleshooting

### "Invalid webhook signature"
- Ensure `EVOLUTION_WEBHOOK_SECRET` is correct
- Check that the signature calculation uses the raw request body

### "Could not create contact"
- Ensure `DEFAULT_USER_ID` is valid
- Check Supabase RLS policies

### "n8n workflow failed"
- Verify n8n is running
- Check n8n webhook URL and API key
- Review n8n workflow logs

### "Contact not found"
- Check phone number format (should be E.164: +55 11 98765-4321)
- Verify contact_network table has data

---

## Next Steps

1. **Test with real Evolution API instance**
2. **Create n8n workflow** (see next document)
3. **Monitor metrics and errors**
4. **Implement rate limiting**
5. **Add logging and alerting**
