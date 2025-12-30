# Backend Guest Approval Implementation Guide

**Last Updated**: 2025-12-30
**Status**: Production (v4 - Evolution API)
**Migration**: Twilio → Evolution API completed

## Overview

The guest approval system has two backend components:

1. **guestApprovalService.ts** - Frontend service layer for API calls
2. **Supabase Edge Function** - Serverless backend for sending approval links

This guide covers implementation, configuration, and deployment.

---

## Part 1: Frontend Service Layer

### File Location
`src/modules/podcast/services/guestApprovalService.ts`

### Main Functions

#### 1. `sendApprovalLink(request)`
Sends approval link to guest via email, WhatsApp, or provides link for manual sharing.

```typescript
await sendApprovalLink({
  episodeId: 'uuid',
  guestName: 'João Silva',
  guestEmail: 'joao@example.com',
  guestPhone: '+5511999999999',
  approvalUrl: 'https://podcast.com/approval/...',
  method: 'email' // or 'whatsapp' or 'link'
});
```

#### 2. `verifyApprovalToken(episodeId, approvalToken)`
Validates approval token for a given episode.

```typescript
const result = await verifyApprovalToken(episodeId, token);
if (result.valid) {
  // Token is valid and not expired
}
```

#### 3. `processApproval(request)`
Saves guest approval or rejection to database.

```typescript
await processApproval({
  episodeId: 'uuid',
  approvalToken: 'token123',
  approved: true,
  notes: 'Looks good!'
});
```

#### 4. `getApprovalStatus(episodeId)`
Retrieves current approval status for an episode.

```typescript
const status = await getApprovalStatus(episodeId);
// Returns: { approved_by_guest, approved_at, approval_notes }
```

#### 5. `revokeApprovalToken(episodeId)`
Invalidates approval link, making it unusable.

```typescript
await revokeApprovalToken(episodeId);
```

---

## Part 2: Supabase Edge Function

### File Location
`supabase/functions/send-guest-approval-link/index.ts`

### Deployment

#### 1. Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Active Supabase project
- API keys and credentials

#### 2. Deploy Function
```bash
# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy send-guest-approval-link

# Or use the CLI to push directly
supabase functions push send-guest-approval-link
```

#### 3. Set Environment Variables

Add the following secrets to your Supabase project:

```bash
# For Email (SendGrid)
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
supabase secrets set FROM_EMAIL=noreply@yourpodcast.com

# For WhatsApp (Evolution API)
supabase secrets set EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
supabase secrets set EVOLUTION_API_KEY=your_evolution_api_key
supabase secrets set EVOLUTION_INSTANCE_NAME=AI_Comtxae_4006
```

#### 4. Test the Function Locally
```bash
# Start the development server
supabase start

# Test the function
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/send-guest-approval-link' \
  --header 'Content-Type: application/json' \
  --data '{
    "episodeId": "test-episode-id",
    "guestName": "Test Guest",
    "guestEmail": "test@example.com",
    "approvalUrl": "https://podcast.com/approval/...",
    "method": "email"
  }'
```

---

## Part 3: Email Configuration (SendGrid)

### Setup

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up and verify email
   - Create API key

2. **Configure API Key**
   ```bash
   supabase secrets set SENDGRID_API_KEY=your_api_key
   supabase secrets set FROM_EMAIL=noreply@podcast.com
   ```

3. **Sender Authentication**
   - Verify sender domain in SendGrid
   - Set SPF and DKIM records
   - Verify from email address

### Email Template

The function sends HTML-formatted email with:
- Guest greeting
- Approval link button
- Fallback text link
- Expiration notice (30 days)
- Professional styling

### Customize Email

Edit the `htmlContent` variable in the Edge Function:

```typescript
const htmlContent = `
  <!-- Your custom HTML email here -->
`;
```

### Testing Email Sending

```bash
# Send test email
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-guest-approval-link' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "episodeId": "test-id",
    "guestName": "Test",
    "guestEmail": "test@example.com",
    "approvalUrl": "https://example.com",
    "method": "email"
  }'
```

---

## Part 4: WhatsApp Configuration (Evolution API)

### Setup

Evolution API is a self-hosted WhatsApp Business API solution that provides more control and lower costs compared to Twilio.

1. **Access Evolution API Instance**
   - URL: `https://evolution-evolution-api.w9jo16.easypanel.host`
   - Instance Name: `AI_Comtxae_4006`
   - Managed via Easypanel dashboard

2. **Get Credentials**
   - API Key (from Evolution dashboard)
   - Instance Name
   - API Base URL

3. **Configure Secrets**
   ```bash
   supabase secrets set EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
   supabase secrets set EVOLUTION_API_KEY=your_api_key
   supabase secrets set EVOLUTION_INSTANCE_NAME=AI_Comtxae_4006
   ```

