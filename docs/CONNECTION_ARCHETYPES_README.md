# Connection Archetypes - Database Schema

## Quick Start

### Migration File
`supabase/migrations/20251214000000_connection_archetypes_base.sql`

### What Gets Created

**5 Tables:**
- `connection_spaces` - Archetypes (habitat, ventures, academia, tribo)
- `connection_members` - Users in each space
- `connection_events` - Shared calendar events
- `connection_documents` - Shared files
- `connection_transactions` - Shared finances

**3 Helper Functions (SECURITY DEFINER):**
- `is_connection_space_member(uuid)` - Check membership
- `is_connection_space_admin(uuid)` - Check admin status
- `is_connection_space_owner(uuid)` - Check ownership

**5 Enum Types:**
- `connection_archetype_type` - habitat, ventures, academia, tribo
- `connection_member_role` - owner, admin, member, guest
- `connection_event_type` - meeting, social, milestone, deadline, other
- `connection_transaction_type` - income, expense, transfer
- `connection_transaction_split_type` - equal, percentage, custom, payer_only

## Architecture Pattern

### SECURITY DEFINER Functions
All RLS policies use SECURITY DEFINER helper functions to prevent infinite recursion:

```sql
-- Helper function (bypasses RLS)
CREATE FUNCTION is_connection_space_member(_space_id uuid)
RETURNS boolean SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM connection_members
    WHERE space_id = _space_id AND user_id = auth.uid()
  );
END;
$$;

-- RLS policy (uses function, not direct table query)
CREATE POLICY "connection_spaces_select"
  ON connection_spaces FOR SELECT
  USING (is_connection_space_member(id));
```

### Why This Matters
- Prevents error 42P17 (infinite recursion)
- Single source of truth for permission logic
- Professional security pattern
- Easier to audit and maintain

## Table Schemas

### connection_spaces
Main archetype container.
```sql
id UUID PRIMARY KEY
user_id UUID -> REFERENCES auth.users (owner)
archetype connection_archetype_type (habitat|ventures|academia|tribo)
name TEXT, subtitle TEXT, description TEXT
icon TEXT, color_theme TEXT, cover_image_url TEXT
is_active BOOLEAN (default TRUE)
is_favorite BOOLEAN (default FALSE)
last_accessed_at TIMESTAMPTZ
settings JSONB (flexible config)
created_at, updated_at TIMESTAMPTZ
```

**Access:**
- SELECT: Owner + Members
- INSERT: Owner only
- UPDATE: Owner only
- DELETE: Owner only

### connection_members
Users in a space (Aica or external).
```sql
id UUID PRIMARY KEY
space_id UUID -> REFERENCES connection_spaces
user_id UUID -> REFERENCES auth.users (nullable)
external_name, external_email, external_phone, external_avatar_url
role connection_member_role (owner|admin|member|guest)
permissions JSONB (custom permissions)
context_label TEXT (role-specific label like "Dad")
context_data JSONB (archetype-specific data)
is_active BOOLEAN (default TRUE)
joined_at TIMESTAMPTZ, last_interaction_at TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
```

**Access:**
- SELECT: Self + Admins
- INSERT: Admins only
- UPDATE: Admins only
- DELETE: Admins only

### connection_events
Shared calendar events.
```sql
id UUID PRIMARY KEY
space_id UUID -> REFERENCES connection_spaces
created_by UUID -> REFERENCES auth.users
title TEXT, description TEXT, location TEXT
starts_at, ends_at TIMESTAMPTZ
is_all_day BOOLEAN
recurrence_rule TEXT (RFC 5545 RRULE)
event_type connection_event_type
rsvp_enabled BOOLEAN, rsvp_deadline TIMESTAMPTZ
google_event_id TEXT (Google Calendar sync)
created_at, updated_at TIMESTAMPTZ
```

**Access:**
- SELECT: Members only
- INSERT: Members only (created_by = current user)
- UPDATE: Creator + Admins
- DELETE: Creator + Admins

### connection_documents
Shared files and documents.
```sql
id UUID PRIMARY KEY
space_id UUID -> REFERENCES connection_spaces
uploaded_by UUID -> REFERENCES auth.users
file_name, file_path, file_type TEXT
file_size_bytes BIGINT
category TEXT
tags TEXT[] (array for flexible tagging)
version INTEGER, parent_document_id UUID (for versioning)
expires_at TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
```

**Access:**
- SELECT: Members only
- INSERT: Members only
- UPDATE: Uploader + Admins
- DELETE: Uploader + Admins

### connection_transactions
Shared financial transactions.
```sql
id UUID PRIMARY KEY
space_id UUID -> REFERENCES connection_spaces
created_by UUID -> REFERENCES auth.users
description, amount DECIMAL, currency TEXT (default USD)
type connection_transaction_type (income|expense|transfer)
category TEXT
transaction_date TIMESTAMPTZ
split_type connection_transaction_split_type
split_data JSONB (member_id -> percentage/amount)
is_paid BOOLEAN (default FALSE), paid_at TIMESTAMPTZ, paid_by UUID
is_recurring BOOLEAN, recurrence_rule TEXT
created_at, updated_at TIMESTAMPTZ
```

