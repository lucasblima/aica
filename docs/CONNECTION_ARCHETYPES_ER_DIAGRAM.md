# Connection Archetypes - Entity Relationship Diagram

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AICA LIFE OS DATABASE                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     auth.users (Supabase)                      │  │
│  │  ────────────────────────────────────────────────────────────  │  │
│  │  id (UUID) [PK]                                                │  │
│  │  email, created_at, updated_at                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│    ▲                                                                   │
│    │ 1:N (user owns many spaces)                                     │
│    │                                                                   │
│  ┌─┴──────────────────────────────────────────────────────────────┐  │
│  │           CONNECTION_SPACES (Archetypes)                        │  │
│  │  ────────────────────────────────────────────────────────────  │  │
│  │  id (UUID) [PK]                                                │  │
│  │  user_id (UUID) [FK -> auth.users] ◄── Owner                  │  │
│  │  archetype (ENUM) ◄── habitat|ventures|academia|tribo         │  │
│  │  name, subtitle, description                                   │  │
│  │  icon, color_theme, cover_image_url                           │  │
│  │  is_active, is_favorite, last_accessed_at                     │  │
│  │  settings (JSONB) ◄── Flexible archetype config               │  │
│  │  created_at, updated_at                                        │  │
│  │                                                                  │  │
│  │  INDEXES:                                                       │  │
│  │  - idx_connection_spaces_user_id (fast owner lookup)           │  │
│  │  - idx_connection_spaces_archetype (filter by type)            │  │
│  │  - idx_connection_spaces_is_active (active spaces)             │  │
│  │  - idx_connection_spaces_is_favorite (favorite spaces)         │  │
│  │  - idx_connection_spaces_created_at (sort by date)             │  │
│  │                                                                  │  │
│  │  RLS POLICIES:                                                  │  │
│  │  - SELECT: (owner = auth.uid()) OR is_member_of(id)           │  │
│  │  - INSERT: (owner = auth.uid())                                │  │
│  │  - UPDATE: is_owner_of(id)                                     │  │
│  │  - DELETE: is_owner_of(id)                                     │  │
│  └──────────────┬──────────────────────────────────────────────────┘  │
│                 │                                                      │
│                 │ 1:N (space has many members)                        │
│                 ├────────┐                                            │
│                 │         │                                            │
│  ┌──────────────▼──────┐  │  ┌──────────────────────────────────────┐│
│  │  CONNECTION_MEMBERS │  │  │   CONNECTION_EVENTS                  ││
│  │  ──────────────────  │  │  │  ────────────────────────────────   ││
│  │  id (UUID) [PK]      │  │  │  id (UUID) [PK]                    ││
│  │  space_id (UUID)[FK] ◄──┤  │  space_id (UUID) [FK]              ││
│  │  user_id (UUID)[FK]  │  │  │  created_by (UUID) [FK -> auth]    ││
│  │    (nullable for     │  │  │  title, description, location      ││
│  │     external users)  │  │  │  starts_at, ends_at                ││
│  │                      │  │  │  is_all_day, recurrence_rule       ││
│  │  external_name       │  │  │  event_type (ENUM)                 ││
│  │  external_email      │  │  │  rsvp_enabled, rsvp_deadline       ││
│  │  external_phone      │  │  │  google_event_id (for sync)        ││
│  │  external_avatar_url │  │  │  created_at, updated_at            ││
│  │                      │  │  │                                     ││
│  │  role (ENUM)         │  │  │  INDEXES:                           ││
│  │  owner|admin|        │  │  │  - idx_connection_events_space_id  ││
│  │  member|guest        │  │  │  - idx_connection_events_created   ││
│  │                      │  │  │  - idx_connection_events_starts_at ││
│  │  permissions (JSONB) │  │  │  - idx_connection_events_google_id ││
│  │  context_label       │  │  │  - idx_connection_events_recurring ││
│  │  context_data(JSONB) │  │  │  - idx_connection_events_date_range││
│  │                      │  │  │                                     ││
│  │  is_active, joined_at│  │  │  RLS POLICIES:                      ││
│  │  last_interaction_at │  │  │  - SELECT: is_member_of(space_id) ││
│  │  created_at,         │  │  │  - INSERT: is_member_of(space_id) ││
│  │  updated_at          │  │  │  - UPDATE: is_creator_or_admin()   ││
│  │                      │  │  │  - DELETE: is_creator_or_admin()   ││
│  │  UNIQUE CONSTRAINTS: │  │  └──────────────────────────────────────┘│
│  │  - space_id + user_id│  │                                          │
│  │    (one member per   │  │                                          │
│  │     Aica user)       │  │                                          │
│  │  - space_id + email  │  │                                          │
│  │    (external unique) │  │                                          │
│  │                      │  │                                          │
│  │  INDEXES:            │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    space_id          │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    user_id           │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    space_user        │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    role              │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    is_active         │  │                                          │
│  │  - idx_conn_members_ │  │                                          │
│  │    external_email    │  │                                          │
│  │                      │  │                                          │
│  │  RLS POLICIES:       │  │                                          │
│  │  - SELECT: (self) OR │  │                                          │
│  │    is_admin_of()     │  │                                          │
│  │  - INSERT: is_admin_ │  │                                          │
│  │    of(space_id)      │  │                                          │
│  │  - UPDATE: is_admin_ │  │                                          │
│  │    of(space_id)      │  │                                          │
│  │  - DELETE: is_admin_ │  │                                          │
│  │    of(space_id)      │  │                                          │
│  └──────────────────────┘  │                                          │
│       ▲                     │                                          │
│       │ 1:1 (linked from    │                                          │
│       │ connection_events   │                                          │
│       │ connection_docs     │                                          │
│       │ connection_trans)   │                                          │
│       │                     │                                          │
│       └─────────────────────┘                                          │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              CONNECTION_DOCUMENTS (Shared Files)                │  │
│  │  ────────────────────────────────────────────────────────────   │  │
│  │  id (UUID) [PK]                                                │  │
│  │  space_id (UUID) [FK] ◄─── 1:N from connection_spaces        │  │
│  │  uploaded_by (UUID) [FK -> auth.users]                        │  │
│  │  file_name, file_path, file_type, file_size_bytes             │  │
│  │  category, tags (TEXT[])                                       │  │
│  │  version, parent_document_id (UUID)[FK] ◄── Versioning        │  │
│  │  expires_at                                                     │  │
│  │  created_at, updated_at                                        │  │
│  │                                                                  │  │
│  │  INDEXES:                                                       │  │
│  │  - idx_connection_documents_space_id                           │  │
│  │  - idx_connection_documents_uploaded_by                        │  │
│  │  - idx_connection_documents_category                           │  │
│  │  - idx_connection_documents_tags (GIN for array search)        │  │
│  │  - idx_connection_documents_created_at                         │  │
│  │  - idx_connection_documents_expires_at                         │  │
│  │  - idx_connection_documents_parent (for version chains)        │  │
│  │                                                                  │  │
│  │  RLS POLICIES:                                                  │  │
│  │  - SELECT: is_member_of(space_id)                              │  │
│  │  - INSERT: is_member_of(space_id)                              │  │
│  │  - UPDATE: is_creator_or_admin(uploaded_by)                    │  │
│  │  - DELETE: is_creator_or_admin(uploaded_by)                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │           CONNECTION_TRANSACTIONS (Shared Finances)             │  │
│  │  ────────────────────────────────────────────────────────────   │  │
│  │  id (UUID) [PK]                                                │  │
│  │  space_id (UUID) [FK]                                          │  │
│  │  created_by (UUID) [FK -> auth.users]                          │  │
│  │  description, amount (DECIMAL), currency (default USD)         │  │
│  │  type (ENUM): income|expense|transfer                          │  │
│  │  category, transaction_date                                     │  │
│  │                                                                  │  │
│  │  SPLIT SUPPORT:                                                 │  │
│  │  split_type (ENUM):                                             │  │
│  │  - equal (divide equally among members)                        │  │
│  │  - percentage (split by percentages)                           │  │
│  │  - custom (custom amounts per member)                          │  │
│  │  - payer_only (entire amount to creator)                       │  │
│  │                                                                  │  │
│  │  split_data (JSONB):                                            │  │
│  │  {                                                               │  │
│  │    "member-uuid-1": 0.60,  # percentage or amount               │  │
│  │    "member-uuid-2": 0.40                                        │  │
│  │  }                                                               │  │
│  │                                                                  │  │
│  │  PAYMENT TRACKING:                                              │  │
│  │  is_paid (BOOLEAN)                                              │  │
│  │  paid_at (TIMESTAMPTZ)                                          │  │
│  │  paid_by (UUID)[FK -> auth.users]                              │  │
│  │                                                                  │  │
│  │  RECURRING SUPPORT:                                             │  │
│  │  is_recurring (BOOLEAN)                                         │  │
│  │  recurrence_rule (RFC 5545 RRULE)                              │  │
│  │  Example: "FREQ=MONTHLY;INTERVAL=1;UNTIL=20261231"            │  │
│  │                                                                  │  │
│  │  TIMESTAMPS:                                                    │  │
│  │  created_at, updated_at                                        │  │
│  │                                                                  │  │
│  │  INDEXES:                                                       │  │
│  │  - idx_connection_transactions_space_id                         │  │
│  │  - idx_connection_transactions_created_by                       │  │
│  │  - idx_connection_transactions_date                             │  │
│  │  - idx_connection_transactions_type                             │  │
│  │  - idx_connection_transactions_category                         │  │
│  │  - idx_connection_transactions_is_paid                          │  │
│  │  - idx_connection_transactions_recurring                        │  │
│  │                                                                  │  │
│  │  RLS POLICIES:                                                  │  │
│  │  - SELECT: is_member_of(space_id)                              │  │
│  │  - INSERT: is_member_of(space_id)                              │  │
│  │  - UPDATE: is_creator_or_admin(created_by)                     │  │
│  │  - DELETE: is_creator_or_admin(created_by)                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Access Patterns

