# Connection Archetypes - Complete Documentation Index

## Overview

Complete database migration and documentation for the Connection Archetypes system in Aica Life OS.

**Status:** Ready to Apply
**Scope:** 5 tables, 3 helper functions, 5 enum types, 20 RLS policies, 31+ indexes
**Security:** SECURITY DEFINER pattern to prevent RLS recursion
**Date Created:** 2025-12-13

---

## Files Created

### 1. Migration File

**File:** `supabase/migrations/20251214000000_connection_archetypes_base.sql` (25 KB)

The actual database migration file containing:
- All table definitions with standard columns
- 5 ENUM type definitions
- 3 SECURITY DEFINER helper functions
- 20 RLS policies (4 per table)
- 5 updated_at triggers
- 31+ performance indexes
- GRANT statements for authenticated users
- Comprehensive comments for documentation

**When to use:** Apply to Supabase using `supabase migration up`

---

### 2. Quick Reference Guide

**File:** `docs/CONNECTION_ARCHETYPES_README.md` (9.8 KB)

Quick reference for developers. Start here for:
- Quick start instructions
- 5-table overview
- Schema summaries with key columns
- Common operations (create space, add member, etc.)
- Archetype use cases matrix
- Index summary
- JSONB extensibility examples
- Quick lookup table

**Best for:** 5-minute reference, decisions on table structure

---

### 3. Detailed Architecture Guide

**File:** `docs/CONNECTION_ARCHETYPES_MIGRATION.md` (12 KB)

Comprehensive architecture documentation:
- Problem statement (why SECURITY DEFINER)
- Complete table definitions with all columns
- Security function descriptions
- RLS policy pattern explanation
- Enum type definitions
- Index strategy
- Performance considerations
- Security considerations
- JSONB field extensibility
- Next steps for implementation

**Best for:** Understanding the "why" behind design decisions

---

### 4. Code Examples

**File:** `docs/CONNECTION_ARCHETYPES_USAGE_EXAMPLES.md` (19 KB)

28+ practical SQL examples including:
- Creating spaces (habitat, ventures, academia, tribo)
- Managing members (add Aica user, add external user, promote, deactivate)
- Shared events (all-day, recurring, with RSVP)
- Document sharing (basic, with versioning, with expiration)
- Financial tracking (equal split, percentage split, recurring)
- Query patterns (find spaces, find members, upcoming events, unpaid expenses)
- Archetype-specific workflows
- Performance tips

**Best for:** Copy-paste implementation patterns

---

### 5. Validation Checklist

**File:** `docs/CONNECTION_ARCHETYPES_VALIDATION.md` (17 KB)

Complete verification checklist with:
- Pre-migration checklist
- Post-migration SQL verification queries
- 8 functional test scenarios
- 5 performance test queries
- 3 security test cases
- 1 rollback test with SQL
- Post-migration follow-up steps
- Comprehensive verification summary query

**Best for:** Verifying migration success, testing, quality assurance

---

### 6. Entity Relationship Diagram

**File:** `docs/CONNECTION_ARCHETYPES_ER_DIAGRAM.md` (27 KB)

Visual and textual ER documentation:
- Complete database schema ASCII diagram
- Relationship topology with 1:N cardinality
- Data access patterns with ownership model
- Query performance routes (fast paths)
- ENUM type definitions with meanings
- Foreign key relationship map
- Security function topology
- Data flow example (step-by-step)
- Capacity planning estimates
- Index coverage analysis
- Migration sequence diagram

**Best for:** Understanding data relationships, capacity planning

---

## How to Use These Documents

### Scenario 1: "I need to apply the migration"

1. Read: **CONNECTION_ARCHETYPES_README.md** - understand what's being created
2. Review: **CONNECTION_ARCHETYPES_MIGRATION.md** - understand the security pattern
3. Apply: Use `20251214000000_connection_archetypes_base.sql`
4. Verify: Follow **CONNECTION_ARCHETYPES_VALIDATION.md** checklist

### Scenario 2: "I need to write queries"

1. Start: **CONNECTION_ARCHETYPES_README.md** - quick table overview
2. Find patterns: **CONNECTION_ARCHETYPES_USAGE_EXAMPLES.md** - find similar example
3. Reference: **CONNECTION_ARCHETYPES_ER_DIAGRAM.md** - understand relationships
4. Optimize: Check indexes in the diagram

### Scenario 3: "I'm investigating a performance issue"