### Phone Number Format

Evolution API expects phone numbers in a specific format:
- **Input**: `5521999999999` (digits only, no + sign)
- **Internal format**: `5521999999999@s.whatsapp.net` (handled automatically)

The Edge Function automatically normalizes phone numbers:
```typescript
// Input: "+55 21 99999-9999" or "5521999999999"
// Output: "5521999999999@s.whatsapp.net"
```

### Shared Evolution Client

The Edge Function uses `supabase/functions/_shared/evolution-client.ts` which provides:

```typescript
// Send text message
await sendMessage(instanceName, remoteJid, text);

// Send media (images, audio, video)
await sendMedia(instanceName, remoteJid, mediaUrl, mediaType, caption);
```

This shared client is used across multiple Edge Functions:
- `send-guest-approval-link` (this function)
- `webhook-evolution` (WhatsApp webhook handler)
- `notification-sender` (notification system)

### Message Template

The function sends:
```
Olá [Guest Name]! 🎙️

Por favor, revise suas informações para o podcast clicando no link abaixo:

[Approval URL]

Este link expira em 30 dias.
```

### Customize Message

Edit the `message` variable in the `sendWhatsAppViaEvolution` function:

```typescript
const message = `Your custom message here`;
```

### Testing WhatsApp

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-guest-approval-link' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "episodeId": "test-id",
    "guestName": "Test",
    "guestPhone": "+5511999999999",
    "approvalUrl": "https://example.com",
    "method": "whatsapp"
  }'
```

### Evolution API vs Twilio

**Why we migrated from Twilio to Evolution API:**

| Feature | Twilio | Evolution API |
|---------|--------|---------------|
| **Cost** | Pay per message (~$0.005/msg) | Self-hosted (fixed cost) |
| **Control** | Limited customization | Full control over instance |
| **Phone Format** | `whatsapp:+number` | `number@s.whatsapp.net` |
| **Setup Complexity** | Easy (managed) | Moderate (self-hosted) |
| **Reliability** | High (99.95% SLA) | Depends on hosting |
| **Vendor Lock-in** | Yes | No |

**Migration Benefits:**
- Reduced operational costs (no per-message charges)
- Better control over message delivery
- Shared client across multiple functions
- No vendor lock-in

---

## Part 5: Alternative Implementations

### Option A: Next.js API Routes

If you're using Next.js, create API routes instead of Edge Functions:

```typescript
// pages/api/podcast/send-approval-link.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { sendApprovalLink } from '@/modules/podcast/services/guestApprovalService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sendApprovalLink(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send approval link' });
  }
}
```

### Option B: Express Backend

For standalone Express server:

```typescript
app.post('/api/podcast/send-approval-link', async (req, res) => {
  try {
    const result = await sendApprovalLink(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send' });
  }
});
```

### Option C: Firebase Cloud Functions

For Firebase users:

```typescript
import * as functions from 'firebase-functions';
import { sendApprovalLink } from './services/guestApprovalService';

export const sendGuestApprovalLink = functions.https.onRequest(
  async (request, response) => {
    try {
      const result = await sendApprovalLink(request.body);
      response.json(result);
    } catch (error) {
      response.status(500).json({ error: 'Failed to send' });
    }
  }
);
```

---

## Part 6: Database Tables

### approval_link_history (Optional)

Track approval link sends for audit purposes:

```sql
CREATE TABLE approval_link_history (
  id BIGSERIAL PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  guest_email TEXT,
  guest_phone TEXT,
  method TEXT NOT NULL CHECK (method IN ('email', 'whatsapp')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_history_episode_id ON approval_link_history(episode_id);
CREATE INDEX idx_approval_history_sent_at ON approval_link_history(sent_at);
```

### podcast_episodes Updates

Ensure these fields exist (added in migration):

```sql
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS approval_token TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS approval_token_created_at TIMESTAMPTZ;
```

### podcast_guest_research Updates

Ensure these fields exist (added in migration):

```sql
ALTER TABLE podcast_guest_research ADD COLUMN IF NOT EXISTS approved_by_guest BOOLEAN;
ALTER TABLE podcast_guest_research ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE podcast_guest_research ADD COLUMN IF NOT EXISTS approval_notes TEXT;
```

---

## Part 7: Integration with Frontend

### Update GuestApprovalLinkDialog

The component calls `/api/podcast/send-approval-link`. Update the service call:

```typescript
// In guestApprovalService.ts
const response = await fetch('/api/podcast/send-approval-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    episodeId,
    guestName,
    guestEmail: method === 'email' ? guestEmail : undefined,
    guestPhone: method === 'whatsapp' ? guestPhone : undefined,
    approvalUrl: url,
    method,
  }),
});
```

### Update GuestApprovalPage

The component calls `processApproval` which uses Supabase directly. No API call needed - it's already integrated.

---

## Part 8: Monitoring & Logging

### Check Function Logs

```bash
# View Edge Function logs
supabase functions list
supabase functions logs send-guest-approval-link