### Ownership Model

```
User (auth.users)
  │
  ├─ owns (1) ─────► connection_space_1 (habitat: family)
  │                    │
  │                    ├─ invites ─► member_1 (role: admin)
  │                    ├─ invites ─► member_2 (role: member)
  │                    ├─ invites ─► external_user_1 (role: guest)
  │                    │
  │                    ├─ contains ─► event_1 (created_by: user)
  │                    ├─ contains ─► event_2 (created_by: member_1)
  │                    │
  │                    ├─ contains ─► document_1 (uploaded_by: user)
  │                    ├─ contains ─► document_2 (uploaded_by: member_2)
  │                    │
  │                    ├─ contains ─► transaction_1 (created_by: user)
  │                    │              split: {member_1: 50%, member_2: 50%}
  │                    │
  │                    └─ contains ─► transaction_2 (created_by: member_1)
  │
  ├─ owns (2) ─────► connection_space_2 (ventures: startup)
  │                    │
  │                    ├─ co-founder_1 (role: admin)
  │                    └─ ...
  │
  ├─ owns (3) ─────► connection_space_3 (academia: research)
  └─ owns (4) ─────► connection_space_4 (tribo: community)
```

## Query Performance Routes

### Fast Paths (Indexed)

```
connection_spaces
  ├─ [idx_user_id]       ◄─ Find all user's spaces
  ├─ [idx_archetype]     ◄─ Filter by type
  ├─ [idx_is_active]     ◄─ Only active spaces
  └─ [idx_is_favorite]   ◄─ Favorite spaces

connection_members
  ├─ [idx_space_id]      ◄─ Find all space members
  ├─ [idx_user_id]       ◄─ Find user's memberships
  ├─ [idx_space_user]    ◄─ Check specific membership
  ├─ [idx_role]          ◄─ Filter by role
  └─ [idx_is_active]     ◄─ Active members only

connection_events
  ├─ [idx_space_id]      ◄─ Space's events
  ├─ [idx_starts_at]     ◄─ Upcoming events
  ├─ [idx_date_range]    ◄─ Events in range
  └─ [idx_google_id]     ◄─ Google Calendar sync

connection_documents
  ├─ [idx_space_id]      ◄─ Space's documents
  ├─ [idx_category]      ◄─ By category
  ├─ [idx_tags] (GIN)    ◄─ By tags
  └─ [idx_created_at]    ◄─ Recent uploads

connection_transactions
  ├─ [idx_space_id]      ◄─ Space's transactions
  ├─ [idx_date]          ◄─ By date range
  ├─ [idx_type]          ◄─ By type
  ├─ [idx_category]      ◄─ By category
  └─ [idx_is_paid]       ◄─ Unpaid tracking
```

