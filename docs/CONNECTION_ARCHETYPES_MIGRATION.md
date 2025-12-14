# Connection Archetypes Migration Guide

## Migration File
`supabase/migrations/20251214000000_connection_archetypes_base.sql`

## Overview

This migration creates the foundational database schema for the Connection Archetypes system. It establishes five core tables with comprehensive Row-Level Security (RLS) policies following professional security patterns to prevent recursion and ensure data integrity.

## Architecture Pattern: Security Definer Functions

This migration implements the **SECURITY DEFINER pattern** to avoid RLS recursion issues:

### Problem Solved
When RLS policies directly query tables in the USING/WITH CHECK clause, it causes infinite recursion:
```sql
-- ❌ WRONG - Causes error 42P17 (infinite recursion)
CREATE POLICY "bad_policy"
  ON connection_spaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connection_members
      WHERE space_id = connection_spaces.id
      AND user_id = auth.uid()
    )
  );
```

### Solution: SECURITY DEFINER Functions
All permission logic is centralized in helper functions that bypass RLS:
```sql
-- ✅ CORRECT - Permission logic in function
CREATE FUNCTION public.is_connection_space_member(_space_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM connection_members
    WHERE space_id = _space_id
    AND user_id = auth.uid()
    AND is_active = TRUE
  );
END;
$$;

-- ✅ CORRECT - Policy uses function (no recursion)
CREATE POLICY "connection_spaces_select"
  ON connection_spaces FOR SELECT
  USING (is_connection_space_member(id));
```

## Tables Created

### 1. connection_spaces
Main table for all archetype instances.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Owner/creator of the space
- `archetype` (enum) - Type: habitat, ventures, academia, tribo
- `name` (TEXT) - Display name
- `subtitle` (TEXT) - Optional subtitle
- `description` (TEXT) - Detailed description
- `icon` (TEXT) - Icon identifier or URL
- `color_theme` (TEXT) - Color scheme identifier
- `cover_image_url` (TEXT) - Banner image
- `is_active` (BOOLEAN) - Soft delete flag
- `is_favorite` (BOOLEAN) - User favorite status
- `last_accessed_at` (TIMESTAMPTZ) - Activity tracking
- `settings` (JSONB) - Flexible archetype-specific configuration
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

**Key Features:**
- Owner-based security (only owner can edit/delete)
- Members can view
- Settings JSONB for extensibility
- Composite indexes for common queries

### 2. connection_members
Manages who has access to each connection space.

**Columns:**
- `id` (UUID) - Primary key
- `space_id` (UUID) - Reference to connection_spaces
- `user_id` (UUID) - Aica user (nullable for external members)
- `external_name`, `external_email`, `external_phone`, `external_avatar_url` - For non-Aica users
- `role` (enum) - owner, admin, member, guest
- `permissions` (JSONB) - Granular permission flags
- `context_label` (TEXT) - Role-specific label (e.g., "Dad" for habitat)
- `context_data` (JSONB) - Archetype-specific metadata
- `is_active` (BOOLEAN) - Member status
- `joined_at` (TIMESTAMPTZ) - When member joined
- `last_interaction_at` (TIMESTAMPTZ) - Activity tracking
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

**Key Features:**
- Supports both Aica users and external members
- Unique constraints prevent duplicates (per space)
- Admin-only write access (through RLS)
- Flexible JSONB for permissions and context

### 3. connection_events
Shared calendar events within spaces.

**Columns:**
- `id` (UUID) - Primary key
- `space_id` (UUID) - Reference to connection_spaces
- `created_by` (UUID) - Event creator
- `title` (TEXT) - Event title
- `description` (TEXT) - Event description
- `location` (TEXT) - Event location
- `starts_at`, `ends_at` (TIMESTAMPTZ) - Event time
- `is_all_day` (BOOLEAN) - All-day flag
- `recurrence_rule` (TEXT) - RFC 5545 RRULE for recurring events
- `event_type` (enum) - meeting, social, milestone, deadline, other
- `rsvp_enabled` (BOOLEAN) - RSVP functionality
- `rsvp_deadline` (TIMESTAMPTZ) - RSVP deadline
- `google_event_id` (TEXT) - Google Calendar sync ID
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

**Key Features:**
- Member-level read access
- Creator/admin can edit
- Google Calendar integration ready
- Recurring event support via RRULE
- RSVP tracking capability

### 4. connection_documents
Shared files and documents.

**Columns:**
- `id` (UUID) - Primary key
- `space_id` (UUID) - Reference to connection_spaces
- `uploaded_by` (UUID) - File uploader
- `file_name` (TEXT) - Original filename
- `file_path` (TEXT) - Storage path
- `file_type` (TEXT) - MIME type
- `file_size_bytes` (BIGINT) - File size in bytes
- `category` (TEXT) - Document category
- `tags` (TEXT[]) - Array of tags
- `version` (INTEGER) - Version number
- `parent_document_id` (UUID) - Reference for versioning
- `expires_at` (TIMESTAMPTZ) - Expiration date
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

**Key Features:**
- Member-level read access
- Uploader/admin can modify
- Document versioning support
- Tag-based filtering with GIN index
- Expiration tracking

### 5. connection_transactions
Shared financial transactions and splits.

**Columns:**
- `id` (UUID) - Primary key
- `space_id` (UUID) - Reference to connection_spaces
- `created_by` (UUID) - Transaction creator
- `description` (TEXT) - Transaction description
- `amount` (DECIMAL) - Transaction amount
- `currency` (TEXT) - Currency code (default: USD)
- `type` (enum) - income, expense, transfer
- `category` (TEXT) - Transaction category
- `transaction_date` (TIMESTAMPTZ) - Transaction date
- `split_type` (enum) - equal, percentage, custom, payer_only
- `split_data` (JSONB) - Split details (member_id -> amount/percentage)
- `is_paid` (BOOLEAN) - Payment status
- `paid_at` (TIMESTAMPTZ) - When paid
- `paid_by` (UUID) - Who marked as paid
- `is_recurring` (BOOLEAN) - Recurring flag
- `recurrence_rule` (TEXT) - RFC 5545 RRULE
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