# Or view in Supabase Dashboard:
# Project > Functions > send-guest-approval-link > Logs
```

### Monitor Email Delivery

**SendGrid Dashboard:**
- Track delivery status
- Monitor bounce rates
- Check spam complaints
- Review email analytics

### Monitor WhatsApp Delivery

**Evolution API Dashboard:**
- Check message delivery status
- Monitor failed sends
- Review instance health
- Check webhook logs
- Monitor API rate limits

---

## Part 9: Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "SendGrid API key not configured" | Missing env var | Set SENDGRID_API_KEY secret |
| "Failed to send email" | SendGrid API error | Check SendGrid logs, verify from email |
| "Evolution instance name not configured" | Missing env var | Set EVOLUTION_INSTANCE_NAME secret |
| "Failed to send WhatsApp" | Evolution API error | Check Evolution API logs, verify instance status |
| "Method not allowed" | Wrong HTTP method | Use POST requests only |
| "Missing required fields" | Incomplete request body | Include all required fields |
| "Token invalid" | Mismatched or expired token | Generate new token |

### Retry Logic

Implement exponential backoff for retries:

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s...
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## Part 10: Security Best Practices

1. **Token Security**
   - Tokens are 32 random alphanumeric characters
   - Never log tokens
   - Expire after 30 days
   - Use HTTPS only

2. **Rate Limiting**
   - Limit email sends per IP/user
   - Prevent token enumeration attacks
   - Monitor for abuse

3. **Email Validation**
   - Validate email format before sending
   - Handle bounces gracefully
   - Update invalid emails in database

4. **Data Privacy**
   - Don't log personal data
   - Use secure transmission
   - Follow GDPR/CCPA requirements

5. **API Authentication**
   - Validate Supabase auth tokens
   - Use service role key securely (backend only)
   - Implement request validation

---

## Part 11: Testing Checklist

- [ ] Send email to test account
- [ ] Verify email formatting and content
- [ ] Test email link opens approval page
- [ ] Send WhatsApp message to test number
- [ ] Verify WhatsApp link works on mobile
- [ ] Test invalid/expired tokens
- [ ] Test approval submission
- [ ] Verify database updates on approval
- [ ] Test email with special characters in name
- [ ] Monitor logs for errors

---

## Part 12: Deployment Checklist

- [ ] Set all environment variables
- [ ] Deploy Edge Function
- [ ] Test function locally
- [ ] Test function in production
- [ ] Update frontend API endpoints
- [ ] Create database tables
- [ ] Configure SendGrid
- [ ] Configure Evolution API
- [ ] Test end-to-end flow
- [ ] Monitor for errors
- [ ] Document configuration

---

## Support & Troubleshooting

### SendGrid
- Docs: https://docs.sendgrid.com
- API Ref: https://docs.sendgrid.com/api-reference
- Support: https://support.sendgrid.com

### Evolution API
- GitHub: https://github.com/EvolutionAPI/evolution-api
- Docs: https://doc.evolution-api.com/
- Community: Discord/Telegram (check GitHub)
- Self-hosted instance: https://evolution-evolution-api.w9jo16.easypanel.host

### Supabase
- Docs: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions
- Support: https://github.com/supabase/supabase/discussions

---

## Changelog

### v4 (2025-12-30) - Evolution API Migration
- ✅ **BREAKING**: Migrated WhatsApp from Twilio to Evolution API
- ✅ Added shared `evolution-client.ts` for code reuse
- ✅ Improved phone number normalization (handles multiple formats)
- ✅ Reduced external dependencies (no Twilio SDK)
- ✅ Lower operational costs (self-hosted vs per-message pricing)
- ⚠️ **Action Required**: Remove obsolete Twilio secrets after validation period

**Migration Details:**
- Commit: `f7add4c` (2025-12-30)
- Pull Request: #12
- Documentation: See `docs/migrations/SEND_GUEST_APPROVAL_LINK_MIGRATION.md`
- Security Audit: See `docs/security/TWILIO_SECRETS_CLEANUP_AUDIT.md`

**Secrets to Remove** (after 7-day validation):
```bash
npx supabase secrets unset TWILIO_ACCOUNT_SID
npx supabase secrets unset TWILIO_AUTH_TOKEN
npx supabase secrets unset TWILIO_PHONE_NUMBER
```

### v3 (Previous)
- Added email support via SendGrid
- Implemented `approval_link_history` table
- Added token expiration logic (30 days)
- Improved error handling

### v2 (Previous)
- Initial Twilio WhatsApp integration
- Basic approval flow implementation

### v1 (Previous)
- Basic approval link functionality
- Email-only delivery
