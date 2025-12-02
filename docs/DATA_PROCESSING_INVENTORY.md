# Data Processing Inventory & Compliance Record

**Organization**: Aica Life OS
**Date Prepared**: December 2, 2025
**Scope**: All data processing activities
**Responsible Party**: Privacy Officer (privacy@aica.app)

---

## 1. Core Processing Activities

### Processing Activity 1: User Account Management

**Activity**: User registration, authentication, profile management
**Legal Basis**: Contractual necessity (6(1)(b) GDPR)
**Data Categories**:
- Email address
- Hashed password
- Full name
- Avatar/profile photo
- Birth date
- Phone number (optional)
- Timezone
- Language preference
- Theme preference

**Processor**: Supabase Auth (Firebase backend)
**Retention**: Until account deletion
**Recipients**: N/A (internal only)
**Safeguards**: Bcrypt hashing, HTTPS, RLS policies, 2FA optional
**User Rights**: Access, rectification, erasure, portability

---

### Processing Activity 2: Work Item & Task Management

**Activity**: Creating, organizing, and tracking tasks/work items
**Legal Basis**: Contractual necessity (6(1)(b) GDPR)
**Data Categories**:
- Task title, description
- Due dates, scheduled times
- Priority levels
- Completion status
- Assignment information
- Tags and categorization

**Processor**: Supabase PostgreSQL
**Retention**: Until user deletion (manual archival available)
**Recipients**: Associated team members (if shared)
**Safeguards**: RLS policies, user-based access control
**User Rights**: Access, rectification, erasure, portability, restrict

---

### Processing Activity 3: Mood & Emotional Tracking

**Activity**: Daily mood logging, stress level tracking, emotional intelligence
**Legal Basis**: Explicit consent (6(1)(a) GDPR) - OPTIONAL
**Data Categories**:
- Mood scores/levels
- Energy levels
- Stress levels
- Emotional state descriptions
- Daily mood history

**Processor**: Supabase PostgreSQL
**Retention**: 1 year (user-configurable)
**Recipients**: None (personal data)
**Safeguards**: Encrypted connection, RLS, optional feature
**Opt-out**: Settings → Privacy → Disable emotional tracking
**User Rights**: Access, rectification, erasure, portability, restrict, withdraw

---

### Processing Activity 4: Memory & Insight Extraction

**Activity**: Processing WhatsApp messages to extract insights (via n8n + Gemini)
**Legal Basis**: Explicit consent (6(1)(a) GDPR) - OPT-IN required
**Data Categories**:
- Message content (TEMPORARY, discarded after processing)
- Sentiment analysis
- Key topics/triggers
- Summary insights
- Vector embeddings (1536-dimensional)
- Source metadata (sender, timestamp)

**Processing Steps**:
1. WhatsApp message received (Evolution API)
2. Forwarded to n8n webhook
3. Analyzed by Gemini API (sentiment, summary, key points)
4. Results stored in Supabase `memories` table
5. Raw message discarded (NOT stored)
6. Contact metadata updated

**Processors**:
- Evolution API: Message gateway
- n8n: Workflow orchestration
- Google Gemini: AI analysis
- Supabase: Results storage

**Retention**: Configurable (default 1 year)
**Recipients**: None (personal data)
**Safeguards**:
- Raw messages never logged
- Results encrypted at rest
- RLS policies enforce user isolation
- Gemini does NOT use data for training
**Opt-out**: Settings → Privacy → Disable message processing
**User Rights**: Access, rectification, erasure, portability, restrict, withdraw

---

### Processing Activity 5: Contact Network & Relationship Tracking

**Activity**: Tracking relationships, interaction patterns, relationship health
**Legal Basis**: Explicit consent (6(1)(a) GDPR) - OPT-IN required
**Data Categories**:
- Contact names
- Contact phone numbers/emails
- Relationship type
- Last interaction date
- Interaction frequency
- Sentiment trends
- Engagement level
- Health score (calculated)

