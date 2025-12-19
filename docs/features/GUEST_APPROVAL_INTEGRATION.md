# Guest Approval Page Integration Guide

## Overview

The `GuestApprovalPage` component provides an unauthenticated public interface for podcast guests to review and approve their information before recording.

## Components

### 1. GuestApprovalPage.tsx
**Location:** `src/modules/podcast/views/GuestApprovalPage.tsx`

**Purpose:**
- Display guest information (biography, technical sheet, key facts, controversies)
- Allow guests to approve or reject their information
- Save approval status to `podcast_guest_research` table
- Validate approval tokens for security

**Features:**
- Approval token verification (generates 30-day expiring tokens)
- Secure link validation against database
- Comprehensive guest data display
- Two-way approval/rejection with comments
- Responsive design with smooth animations

## Routing Integration

Add this route to your main router configuration (typically in your App.tsx or main routing file):

```tsx
import { GuestApprovalPage } from '@/modules/podcast/views/GuestApprovalPage';

// In your Routes component:
<Route
  path="/podcast/approval/:episodeId/:approvalToken"
  element={<GuestApprovalPage />}
/>
```

## Database Schema Requirements

The following fields should exist in `podcast_episodes` table:
- `approval_token` (TEXT) - Secure token for approval link validation
- `approval_token_created_at` (TIMESTAMPTZ) - Token creation timestamp for expiration checking

The following fields should exist in `podcast_guest_research` table:
- `approved_by_guest` (BOOLEAN) - Approval status
- `approved_at` (TIMESTAMPTZ) - When approval was submitted
- `approval_notes` (TEXT) - Guest comments/feedback

These fields are already included in the migration `20251210_fix_podcast_pautas_schema.sql`.

## Data Flow

```
1. Host generates approval link via GuestApprovalLinkDialog
   ↓
2. Token saved to podcast_episodes.approval_token
   ↓
3. Link sent to guest: /podcast/approval/{episodeId}/{approvalToken}
   ↓
4. Guest visits link (unauthenticated)
   ↓
5. GuestApprovalPage verifies token & loads guest data
   ↓
6. Guest reviews info & clicks Approve/Reject
   ↓
7. Status saved to podcast_guest_research
   ↓
8. Host can see approval status in PreProductionHub
```

## Security Considerations

1. **Token Validation**
   - Tokens are 32 characters of random alphanumeric data
   - Expires after 30 days from creation
   - Must match exactly with database value

2. **Data Access**
   - Only data associated with that episode_id is shown
   - No authentication required (public link)
   - RLS policies don't apply to this page (unauthenticated)
   - Episode existence check prevents unauthorized access

3. **CSRF Protection**
   - Consider adding CSRF tokens if sensitive data is involved
   - Currently uses simple token verification

## API/Backend Requirements

The GuestApprovalPage expects:
- Read access to `podcast_episodes` table (episode data + approval_token)
- Read access to `podcast_guest_research` table (guest information)
- Write access to `podcast_guest_research` table (approval status)
- No authentication required (unauthenticated access)

## Error Handling

The component gracefully handles:
- Invalid episode IDs
- Mismatched approval tokens
- Expired tokens (> 30 days old)
- Missing guest data
- Database connection errors
- Submission failures (with retry capability)

## UI/UX Features

### Visual States
- **Loading:** Spinner while data loads
- **Error:** Clear error messages with causes
- **Approval Pending:** Form for reviewing info + approve/reject buttons
- **Approved:** Success state with timestamp
- **Rejected:** Shows rejection with guest comments

### Guest Information Sections
1. **Biography** - Full guest biography from research
2. **Key Facts** - Bulleted list of important facts
3. **Technical Sheet** - Structured technical details
4. **Controversies** - Highlighted potentially sensitive information

### Interactive Elements
- Textarea for guest comments/corrections
- Approve button (green, always available)
- Reject button (red, requires comments)
- Navigation back button
- Smooth animations between states

## Future Enhancements

1. **Email Notifications**
   - Send approval confirmation emails to host
   - Auto-approve after certain time period

2. **Revision Requests**
   - Host can request changes to specific fields
   - Guest can submit revised information
   - Version tracking for iterations

3. **Multi-language Support**
   - Portuguese (current)
   - English
   - Spanish

4. **Advanced Sections**
   - Media links (photos, videos)
   - Social media profiles
   - Previous appearances/interviews
   - FAQ section for host

5. **Analytics**
   - Track approval rates
   - Monitor time-to-approval
   - Identify commonly rejected items

## Testing

### E2E Test Scenarios

1. **Happy Path - Approve**
   - Valid token → Load data → Click Approve → See success

2. **Happy Path - Reject**
   - Valid token → Load data → Add comments → Click Reject → See success

3. **Invalid Token**
   - Invalid token → See error message

4. **Expired Token**
   - Token > 30 days old → See expiration error

5. **Missing Data**
   - Episode exists but no guest research → Show partial data gracefully

6. **Duplicate Submission**
   - Already approved → Show previous approval status
   - Should not allow double-submission

## Environment Variables

None required - uses Supabase client from `@/services/supabaseClient`

## Dependencies

- React 18+
- React Router DOM (useParams, useNavigate)
- Framer Motion (animations)
- Lucide Icons (UI icons)
- Supabase JS client
- TypeScript

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

---

## Integration Checklist

- [ ] Add route to main router configuration
- [ ] Test with valid approval token
- [ ] Test with invalid/expired token
- [ ] Verify approval data saved to database
- [ ] Test UI responsiveness on mobile
- [ ] Add to navigation menu (if applicable)
- [ ] Create documentation for guests about approval process
- [ ] Test email/WhatsApp link generation and sending
- [ ] Monitor approval submission logs
- [ ] Set up monitoring for failed approvals

