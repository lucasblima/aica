# Twilio Secrets Cleanup - Execution Checklist

**Date**: 2025-12-30
**Task**: Remove obsolete Twilio secrets after Evolution API migration
**Status**: READY FOR EXECUTION
**Estimated Time**: 15-20 minutes

---

## Pre-Execution Verification

Before removing any secrets, verify the migration is complete:

### Step 1: Verify Current Secrets

```bash
# List all current Supabase secrets
npx supabase secrets list
```

Expected output should include:
- EVOLUTION_API_KEY
- EVOLUTION_BASE_URL (or EVOLUTION_INSTANCE_NAME)
- SENDGRID_API_KEY
- GEMINI_API_KEY
- TWILIO_ACCOUNT_SID (to be removed)
- TWILIO_AUTH_TOKEN (to be removed)
- TWILIO_PHONE_NUMBER (to be removed)

**Status**: [ ] Verified

---

### Step 2: Verify Edge Function Deployment

```bash
# List deployed Edge Functions
npx supabase functions list
```

Expected output should show:
- send-guest-approval-link (deployed)

**Status**: [ ] Verified

---

### Step 3: Test Current Function (Pre-Cleanup)

```bash
# Test that the function works BEFORE cleanup
curl -X POST https://[your-project].supabase.co/functions/v1/send-guest-approval-link \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "episodeId": "test-cleanup-verification",
    "guestName": "Test User",
    "guestPhone": "+5511999999999",
    "approvalUrl": "https://example.com/test",
    "method": "whatsapp"
  }'
```

Expected response:
```json
{"success": true, "message": "Approval link sent via whatsapp"}
```

**Status**: [ ] Function working before cleanup

---

## Execution Phase

### Step 4: Remove Twilio Secrets

Execute these commands one at a time:

```bash
# Remove TWILIO_ACCOUNT_SID
npx supabase secrets unset TWILIO_ACCOUNT_SID
```

**Status**: [ ] TWILIO_ACCOUNT_SID removed

```bash
# Remove TWILIO_AUTH_TOKEN
npx supabase secrets unset TWILIO_AUTH_TOKEN
```

**Status**: [ ] TWILIO_AUTH_TOKEN removed

```bash
# Remove TWILIO_PHONE_NUMBER
npx supabase secrets unset TWILIO_PHONE_NUMBER
```

**Status**: [ ] TWILIO_PHONE_NUMBER removed

---

### Step 5: Verify Secrets Removed

```bash
# Verify no TWILIO secrets remain
npx supabase secrets list | grep TWILIO
```

Expected output: (empty - no matches)

**Status**: [ ] Verified - No TWILIO secrets found

---

## Post-Cleanup Validation

### Step 6: Test Function (Post-Cleanup)

```bash
# Test that the function STILL works after cleanup
curl -X POST https://[your-project].supabase.co/functions/v1/send-guest-approval-link \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "episodeId": "test-post-cleanup",
    "guestName": "Test User",
    "guestPhone": "+5511999999999",
    "approvalUrl": "https://example.com/test",
    "method": "whatsapp"
  }'
```

Expected response:
```json
{"success": true, "message": "Approval link sent via whatsapp"}
```

**Status**: [ ] Function working after cleanup

---

### Step 7: Monitor Function Logs

```bash
# Check for any errors in the last 10 minutes
npx supabase functions logs send-guest-approval-link --tail
```

**Look for**:
- No errors related to missing TWILIO secrets
- Successful message sending via Evolution API

**Status**: [ ] Logs reviewed - No errors

---

### Step 8: Send Real Test Message

If possible, send a real WhatsApp message using the function:

**Method 1** - Via Frontend (if available):
1. Navigate to podcast guest approval feature
2. Enter test guest details
3. Select "WhatsApp" method
4. Send approval link
5. Verify message received on WhatsApp

**Method 2** - Via Direct API Call:
Use the curl command from Step 6 with a real phone number.

**Status**: [ ] Real message sent and received successfully

---

## Optional: External Cleanup

### Step 9: Revoke Twilio API Keys (Optional but Recommended)

If you still have access to the Twilio account:

1. Log in to Twilio Console: https://console.twilio.com
2. Navigate to: Account → API Keys & Credentials
3. Locate the API key matching the removed `TWILIO_ACCOUNT_SID`
4. Click "Delete" or "Revoke"
5. Confirm revocation

**Benefits**:
- Prevents accidental reuse even if secrets leak
- Reduces attack surface further
- Follows principle of least privilege

**Status**: [ ] Twilio API keys revoked (or N/A if no access)

---

### Step 10: Download Twilio Records (Optional)