1. Check: **CONNECTION_ARCHETYPES_ER_DIAGRAM.md** - Index Coverage section
2. Review: **CONNECTION_ARCHETYPES_VALIDATION.md** - Performance tests
3. Analyze: Check query plan against expected indexes
4. Reference: **CONNECTION_ARCHETYPES_MIGRATION.md** - Index strategy section

### Scenario 4: "I need to add RLS to a new table"

1. Study: **CONNECTION_ARCHETYPES_MIGRATION.md** - Architecture Pattern section
2. Copy pattern from: **CONNECTION_ARCHETYPES_USAGE_EXAMPLES.md** - similar table
3. Review security: **CONNECTION_ARCHETYPES_VALIDATION.md** - Security tests
4. Validate: Use provided verification queries

### Scenario 5: "I'm debugging RLS issues"

1. Understand: **CONNECTION_ARCHETYPES_MIGRATION.md** - Why SECURITY DEFINER
2. Visualize: **CONNECTION_ARCHETYPES_ER_DIAGRAM.md** - Security function topology
3. Test: **CONNECTION_ARCHETYPES_VALIDATION.md** - Functional tests 1-5
4. Check: Verify no direct table queries in policies

---

## Document Quick Lookup

| Question | Document | Section |
|----------|----------|---------|
| What tables are created? | README | Quick Start / Table Schemas |
| How do I create a space? | USAGE_EXAMPLES | Creating Connection Spaces |
| Why use SECURITY DEFINER? | MIGRATION | Architecture Pattern |
| How do I verify migration? | VALIDATION | Post-Migration Verification |
| What indexes exist? | ER_DIAGRAM | Index Coverage Analysis |
| Show me the relationships | ER_DIAGRAM | Database Schema Relationships |
| What's my data access? | ER_DIAGRAM | Data Access Patterns |
| How do I add a member? | USAGE_EXAMPLES | Managing Members |
| What's the RLS policy pattern? | MIGRATION | RLS Policy Pattern |
| How do I query spaces? | USAGE_EXAMPLES | Querying Patterns |
| What JSONB fields exist? | README | Extensibility |
| Can I split expenses? | USAGE_EXAMPLES | Financial Tracking |
| Performance tips? | USAGE_EXAMPLES | Performance Tips |
| Rollback procedure? | VALIDATION | Rollback Testing |

---

## File Statistics

| File | Size | Type | Content |
|------|------|------|---------|
| Migration | 25 KB | SQL | 750+ lines of SQL |
| README | 9.8 KB | MD | Quick reference, 350+ lines |
| MIGRATION | 12 KB | MD | Architecture guide, 450+ lines |
| USAGE_EXAMPLES | 19 KB | MD | 28+ code examples, 650+ lines |
| VALIDATION | 17 KB | MD | 15+ test scenarios, 550+ lines |
| ER_DIAGRAM | 27 KB | MD | Visual docs, 800+ lines |
| **TOTAL** | **110 KB** | | **3,900+ lines** |

---

## Key Concepts

### Architecture Pattern: SECURITY DEFINER

**Problem:** RLS policies can't directly query tables (causes recursion)

**Solution:** Create SECURITY DEFINER functions that:
1. Bypass RLS (only functions, not policies)
2. Execute as superuser in controlled context
3. Have `SET search_path = public` for security
4. Return boolean for policy decisions

**Functions Created:**
- `is_connection_space_member(_space_id uuid)` - check membership
- `is_connection_space_admin(_space_id uuid)` - check admin status
- `is_connection_space_owner(_space_id uuid)` - check ownership

### Table Hierarchy

```
connection_spaces (owner = user)
  ├─ connection_members (who has access)
  ├─ connection_events (shared calendar)
  ├─ connection_documents (shared files)
  └─ connection_transactions (shared finances)
```

### Archetype Types

| Type | Purpose | Example |
|------|---------|---------|
| habitat | Family/Home | "The Silva Family" |
| ventures | Business | "TechStart Brazil" |
| academia | Education | "AI Ethics Research Group" |
| tribo | Community | "Rio Biohackers Collective" |

### Member Roles

| Role | Capabilities | Use Case |
|------|--------------|----------|
| owner | Everything | Space creator |
| admin | Manage space & members | Co-founder, lead |
| member | Create content | Regular family member |
| guest | View only | External observer |

### Split Types for Transactions

| Type | Use Case | Example |
|------|----------|---------|
| equal | Fair split | 3 friends split dinner equally |
| percentage | Unequal share | Co-founders: 60/40 split |
| custom | Per-person amounts | Custom cost allocation |
| payer_only | No split | Individual transaction |

---

## Security Summary

