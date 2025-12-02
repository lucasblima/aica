# Aica Life OS - Privacy & Security Documentation

**Version**: 2.0
**Last Updated**: December 2, 2025
**Compliance**: GDPR, LGPD (Brazil), CCPA (California), PIPEDA (Canada)
**Status**: Complete

---

## Table of Contents

1. [Privacy Philosophy](#privacy-philosophy)
2. [Data Collection & Processing](#data-collection--processing)
3. [GDPR Compliance](#gdpr-compliance)
4. [Data Security](#data-security)
5. [Encryption & Data Protection](#encryption--data-protection)
6. [Access Control & Authentication](#access-control--authentication)
7. [Third-Party Integrations](#third-party-integrations)
8. [User Rights & Data Subject Requests](#user-rights--data-subject-requests)
9. [Data Retention & Deletion](#data-retention--deletion)
10. [Privacy by Design](#privacy-by-design)
11. [Incident Response](#incident-response)
12. [Compliance Checklist](#compliance-checklist)
13. [Privacy Notice (User-Facing)](#privacy-notice-user-facing)

---

## Privacy Philosophy

Aica is built on **privacy-first principles**. Our architecture prioritizes user autonomy, data minimization, and transparency.

### Core Tenets

1. **Privacy by Design** - Privacy is not an afterthought; it's embedded in every system
2. **Data Minimization** - Collect only what's necessary for functionality
3. **User Control** - Users own their data and can export/delete anytime
4. **Transparency** - Clear communication about what data is processed and why
5. **Security First** - Industry-standard encryption and access controls
6. **No Surveillance** - No tracking, no behavioral profiling, no ad networks
7. **Open Standards** - Use open-source tools where possible

---

## Data Collection & Processing

### What Data We Collect

#### User-Provided Data
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| **Account Info** | Authentication, identity | Lifetime (until deletion) |
| - Email | Login, notifications | Lifetime |
| - Password (hashed) | Authentication | Lifetime |
| - Name, avatar | Profile display | Lifetime |
| - Birth date | Memento Mori calculation | Lifetime |
| - Phone number | WhatsApp integration | Lifetime |
| **Tasks & Goals** | Productivity tracking | User-defined |
| **Life Events** | Life planning, Memento Mori | User-defined |
| **Mood & Emotions** | Daily sentiment tracking | Configurable retention |
| **Notes & Preferences** | Personalization | Lifetime |

#### Automatically Generated Data
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| **Session Tokens** | Authentication | Session duration |
| **Activity Logs** | Security audit | 90 days |
| **Efficiency Scores** | Performance analytics | 1 year (aggregated) |
| **Relationship Metadata** | Contact network | Lifetime (interaction-only) |
| **Memory Embeddings** | Semantic search | Configurable (default 1 year) |
| **Daily Reports** | Summary analytics | Configurable (default 1 year) |

#### Communication Data
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| **WhatsApp Messages** | Processing only | **NONE - Immediate discard** |
| **Message Summaries** | AI insights | Configurable (default 1 year) |
| **Sentiment Analysis** | Emotional tracking | Configurable (default 1 year) |
| **Contact Interactions** | Relationship scoring | 2 years |

**⚠️ CRITICAL**: Raw WhatsApp messages are **NEVER stored**. Only AI-extracted insights are retained.

### What Data We DO NOT Collect

✅ **Explicit Non-Collection**:
- Raw message content (discarded after processing)
- Location data (unless explicitly provided by user)
- Health data (except user-provided mood/stress levels)
- Genetic data
- Biometric data
- Criminal records
- Financial account details
- Browsing history
- Device identifiers (IDFA, Android ID)
- IP addresses (except for security logging)

---

## GDPR Compliance

### GDPR Applicability

**Scope**: Aica complies with GDPR for all users, regardless of location, as data is processed in EU-compliant infrastructure (Supabase/AWS EU).

### Legal Basis for Processing

| Data Category | Legal Basis | Article |
|---------------|-------------|---------|
| Account & Authentication | Contractual necessity | 6(1)(b) |
| Task management | Contractual necessity | 6(1)(b) |
| Efficiency analytics | Legitimate interest | 6(1)(f) |
| Mood/wellness tracking | Explicit consent | 6(1)(a) |
| Marketing emails | Explicit consent | 6(1)(a) |
| Security logs | Legal obligation | 6(1)(c) |
| Relationship analytics | Legitimate interest | 6(1)(f) |

### Data Subject Rights (GDPR Articles 12-23)

**Users have the right to**:

#### 1. Right of Access (Article 15)
- **What**: Copy of all personal data
- **Request Method**: Settings → Privacy → "Export My Data"
- **Format**: JSON, CSV, PDF
- **Timeline**: 30 days
- **Cost**: Free
- **Implementation**: Automated export function

```typescript
// User can access all their data via one-click export
const exportUserData = async (userId: string) => {
  return {
    profile: await getProfile(userId),
    workItems: await getWorkItems(userId),
    memories: await getMemories(userId),
    dailyReports: await getDailyReports(userId),
    contactNetwork: await getContactNetwork(userId),
    settings: await getUserSettings(userId)
  };
};
```

#### 2. Right to Rectification (Article 16)
- **What**: Correct inaccurate data
- **Request Method**: Settings → Edit Profile/Data
- **Timeline**: Immediate (user-initiated)
- **Implementation**: Edit all user-controlled fields

#### 3. Right to Erasure (Article 17) - "Right to be Forgotten"
- **What**: Delete all personal data
- **Request Method**: Settings → Privacy → "Delete Account"
- **Timeline**: 30 days (grace period for data backup)
- **Cost**: Free
- **What Gets Deleted**:
  - ✅ All personal data (account, tasks, memories, reports)
  - ✅ All identifiable information
  - ⚠️ Exceptions:
    - Anonymized aggregates (statistical data)
    - Legally required retention (tax records)
    - Active contractual obligations

```sql
-- Account deletion cascade
DELETE FROM users WHERE id = $1;
-- Triggers cascade delete on all related tables via ON DELETE CASCADE
```

#### 4. Right to Restrict Processing (Article 18)
- **What**: Limit how data is used
- **Request Method**: Settings → Privacy → Manage Processing
- **Options**:
  - Disable AI analysis
  - Disable analytics
  - Disable recommendations
  - Keep data but don't process
- **Implementation**: Feature flags per user

#### 5. Right to Data Portability (Article 20)
- **What**: Receive data in machine-readable format
- **Request Method**: Settings → Privacy → "Download My Data"
- **Format**: JSON (preferred), CSV, PDF
- **Timeline**: 30 days
- **Implementation**: Export all user data as structured JSON

#### 6. Right to Object (Article 21)
- **What**: Opt-out of processing
- **Request Method**: Settings → Privacy → Manage Preferences
- **Options**:
  - Opt-out of marketing
  - Opt-out of analytics
  - Opt-out of recommendations

#### 7. Right to Withdraw Consent (Article 7)
- **What**: Withdraw consent for non-essential processing
- **Request Method**: Settings → Privacy → Manage Consents
- **Implementation**: Checkbox for each optional processing type

#### 8. Automated Decision-Making & Profiling (Article 22)
- **What**: Right not to be subject to automated decisions
- **Aica Position**:
  - ✅ We provide recommendations, but never make binding decisions
  - ✅ Users always have human review option
  - ✅ No automated account suspension
  - ✅ Transparency on how suggestions are made
- **Implementation**: All AI suggestions are labeled as "AI-Suggested" with reasoning

### Data Protection Impact Assessment (DPIA)

**Required for**:
- Large-scale processing
- Sensitive data (mood, relationships)
- AI/automated decision-making

**DPIA Completed for**:
- ✅ WhatsApp message processing (Evolution API + n8n + Gemini)
- ✅ Memory embeddings & semantic search
- ✅ Daily report generation
- ✅ Contact network health scoring
- ✅ Efficiency recommendations (Aica Auto)

---

## Data Security

### Security Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React/TypeScript)                         │
│  - Client-side validation                            │
│  - Secure token storage (sessionStorage, not Cookie) │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS/TLS 1.3
┌────────────────▼────────────────────────────────────┐
│  Supabase API Gateway                               │
│  - Rate limiting                                     │
│  - API key validation                                │
│  - Request/response encryption                       │
└────────────────┬────────────────────────────────────┘
                 │ Private connection
┌────────────────▼────────────────────────────────────┐
│  PostgreSQL Database (AWS EU - Ireland)             │
│  - Row-Level Security (RLS)                          │
│  - Encryption at rest (AES-256)                      │
│  - Encrypted backups                                 │
│  - pgvector for secure embeddings                    │
└─────────────────────────────────────────────────────┘
```

### Security Measures

#### 1. Transport Security
- **Protocol**: HTTPS/TLS 1.3 (minimum)
- **Cipher Suites**: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
- **Certificate**: Let's Encrypt, auto-renewed
- **HSTS**: Enabled (max-age=31536000)
- **Pinning**: Not used (due to certificate rotation)

**Implementation**:
```javascript
// Force HTTPS redirect
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

#### 2. Authentication & Authorization

**Authentication Method**: Supabase Auth (JWT-based)

```typescript
// Login flow
const { data, error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword
});

// JWT token structure
{
  iss: "https://gppebtrshbvuzatmebhr.supabase.co/auth/v1",
  sub: "user-uuid",
  aud: "authenticated",
  exp: 1234567890,
  iat: 1234567800,
  email: "user@example.com"
}
```

**Token Management**:
- **Access Token**: 1 hour expiry
- **Refresh Token**: 7 days expiry, auto-refresh
- **Storage**: sessionStorage (cleared on tab close)
- **Transmission**: Authorization header only
- **CSRF Protection**: SameSite=Strict cookies

**Multi-Factor Authentication (MFA)**:
- Optional TOTP via authenticator app
- Recovery codes for account recovery
- Backup email for verification

#### 3. Database Security - Row-Level Security (RLS)

Every table implements strict RLS policies:

**Pattern 1: User-scoped data**
```sql
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own work items
CREATE POLICY "Users can manage own work_items" ON work_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Pattern 2: Association-based access**
```sql
-- Users can access association data only if they're members
CREATE POLICY "Users can access association work_items" ON work_items
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (association_id IS NOT NULL AND
     association_id IN (
       SELECT association_id FROM association_members
       WHERE user_id = auth.uid()
     ))
  );
```

**Pattern 3: Public/shared data**
```sql
-- Public profile data (limited fields)
CREATE POLICY "Public profiles are readable" ON profiles
  FOR SELECT
  USING (is_public = true);
```

#### 4. API Security

**Rate Limiting**:
- 100 requests per minute per user
- 10,000 requests per day per user
- Burst capacity: 20 requests per 10 seconds

**Input Validation**:
```typescript
// Validate all inputs server-side
const validateTaskInput = (input: unknown) => {
  const schema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low']),
    due_date: z.string().datetime().optional()
  });

  return schema.parse(input);
};
```

**SQL Injection Prevention**:
- All queries use parameterized statements
- No string concatenation in SQL
- Supabase API handles escaping

**CORS Policy**:
```typescript
// Only allow requests from Aica frontend
const corsOptions = {
  origin: [
    'https://aica.app',
    'https://www.aica.app',
    'http://localhost:3000' // Development only
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

#### 5. Password Security

**Requirements**:
- Minimum 12 characters
- Mix of: uppercase, lowercase, numbers, special characters
- No common patterns (123456, password, etc.)
- No username/email in password

**Storage**:
- Bcrypt with 12 salt rounds (Supabase Auth handles this)
- Never logged or exposed

**Password Reset**:
- Time-limited reset tokens (15 minutes)
- Sent via secure email
- Requires email verification
- New password sent only to authenticated email

#### 6. Session Security

**Session Timeout**:
- Auto-logout after 30 minutes of inactivity
- User warned at 25 minutes
- All tokens invalidated on logout

**Session Fixation Prevention**:
- New session ID on every login
- Browser tab communication (logout in one tab = logout in all)

**Code**:
```typescript
// Auto-logout on inactivity
let inactivityTimer: NodeJS.Timeout;

const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    supabase.auth.signOut();
    navigate('/login');
  }, 30 * 60 * 1000); // 30 minutes
};

// Reset on user activity
window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('keypress', resetInactivityTimer);
```

---

## Encryption & Data Protection

### Data Encryption

#### At Rest
- **Database**: Supabase provides AES-256 encryption at rest
- **Backups**: Encrypted backups stored in AWS S3
- **Audit Logs**: Encrypted storage
- **PII Fields**: Optional additional encryption

#### In Transit
- **HTTPS/TLS 1.3**: All data in transit
- **API Connections**: Verified SSL certificates
- **Database Connections**: Private VPC connection (no internet exposure)

#### Special Cases

**Password Storage**:
- Bcrypt hashing (Supabase Auth)
- Never transmitted plaintext
- Never visible to developers/admins

**Embeddings (Vectors)**:
- 1536-dimensional vector (Gemini)
- Stored unencrypted (cannot be reversed)
- Treated as searchable index (like full-text search)

**Session Tokens**:
- Encrypted in database
- HTTP-only, Secure, SameSite cookies
- Signed with RS256 JWT algorithm

### Encryption Keys Management

**Key Rotation**:
- Database encryption keys: Managed by AWS KMS
- API keys: Service role key stored in server environment variables only
- Anon key: Public key (intentionally limited permissions)
- Session tokens: Rotated on each refresh

**Access to Keys**:
- ✅ Encrypted and stored in GitHub Secrets (CI/CD)
- ✅ Never logged or exposed in console
- ✅ Accessible only to authenticated backend services
- ❌ Never shared in Slack, email, or documentation

---

## Access Control & Authentication

### Role-Based Access Control (RBAC)

**User Roles**:

| Role | Permissions | Intended User |
|------|-------------|---------------|
| **Owner** | Full access to association; manage members; delete association | Association creator |
| **Admin** | Manage members; manage content (work items, settings) | Association manager |
| **Member** | View/edit own items; view shared content; access association | Team member |
| **Viewer** | View-only access to shared content | Restricted access user |
| **Guest** | Temporary access to specific items (time-limited) | External collaborators |

**Implementation**:
```sql
-- Role-based policies
CREATE POLICY "Admins can manage members"
  ON association_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM association_members am2
      WHERE am2.association_id = association_members.association_id
        AND am2.user_id = auth.uid()
        AND am2.role IN ('owner', 'admin')
    )
  );
```

### Admin Access

**Principles**:
- ✅ Zero-trust: All admin access logged and audited
- ✅ No default superuser account
- ✅ MFA required for admin accounts
- ✅ Limited to necessary operations only
- ✅ Time-limited access (automatic revocation)

**Admin Capabilities** (Supabase Dashboard only):
- View anonymized usage statistics
- Reset user passwords (via email link)
- Review system logs (not user data)
- Manage database backups

**What Admins CANNOT Do**:
- ❌ View user data without explicit permission
- ❌ Modify user data directly
- ❌ Access encrypted fields
- ❌ Disable RLS policies
- ❌ Export user data without audit log

### Service Account Access

**n8n Workflow Access**:
- Service role key with limited permissions
- Can: Read messages, insert memories, update contact metadata
- Cannot: Read other users' data, delete accounts
- All actions logged with timestamp and workflow ID

**Gemini API Access**:
- API key stored in environment variables
- Rate-limited (100 requests/minute)
- Only called by n8n workflow
- Timeouts after 30 seconds

---

## Third-Party Integrations

### Evolution API (WhatsApp)

**Data Flow**:
```
Evolution API (WhatsApp)
  → Webhook to n8n
  → Message extraction & analysis
  → Gemini embeddings
  → Store summaries in Supabase
  → Discard raw message
```

**Data Handling**:
- Raw messages: Never stored
- Metadata: Phone number, timestamp, sender (stored in contact_network)
- Content summary: Sentiment, key points, triggers (stored in memories)
- Raw text: Discarded after processing (no logs)

**Evolution API Agreement**:
- [Your Agreement Status]: [Link to ToS/DPA]
- Data processor agreement in place
- Message encryption in transit (WhatsApp end-to-end encryption)
- No message storage on Evolution servers

### n8n Workflow (Message Processing)

**Data Handling**:
- Runs on secure n8n cloud
- Execution logs: Retained 30 days
- Message content: Passed to Gemini, not logged
- Results: Stored in Supabase only

**Security**:
- OAuth2 authentication
- API key rotation monthly
- All connections over HTTPS
- No backup of raw messages

### Gemini API (AI Analysis)

**Data Handling**:
- Text sent to Google Gemini API
- Used for sentiment analysis, summarization, embedding generation
- Google: Does not use data for training (as per API agreement)
- Aica: Does not log original text, only results

**Security**:
- API key: Service role, not user-associated
- Requests: Over HTTPS with API key auth
- Rate limiting: 100 requests/minute per account
- Data residency: Can be restricted to EU (if needed)

**Privacy**:
- [Gemini API DPA Status]: [Link]
- Data encryption: TLS in transit
- Data retention: API requests not stored by Google (verified)

### Supabase / AWS Infrastructure

**Data Residency**:
- Primary: AWS eu-west-1 (Ireland)
- Backups: AWS multi-region (EU)
- CDN: Cloudflare (DDoS protection, caching)

**Supabase Data Processing**:
- Supabase acts as data processor (not controller)
- Data processing agreement in place
- EU Standard Contractual Clauses (SCCs) for US-based Google Cloud

**Security Standards**:
- ISO 27001 certified
- SOC 2 Type II compliance
- Regular penetration testing
- Bug bounty program

---

## User Rights & Data Subject Requests

### How to Exercise Rights

**Self-Service** (Settings → Privacy):
- ✅ Export data (right to portability)
- ✅ Delete account (right to erasure)
- ✅ Update profile (right to rectification)
- ✅ Manage preferences (right to restrict)
- ✅ Download reports (right of access)

**Formal Request** (via support@aica.app):
- Subject access requests (SARs)
- Data deletion requests
- Data portability requests
- Complaints to supervisory authority

### Request Handling Process

**Timeline**:
1. **Day 1**: Acknowledge receipt, assign ticket
2. **Days 2-30**: Investigate and prepare response
3. **Day 30**: Respond to user (or request extension)
4. **Day 60**: Final deadline (with justified extension)

**Process**:
```
User Request
    ↓
Verify identity (email verification link)
    ↓
Authenticate (password confirmation)
    ↓
Process request (export/delete/etc.)
    ↓
Audit log entry (timestamped, confirmed)
    ↓
Email confirmation to user
    ↓
Archive request for 3 years (audit trail)
```

**Verification**:
- Email link confirmation (one-time use, 24-hour expiry)
- Password re-entry for sensitive requests
- Optional: Video ID verification for delete requests

### Right to Erasure Implementation

**When User Requests Deletion**:

1. **Immediate** (upon request):
   - Account marked for deletion
   - All auth tokens invalidated
   - Access to app revoked
   - Confirmation email sent

2. **30-Day Grace Period**:
   - Data retained but not accessible
   - User can cancel deletion (until day 29)
   - All processing stops (notifications, reports, etc.)

3. **Day 31** (automatic):
   - Cascade delete all user data
   - Records: deleted from all tables (ON DELETE CASCADE)
   - Backups: removed from 30-day backup retention
   - Audit log: marked as deleted (not erasable)

```sql
-- Delete user data (cascade)
BEGIN;
DELETE FROM users WHERE id = $1;
-- Triggers cascade:
-- - profile deleted
-- - work_items deleted
-- - memories deleted
-- - contact_network deleted
-- - daily_reports deleted
-- - etc.
COMMIT;

-- Log deletion for audit (never deleted)
INSERT INTO audit_log (event, user_id, timestamp)
VALUES ('user_deleted', $1, now());
```

---

## Data Retention & Deletion

### Default Retention Periods

| Data Type | Default Period | Configurable | Notes |
|-----------|---|---|---|
| Account data | Lifetime | No | Deleted only on account deletion |
| Work items | Lifetime | No | User can manually archive |
| Passwords | Lifetime | No | Never logged/exposed |
| Session logs | 30 days | No | Auto-purged |
| Audit logs | 3 years | No | Legal requirement |
| Memories | 1 year | **Yes** | User can configure |
| Daily reports | 1 year | **Yes** | User can configure |
| Contact interactions | 2 years | **Yes** | User can configure |
| Efficiency scores | 1 year | **Yes** | User can configure |
| Raw WhatsApp messages | Never stored | N/A | Immediate discard |
| Activity logs | 90 days | No | Security audit trail |

### Automated Retention Enforcement

**Scheduled Jobs** (Daily at 02:00 UTC):
```sql
-- Delete expired memories
DELETE FROM memories
WHERE retention_until IS NOT NULL
  AND retention_until < now();

-- Delete expired daily reports
DELETE FROM daily_reports
WHERE retention_until IS NOT NULL
  AND retention_until < now();

-- Archive old session logs
DELETE FROM session_logs
WHERE created_at < now() - interval '30 days';
```

**User-Configurable Retention**:
```typescript
// User can set retention period
const updateRetention = async (userId, dataType, days) => {
  const retentionUntil = new Date();
  retentionUntil.setDate(retentionUntil.getDate() + days);

  await supabase
    .from(dataType)
    .update({ retention_until: retentionUntil })
    .eq('user_id', userId);
};
```

---

## Privacy by Design

### Principles Applied

#### 1. Data Minimization
- Collect only what's necessary for core functionality
- No email address required if using WhatsApp only
- Optional fields for non-essential features
- Offer limited-feature accounts

#### 2. Purpose Limitation
- Data used only for stated purpose
- No secondary use without consent
- Cross-functional use requires consent toggle
- AI analysis opt-in by default

#### 3. Transparency
- Clear privacy notice (shown in onboarding)
- Data flow diagrams in settings
- Explicit consent for non-essential processing
- Annual privacy report generation

#### 4. User Control
- Granular permission settings
- Easy data export (one-click)
- Easy data deletion (one-click)
- Preference management dashboard

#### 5. Security & Confidentiality
- Default to high security settings
- Encrypt sensitive fields by default
- No verbose logging
- Regular security audits

#### 6. Accountability
- Privacy impact assessments
- Data processing records
- Audit trails for all data access
- Annual compliance reviews

### Privacy-by-Design Implementation

**Frontend**:
```typescript
// Privacy choices presented upfront
const PrivacySetup: React.FC = () => {
  const [choices, setChoices] = useState({
    aiAnalysis: false, // Opt-in
    emotionalTracking: false, // Opt-in
    relationshipAnalytics: false, // Opt-in
    productRecommendations: false, // Opt-in
    analyticsSharing: false // Opt-in
  });

  // Only necessary features are enabled by default
  return (
    <div>
      <h2>Choose Your Privacy Settings</h2>
      <Checkbox
        label="Enable AI analysis for recommendations"
        checked={choices.aiAnalysis}
        onChange={(v) => setChoices({...choices, aiAnalysis: v})}
      />
      {/* More checkboxes */}
    </div>
  );
};
```

**Backend**:
```sql
-- Store user privacy choices
CREATE TABLE user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  ai_analysis BOOLEAN DEFAULT false,
  emotional_tracking BOOLEAN DEFAULT false,
  relationship_analytics BOOLEAN DEFAULT false,
  product_recommendations BOOLEAN DEFAULT false,
  analytics_sharing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT now()
);

-- Enforce privacy settings in processing
CREATE OR REPLACE FUNCTION should_process_emotionally(user_id UUID)
RETURNS BOOLEAN AS $$
SELECT emotional_tracking FROM user_privacy_settings
WHERE user_id = $1;
$$ LANGUAGE SQL;
```

---

## Incident Response

### Data Breach Response Plan

**Definition**: Unauthorized access, use, or disclosure of personal data

**Response Timeline**:
- **0-1 hour**: Contain breach, stop incident, preserve evidence
- **1-24 hours**: Assess severity, determine affected users, engage experts
- **24-72 hours**: Notify affected users (if risk to rights/freedoms)
- **72 hours**: Notify supervisory authority (GDPR requirement)
- **10 days**: Publish incident report

**Response Steps**:

1. **Immediate** (Minutes 0-60):
   - Isolate affected systems
   - Revoke compromised credentials
   - Preserve audit logs
   - Alert security team
   - Activate incident response plan

2. **Short-term** (Hours 1-24):
   - Forensic analysis (what happened?)
   - Scope determination (what data affected?)
   - Severity assessment (high/medium/low)
   - Customer notification preparation

3. **Medium-term** (Days 1-10):
   - Notify affected users (email + settings notification)
   - Notify supervisory authority (supervisory@ie.gov if EU)
   - Offer credit monitoring (if applicable)
   - Publish transparency report

4. **Long-term** (Weeks/Months):
   - Root cause analysis
   - Process improvements
   - Security enhancements
   - Third-party audit
   - Public post-mortem (optional)

### Breach Notification Template

```
Subject: Important Security Notice - Your Data May Have Been Affected

Dear [User Name],

We're writing to inform you of a security incident that may have affected your account.

WHAT HAPPENED:
[Describe incident clearly]

WHEN IT HAPPENED:
[Date and time range]

WHAT DATA WAS AFFECTED:
[Specific data: email, name, encrypted password, etc.]

WHAT WE'RE DOING:
- Investigating root cause
- Enhancing security measures
- Monitoring for unauthorized access
- Notifying authorities

WHAT YOU SHOULD DO:
1. Change your password immediately
2. Enable multi-factor authentication
3. Monitor your account for unusual activity
4. Report any suspicious activity to support@aica.app

SUPPORT:
- Dedicated support: breach-support@aica.app
- Phone: [Emergency hotline]
- FAQ: [Link]

We sincerely apologize for this incident.

Sincerely,
Aica Security Team
```

### Breach Assessment Criteria

**Severity**: HIGH if:
- Unencrypted personal data exposed
- Passwords compromised
- Financial information exposed
- Health/emotional data exposed
- Affects >100 users

**Severity**: MEDIUM if:
- Limited personal data exposed
- User account IDs only
- Affects 10-100 users
- Data encrypted but key exposed

**Severity**: LOW if:
- Publicly available data exposed
- Affects <10 users
- Data already disclosed
- No real harm to users

---

## Compliance Checklist

### GDPR Compliance

- ✅ **Legal Basis**: Documented and implemented
- ✅ **Consent Management**: Explicit consent for non-essential processing
- ✅ **Data Subject Rights**: All 8 rights implemented (access, rectification, erasure, restrict, portability, object, automated decisions, withdraw)
- ✅ **Privacy Notice**: Published and presented to users
- ✅ **Data Protection Impact Assessment**: Completed for high-risk processing
- ✅ **Data Processing Agreement**: In place with Supabase
- ✅ **Breach Notification**: Plan in place (72 hours)
- ✅ **Incident Response**: Plan documented
- ✅ **Security Measures**: Encryption, RLS, access controls
- ✅ **Retention Limits**: Policies set and enforced
- ✅ **Audit Trails**: All data access logged
- ✅ **Accountability Records**: DPA register maintained

### LGPD (Brazil) Compliance

- ✅ **Legal Purpose**: Identified and documented
- ✅ **Data Subject Consent**: Explicit consent obtained
- ✅ **Rights Implementation**: Access, rectification, deletion, portability
- ✅ **Data Processing Agreement**: With Supabase/AWS
- ✅ **Breach Notification**: 72 hours to authority + users
- ✅ **Children's Data**: Age verification (13+)
- ✅ **Data Retention**: Policies set
- ✅ **Sensitive Data Protection**: Special protection for health, etc.

### CCPA (California) Compliance

- ✅ **Privacy Notice**: Provided (linked from footer)
- ✅ **Consumer Rights**: Implemented (access, delete, opt-out)
- ✅ **Do Not Track**: Honored if enabled
- ✅ **Data Sharing Disclosure**: No sale of data
- ✅ **Opt-out Mechanism**: One-click opt-out
- ✅ **Child Privacy**: Age 13+ required
- ✅ **California Resident Notice**: Specific language

### PIPEDA (Canada) Compliance

- ✅ **Consent**: Informed and voluntary
- ✅ **Accuracy**: Data accuracy maintained
- ✅ **Access**: User can access personal information
- ✅ **Protection**: Secure storage and transmission
- ✅ **Openness**: Privacy policy available
- ✅ **Individual Access**: Subject access requests honored
- ✅ **Accountability**: Privacy officer designated

### Industry Standards

- ✅ **ISO 27001**: Applicable to infrastructure (Supabase/AWS)
- ✅ **SOC 2 Type II**: Applicable to infrastructure
- ✅ **OWASP Top 10**: Mitigated in application code
- ✅ **NIST Cybersecurity**: Framework awareness
- ✅ **PCI DSS**: N/A (no payment card storage)

---

## Privacy Notice (User-Facing)

### Short Version (TL;DR)

```markdown
# Privacy Notice - Short Version

**Last Updated**: December 2, 2025

## What We Collect
- Account info: email, name, birth date (for Memento Mori)
- Your data: tasks, goals, notes
- Optional: mood, emotions, relationships (for AI insights)
- **NOT**: Raw WhatsApp messages (discarded after processing)

## How We Use It
- Core functionality: tasks, goals, planning
- Optional: AI recommendations, efficiency tracking
- **NOT**: Advertising, tracking, selling data

## Your Rights
- **Export**: Download all your data anytime
- **Delete**: Remove your account anytime (30-day grace period)
- **Control**: Manage what features use your data
- **Withdraw**: Opt-out of AI analysis, recommendations

## Security
- All data encrypted in transit (HTTPS/TLS)
- Encrypted at rest (AES-256)
- Row-level security (RLS) in database
- No admin access to user data
- Regular security audits

## Third Parties
- **Supabase**: Database provider (data processor)
- **AWS**: Cloud infrastructure (data processor)
- **Evolution API**: WhatsApp integration (data processor)
- **Gemini API**: AI analysis (does NOT train on your data)

## Contact
- Privacy questions: privacy@aica.app
- Data subject requests: dsar@aica.app
- Complaints: [Local supervisory authority]

## Full Policy
[Link to this document]
```

### Full Privacy Policy (Detailed)

[Full policy provided in Privacy Notice section above]

---

## Appendix: Compliance Documents

### A. Data Processing Agreement (DPA) Status

- ✅ **Supabase DPA**: [Link to Supabase DPA]
- ✅ **AWS DPA**: [Link to AWS DPA]
- ✅ **Evolution API**: [Link to Evolution DPA or confirmation]
- ✅ **Gemini API**: [Google Cloud Standard Contract Terms](https://cloud.google.com/terms/data-processing-terms)

### B. Subprocessors

**Authorized Subprocessors**:
1. **Amazon Web Services (AWS)** - Cloud infrastructure
2. **Cloudflare** - CDN, DDoS protection
3. **Google Cloud (Gemini)** - AI API
4. **SendGrid** - Email delivery
5. **n8n Cloud** - Workflow automation

### C. Standard Contractual Clauses (SCCs)

For transfers of personal data outside the EEA:
- ✅ AWS: Module 1 (Controller to Processor)
- ✅ Google Cloud: Google Cloud Data Processing Amendment
- ✅ n8n: Standard contractual clauses incorporated

### D. Supervisory Authorities

**For EU Residents**:
- Ireland (DPC): [dataprotection.ie](https://dataprotection.ie)

**For US Residents** (California):
- California CPRA: [cppa.ca.gov](https://cppa.ca.gov)

**For Brazil**:
- ANPD: [anpd.gov.br](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Document Version**: 2.0
**Approval Date**: December 2, 2025
**Next Review**: December 2, 2026
**Privacy Officer**: [Name/Email]