## ENUM Type Definitions

```
connection_archetype_type
├─ 'habitat'      ◄─ Family/Home
├─ 'ventures'     ◄─ Business
├─ 'academia'     ◄─ Education/Research
└─ 'tribo'        ◄─ Community

connection_member_role
├─ 'owner'        ◄─ Can do everything
├─ 'admin'        ◄─ Can manage space + members
├─ 'member'       ◄─ Can create content
└─ 'guest'        ◄─ Can view only

connection_event_type
├─ 'meeting'      ◄─ Business/sync meetings
├─ 'social'       ◄─ Social events
├─ 'milestone'    ◄─ Important dates (birthday, etc)
├─ 'deadline'     ◄─ Deadlines
└─ 'other'        ◄─ Miscellaneous

connection_transaction_type
├─ 'income'       ◄─ Money in
├─ 'expense'      ◄─ Money out
└─ 'transfer'     ◄─ Transfer between members

connection_transaction_split_type
├─ 'equal'        ◄─ Split equally
├─ 'percentage'   ◄─ Split by percentages
├─ 'custom'       ◄─ Custom amounts
└─ 'payer_only'   ◄─ No split (entire amount)
```

## Foreign Key Relationships

```
auth.users (1) ──────────────────► (N) connection_spaces
              (1) ──────────────────► (N) connection_members
              (1) ──────────────────► (N) connection_events
              (1) ──────────────────► (N) connection_documents
              (1) ──────────────────► (N) connection_transactions

connection_spaces (1) ────────────► (N) connection_members
                    (1) ────────────► (N) connection_events
                    (1) ────────────► (N) connection_documents
                    (1) ────────────► (N) connection_transactions

connection_documents (1) ─────────► (N) connection_documents
                                   (version chains)
```

