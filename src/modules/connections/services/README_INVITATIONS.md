# Connection Invitations Service - Developer Guide

**Module:** `@/modules/connections/services/invitationService`
**Issue:** #172

---

## Quick Start

```typescript
import {
  createInvitation,
  acceptInvitation,
  rejectInvitation,
  resendInvitation,
  getSpaceInvitations,
  cancelInvitation,
  getInvitationByToken,
} from '@/modules/connections/services/invitationService';
```

---

## API Reference

### createInvitation()

Creates a new invitation and sends email automatically.

```typescript
async function createInvitation(
  spaceId: string,
  email: string,
  invitedBy: string,
  role?: 'owner' | 'admin' | 'member' | 'guest',
  expiresInDays?: number
): Promise<InviteResult>
```

**Parameters:**
- `spaceId` - Connection space UUID
- `email` - Invitee email address
- `invitedBy` - User ID of inviter (must be owner/admin)
- `role` - Role to assign (default: `'member'`)
- `expiresInDays` - Days until expiration (default: `7`)

**Returns:**
```typescript
{
  success: boolean;
  invitation?: Invitation;
  inviteLink?: string;
  error?: string;
}
```

**Example:**
```typescript
const { data: { user } } = await supabase.auth.getUser();

const result = await createInvitation(
  'space-123',
  'colleague@example.com',
  user.id,
  'member',
  7
);

if (result.success) {
  console.log('Invitation sent!');
  console.log('Link:', result.inviteLink);
  console.log('Email status:', result.invitation?.email_delivery_status);
} else {
  console.error('Error:', result.error);
}
```

**Email Sent:**
- Subject: `{inviterName} convidou você para {spaceName} no Aica`
- From: `noreply@aica.app` (or `noreply@resend.dev` if domain not configured)
- Template: Responsive HTML with archetype-based colors
- Expires: 7 days (or custom `expiresInDays`)

---

### acceptInvitation()

Accepts an invitation and adds user to space.

```typescript
async function acceptInvitation(
  token: string,
  userId: string
): Promise<InviteResult>
```

**Parameters:**
- `token` - Invitation token (from URL `/invite/{token}`)
- `userId` - User ID accepting invitation

**Returns:**
```typescript
{
  success: boolean;
  invitation?: Invitation;
  error?: string;
}
```

**Example:**
```typescript
// In /invite/[token] route
const { token } = useParams();
const { data: { user } } = await supabase.auth.getUser();

const result = await acceptInvitation(token, user.id);

if (result.success) {
  // Redirect to space
  navigate(`/connections/${result.invitation.space_id}`);
} else {
  console.error('Error:', result.error);
  // Show error: expired, already accepted, invalid, etc.
}
```

**Validation:**
- ✅ Token exists and valid
- ✅ Not expired (`expires_at > NOW()`)
- ✅ Status is `pending`
- ✅ User email matches invitation email
- ✅ User not already a member

---

### rejectInvitation()

Rejects an invitation (soft delete, keeps record).

```typescript
async function rejectInvitation(token: string): Promise<InviteResult>
```

**Parameters:**
- `token` - Invitation token

**Example:**
```typescript
const result = await rejectInvitation(token);

if (result.success) {
  console.log('Invitation rejected');
} else {
  console.error('Error:', result.error);
}
```

---

### resendInvitation()

Cancels old invitation and creates a new one with fresh token and email.

```typescript
async function resendInvitation(invitationId: string): Promise<InviteResult>
```

**Parameters:**
- `invitationId` - UUID of invitation to resend

**Example:**
```typescript
const result = await resendInvitation('inv-123');

if (result.success) {
  console.log('New invitation sent!');
  console.log('New link:', result.inviteLink);
  console.log('New token:', result.invitation?.token);
} else {
  console.error('Error:', result.error);
}
```

**Use Cases:**
- User didn't receive email (spam filter)
- Token expired
- User requests new link

---

### getSpaceInvitations()

Lists all invitations for a space (owner/admin only).

```typescript
async function getSpaceInvitations(spaceId: string): Promise<Invitation[]>
```

**Parameters:**
- `spaceId` - Connection space UUID

**Returns:** Array of invitations

**Example:**
```typescript
const invitations = await getSpaceInvitations('space-123');

invitations.forEach(inv => {
  console.log(`${inv.email} - ${inv.status}`);
  console.log(`Sent: ${inv.email_sent_at}`);
  console.log(`Delivery: ${inv.email_delivery_status}`);
});
```

**UI Example:**
```tsx
function InvitationsList({ spaceId }: { spaceId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    getSpaceInvitations(spaceId).then(setInvitations);
  }, [spaceId]);

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Sent</th>
          <th>Delivery</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map(inv => (
          <tr key={inv.id}>
            <td>{inv.email}</td>
            <td>{inv.status}</td>
            <td>{inv.email_sent_at ? new Date(inv.email_sent_at).toLocaleString() : 'N/A'}</td>
            <td>{inv.email_delivery_status}</td>
            <td>
              {inv.status === 'pending' && (
                <button onClick={() => resendInvitation(inv.id)}>
                  Resend
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### cancelInvitation()

Deletes a pending invitation (hard delete).

```typescript
async function cancelInvitation(invitationId: string): Promise<void>
```

**Parameters:**
- `invitationId` - UUID of invitation to cancel

**Example:**
```typescript
try {
  await cancelInvitation('inv-123');
  console.log('Invitation cancelled');
} catch (error) {
  console.error('Error:', error.message);
}
```

**Throws:** Error if not found or permission denied

---

### getInvitationByToken()

Retrieves invitation details by token (public access).

```typescript
async function getInvitationByToken(token: string): Promise<Invitation | null>
```

**Parameters:**
- `token` - Invitation token

**Returns:** Invitation object or `null` if not found

**Example:**
```typescript
// In /invite/[token] page
const invitation = await getInvitationByToken(token);

