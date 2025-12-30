# Migration Plan: send-guest-approval-link to Evolution API

**Issue Reference**: Related to #12 - WhatsApp Integration via Evolution API
**Migration Date**: 2025-12-30
**Status**: Planning Complete
**Priority**: High (Reduces external dependencies)

---

## Executive Summary

This document outlines the migration plan for the `send-guest-approval-link` Edge Function from SendGrid/Twilio to Evolution API. The goal is to consolidate WhatsApp messaging through Evolution API while deciding on email strategy.

### Current State
- **WhatsApp**: Uses Twilio API (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- **Email**: Uses SendGrid API (requires SENDGRID_API_KEY)
- **Location**: `supabase/functions/send-guest-approval-link/index.ts`

### Target State
- **WhatsApp**: Evolution API (already configured: EVOLUTION_API_KEY, EVOLUTION_API_URL)
- **Email**: Decision required (see Options below)

---

## Analysis

### Existing Code Review

#### Current Function Interface (MUST PRESERVE)
```typescript
interface SendApprovalLinkRequest {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  approvalUrl: string;
  method: 'email' | 'whatsapp';
}

// Response format
{
  success: boolean;
  message?: string;
  error?: string;
}
```

#### Current Secrets Required
| Secret | Service | Status |
|--------|---------|--------|
| SENDGRID_API_KEY | SendGrid Email | Keep or Remove |
| TWILIO_ACCOUNT_SID | Twilio WhatsApp | **REMOVE** |
| TWILIO_AUTH_TOKEN | Twilio WhatsApp | **REMOVE** |
| TWILIO_PHONE_NUMBER | Twilio WhatsApp | **REMOVE** |
| FROM_EMAIL | Email From Address | Keep |

#### Evolution API Secrets (Already Available)
| Secret | Description | Status |
|--------|-------------|--------|
| EVOLUTION_API_KEY | API authentication | Available |
| EVOLUTION_API_URL | API endpoint | Available |
| EVOLUTION_BOT_PHONE | Bot phone number | Available |
| EVOLUTION_WEBHOOK_SECRET | Webhook validation | Available |
| EVOLUTION_INSTANCE_NAME | Instance identifier | Available (Lucas_4569) |

### Reusable Code from webhook-evolution

The `webhook-evolution` Edge Function provides reusable patterns:

1. **sendWhatsAppMessage function** (lines 492-527):
```typescript
async function sendWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  text: string
): Promise<boolean>
```

2. **evolution-client.ts shared module** provides:
   - `sendMessage(instanceName, remoteJid, text)` - Send text messages
   - `sendMedia(instanceName, remoteJid, mediaUrl, mediaType, caption)` - Send media

### Phone Number Format Differences

| Provider | Format | Example |
|----------|--------|---------|
| Twilio | `whatsapp:+5511999999999` | Prefixed with `whatsapp:` |
| Evolution | `5511999999999` or `5511999999999@s.whatsapp.net` | Raw number or JID |

**Action Required**: Convert incoming phone format to Evolution format.

---

## Email Strategy Decision

### Option A: Keep SendGrid (Recommended)
**Pros**:
- Email requires different infrastructure than WhatsApp
- SendGrid is reliable and well-integrated
- No additional development needed
- Clear separation of concerns

**Cons**:
- Still requires SENDGRID_API_KEY secret
- Two external dependencies (but different domains)

### Option B: Supabase Auth Email (Built-in)
**Pros**:
- No additional secrets needed
- Uses Supabase's built-in email
- Consistent with auth emails

**Cons**:
- Limited templates
- Less control over delivery
- Not designed for transactional emails

### Option C: Resend (Modern Alternative)
**Pros**:
- Modern API, good DX
- Better React email templates
- Free tier available

**Cons**:
- Requires migration effort
- New dependency
- Learning curve

### Recommendation
**Keep SendGrid for email** - The migration scope should focus on WhatsApp only. Email and WhatsApp are fundamentally different channels, and consolidating them brings no benefit. Keep the proven SendGrid integration.

---

## Architecture Changes

### Before (Current)
```
[Frontend] --> [send-guest-approval-link]
                    |
          +---------+---------+
          |                   |
    [SendGrid API]      [Twilio API]
       (email)           (WhatsApp)
```

### After (Target)
```
[Frontend] --> [send-guest-approval-link]
                    |
          +---------+---------+
          |                   |
    [SendGrid API]    [Evolution API]
       (email)           (WhatsApp)
                              |
                       [_shared/evolution-client.ts]
```

---

## Implementation Plan

### Phase 1: Code Changes

#### 1.1 Update Environment Variables
```typescript
// REMOVE
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// ADD
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'Lucas_4569';
```

#### 1.2 Replace sendWhatsAppViaTwilio Function

**Current Implementation** (to be replaced):
```typescript
async function sendWhatsAppViaTwilio(
  toPhone: string,
  guestName: string,
  approvalUrl: string
): Promise<{ success: boolean; error?: string }>
```

**New Implementation** (using Evolution API):
```typescript
async function sendWhatsAppViaEvolution(
  toPhone: string,
  guestName: string,
  approvalUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return {
      success: false,
      error: 'Evolution API credentials not configured',
    };
  }

  // Normalize phone number (remove whatsapp: prefix if present, + sign, etc.)
  const normalizedPhone = toPhone
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '');

  const message = `Ola ${guestName}!\n\nPor favor, revise suas informacoes para o podcast clicando no link abaixo:\n\n${approvalUrl}\n\nEste link expira em 30 dias.`;

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Evolution API Error:', error);
      return {
        success: false,
        error: `Evolution API error: ${response.status}`,
      };
    }

    const result = await response.json();
    console.log('Evolution API Success:', result);
    return { success: true };
  } catch (error) {
    console.error('Evolution API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp',
    };
  }
}
```

#### 1.3 Update Function Call
```typescript
// In serve() handler, change:
} else if (body.method === 'whatsapp') {
  result = await sendWhatsAppViaTwilio(body.guestPhone!, body.guestName, body.approvalUrl);
}

// To:
} else if (body.method === 'whatsapp') {
  result = await sendWhatsAppViaEvolution(body.guestPhone!, body.guestName, body.approvalUrl);
}
```

### Phase 2: Testing

#### 2.1 Local Testing
```bash
# Start Supabase locally
supabase start

# Set environment variables locally
supabase secrets set EVOLUTION_API_URL="https://evolution-evolution-api.w9jo16.easypanel.host"
supabase secrets set EVOLUTION_API_KEY="429683C4C977415CAAFCCE10F7D57E11"
supabase secrets set EVOLUTION_INSTANCE_NAME="Lucas_4569"

# Test the function
curl -X POST http://localhost:54321/functions/v1/send-guest-approval-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "episodeId": "test-uuid-123",
    "guestName": "Test Guest",
    "guestPhone": "+5521999999999",
    "approvalUrl": "https://aica.app/approval/test",
    "method": "whatsapp"
  }'
```

#### 2.2 Test Cases
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid WhatsApp BR format | +5521999999999 | Success |
| WhatsApp without + | 5521999999999 | Success |
| WhatsApp with prefix | whatsapp:+5521999999999 | Success (normalized) |
| Valid Email | email@test.com | Success (SendGrid) |
| Missing credentials | No EVOLUTION_API_KEY | Error: credentials not configured |
| Invalid phone | abc123 | Error from Evolution API |

### Phase 3: Deployment

#### 3.1 Update Supabase Secrets
```bash
# Add Evolution API secrets (if not already present)
supabase secrets set EVOLUTION_API_URL="https://evolution-evolution-api.w9jo16.easypanel.host"
supabase secrets set EVOLUTION_API_KEY="[REDACTED]"
supabase secrets set EVOLUTION_INSTANCE_NAME="Lucas_4569"

# Verify secrets
supabase secrets list
```

#### 3.2 Deploy Function
```bash
# Deploy single function
supabase functions deploy send-guest-approval-link

# Verify deployment
supabase functions list
```

#### 3.3 Remove Old Secrets (After Validation)
```bash
# ONLY after confirming new implementation works
supabase secrets unset TWILIO_ACCOUNT_SID
supabase secrets unset TWILIO_AUTH_TOKEN
supabase secrets unset TWILIO_PHONE_NUMBER
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-guest-approval-link/index.ts` | **MODIFY** | Replace Twilio with Evolution API |
| `supabase/.env.example` | **UPDATE** | Document new env vars, remove Twilio |
| `docs/architecture/EDGE_FUNCTIONS.md` | **UPDATE** | Document new integration |

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**: The old Twilio secrets are still available (not deleted yet)
2. **Revert Code**: Git revert to previous commit
3. **Redeploy**: `supabase functions deploy send-guest-approval-link`

Keep Twilio secrets for at least 7 days after successful migration validation.

---

## Success Criteria

- [ ] WhatsApp messages sent successfully via Evolution API
- [ ] Email functionality unchanged (SendGrid)
- [ ] No breaking changes to API interface
- [ ] All test cases pass
- [ ] Approval links received on WhatsApp
- [ ] Error handling works correctly
- [ ] Logging provides adequate debugging info

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Evolution API downtime | High | Monitor instance status, have manual fallback |
| Phone format incompatibility | Medium | Comprehensive normalization function |
| Rate limiting | Low | Evolution API has higher limits than Twilio |
| Message delivery failure | Medium | Implement retry logic if needed |

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Code changes | 30 min | Simple replacement |
| Local testing | 30 min | Verify with real phone |
| Deployment | 15 min | Deploy and verify |
| Monitoring | 24-48h | Watch for issues |
| Cleanup | 15 min | Remove Twilio secrets |

**Total**: ~2 hours active work + 48h monitoring

---

## Appendix: Message Template Comparison

### Twilio (Current)
```
Ola {guestName}!
Por favor, revise suas informacoes para o podcast clicando no link abaixo:

{approvalUrl}

Este link expira em 30 dias.
```

### Evolution API (Target)
```
Ola {guestName}!

Por favor, revise suas informacoes para o podcast clicando no link abaixo:

{approvalUrl}

Este link expira em 30 dias.
```

**Note**: Removed emoji from template for cleaner professional communication. The message content remains functionally identical.

---

## References

- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Issue #12 - WhatsApp Integration](https://github.com/lucasblima/Aica_frontend/issues/12)
- [webhook-evolution Edge Function](../supabase/functions/webhook-evolution/index.ts)
- [evolution-client.ts Shared Module](../supabase/functions/_shared/evolution-client.ts)