Before closing the Twilio account (if applicable):

1. Download transaction history
2. Save any important logs
3. Export usage reports
4. Store records securely for compliance

**Status**: [ ] Records downloaded (or N/A)

---

## Documentation Updates

### Step 11: Update Backend Documentation

Edit: `docs/delivery/BACKEND_APPROVAL_IMPLEMENTATION.md`

**Changes**:
1. Remove all Twilio setup instructions (lines 107-110, 191-209)
2. Remove Twilio troubleshooting entry (line 422)
3. Remove Twilio resources section (lines 514-517)
4. Add Evolution API setup instructions

**Note**: A detailed update guide is in Section 6.1 of `TWILIO_SECRETS_CLEANUP_AUDIT.md`

**Status**: [ ] Documentation updated

---

### Step 12: Record in Audit Log

Add this entry to your security audit log:

```markdown
## 2025-12-30: Twilio Credentials Cleanup

**Action**: Removed obsolete Twilio API credentials from Supabase secrets
**Reason**: Migration to Evolution API completed successfully
**Secrets Removed**:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

**Verification**:
- Pre-cleanup test: PASSED
- Secrets removal: COMPLETED
- Post-cleanup test: PASSED
- Function logs: NO ERRORS
- Real message test: PASSED

**External Actions**:
- Twilio API keys revoked: [YES/NO/N/A]
- Records downloaded: [YES/NO/N/A]

**Documentation Updated**:
- BACKEND_APPROVAL_IMPLEMENTATION.md: UPDATED
- SECURITY_AUDIT_REPORT.md: UPDATED
- Audit trail recorded: YES

**Approved By**: Security & Privacy Agent
**Executed By**: [Your Name]
**Date**: 2025-12-30
**Status**: COMPLETED
```

**Status**: [ ] Audit log updated

---

## Final Verification

### Comprehensive Post-Cleanup Checklist

- [ ] All 3 Twilio secrets removed from Supabase
- [ ] `supabase secrets list` shows no TWILIO* secrets
- [ ] `send-guest-approval-link` function tested successfully
- [ ] Function logs show no errors
- [ ] Real WhatsApp message sent and received
- [ ] Twilio API keys revoked (optional)
- [ ] Documentation updated
- [ ] Audit trail recorded
- [ ] No rollback needed

---

## Rollback Plan (Emergency Only)

**If something goes wrong and you need to restore Twilio**:

### Quick Rollback Steps

1. **Restore Secrets** (if you still have the values):
```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=[backup_value]
npx supabase secrets set TWILIO_AUTH_TOKEN=[backup_value]
npx supabase secrets set TWILIO_PHONE_NUMBER=[backup_value]
```

2. **Restore Code from Git**:
```bash
# Find the commit before Evolution API migration
git log --all --oneline -- supabase/functions/send-guest-approval-link/index.ts

# View the old Twilio version
git show [commit_hash]:supabase/functions/send-guest-approval-link/index.ts

# Restore if needed
git checkout [commit_hash] -- supabase/functions/send-guest-approval-link/index.ts
```

3. **Redeploy**:
```bash
npx supabase functions deploy send-guest-approval-link
```

**Rollback Time Estimate**: 5-10 minutes

**Likelihood of Needing Rollback**: VERY LOW (migration tested and verified)

---

## Sign-Off

**Cleanup Executed By**: ___________________________

**Date**: ___________________________

**Verification Completed**: [ ] YES [ ] NO

**Issues Encountered**: [ ] NONE [ ] See notes below

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Status**: [ ] COMPLETED SUCCESSFULLY

---

## References

- **Detailed Audit Report**: `docs/security/TWILIO_SECRETS_CLEANUP_AUDIT.md`
- **Security Audit**: `docs/security/SECURITY_AUDIT_REPORT.md`
- **Migration Plan**: `docs/migrations/SEND_GUEST_APPROVAL_LINK_MIGRATION.md`
- **Evolution API Client**: `supabase/functions/_shared/evolution-client.ts`

---

## Support

**If you encounter issues**:

1. Check function logs: `npx supabase functions logs send-guest-approval-link`
2. Verify Evolution API credentials: `npx supabase secrets list | grep EVOLUTION`
3. Review migration documentation: `docs/migrations/SEND_GUEST_APPROVAL_LINK_MIGRATION.md`
4. Consult detailed audit: `docs/security/TWILIO_SECRETS_CLEANUP_AUDIT.md`

**Emergency Contact**:
- Refer to Section 9 (Rollback Plan) in `TWILIO_SECRETS_CLEANUP_AUDIT.md`

---

**END OF CHECKLIST**
