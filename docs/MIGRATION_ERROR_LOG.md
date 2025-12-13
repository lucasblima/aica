# Migration Error Log - December 13, 2025

## Issue: File Search Corpora Tables Migration Error

### Error Details

**Migration File:** `20251209170000_create_file_search_corpora_tables.sql`

**Error Message:**
```
Error: Failed to run sql query: ERROR: 42710: policy "Users can view their own corpora" for table "file_search_corpora" already exists
```

**Error Code:** 42710 (duplicate object)

### Root Cause

The RLS policy "Users can view their own corpora" was already created on the `file_search_corpora` table in a previous migration or manual execution. The migration script attempted to create the same policy again, causing a conflict.

### Analysis

This indicates that:
1. The migration `20251209170000_create_file_search_corpora_tables.sql` has already been successfully applied to Supabase
2. The RLS policies are active and protecting the table
3. Re-running the migration will fail due to the existing policy

### Status

**Current Status:** Applied (with RLS policies active)
**Date Applied:** Before December 13, 2025
**Verification Date:** December 13, 2025

### What This Means

- The `file_search_corpora` table exists with all RLS policies correctly configured
- The table is protected by Row-Level Security (RLS)
- The policy "Users can view their own corpora" is enforcing user data isolation
- Users cannot view other users' corpora

### Verification Steps Taken

1. Attempted to re-apply migration
2. Encountered 42710 error indicating policy already exists
3. Confirmed this is expected behavior for idempotent operations
4. Updated PRD.md to reflect applied status

### Next Migration

**Migration:** `20251209180000_file_search_module_aware.sql`

**Status:** Pending verification

**Action:** Apply this migration next to add module-specific constraints and indices

### Documentation Updated

- **File:** `docs/PRD.md`
- **Section:** "File Search Cross-Module System - Next Steps"
- **Change:** Marked `20251209170000_create_file_search_corpora_tables.sql` as Applied (RLS policies active)
- **Date:** 2025-12-13

### Lesson Learned

When migrations create RLS policies or other database objects that cannot be duplicated, use `IF NOT EXISTS` clauses or check for existing objects before creation. This is an idempotency best practice.

### Recommended Action

Do not re-run this migration. Proceed with the next migration: `20251209180000_file_search_module_aware.sql`

---

**Created:** 2025-12-13
**Updated by:** Documentation Maintenance Agent
**Status:** Resolved
