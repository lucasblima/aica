# Connection Archetypes - Usage Examples

## Table of Contents
1. [Creating Connection Spaces](#creating-connection-spaces)
2. [Managing Members](#managing-members)
3. [Shared Events](#shared-events)
4. [Document Sharing](#document-sharing)
5. [Financial Tracking](#financial-tracking)
6. [Querying Patterns](#querying-patterns)
7. [Archetype-Specific Examples](#archetype-specific-examples)

## Creating Connection Spaces

### Example 1: Create a Habitat Space (Family)

```sql
INSERT INTO public.connection_spaces (
  user_id,
  archetype,
  name,
  subtitle,
  description,
  icon,
  color_theme,
  settings
) VALUES (
  auth.uid(),
  'habitat'::connection_archetype_type,
  'The Silva Family',
  'Our home, our values',
  'Family connection space for coordinating household activities and sharing memories',
  'home',
  'blue-warmth',
  '{
    "family_structure": "nuclear",
    "household_members": 4,
    "preferences": {
      "sharing_mode": "collaborative",
      "calendar_sync": true
    }
  }'::jsonb
);
```

### Example 2: Create a Ventures Space (Business)

```sql
INSERT INTO public.connection_spaces (
  user_id,
  archetype,
  name,
  subtitle,
  description,
  icon,
  color_theme,
  cover_image_url,
  settings
) VALUES (
  auth.uid(),
  'ventures'::connection_archetype_type,
  'TechStart Brazil',
  'Building the future of FinTech',
  'Co-founders collaboration space for our SaaS startup',
  'rocket',
  'emerald-growth',
  'https://example.com/techstart-banner.jpg',
  '{
    "business_model": "saas",
    "stage": "seed",
    "co_founders": ["alice@example.com", "bob@example.com"],
    "focus_areas": ["product", "growth", "fundraising"]
  }'::jsonb
);
```

### Example 3: Create an Academia Space (Education)

```sql
INSERT INTO public.connection_spaces (
  user_id,
  archetype,
  name,
  subtitle,
  description,
  settings
) VALUES (
  auth.uid(),
  'academia'::connection_archetype_type,
  'AI Ethics Research Group',
  'Exploring responsible AI development',
  'Academic research collaboration with focus on ethical implications of AI',
  '{
    "institution": "UFRJ",
    "field": "computer_science",
    "research_areas": ["AI Ethics", "Responsible AI"],
    "publication_targets": ["top_conferences", "peer_reviewed_journals"]
  }'::jsonb
);
```

### Example 4: Create a Tribo Space (Community)

```sql
INSERT INTO public.connection_spaces (
  user_id,
  archetype,
  name,
  subtitle,
  description,
  icon,
  color_theme,
  settings
) VALUES (
  auth.uid(),
  'tribo'::connection_archetype_type,
  'Rio Biohackers Collective',
  'Grassroots innovation and community DIY',
  'Community space for biotech enthusiasts and DIY bio projects in Rio',
  'dna',
  'purple-community',
  '{
    "community_type": "interest_based",
    "meeting_frequency": "biweekly",
    "estimated_members": 50,
    "focus": "open_source_biotech"
  }'::jsonb
);
```

## Managing Members

### Example 5: Add Aica User as Member

```sql
INSERT INTO public.connection_members (
  space_id,
  user_id,
  role,
  context_label,
  context_data,
  permissions
) VALUES (
  'your-space-uuid',
  'member-uuid',
  'member'::connection_member_role,
  'Mom',
  '{
    "relationship": "mother",
    "contact_preferred": "whatsapp"
  }'::jsonb,
  '{
    "can_edit_events": true,
    "can_upload_documents": true,
    "can_modify_transactions": false
  }'::jsonb
);
```

### Example 6: Add External Member (Non-Aica User)

```sql
INSERT INTO public.connection_members (
  space_id,
  external_name,
  external_email,
  external_phone,
  role,
  context_label,
  context_data
) VALUES (
  'your-space-uuid',
  'John Family Friend',
  'john@example.com',
  '+55 21 99999-8888',
  'guest'::connection_member_role,
  'Dad\'s Friend',
  '{
    "invited_by": "Dad",
    "access_level": "limited",
    "shared_documents_only": true
  }'::jsonb
);
```

### Example 7: Promote Member to Admin

```sql
UPDATE public.connection_members
SET role = 'admin'::connection_member_role
WHERE space_id = 'your-space-uuid'
  AND user_id = 'member-uuid';
```

### Example 8: Deactivate Member

```sql
UPDATE public.connection_members
SET
  is_active = FALSE,
  last_interaction_at = NOW()
WHERE space_id = 'your-space-uuid'
  AND user_id = 'member-uuid';
```

## Shared Events

### Example 9: Create Family Event (All-Day)

```sql
INSERT INTO public.connection_events (
  space_id,
  created_by,
  title,
  description,
  location,
  starts_at,
  is_all_day,
  event_type,
  rsvp_enabled,
  rsvp_deadline
) VALUES (
  'family-space-uuid',
  auth.uid(),
  'Extended Family Reunion',
  'Annual gathering at the beach house',
  'Armacao Beach, Rio de Janeiro',
  '2025-07-15T00:00:00Z',
  TRUE,
  'social'::connection_event_type,
  TRUE,
  '2025-07-08T00:00:00Z'
);
```

### Example 10: Create Recurring Business Meeting

```sql
INSERT INTO public.connection_events (
  space_id,
  created_by,
  title,
  description,
  starts_at,
  ends_at,
  is_all_day,
  recurrence_rule,
  event_type,
  rsvp_enabled
) VALUES (
  'ventures-space-uuid',
  auth.uid(),
  'Weekly Standup Meeting',
  'Co-founders sync: product, growth, fundraising',
  '2025-12-15T10:00:00Z',
  '2025-12-15T11:00:00Z',
  FALSE,
  'FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260331',
  'meeting'::connection_event_type,
  FALSE
);
```

### Example 11: Create Academic Deadline

```sql
INSERT INTO public.connection_events (
  space_id,
  created_by,
  title,
  starts_at,
  event_type
) VALUES (
  'academia-space-uuid',
  auth.uid(),
  'Journal Submission Deadline - Nature ML',
  '2025-12-31T23:59:59Z',
  'deadline'::connection_event_type
);
```

### Example 12: Create Event with Google Calendar Sync

```sql
INSERT INTO public.connection_events (
  space_id,
  created_by,
  title,
  description,
  starts_at,
  ends_at,
  google_event_id,
  event_type
) VALUES (
  'family-space-uuid',
  auth.uid(),
  'Mom\'s Birthday',
  'Let\'s celebrate!',
  '2025-12-25T19:00:00Z',
  '2025-12-25T23:00:00Z',
  'google-event-abc123xyz',
  'milestone'::connection_event_type
);
```

## Document Sharing

### Example 13: Upload Family Document

```sql
INSERT INTO public.connection_documents (
  space_id,
  uploaded_by,
  file_name,
  file_path,
  file_type,
  file_size_bytes,
  category,
  tags
) VALUES (
  'family-space-uuid',
  auth.uid(),
  'Insurance_Policies_2025.pdf',
  's3://aica-docs/family-space-id/insurance-policies-2025.pdf',
  'application/pdf',
  1524896,
  'Legal & Financial',
  ARRAY['insurance', 'legal', 'important', '2025']
);
```

### Example 14: Upload Research Paper with Version

```sql
INSERT INTO public.connection_documents (
  space_id,
  uploaded_by,
  file_name,
  file_path,
  file_type,
  file_size_bytes,
  category,
  tags,
  version,
  parent_document_id
) VALUES (
  'academia-space-uuid',
  auth.uid(),
  'AI_Ethics_Framework_v2.docx',
  's3://aica-docs/academia-space-id/ai-ethics-v2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  2847302,
  'Research Paper',
  ARRAY['research', 'ai-ethics', 'peer-review'],
  2,
  'original-document-uuid'  -- Reference to version 1
);
```

### Example 15: Upload Document with Expiration

```sql
INSERT INTO public.connection_documents (
  space_id,
  uploaded_by,
  file_name,
  file_path,
  file_type,
  file_size_bytes,
  category,
  expires_at
) VALUES (
  'ventures-space-uuid',
  auth.uid(),
  'Funding_Pitch_Deck_Jan2026.pptx',
  's3://aica-docs/ventures-space-id/pitch-deck-jan2026.pptx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  4521330,
  'Investor Relations',
  '2026-03-31T23:59:59Z'  -- Expires after 3 months
);
```

### Example 16: Find Latest Document Version

```sql
SELECT
  id,
  file_name,
  version,
  created_at
FROM public.connection_documents
WHERE space_id = 'space-uuid'
  AND file_name = 'AI_Ethics_Framework_v2.docx'
  AND parent_document_id IS NULL  -- Latest version has no parent
ORDER BY version DESC
LIMIT 1;
```

## Financial Tracking

### Example 17: Record Shared Expense (Equal Split)

```sql
INSERT INTO public.connection_transactions (
  space_id,
  created_by,
  description,
  amount,
  currency,
  type,
  category,
  transaction_date,
  split_type,
  split_data
) VALUES (
  'family-space-uuid',
  auth.uid(),
  'Grocery Shopping at Zona Sul Market',
  150.00,
  'BRL',
  'expense'::connection_transaction_type,
  'Food & Groceries',
  NOW(),
  'equal'::connection_transaction_split_type,
  '{
    "member_1_uuid": 0.5,
    "member_2_uuid": 0.5
  }'::jsonb
);
```

### Example 18: Record Income (Community Fundraising)

```sql
INSERT INTO public.connection_transactions (
  space_id,
  created_by,
  description,
  amount,
  currency,
  type,
  category,
  transaction_date
) VALUES (
  'tribo-space-uuid',
  auth.uid(),
  'Workshop Attendance Fees - Biohacking 101',
  2500.00,
  'BRL',
  'income'::connection_transaction_type,
  'Community Funding',
  NOW()
);
```

### Example 19: Record Business Expense (Percentage Split)

```sql
INSERT INTO public.connection_transactions (
  space_id,
  created_by,
  description,
  amount,
  currency,
  type,
  category,
  transaction_date,
  split_type,
  split_data
) VALUES (
  'ventures-space-uuid',
  auth.uid(),
  'AWS Infrastructure Costs - December',
  5000.00,
  'USD',
  'expense'::connection_transaction_type,
  'Technology & Infrastructure',
  NOW(),
  'percentage'::connection_transaction_split_type,
  '{
    "alice_uuid": 0.60,
    "bob_uuid": 0.40
  }'::jsonb
);
```

### Example 20: Mark Transaction as Paid

```sql
UPDATE public.connection_transactions
SET
  is_paid = TRUE,
  paid_at = NOW(),
  paid_by = auth.uid()
WHERE id = 'transaction-uuid'
  AND space_id = 'space-uuid';
```

### Example 21: Create Recurring Monthly Expense

```sql
INSERT INTO public.connection_transactions (
  space_id,
  created_by,
  description,
  amount,
  currency,
  type,
  category,
  transaction_date,
  is_recurring,
  recurrence_rule,
  split_type,
  split_data
) VALUES (
  'family-space-uuid',
  auth.uid(),
  'House Rent - Monthly',
  3500.00,
  'BRL',
  'expense'::connection_transaction_type,
  'Housing',
  NOW(),
  TRUE,
  'FREQ=MONTHLY;INTERVAL=1;UNTIL=20261231',
  'percentage'::connection_transaction_split_type,
  '{
    "mom_uuid": 0.40,
    "dad_uuid": 0.40,
    "sibling_uuid": 0.20
  }'::jsonb
);
```

## Querying Patterns

### Example 22: Get All User's Spaces (All Archetypes)

```sql
SELECT
  id,
  archetype,
  name,
  subtitle,
  is_active,
  is_favorite,
  last_accessed_at,
  created_at
FROM public.connection_spaces
WHERE user_id = auth.uid()
  AND is_active = TRUE
ORDER BY is_favorite DESC, last_accessed_at DESC;
```

### Example 23: Get Spaces by Archetype

```sql
SELECT
  id,
  name,
  subtitle,
  created_at
FROM public.connection_spaces
WHERE user_id = auth.uid()
  AND archetype = 'ventures'::connection_archetype_type
  AND is_active = TRUE;
```

### Example 24: Get Space Members with Permissions

```sql
SELECT
  id,
  user_id,
  external_name,
  external_email,
  role,
  context_label,
  permissions,
  is_active,
  joined_at
FROM public.connection_members
WHERE space_id = 'space-uuid'
  AND is_active = TRUE
ORDER BY role DESC, joined_at DESC;
```

### Example 25: Get Upcoming Events for User

```sql
SELECT
  e.id,
  e.title,
  e.starts_at,
  e.ends_at,
  e.event_type,
  e.location,
  s.name as space_name,
  s.archetype
FROM public.connection_events e
JOIN public.connection_spaces s ON e.space_id = s.id
WHERE s.user_id = auth.uid()
  AND e.starts_at > NOW()
  AND e.starts_at < NOW() + INTERVAL '30 days'
ORDER BY e.starts_at ASC;
```

### Example 26: Get Unpaid Expenses by Space

```sql
SELECT
  id,
  description,
  amount,
  currency,
  created_by,
  transaction_date,
  split_data,
  created_at
FROM public.connection_transactions
WHERE space_id = 'family-space-uuid'
  AND type = 'expense'::connection_transaction_type
  AND is_paid = FALSE
ORDER BY transaction_date DESC;
```

### Example 27: Get Financial Summary for Space

```sql
SELECT
  type,
  SUM(amount) as total,
  COUNT(*) as count,
  AVG(amount) as average
FROM public.connection_transactions
WHERE space_id = 'ventures-space-uuid'
  AND transaction_date >= DATE_TRUNC('month', NOW())
GROUP BY type
ORDER BY total DESC;
```

### Example 28: Search Documents by Tag

```sql
SELECT
  id,
  file_name,
  file_type,
  file_size_bytes,
  category,
  uploaded_by,
  created_at
FROM public.connection_documents
WHERE space_id = 'family-space-uuid'
  AND tags && ARRAY['legal']  -- && operator for array overlap
ORDER BY created_at DESC;
```

## Archetype-Specific Examples

### Habitat (Family)

**Typical Use Cases:**
- Plan family gatherings
- Share household expenses
- Manage family documents (insurance, deeds)
- Coordinate calendar
- Track shared groceries and utilities

**Sample Workflow:**
```sql
-- 1. Create family space
INSERT INTO connection_spaces (...) VALUES (...);

-- 2. Add family members
INSERT INTO connection_members (...) VALUES (
  ..., role = 'member', context_label = 'Mom'
);
INSERT INTO connection_members (...) VALUES (
  ..., role = 'member', context_label = 'Dad'
);
INSERT INTO connection_members (...) VALUES (
  ..., role = 'member', context_label = 'Sister'
);

-- 3. Create monthly rent split
INSERT INTO connection_transactions (...) VALUES (
  ..., split_type = 'percentage', split_data = {
    "mom": 0.40, "dad": 0.40, "sister": 0.20
  }
);

-- 4. Plan family reunion
INSERT INTO connection_events (...) VALUES (
  ..., event_type = 'social', rsvp_enabled = TRUE
);
```

### Ventures (Business)

**Typical Use Cases:**
- Co-founder collaboration
- Track startup expenses
- Share business documents
- Schedule investor meetings
- Manage equity-based transaction splits

**Sample Workflow:**
```sql
-- 1. Create startup space
INSERT INTO connection_spaces (...) VALUES (
  ..., archetype = 'ventures', settings = {
    "stage": "seed", "co_founders": ["alice", "bob"]
  }
);

-- 2. Add co-founders as admins
INSERT INTO connection_members (...) VALUES (
  ..., role = 'admin', context_label = 'Co-founder - Product'
);

-- 3. Track AWS costs (percentage split)
INSERT INTO connection_transactions (...) VALUES (
  ..., split_type = 'percentage', split_data = {"alice": 0.60, "bob": 0.40}
);

-- 4. Share pitch deck
INSERT INTO connection_documents (...) VALUES (
  ..., category = 'Investor Relations', expires_at = '2026-03-31'
);

-- 5. Schedule investor meetings
INSERT INTO connection_events (...) VALUES (
  ..., event_type = 'meeting', title = 'Investor Pitch - VC Latam'
);
```

### Academia (Education)

**Typical Use Cases:**
- Research collaboration
- Paper writing and versioning
- Conference planning
- Publication tracking
- Research fund management

**Sample Workflow:**
```sql
-- 1. Create research group space
INSERT INTO connection_spaces (...) VALUES (
  ..., archetype = 'academia', settings = {
    "institution": "UFRJ", "field": "AI Ethics"
  }
);

-- 2. Add researchers with different roles
INSERT INTO connection_members (...) VALUES (
  ..., role = 'admin', context_label = 'Principal Investigator'
);
INSERT INTO connection_members (...) VALUES (
  ..., role = 'member', context_label = 'PhD Student'
);

-- 3. Upload research paper versions
INSERT INTO connection_documents (...) VALUES (
  ..., version = 1, category = 'Research Paper'
);
-- Later version:
INSERT INTO connection_documents (...) VALUES (
  ..., version = 2, parent_document_id = 'v1-uuid', category = 'Research Paper'
);

-- 4. Track conference deadlines
INSERT INTO connection_events (...) VALUES (
  ..., event_type = 'deadline', title = 'NeurIPS 2026 Submission Deadline'
);
```

### Tribo (Community)

**Typical Use Cases:**
- Community organizing
- Collective fundraising
- Shared resource management
- Event coordination
- Community knowledge sharing

**Sample Workflow:**
```sql
-- 1. Create community space
INSERT INTO connection_spaces (...) VALUES (
  ..., archetype = 'tribo', settings = {
    "community_type": "interest_based",
    "meeting_frequency": "monthly"
  }
);

-- 2. Add members with varying roles
INSERT INTO connection_members (...) VALUES (
  ..., role = 'admin', context_label = 'Community Organizer'
);
INSERT INTO connection_members (...) VALUES (
  ..., role = 'member', external_email = 'member@example.com'
);

-- 3. Track community fundraising
INSERT INTO connection_transactions (...) VALUES (
  ..., type = 'income', description = 'Workshop Fees',
  split_type = 'payer_only'  -- All to community
);

-- 4. Plan monthly meetup
INSERT INTO connection_events (...) VALUES (
  ..., event_type = 'social', rsvp_enabled = TRUE,
  title = 'Monthly Biohacking Meetup'
);

-- 5. Share community guidelines
INSERT INTO connection_documents (...) VALUES (
  ..., category = 'Community Guidelines',
  tags = ARRAY['governance', 'public']
);
```

## Performance Tips

1. **Always filter by space_id** - Leverage indexes
```sql
SELECT * FROM connection_members
WHERE space_id = 'space-uuid'  -- Fast
AND is_active = TRUE;           -- Partial index
```

2. **Use date ranges for events**
```sql
SELECT * FROM connection_events
WHERE space_id = 'space-uuid'
AND starts_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';
```

3. **Bulk operations for member setup**
```sql
INSERT INTO connection_members (space_id, user_id, role, context_label)
VALUES
  ('space-uuid', 'user-1', 'member', 'Role1'),
  ('space-uuid', 'user-2', 'member', 'Role2'),
  ('space-uuid', 'user-3', 'admin', 'Role3');
```

4. **Use JSONB operators efficiently**
```sql
-- Good: Uses index
SELECT * FROM connection_documents
WHERE space_id = 'space-uuid'
AND tags && ARRAY['important'];

-- Also good: GIN index
SELECT * FROM connection_transactions
WHERE space_id = 'space-uuid'
AND split_data @> '{"member_uuid": 0.5}'::jsonb;
```