## Security Function Topology

```
SECURITY DEFINER FUNCTIONS (bypass RLS)
│
├─ is_connection_space_member(_space_id uuid)
│  └─ Returns: EXISTS in connection_members
│     Used in: Events, Documents, Transactions (SELECT/INSERT)
│
├─ is_connection_space_admin(_space_id uuid)
│  └─ Returns: EXISTS with role IN (owner, admin)
│     Used in: Members management, Event/Doc/Trans updates
│
└─ is_connection_space_owner(_space_id uuid)
   └─ Returns: EXISTS in connection_spaces WHERE owner
      Used in: Space modification, Space deletion
```

## Data Flow Example: Create Shared Expense

```
User A (owner) opens Family Habitat Space
         │
         └─→ is_connection_space_owner(space_id) → TRUE
             └─→ Can see space ✓

User A creates transaction: "Dinner: $100"
         │
         ├─→ split_type = "equal"
         ├─→ split_data = {
         │     "user_b": 0.50,
         │     "user_c": 0.50
         │   }
         │
         └─→ INSERT into connection_transactions
             └─→ RLS checks: is_member_of(space_id) → TRUE
                 └─→ created_by = auth.uid() → TRUE
                     └─→ Insert allowed ✓

User B (member) queries unpaid expenses
         │
         ├─→ is_connection_space_member(space_id) → TRUE
         │   └─→ Can see transactions ✓
         │
         └─→ SELECT from connection_transactions
             WHERE is_paid = FALSE
             └─→ Returns expense with their $50 split
```

## Capacity Planning

### Scalability Considerations

```
Per User:
  - connection_spaces: ~5-20 spaces (typical)
  - connection_members: ~50-500 (per space)
  - connection_events: ~200-2000 (per space, with recurrence)
  - connection_documents: ~500-5000 (per space)
  - connection_transactions: ~100-1000 (per space, per year)

For 10,000 users:
  - connection_spaces: ~100,000 rows
  - connection_members: ~1,000,000 rows
  - connection_events: ~1,000,000 rows
  - connection_documents: ~1,000,000 rows
  - connection_transactions: ~1,000,000 rows

Total: ~4 million rows (manageable, fully indexed)
```

### Index Coverage

```
All foreign key columns: INDEXED ✓
All filter columns (type, status): INDEXED ✓
All sort columns (created_at, starts_at): INDEXED ✓
Array columns (tags): GIN INDEX ✓
Boolean flags: PARTIAL INDEXES ✓
Composite queries: COMPOSITE INDEXES ✓
```

## Migration Sequence

```
1. Create ENUM types
   ├─ connection_archetype_type
   ├─ connection_member_role
   ├─ connection_event_type
   ├─ connection_transaction_type
   └─ connection_transaction_split_type

2. Create SECURITY DEFINER functions
   ├─ is_connection_space_member()
   ├─ is_connection_space_admin()
   └─ is_connection_space_owner()

3. Create Tables (in order):
   ├─ connection_spaces (references auth.users)
   ├─ connection_members (references connection_spaces + auth.users)
   ├─ connection_events (references connection_spaces + auth.users)
   ├─ connection_documents (references connection_spaces + auth.users)
   └─ connection_transactions (references connection_spaces + auth.users)

4. Enable RLS on all tables

5. Create RLS policies (using SECURITY DEFINER functions)

6. Create updated_at triggers

7. Create indexes

8. Grant permissions to authenticated role
```

This diagram provides a complete visual reference for the Connection Archetypes database architecture!
