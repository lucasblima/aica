# Migration Checklist: send-guest-approval-link to Evolution API

**Branch**: `feature/whatsapp-evolution-integration-issue-12`
**Related Issue**: #12
**Created**: 2025-12-30

---

## Pre-Migration Tasks

- [x] Analyze current `send-guest-approval-link/index.ts` implementation
- [x] Document current Twilio integration
- [x] Review Evolution API integration in `webhook-evolution`
- [x] Review shared Evolution client at `_shared/evolution-client.ts`
- [x] Verify Evolution API secrets are available in Supabase
- [x] Create migration plan document

---

## Implementation Tasks

### Phase 1: Code Modification

- [ ] **1.1** Create backup of current implementation
  - Agent: `general-purpose`
  - File: `supabase/functions/send-guest-approval-link/index.ts`
  - Action: Copy to `index.ts.bak` (temporary)

- [ ] **1.2** Update environment variable declarations
  - Agent: `general-purpose`
  - Action: Replace Twilio vars with Evolution API vars
  ```typescript
  // Remove:
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

  // Add:
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
  const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'Lucas_4569';
  ```

- [ ] **1.3** Create phone number normalization helper
  - Agent: `general-purpose`
  - Action: Add function to normalize phone formats
  ```typescript
  function normalizePhoneNumber(phone: string): string {
    return phone
      .replace(/^whatsapp:/i, '')
      .replace(/^\+/, '')
      .replace(/\D/g, '');
  }
  ```

- [ ] **1.4** Replace `sendWhatsAppViaTwilio` function
  - Agent: `general-purpose`
  - Action: Implement `sendWhatsAppViaEvolution` function
  - Use patterns from `webhook-evolution/index.ts` lines 492-527

- [ ] **1.5** Update function call in serve() handler
  - Agent: `general-purpose`
  - Action: Replace Twilio call with Evolution call
  - Line ~275: Change `sendWhatsAppViaTwilio` to `sendWhatsAppViaEvolution`

- [ ] **1.6** Update function comments/documentation
  - Agent: `general-purpose`
  - Action: Update header comments to reflect Evolution API

### Phase 2: Testing

- [ ] **2.1** Test phone number normalization
  - Agent: `testing-qa`
  - Cases:
    - `+5521999999999` -> `5521999999999`
    - `5521999999999` -> `5521999999999`
    - `whatsapp:+5521999999999` -> `5521999999999`

- [ ] **2.2** Local function testing
  - Agent: `testing-qa`
  - Action: Test with Supabase local development
  ```bash
  supabase functions serve send-guest-approval-link --env-file .env.local
  ```

- [ ] **2.3** Integration test with real phone
  - Agent: `testing-qa`
  - Action: Send test message to verified phone number
  - Verify: Message received on WhatsApp

- [ ] **2.4** Test error scenarios
  - Agent: `testing-qa`
  - Cases:
    - Missing API credentials
    - Invalid phone number
    - Network timeout
    - Evolution API error response

- [ ] **2.5** Test email path unchanged
  - Agent: `testing-qa`
  - Action: Verify SendGrid email still works
  - No regression in email functionality

### Phase 3: Deployment

- [ ] **3.1** Verify Evolution secrets in production
  - Agent: `security-privacy`
  - Action: Confirm secrets are set
  ```bash
  supabase secrets list | grep EVOLUTION
  ```

- [ ] **3.2** Deploy updated function
  - Agent: `general-purpose`
  - Action: Deploy to Supabase
  ```bash
  supabase functions deploy send-guest-approval-link
  ```

- [ ] **3.3** Smoke test in production
  - Agent: `testing-qa`
  - Action: Send test approval link via WhatsApp
  - Verify: Message delivered successfully

- [ ] **3.4** Monitor logs for errors
  - Agent: `testing-qa`
  - Action: Check Supabase function logs
  - Duration: 24-48 hours

### Phase 4: Cleanup

- [ ] **4.1** Remove Twilio secrets (after 7 days)
  - Agent: `security-privacy`
  - Action: Unset Twilio secrets
  - Condition: Only after confirming stable operation
  ```bash
  supabase secrets unset TWILIO_ACCOUNT_SID
  supabase secrets unset TWILIO_AUTH_TOKEN
  supabase secrets unset TWILIO_PHONE_NUMBER
  ```

- [ ] **4.2** Update documentation
  - Agent: `general-purpose`
  - Action: Update EDGE_FUNCTIONS.md
  - Action: Update .env.example

- [ ] **4.3** Remove backup file
  - Agent: `general-purpose`
  - Action: Delete `index.ts.bak`

- [ ] **4.4** Close related tasks
  - Agent: `atlas-task-agent`
  - Action: Update issue #12 with migration notes

---

## Delegation Summary

| Agent | Tasks |
|-------|-------|
| `general-purpose` | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 4.2, 4.3 |
| `testing-qa` | 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4 |
| `security-privacy` | 3.1, 4.1 |
| `atlas-task-agent` | 4.4 |

---

## Dependencies Graph

```
Pre-Migration (Complete)
         |
         v
+--------+--------+
|                 |
v                 v
1.2 (env vars)    1.3 (normalize fn)
|                 |
+--------+--------+
         |
         v
       1.4 (new function)
         |
         v
       1.5 (update call)
         |
         v
       1.6 (docs)
         |
         v
+--------+--------+
|                 |
v                 v
2.1-2.2 (local)   2.5 (email)
|
v
2.3 (integration)
|
v
2.4 (error cases)
|
v
3.1 (verify secrets)
|
v
3.2 (deploy)
|
v
3.3 (smoke test)
|
v
3.4 (monitor) [24-48h]
|
v
4.1-4.4 (cleanup) [after 7 days]
```

---

## Quick Reference: Code Locations

| Component | File Path |
|-----------|-----------|
| Target function | `supabase/functions/send-guest-approval-link/index.ts` |
| Evolution webhook (reference) | `supabase/functions/webhook-evolution/index.ts` |
| Evolution client (shared) | `supabase/functions/_shared/evolution-client.ts` |
| Media processor (reference) | `supabase/functions/media-processor/index.ts` |
| Migration plan | `docs/migrations/SEND_GUEST_APPROVAL_LINK_MIGRATION.md` |

---

## Acceptance Criteria

1. **Functional**: WhatsApp messages sent successfully via Evolution API
2. **Compatibility**: API interface unchanged (same request/response format)
3. **Reliability**: Error handling works for all edge cases
4. **Email**: SendGrid integration unaffected
5. **Security**: No exposed credentials in logs
6. **Observability**: Adequate logging for debugging

---

## Notes

- Evolution API instance: `Lucas_4569`
- Evolution API URL: `https://evolution-evolution-api.w9jo16.easypanel.host`
- Keep Twilio secrets as rollback option for 7 days
- Message template simplified (removed emoji for professional communication)