**Processor**: Supabase PostgreSQL
**Retention**: Until deletion (interaction data 2 years configurable)
**Recipients**: None (personal data)
**Safeguards**: RLS policies, no raw message storage
**Opt-out**: Settings → Privacy → Disable relationship tracking
**User Rights**: Access, rectification, erasure, portability, restrict, withdraw

---

### Processing Activity 6: Daily Report Generation

**Activity**: Automated end-of-day summaries with AI insights and recommendations
**Legal Basis**: Explicit consent (6(1)(a) GDPR) - OPT-IN required
**Data Categories**:
- Tasks completed count
- Productivity score
- Mood score
- Energy levels
- Stress levels
- Activities per life area
- Top contacts
- Significant events
- Key insights (AI-generated)
- Recommendations (AI-generated)
- Patterns detected

**Processors**:
- n8n: Workflow automation (daily at 23:59 UTC)
- Google Gemini: Insight generation
- Supabase: Storage

**Retention**: Configurable (default 1 year)
**Recipients**: None (personal data, optionally shared with associations)
**Safeguards**: RLS policies, automated generation, optional sharing
**Opt-out**: Settings → Privacy → Disable daily reports
**User Rights**: Access, rectification, erasure, portability, restrict, withdraw

---

### Processing Activity 7: Efficiency Scoring & Analytics

**Activity**: Calculating productivity metrics, efficiency trends, performance analytics
**Legal Basis**: Legitimate interest (6(1)(f) GDPR) - Monitor personal productivity
**Data Categories**:
- Completion rates
- Time estimates vs. actual
- Focus time
- Consistency metrics
- Efficiency scores (0-100)
- Trend data
- Module performance
- Streak counts

**Processor**: Supabase & Frontend calculations
**Retention**: 1 year (aggregate 3 years)
**Recipients**: None (personal data)
**Safeguards**: No behavioral profiling, metrics for self-improvement only
**Opt-out**: Settings → Privacy → Disable analytics
**User Rights**: Access, rectification, erasure, portability, restrict

---

### Processing Activity 8: Gamification & Achievements

**Activity**: XP tracking, level progression, badge/achievement tracking, leaderboards
**Legal Basis**: Contractual necessity (6(1)(b) GDPR)
**Data Categories**:
- XP points
- Level/rank
- Achievement badges
- Streak counts
- Leaderboard position
- Performance metrics

**Processor**: Supabase PostgreSQL
**Retention**: Until account deletion
**Recipients**: Other users (leaderboard, if enabled)
**Safeguards**: User can disable leaderboard visibility
**User Rights**: Access, rectification, erasure, portability

---

### Processing Activity 9: Life Planning & Memento Mori

**Activity**: Life week calculation, life events tracking, milestone planning
**Legal Basis**: Contractual necessity (6(1)(b) GDPR)
**Data Categories**:
- Birth date
- Life events
- Milestone dates
- Week numbers (calculated from birth date)
- Event descriptions
- Event status (planned/completed/skipped)

**Processor**: Supabase PostgreSQL
**Retention**: Until user deletion
**Recipients**: None (personal data)
**Safeguards**: Sensitive data (birth date), RLS enforced
**User Rights**: Access, rectification, erasure, portability

---

## 2. Automated Decision-Making & Profiling

### Aica Auto (Priority Suggestions)

**Activity**: AI-powered task priority suggestions based on context
**Type**: Automated decision-making (but NOT binding)
**Legal Basis**: Legitimate interest (6(1)(f) GDPR) - Improve user experience
**Data Used**:
- Work item history
- Current workload
- Past completion rates
- Mood/stress levels
- Deadlines
- Life area alignment