**Access:**
- SELECT: Members only
- INSERT: Members only
- UPDATE: Creator + Admins
- DELETE: Creator + Admins

## Common Operations

### Create a Habitat (Family) Space
```sql
INSERT INTO connection_spaces (
  user_id, archetype, name, icon, color_theme, settings
) VALUES (
  auth.uid(), 'habitat'::connection_archetype_type, 'The Silva Family',
  'home', 'blue-warmth',
  '{"family_structure": "nuclear", "members": 4}'::jsonb
);
```

### Add a Family Member
```sql
INSERT INTO connection_members (
  space_id, user_id, role, context_label
) VALUES (
  'space-uuid', 'user-uuid', 'member'::connection_member_role, 'Mom'
);
```

### Add External Member (Non-Aica User)
```sql
INSERT INTO connection_members (
  space_id, external_name, external_email, role
) VALUES (
  'space-uuid', 'John Doe', 'john@example.com', 'guest'::connection_member_role
);
```

### Create Shared Expense with Split
```sql
INSERT INTO connection_transactions (
  space_id, created_by, description, amount, type, split_type, split_data
) VALUES (
  'space-uuid', auth.uid(), 'Monthly Rent', 3500.00,
  'expense'::connection_transaction_type,
  'percentage'::connection_transaction_split_type,
  '{"mom-uuid": 0.40, "dad-uuid": 0.40, "sister-uuid": 0.20}'::jsonb
);
```

### Query User's Spaces
```sql
SELECT id, archetype, name FROM connection_spaces
WHERE user_id = auth.uid() AND is_active = TRUE
ORDER BY is_favorite DESC, last_accessed_at DESC;
```

### Query Space Members
```sql
SELECT id, user_id, external_name, role, context_label
FROM connection_members
WHERE space_id = 'space-uuid' AND is_active = TRUE
ORDER BY role DESC, joined_at DESC;
```

## Indexes

**31+ indexes created:**
- User ID lookups (fast member/space finding)
- Archetype filtering (habitat, ventures, etc.)
- Boolean flags (is_active, is_favorite, is_paid)
- Date ranges (event queries, transaction dates)
- Array tags (GIN index for document searches)
- Composite indexes (space_id + filter column)

## Extensibility

### JSONB Fields for Custom Data

**connection_spaces.settings**
```json
{
  "family_structure": "nuclear",
  "household_members": 4,
  "preferences": {"calendar_sync": true}
}
```

**connection_members.permissions**
```json
{
  "can_edit_events": true,
  "can_upload_documents": true,
  "can_modify_transactions": false
}
```

**connection_members.context_data**
```json
{
  "relationship": "mother",
  "contact_preferred": "whatsapp",
  "availability": "evenings"
}
```

**connection_transactions.split_data**
```json
{
  "member-uuid-1": 0.60,
  "member-uuid-2": 0.40
}
```

These JSONB fields allow adding archetype-specific data without schema changes!

## Security & RLS

### All Tables Have:
- RLS enabled
- 4 policies each (SELECT, INSERT, UPDATE, DELETE)
- SECURITY DEFINER helper functions
- No circular dependencies
- Proper foreign key cascades

### Policy Pattern
```
SELECT: Owner + Members
INSERT: Members (self-created records)
UPDATE: Creator/Admins
DELETE: Creator/Admins
```

## Performance Notes

- All foreign keys indexed
- Partial indexes on boolean flags
- Composite indexes for common queries
- GIN index on array fields
- Date range indexes for time-based queries

## Documentation Files

1. **CONNECTION_ARCHETYPES_MIGRATION.md** - Detailed architecture & migration info
2. **CONNECTION_ARCHETYPES_USAGE_EXAMPLES.md** - 28+ code examples
3. **CONNECTION_ARCHETYPES_VALIDATION.md** - Complete verification checklist
4. **CONNECTION_ARCHETYPES_README.md** - This file (quick reference)

## Next Steps

1. Apply migration: `supabase migration up`
2. Run validation checklist
3. Create frontend API endpoints
4. Add TypeScript types from schema
5. Implement UI components for Connection Spaces
6. Add activity tracking tables (optional)
7. Create notification system (optional)

## Archetype Use Cases

| Archetype | Purpose | Example |
|-----------|---------|---------|
| **habitat** | Family/Home | The Silva Family - coordinate household, share expenses, plan gatherings |
| **ventures** | Business | TechStart Brazil - co-founder collaboration, budget tracking, pitch deck sharing |
| **academia** | Education | AI Ethics Research - paper versioning, conference deadlines, fund tracking |
| **tribo** | Community | Rio Biohackers - event organization, fundraising, knowledge sharing |

## Key Features

- Owner-based access control
- Multi-level roles (owner, admin, member, guest)
- Mixed member support (Aica users + external users)
- Financial splits (equal, percentage, custom)
- Recurring events and transactions
- Document versioning
- Google Calendar integration ready
- JSONB for unlimited extensibility

## Support

For questions or issues:
1. Check CONNECTION_ARCHETYPES_USAGE_EXAMPLES.md for code patterns
2. Review CONNECTION_ARCHETYPES_MIGRATION.md for architecture details
3. Run CONNECTION_ARCHETYPES_VALIDATION.md checklist
4. Contact database team
