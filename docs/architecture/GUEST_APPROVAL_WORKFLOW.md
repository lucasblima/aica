# Guest Approval Workflow Documentation

**Last Updated**: 2025-12-30
**Status**: Operational (v4 - Evolution API Migration Complete)
**Owner**: Podcast Production Copilot Agent

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Inventory](#component-inventory)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Frontend Integration](#frontend-integration)
8. [Security Considerations](#security-considerations)
9. [Current Limitations](#current-limitations)
10. [Related Documentation](#related-documentation)

---

## Overview

The Guest Approval Workflow enables podcast hosts to send approval links to guests before recording. Guests can review their profile information (biography, technical sheet, controversies) and approve or request changes. This ensures accuracy and consent before publication.

### Key Features

- **Multi-channel delivery**: Email (SendGrid) and WhatsApp (Evolution API)
- **Token-based security**: 32-character alphanumeric tokens with 30-day expiration
- **Guest self-service**: Public page for reviewing and approving information
- **Audit trail**: History tracking in `approval_link_history` table
- **Two guest workflows**: Public Figure (auto-research) and Common Person (manual entry)

### Recent Migration (v4)

- **From**: Twilio WhatsApp API
- **To**: Evolution API (self-hosted WhatsApp)
- **Status**: Fully operational
- **Benefits**: Cost reduction, more control over WhatsApp instance

---

## Architecture Diagram

```
+------------------+     +---------------------+     +----------------------+
|   Frontend       |     |   Supabase Edge     |     |   External Services  |
|   (React)        |     |   Function          |     |                      |
+------------------+     +---------------------+     +----------------------+
        |                         |                          |
        |  1. User clicks         |                          |
        |  "Enviar Aprovacao"     |                          |
        |                         |                          |
        v                         |                          |
+------------------+              |                          |
| PreProductionHub |              |                          |
| Component        |              |                          |
+------------------+              |                          |
        |                         |                          |
        |  2. Opens               |                          |
        |  ApprovalDialog         |                          |
        v                         |                          |
+------------------+              |                          |
| GuestApproval    |              |                          |
| LinkDialog       |              |                          |
+------------------+              |                          |
        |                         |                          |
        |  3. POST request        |                          |
        |  with episodeId,        |                          |
        |  method, contact        |                          |
        v                         v                          |
        +---------->  send-guest-approval-link  ------------>+
                      Edge Function                          |
                              |                              |
                              |  4a. Email (SendGrid)        |
                              +----------------------------->+ SendGrid API
                              |                              |
                              |  4b. WhatsApp (Evolution)    |
                              +----------------------------->+ Evolution API
                              |                              |
                              |  5. Log to DB                |
                              v                              |
                      approval_link_history                  |
                              |                              |
                              |                              |
+------------------+          |                              |
| Guest receives   |<---------+                              |
| link via email   |                                         |
| or WhatsApp      |                                         |
+------------------+                                         |
        |                                                    |
        |  6. Guest clicks link                              |
        v                                                    |
+------------------+                                         |
| GuestApproval    |                                         |
| Page (Public)    |                                         |
+------------------+                                         |
        |                                                    |
        |  7. Verify token                                   |
        |  8. Load guest_research                            |
        |  9. Display for review                             |
        |                                                    |
        |  10. Guest approves/rejects                        |
        v                                                    |
+------------------+                                         |
| podcast_guest_   |                                         |
| research         |                                         |
| (approved_by_    |                                         |
|  guest field)    |                                         |
+------------------+                                         |
```

---

## Component Inventory

### Backend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `send-guest-approval-link` | `supabase/functions/send-guest-approval-link/index.ts` | Edge Function for sending approval links via email/WhatsApp |
| `evolution-client` | `supabase/functions/_shared/evolution-client.ts` | Shared WhatsApp client using Evolution API |

### Frontend Components

| Component | Location | Description |
|-----------|----------|-------------|
| `GuestApprovalPage` | `src/modules/podcast/views/GuestApprovalPage.tsx` | Public page where guests review and approve their information |
| `GuestApprovalLinkDialog` | (To be implemented) | Dialog for selecting delivery method and sending link |

### Database Tables

| Table | Purpose |
|-------|---------|
| `podcast_episodes` | Stores `approval_token`, `approval_token_created_at`, guest contact info |
| `podcast_guest_research` | Stores research data and approval status (`approved_by_guest`, `approved_at`, `approval_notes`) |
| `approval_link_history` | Audit log of sent approval links |

---

## Data Flow

### 1. Link Generation & Delivery Flow

```
User Action: Click "Enviar Aprovacao" in PreProductionHub
    |
    v
Dialog: Select delivery method (email/whatsapp)
    |
    v
Frontend: Generate approval token (if not exists)
    |
    v
Frontend: Update podcast_episodes with token
    |
    v
Frontend: Construct approval URL
    - Format: /guest-approval/:episodeId/:approvalToken
    |
    v
Frontend: POST to send-guest-approval-link Edge Function
    |
    v
Edge Function: Validate request
    |
    +-- email --> SendGrid API --> Email delivered
    |
    +-- whatsapp --> Evolution API --> WhatsApp delivered
    |
    v
Edge Function: Log to approval_link_history
    |
    v
Success response to frontend
```

### 2. Guest Approval Flow

```
Guest: Clicks link in email/WhatsApp
    |
    v
Router: /guest-approval/:episodeId/:approvalToken
    |
    v
GuestApprovalPage: Load & verify token
    |
    +-- Invalid/Expired --> Error message
    |
    v
GuestApprovalPage: Fetch podcast_episodes
    |
    v
GuestApprovalPage: Fetch podcast_guest_research
    |
    v
Display: Biography, Key Facts, Technical Sheet, Controversies
    |
    v
Guest Action: Approve or Reject (with notes)
    |
    v
Update: podcast_guest_research
    - approved_by_guest: true/false
    - approved_at: timestamp
    - approval_notes: guest comments
    |
    v
Success confirmation displayed
```

---

## Database Schema

### podcast_episodes (relevant columns)

```sql
-- Token management
approval_token TEXT,                    -- 32-char alphanumeric token
approval_token_created_at TIMESTAMPTZ,  -- Token creation timestamp

-- Guest contact info
guest_name TEXT NOT NULL,
guest_email TEXT,                       -- For email delivery
guest_phone TEXT,                       -- For WhatsApp delivery
guest_category TEXT,                    -- 'public_figure' or 'common_person'
```

### podcast_guest_research (relevant columns)

```sql
-- Approval status
approved_by_guest BOOLEAN,              -- NULL = pending, true = approved, false = rejected
approved_at TIMESTAMPTZ,                -- When guest responded
approval_notes TEXT,                    -- Guest comments or rejection reason

-- Research data displayed to guest
biography TEXT,
technical_sheet JSONB,
key_facts JSONB,
controversies JSONB,
```

### approval_link_history

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

---

## API Reference

### Edge Function: send-guest-approval-link

**Endpoint**: `POST /functions/v1/send-guest-approval-link`

**Request Body**:
```typescript
interface SendApprovalLinkRequest {
  episodeId: string;      // UUID of the episode
  guestName: string;      // Guest's display name
  guestEmail?: string;    // Required if method = 'email'
  guestPhone?: string;    // Required if method = 'whatsapp'
  approvalUrl: string;    // Full URL to approval page
  method: 'email' | 'whatsapp';
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Approval link sent via email"
}
```

**Error Responses**:
- 400: Missing required fields
- 405: Method not allowed (not POST)
- 500: SendGrid/Evolution API error

### Frontend Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/guest-approval/:episodeId/:approvalToken` | `GuestApprovalPage` | Public (no auth required) |

---

## Frontend Integration

### Current State

The `GuestApprovalPage` component is implemented and handles:
- Token verification
- Guest research data display
- Approve/Reject actions
- Notes/comments from guest

### Missing Components

1. **GuestApprovalLinkDialog**: Not found in codebase. The E2E tests reference a "Enviar Aprovacao" button but the dialog component for selecting delivery method is not implemented.

2. **Frontend Service Layer**: `src/modules/podcast/services/guestApprovalService.ts` is documented but not found in codebase.

### Integration Points

1. **PreProductionHub**: Should contain "Enviar Aprovacao" button
2. **GuestIdentificationWizard**: Creates episode with guest contact info
3. **StudioMainView**: Contains workflow navigation

---

## Security Considerations

### Token Security

- 32-character alphanumeric tokens
- 30-day expiration
- Tokens stored in database (not in URL only)
- HTTPS required for all communications

### Data Privacy

- Guest approval page is public (no authentication)
- RLS policies prevent unauthorized access to research data
- Guests can only see their own episode's data via token
- Sensitive data not logged

### Rate Limiting

Currently NOT implemented. Recommendations:
- Limit email sends per IP/user
- Prevent token enumeration attacks
- Monitor for abuse patterns

---

## Current Limitations

### Known Issues

1. **Missing Dialog Component**: The `GuestApprovalLinkDialog` is not implemented
2. **No Frontend Service Layer**: Direct Supabase calls instead of service abstraction
3. **No Rate Limiting**: Potential for abuse
4. **No Retry Logic**: Failed sends are not automatically retried
5. **No Status Tracking**: Cannot see if guest has opened the link

### Technical Debt

1. Documentation references Twilio (outdated after Evolution migration)
2. `BACKEND_APPROVAL_IMPLEMENTATION.md` needs update for Evolution API
3. E2E tests may need updates for current UI

---

## Related Documentation

- `docs/delivery/BACKEND_APPROVAL_IMPLEMENTATION.md` - Implementation guide (needs update)
- `tests/e2e/podcast-guest-approval-flow.spec.ts` - E2E test suite
- `tests/sql/guest-approval-validation.sql` - Database validation queries
- `.claude/agents/podcast-production-copilot.md` - Agent prompt with workflow context

---

## Environment Variables Required

### Supabase Edge Functions

```bash
# Email (SendGrid)
SENDGRID_API_KEY=sg_...
FROM_EMAIL=noreply@yourpodcast.com

# WhatsApp (Evolution API) - NEW
EVOLUTION_API_URL=https://your-evolution-instance.com
EVOLUTION_API_KEY=your_api_key
EVOLUTION_INSTANCE_NAME=AI_Comtxae_4006

# Legacy (TO BE REMOVED)
TWILIO_ACCOUNT_SID=deprecated
TWILIO_AUTH_TOKEN=deprecated
TWILIO_PHONE_NUMBER=deprecated
```

---

## Appendix: Message Templates

### Email Template (HTML)

```html
<h2>Ola [Guest Name]!</h2>
<p>Estamos felizes em ter voce em nosso podcast.</p>
<p>Por favor, clique no link abaixo para revisar e aprovar seus dados:</p>
<a href="[Approval URL]">Revisar Informacoes</a>
<p>Este link expira em 30 dias.</p>
```

### WhatsApp Template

```
Ola [Guest Name]! (microphone emoji)

Por favor, revise suas informacoes para o podcast clicando no link abaixo:

[Approval URL]

Este link expira em 30 dias.
```