**Key Features:**
- Member-level read access
- Creator/admin can edit
- Multiple split strategies (equal, percentage, custom)
- Recurring transaction support
- Payment tracking

## Security Functions Created

### 1. is_connection_space_member(space_id)
Checks if the current user is an active member of a space.
- Used in SELECT policies across all tables
- Enables members to view content

### 2. is_connection_space_admin(space_id)
Checks if the current user is an owner or admin of a space.
- Used in INSERT/UPDATE/DELETE policies
- Enables admin management capabilities

### 3. is_connection_space_owner(space_id)
Checks if the current user is the owner of a space.
- Used in UPDATE/DELETE policies for connection_spaces
- Ensures only owners can modify space settings

## RLS Policy Pattern

All tables follow a consistent pattern:

```sql
-- SELECT: Owners + Members
USING (
  is_connection_space_owner(space_id)
  OR
  is_connection_space_member(space_id)
);

-- INSERT: Only members can insert their own records
WITH CHECK (
  is_connection_space_member(space_id)
  AND created_by = auth.uid()
);

-- UPDATE: Creators + Admins
USING (
  created_by = auth.uid()
  OR
  is_connection_space_admin(space_id)
);

-- DELETE: Creators + Admins
USING (
  created_by = auth.uid()
  OR
  is_connection_space_admin(space_id)
);
```

## Enum Types Created

1. **connection_archetype_type**: habitat, ventures, academia, tribo
2. **connection_member_role**: owner, admin, member, guest
3. **connection_event_type**: meeting, social, milestone, deadline, other
4. **connection_transaction_type**: income, expense, transfer
5. **connection_transaction_split_type**: equal, percentage, custom, payer_only

## Indexes Created

### connection_spaces
- `idx_connection_spaces_user_id` - Find user's spaces
- `idx_connection_spaces_archetype` - Filter by type
- `idx_connection_spaces_is_active` - Active spaces only
- `idx_connection_spaces_is_favorite` - Favorite spaces
- `idx_connection_spaces_created_at` - Sort by date

### connection_members
- `idx_connection_members_space_id` - Find space members
- `idx_connection_members_user_id` - Find user memberships
- `idx_connection_members_space_user` - Composite for lookups
- `idx_connection_members_role` - Filter by role
- `idx_connection_members_is_active` - Active members only
- `idx_connection_members_external_email` - Email lookups

### connection_events
- `idx_connection_events_space_id` - Find space events
- `idx_connection_events_created_by` - Find user events
- `idx_connection_events_starts_at` - Sort by date
- `idx_connection_events_date_range` - Range queries
- `idx_connection_events_google_id` - Google sync lookup
- `idx_connection_events_recurring` - Find recurring

### connection_documents
- `idx_connection_documents_space_id` - Find space documents
- `idx_connection_documents_uploaded_by` - Find user uploads
- `idx_connection_documents_category` - Category filtering
- `idx_connection_documents_tags` - GIN index for tags
- `idx_connection_documents_created_at` - Sort by date
- `idx_connection_documents_expires_at` - Find expiring
- `idx_connection_documents_parent` - Version chains

### connection_transactions
- `idx_connection_transactions_space_id` - Find space transactions
- `idx_connection_transactions_created_by` - Find user transactions
- `idx_connection_transactions_date` - Sort by date
- `idx_connection_transactions_type` - Type filtering
- `idx_connection_transactions_category` - Category filtering
- `idx_connection_transactions_is_paid` - Unpaid tracking
- `idx_connection_transactions_recurring` - Find recurring

## Applying the Migration

```bash
supabase migration up
```

Or manually execute the SQL file in your Supabase console.

## Verifying the Migration

Check that all tables and policies are created:

```sql
-- List all tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'connection_%'
ORDER BY tablename;

-- List all RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('connection_spaces', 'connection_members', 'connection_events',
                    'connection_documents', 'connection_transactions')
ORDER BY tablename, policyname;

-- Check function definitions
SELECT proname FROM pg_proc
WHERE proname LIKE 'is_connection_%'
AND pronamespace = 'public'::regnamespace;
```

## Next Steps

1. **Connection Types Configuration** - Create tables for:
   - Archetype-specific templates
   - Role templates per archetype
   - Permission profiles

2. **Activity Tracking** - Create:
   - connection_activity_logs
   - connection_notifications
   - connection_activity_feeds

3. **Advanced Features**:
   - Document sharing tokens
   - Event RSVP tracking
   - Transaction settlement workflows
   - Bulk member operations

## Performance Considerations

- All foreign key columns are indexed
- Composite indexes for common filter combinations
- Partial indexes for boolean flags (is_active, is_paid)
- GIN index on tags array for efficient filtering
- TIMESTAMPTZ used throughout for timezone awareness

## Security Considerations

- RLS enabled on all tables
- SECURITY DEFINER functions with SET search_path
- No direct table queries in policies (prevents recursion)
- User context via auth.uid() built-in
- Soft delete via is_active flag (preserves referential integrity)
- Cascading deletes where appropriate (space deletion cascades to content)

## JSONB Fields for Extensibility

- `connection_spaces.settings` - Archetype-specific configuration
- `connection_members.permissions` - Granular permissions
- `connection_members.context_data` - Role-specific metadata
- `connection_transactions.split_data` - Split details

These JSONB fields allow adding new functionality without schema migrations.