if (!invitation) {
  return <ErrorPage message="Invalid invitation link" />;
}

if (isInvitationExpired(invitation)) {
  return <ErrorPage message="This invitation has expired" />;
}

return (
  <div>
    <h1>You've been invited to {invitation.space_name}</h1>
    <button onClick={() => acceptInvitation(token, user.id)}>
      Accept Invitation
    </button>
  </div>
);
```

---

## Types

### Invitation

```typescript
interface Invitation {
  id: string;
  space_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  invited_by: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  rejected_at?: string;

  // Email tracking
  email_sent_at?: string;
  email_delivery_status?: EmailDeliveryStatus;
  email_delivery_error?: string;
}
```

### InviteStatus

```typescript
type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
```

### EmailDeliveryStatus

```typescript
type EmailDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
```

### InviteResult

```typescript
interface InviteResult {
  success: boolean;
  invitation?: Invitation;
  inviteLink?: string;
  error?: string;
}
```

---

## Helper Functions

### isInvitationExpired()

```typescript
function isInvitationExpired(invitation: Invitation): boolean
```

**Example:**
```typescript
if (isInvitationExpired(invitation)) {
  console.log('This invitation has expired');
}
```

### generateInviteLink()

```typescript
function generateInviteLink(token: string): string
```

**Example:**
```typescript
const link = generateInviteLink('abc123def456');
// Returns: "https://aica-staging-5p22u2w6jq-rj.a.run.app/invite/abc123def456"
```

---

## Error Handling

All functions return `InviteResult` with `success` boolean:

```typescript
const result = await createInvitation(...);

if (!result.success) {
  switch (result.error) {
    case 'Invalid email format':
      // Show email validation error
      break;
    case 'An active invitation already exists for this email':
      // Show duplicate invitation error
      break;
    case 'Space not found or you do not have permission to invite members':
      // Show permission error
      break;
    default:
      // Show generic error
      console.error(result.error);
  }
}
```

---

## Common Patterns

### Invite Flow (Owner Perspective)

```typescript
// 1. Create invitation
const result = await createInvitation(
  spaceId,
  'newmember@example.com',
  currentUserId,
  'member'
);

if (result.success) {
  // 2. Show success message
  toast.success(`Invitation sent to ${email}!`);

  // 3. Copy invite link to clipboard (optional)
  navigator.clipboard.writeText(result.inviteLink);

  // 4. Refresh invitations list
  const invitations = await getSpaceInvitations(spaceId);
  setInvitations(invitations);
}
```

### Accept Flow (Invitee Perspective)

```typescript
// 1. Extract token from URL
const { token } = useParams<{ token: string }>();

// 2. Get invitation details
const invitation = await getInvitationByToken(token);

if (!invitation) {
  return <NotFound />;
}

if (isInvitationExpired(invitation)) {
  return <Expired />;
}

// 3. Authenticate user (if not logged in)
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  // Redirect to login with return URL
  navigate(`/login?redirect=/invite/${token}`);
  return;
}

// 4. Accept invitation
const result = await acceptInvitation(token, user.id);

if (result.success) {
  // Redirect to space
  navigate(`/connections/${invitation.space_id}`);
} else {
  toast.error(result.error);
}
```

### Resend Flow (Owner Perspective)

```typescript
// In invitations list component
async function handleResend(invitationId: string) {
  const result = await resendInvitation(invitationId);

  if (result.success) {
    toast.success('Invitation resent!');
    // Refresh list
    const invitations = await getSpaceInvitations(spaceId);
    setInvitations(invitations);
  } else {
    toast.error(result.error);
  }
}
```

---

## Monitoring

### Check Email Delivery Status

```typescript
const invitations = await getSpaceInvitations(spaceId);

const sentCount = invitations.filter(inv => inv.email_delivery_status === 'sent').length;
const failedCount = invitations.filter(inv => inv.email_delivery_status === 'failed').length;

console.log(`Sent: ${sentCount}, Failed: ${failedCount}`);

// Show failed invitations
const failed = invitations.filter(inv => inv.email_delivery_status === 'failed');
failed.forEach(inv => {
  console.error(`Failed to send to ${inv.email}: ${inv.email_delivery_error}`);
});
```

---

## Related Documentation

- **Full Docs:** `docs/features/CONNECTION_INVITATIONS_EMAIL_SYSTEM.md`
- **Setup Guide:** `docs/SETUP_INVITATION_EMAIL.md`
- **Testing:** `test-invitation-email.http`
- **Migration:** `supabase/migrations/20260129000001_connection_invitations.sql`
- **Edge Function:** `supabase/functions/send-invitation-email/index.ts`

---

## Support

**Issue:** GitHub #172
**Agent:** backend-architect-supabase