- **RLS Enabled:** All tables
- **Policies Per Table:** 4 (SELECT, INSERT, UPDATE, DELETE)
- **Total Policies:** 20
- **Recursive Risk:** Eliminated via SECURITY DEFINER
- **Helper Functions:** 3 (is_member, is_admin, is_owner)
- **Auth Context:** Built-in via `auth.uid()`
- **Cascading Deletes:** Enabled for referential integrity

---

## Performance Summary

- **Total Indexes:** 31+
- **Foreign Key Indexes:** All covered
- **Composite Indexes:** 8+ for common queries
- **Partial Indexes:** Boolean flags (is_active, is_paid)
- **GIN Indexes:** Array fields (tags)
- **Date Indexes:** starts_at, created_at, transaction_date
- **Estimated Capacity:** 4M rows (for 10K users)

---

## Implementation Timeline

### Phase 1: Foundation (Day 1)
- [ ] Apply migration
- [ ] Run validation checks
- [ ] Verify RLS policies
- [ ] Test helper functions

### Phase 2: APIs (Days 2-3)
- [ ] Create REST endpoints
- [ ] Add TypeScript types
- [ ] Document endpoints
- [ ] Add error handling

### Phase 3: Frontend (Days 4-5)
- [ ] Create Space components
- [ ] Implement Member management UI
- [ ] Add Event/Document/Transaction interfaces
- [ ] Test with RLS

### Phase 4: Testing (Days 6-7)
- [ ] Integration tests
- [ ] Security tests
- [ ] Performance tests
- [ ] UAT with team

### Phase 5: Launch (Day 8)
- [ ] Production deployment
- [ ] Monitor performance
- [ ] Team training
- [ ] Documentation update

---

## Troubleshooting Guide

### "Infinite recursion error (42P17)"
See: MIGRATION.md - Architecture Pattern section
Solution: Use SECURITY DEFINER functions, not direct table queries

### "Permission denied on [table]"
See: VALIDATION.md - Functional tests
Solution: Check auth.uid() matches expected user, verify RLS policy

### "Slow queries on [operation]"
See: ER_DIAGRAM.md - Index Coverage / USAGE_EXAMPLES.md - Performance Tips
Solution: Check if query uses indexed columns

### "JSONB query not returning results"
See: USAGE_EXAMPLES.md - Querying Patterns
Solution: Use correct operators (&&, @>, ->>), verify JSON structure

### "Foreign key constraint violation"
See: ER_DIAGRAM.md - Foreign Key Relationships
Solution: Ensure referenced record exists, check CASCADE rules

---

## Next Steps After Migration

1. **Create Frontend API Wrapper**
   ```typescript
   // supabase/queries/connectionSpaces.ts
   export const getSpaces = (userId: string) => {
     return supabase
       .from('connection_spaces')
       .select('*')
       .eq('user_id', userId)
       .eq('is_active', true);
   };
   ```

2. **Create TypeScript Types**
   ```typescript
   // types/connectionArchetypes.ts
   export type ConnectionSpace = Database['public']['Tables']['connection_spaces']['Row'];
   export type ConnectionArchetype = Database['public']['Enums']['connection_archetype_type'];
   ```

3. **Build UI Components**
   - SpaceCard component for displaying spaces
   - MemberList component for managing members
   - EventCalendar for viewing/creating events
   - DocumentUpload for file sharing
   - TransactionSplit for financial tracking

4. **Add Activity Tracking (Optional)**
   - Create connection_activity_logs table
   - Track all CRUD operations
   - Enable audit trails

5. **Create Notification System (Optional)**
   - connection_notifications table
   - Real-time updates via Supabase subscriptions
   - Email/SMS alerts for important events

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **SECURITY DEFINER:** https://www.postgresql.org/docs/current/sql-createfunction.html

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-13 | 1.0 | Initial creation |
| | | - 5 tables (spaces, members, events, documents, transactions) |
| | | - 3 SECURITY DEFINER functions |
| | | - 20 RLS policies |
| | | - 6 documentation files |

---

## Contact & Questions

For questions about:
- **Architecture decisions:** See MIGRATION.md - Architecture Pattern
- **RLS policies:** See VALIDATION.md - Security Testing
- **Query optimization:** See ER_DIAGRAM.md - Query Performance Routes
- **Implementation:** See USAGE_EXAMPLES.md - relevant section
- **Migration issues:** See VALIDATION.md - Troubleshooting

---

**Last Updated:** 2025-12-13
**Status:** Ready for Production
**Review Date:** 2025-12-20