**Decision**: Suggested priority (user can override)
**Impact**: Informational only (user retains full control)
**Transparency**: Users see reasoning ("Suggested: High priority because due soon + low completion rate in area")
**User Rights**:
- ✅ Right to explanation (why was this suggested?)
- ✅ Right to human review (can appeal)
- ✅ Right to opt-out (disable suggestions)
- ✅ Right to object (don't suggest this type)

---

### Daily Report Recommendations

**Activity**: AI-generated recommendations for next day
**Type**: Automated decision-making (advisory only)
**Legal Basis**: Explicit consent (6(1)(a) GDPR) - OPT-IN
**Data Used**:
- Daily report data
- Historical patterns
- Completed tasks
- Efficiency metrics
- Life balance

**Decision**: Suggested focus areas for next day
**Impact**: Advisory (user can ignore)
**Transparency**: Recommendations include reasoning
**User Rights**:
- ✅ Right to explanation
- ✅ Right to opt-out
- ✅ Right to object

---

## 3. Third-Party Data Processors

### Processor 1: Supabase (supabase.io)

**Type**: Cloud database & authentication provider
**Data Processed**: All personal data (account, tasks, memories, reports)
**Processing Agreement**: [Yes] - Supabase Master Service Agreement
**Sub-processors**:
- AWS (cloud infrastructure)
- Cloudflare (DNS, DDoS)
- SendGrid (email delivery)
**Data Location**: EU (Ireland - eu-west-1)
**Standard Contractual Clauses**: Yes (Supabase DPA)

---

### Processor 2: Amazon Web Services (AWS)

**Type**: Cloud infrastructure
**Data Processed**: Database storage, backups, compute
**Processing Agreement**: [Yes] - AWS DPA
**Data Location**: EU (eu-west-1 Ireland)
**Certifications**: ISO 27001, SOC 2 Type II
**Safeguards**: Encryption at rest, access controls, audit logs

---

### Processor 3: Evolution API (evolution-api.com)

**Type**: WhatsApp gateway
**Data Processed**: WhatsApp messages (temporary), metadata
**Processing Agreement**: [Status: Verify]
**Data Retention**: Messages NOT stored (immediate discard)
**Security**: Webhook authentication, message encryption
**Use**: Message ingestion only (forwarded to n8n)

---

### Processor 4: n8n Cloud (n8n.io)

**Type**: Workflow automation
**Data Processed**: WhatsApp message content (temporary), results
**Processing Agreement**: [Yes] - Standard contract terms
**Data Retention**: Execution logs 30 days, messages not stored
**Security**: OAuth2, HTTPS, secure credentials
**Use**: Message processing pipeline (extraction → Gemini → storage)

---

### Processor 5: Google Gemini API (Google Cloud)

**Type**: AI/LLM service
**Data Processed**: Message content (temporary), analysis requests
**Processing Agreement**: [Yes] - Google Cloud Data Processing Amendment
**Data Retention**: NOT retained by Google (verified in API terms)
**Data Training**: NOT used for model training (verified)
**Security**: HTTPS, API key authentication
**Use**: Sentiment analysis, summarization, embedding generation

---

### Processor 6: Cloudflare (cloudflare.com)

**Type**: CDN & DDoS protection
**Data Processed**: Traffic metadata, performance logs
**Processing Agreement**: [Yes] - Cloudflare DPA
**Data Retention**: Logs retained 30 days
**Security**: Automatic encryption, access controls
**Use**: DDoS mitigation, static content caching

---

## 4. Data Subject Rights Implementation

### Right of Access (GDPR Article 15)

**Implementation Method**: Self-service export
**Location**: Settings → Privacy → "Export My Data"
**Format Options**: JSON, CSV, PDF
**Timeline**: Instant (user-initiated)
**Cost**: Free
**Scope**:
- Profile information
- All work items
- All memories
- All daily reports
- All contact data
- All settings
- All activity history

**Code Implementation**:
```typescript
export async function exportUserData(userId: string) {
  const data = {
    profile: await getProfile(userId),
    workItems: await getAllWorkItems(userId),
    memories: await getAllMemories(userId),
    dailyReports: await getAllDailyReports(userId),
    contactNetwork: await getContactNetwork(userId),
    achievements: await getUserAchievements(userId),
    settings: await getUserSettings(userId),
    exportDate: new Date().toISOString()
  };
  return generateZipFile(data);
}
```

---

### Right to Rectification (GDPR Article 16)

**Implementation Method**: In-app editing
**Location**: Throughout app (edit profile, edit tasks, etc.)
**Timeline**: Immediate
**Cost**: Free
**Scope**: All user-editable fields

---

### Right to Erasure (GDPR Article 17)

**Implementation Method**: Account deletion workflow
**Location**: Settings → Privacy → "Delete Account"
**Timeline**: 30-day grace period, then permanent
**Cost**: Free
**Process**:
1. User confirms deletion
2. Email verification
3. 30-day waiting period (cancellable)
4. Automatic cascade delete (all related data)
5. Audit log entry (retained for 3 years)

**What Gets Deleted**:
- ✅ Account & profile
- ✅ Work items & tasks
- ✅ Memories
- ✅ Daily reports
- ✅ Contact network
- ✅ Preferences & settings
- ❌ Audit logs (retained for legal reasons)
- ❌ Anonymized aggregates

---

### Right to Restrict Processing (GDPR Article 18)

**Implementation Method**: Privacy settings toggles
**Location**: Settings → Privacy → "Manage Processing"
**Options**:
- [ ] Enable AI analysis
- [ ] Enable emotional tracking
- [ ] Enable message processing
- [ ] Enable relationship analytics
- [ ] Enable recommendations
- [ ] Share with leaderboard
- [ ] Allow marketing emails

---

### Right to Data Portability (GDPR Article 20)

**Implementation Method**: Download data in machine-readable format
**Location**: Settings → Privacy → "Download My Data"
**Formats**:
- JSON (primary)
- CSV (tabular data)
- PDF (formatted report)
**Timeline**: Instant (user-initiated)
**Scope**: All data controlled by user

---

### Right to Object (GDPR Article 21)

**Implementation Method**: Opt-out toggles
**Location**: Settings → Privacy → "Manage Preferences"
**Options**:
- Opt-out of marketing communications
- Opt-out of analytics
- Opt-out of recommendations
- Opt-out of leaderboard

---

### Right to Withdraw Consent (GDPR Article 7)

**Implementation Method**: Consent management dashboard
**Location**: Settings → Privacy → "Manage Consents"
**Withdrawable Consents**:
- Message processing
- AI analysis
- Emotional tracking
- Relationship analytics
- Daily recommendations
- Marketing emails
- Analytics sharing

**Impact**: Affected processing stops immediately; data is marked do-not-process but not deleted

---

### Right to Explanation (Article 22)

**Implementation Method**: Transparency in recommendations
**Example**:
```
🤖 AI Suggested: HIGH PRIORITY

This task is suggested as high priority because:
- Due date is in 2 days
- Your completion rate in "Finances" is low (30%)
- Current workload is moderate (5 active tasks)
- Aligns with your goals

You can:
[Accept]  [Snooze]  [Dismiss]  [Why?] [Feedback]
```

---

## 5. Data Protection Impact Assessment (DPIA) Summary

### DPIA 1: WhatsApp Message Processing

**Risk Level**: MEDIUM-HIGH
**Key Risks**:
- Interception of message content (during transmission)
- Unauthorized access to raw messages
- Gemini API seeing sensitive content
- Bulk data exposure from n8n

**Mitigations**:
- End-to-end encryption (WhatsApp)
- TLS 1.3 in transit
- Raw messages discarded after processing
- Gemini API confirmed NO data retention/training
- n8n logs purged after 30 days
- User consent required

**Status**: ✅ Risk acceptable with mitigations

---

### DPIA 2: Memory Embeddings & Semantic Search

**Risk Level**: MEDIUM
**Key Risks**:
- Vector embeddings could reveal semantic information
- Large-scale search could enable profiling
- Long-term embedding retention

**Mitigations**:
- RLS policies (users can't see others' embeddings)
- User-configurable retention (default 1 year)
- Embeddings are point-in-time (don't update automatically)
- No continuous learning/profiling

**Status**: ✅ Risk acceptable with mitigations

---

### DPIA 3: Daily Report AI Generation

**Risk Level**: MEDIUM
**Key Risks**:
- Behavioral profiling via automated insights
- Binding automated decisions
- Historical pattern exposure

**Mitigations**:
- Reports are advisory only (not binding)
- User transparency on reasoning
- Easy opt-out
- User can delete reports anytime
- No leaderboard comparison on insights

**Status**: ✅ Risk acceptable with mitigations

---

## 6. Compliance Status Summary

### GDPR Status
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Legal basis documented | ✅ | This document, Privacy Policy |
| Consent management | ✅ | Privacy settings, opt-in toggles |
| Data subject rights | ✅ | All 8 rights implemented |
| RLS policies | ✅ | Database policies configured |
| Data processing agreement | ✅ | Supabase/AWS DPAs in place |
| Breach notification plan | ✅ | Incident Response section |
| DPA register | ✅ | This document |
| Privacy notice | ✅ | Published in Privacy Policy |

**Compliance Assessment**: ✅ **COMPLIANT**

---

### LGPD (Brazil) Status
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Legal purpose identified | ✅ | Data Processing Inventory |
| Consent (non-essential) | ✅ | Opt-in features |
| Data subject rights | ✅ | Access, delete, portability |
| Data processing agreement | ✅ | Supabase/AWS |
| Breach notification (ANPD) | ✅ | 72-hour timeline |
| Data retention | ✅ | Policies defined |
| Sensitive data protection | ✅ | RLS, encryption |

**Compliance Assessment**: ✅ **COMPLIANT**

---

### CCPA (California) Status
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Privacy notice | ✅ | Published + disclosures |
| Consumer rights (access/delete/opt-out) | ✅ | Settings implementation |
| Sale prohibition (if applicable) | ✅ | No data sales |
| Child privacy (13+ requirement) | ✅ | Age verification |
| California-specific language | ⚠️ | In progress |
| Opt-out mechanism | ✅ | One-click opt-out |

**Compliance Assessment**: ⚠️ **SUBSTANTIALLY COMPLIANT** (minor updates needed for CCPA-specific language)

---

## 7. Data Retention Schedule

```
Timeline | Data Type | Action | Responsible
---------|-----------|--------|-------------
Immediate | Raw WhatsApp messages | Delete (discard) | n8n workflow
30 days | Session logs | Auto-delete | Scheduled job
30 days | n8n execution logs | Auto-delete | n8n Cloud
90 days | Activity audit logs | Auto-delete | Scheduled job
1 year | Memories (default) | Auto-delete (if set) | Scheduled job
1 year | Daily reports (default) | Auto-delete (if set) | Scheduled job
1 year | Efficiency data | Aggregate/anonymize | Scheduled job
2 years | Contact interactions | Auto-delete (default) | Scheduled job
3 years | Audit logs (events) | Retain (legal hold) | Never auto-deleted
3 years | DPA register entries | Retain (legal hold) | Never auto-deleted
Until deletion | Account data | Until user deletes | User-initiated
```

---

## 8. Audit & Accountability

### Audit Logging

**All logged events**:
- User login (success/failure)
- Data access (export, view bulk data)
- Data modification (update, delete)
- Privacy setting changes
- Consent withdrawal
- Account deletion
- Admin actions

**Retention**: 3 years
**Queries**: Auditable by user (Settings → Activity → View Audit Log)

---

### Annual Compliance Review

**Schedule**: December each year
**Reviewer**: Privacy Officer
**Checklist**:
- [ ] Data processing inventory updated
- [ ] DPA agreements current
- [ ] RLS policies reviewed
- [ ] Retention policies working
- [ ] Breach incidents reviewed (if any)
- [ ] User rights requests processed
- [ ] GDPR/LGPD/CCPA updates applied
- [ ] Security assessments completed

---

**Document Status**: ✅ Complete
**Approval Date**: December 2, 2025
**Next Review**: December 2, 2026
**Privacy Officer**: [Name/Title]
