# Migration Checklist: send-guest-approval-link to Evolution API

**Branch**: `feature/whatsapp-evolution-integration-issue-12`
**Related Issue**: #12
**Created**: 2025-12-30
**Status**: ✅ **MIGRATION COMPLETED** (2025-12-30)
**Deployed Version**: v4

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

### Phase 1: Code Modification ✅

- [x] **1.1** Create backup of current implementation
  - Agent: `general-purpose`
  - File: `supabase/functions/send-guest-approval-link/index.ts`
  - Status: Completed via git history

- [x] **1.2** Update environment variable declarations
  - Agent: `general-purpose`
  - Action: Replace Twilio vars with Evolution API vars
  - Status: ✅ Completed - Using EVOLUTION_INSTANCE_NAME=AI_Comtxae_4006

- [x] **1.3** Create phone number normalization helper
  - Agent: `general-purpose`
  - Status: ✅ Completed - Handles multiple formats automatically

- [x] **1.4** Replace `sendWhatsAppViaTwilio` function
  - Agent: `general-purpose`
  - Status: ✅ Completed - Using `sendWhatsAppViaEvolution` with evolution-client.ts

- [x] **1.5** Update function call in serve() handler
  - Agent: `general-purpose`
  - Status: ✅ Completed - Line 279 updated

- [x] **1.6** Update function comments/documentation
  - Agent: `general-purpose`
  - Status: ✅ Completed - Header comments reflect Evolution API

### Phase 2: Testing ✅

- [x] **2.1** Test phone number normalization
  - Agent: `testing-qa`
  - Status: ✅ Completed - Multiple formats tested and working

- [x] **2.2** Local function testing
  - Agent: `testing-qa`
  - Status: ✅ Completed - Tested via curl commands

- [x] **2.3** Integration test with real phone
  - Agent: `testing-qa`
  - Status: ✅ Completed - Message received on +5521981454569

- [x] **2.4** Test error scenarios
  - Agent: `testing-qa`
  - Status: ✅ Completed - Error handling verified

- [x] **2.5** Test email path unchanged
  - Agent: `testing-qa`
  - Status: ✅ Completed - SendGrid integration maintained

### Phase 3: Deployment ✅

- [x] **3.1** Verify Evolution secrets in production
  - Agent: `security-privacy`
  - Status: ✅ Completed - All Evolution secrets configured

- [x] **3.2** Deploy updated function
  - Agent: `general-purpose`
  - Status: ✅ Completed - v4 deployed successfully

- [x] **3.3** Smoke test in production
  - Agent: `testing-qa`
  - Status: ✅ Completed - Message delivered successfully

- [x] **3.4** Monitor logs for errors
  - Agent: `testing-qa`
  - Status: ✅ Completed - No errors detected in logs

### Phase 4: Cleanup ⏳

- [ ] **4.1** Remove Twilio secrets (after 7 days) ⏳ **PENDING**
  - Agent: `security-privacy`
  - Status: ⏳ Waiting for 7-day validation period (until 2025-01-06)
  - Action: Execute cleanup commands after validation
  - **Commands**:
  ```bash
  npx supabase secrets unset TWILIO_ACCOUNT_SID
  npx supabase secrets unset TWILIO_AUTH_TOKEN
  npx supabase secrets unset TWILIO_PHONE_NUMBER
  ```
  - **Checklist**: See `docs/security/TWILIO_CLEANUP_CHECKLIST.md`

- [x] **4.2** Update documentation
  - Agent: `general-purpose`
  - Status: ✅ Completed
  - Updated: `BACKEND_APPROVAL_IMPLEMENTATION.md`
  - Updated: `SEND_GUEST_APPROVAL_LINK_MIGRATION.md`
  - Updated: `MIGRATION_SEND_GUEST_APPROVAL_CHECKLIST.md`
  - Created: `TWILIO_SECRETS_CLEANUP_AUDIT.md`

- [x] **4.3** Remove backup file
  - Agent: `general-purpose`
  - Status: ✅ N/A - Using git history as backup

- [x] **4.4** Close related tasks
  - Agent: `atlas-task-agent`
  - Status: ✅ Completed - Migration documented in PRs #11, #12

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

- Evolution API instance: `AI_Comtxae_4006` (corrected from Lucas_4569)
- Evolution API URL: `https://evolution-evolution-api.w9jo16.easypanel.host`
- Twilio secrets kept as rollback option for 7 days (until 2025-01-06)
- Message template includes emoji (🎙️) for friendly communication
- Git commit: `f7add4c`
- Pull Requests: #11, #12

## Migration Success Metrics

✅ **Code**: 100% migrated to Evolution API
✅ **Testing**: All phases completed successfully
✅ **Deployment**: v4 deployed and verified
✅ **Documentation**: All docs updated
⏳ **Cleanup**: Pending 7-day validation period
