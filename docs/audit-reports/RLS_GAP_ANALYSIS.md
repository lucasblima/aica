# RLS Coverage Gap Analysis - Issue #73 Phase 1

**Generated**: 2026-01-08  
**Project**: Aica Life OS  
**Supabase**: gppebtrshbvuzatmebhr  

---

## Executive Summary

Based on migration file analysis:

- **Total Tables**: 90
- **Total RLS Policies Found**: 381
- **Tables Requiring Audit**: CRITICAL and HIGH priority tables

---

## 1. RLS AUDIT REPORT

### Critical Tables (Privacy & Sensitive Data)

| Table | Current Status | Required Actions |
|-------|----------------|------------------|
| `ai_usage_logs` | ⚠️ Has 2 policies | Verify full CRUD coverage |
| `gemini_api_logs` | ⚠️ Has 2 policies | Verify full CRUD coverage |
| `ai_usage_tracking_errors` | ⚠️ Has 1 policy | Missing INSERT, UPDATE, DELETE |
| `whatsapp_consent_records` | ✅ Has ALL + SELECT | COMPLETE |
| `data_deletion_requests` | ⚠️ Has INSERT, SELECT only | Missing UPDATE, DELETE |
| `moments` | ✅ Has 4 policies | COMPLETE |
| `weekly_summaries` | ⚠️ Inconsistent | DELETE + INSERT + UPDATE (missing SELECT in some migrations) |
| `daily_questions` | ⚠️ Has 1 policy | Missing CRUD policies |
| `question_responses` | ⚠️ Has 2 policies | Verify full CRUD coverage |
| `whatsapp_messages` | ⚠️ Has SELECT, UPDATE only | Missing INSERT, DELETE |
| `contact_network` | ✅ Has 4 policies | COMPLETE |
| `whatsapp_sync_logs` | ⚠️ Has 1 policy | Missing CRUD policies |

### High Priority Tables (Business Logic)

| Table | Current Status | Required Actions |
|-------|----------------|------------------|
| `work_items` | ✅ Has 4+ policies | COMPLETE |
| `user_achievements` | ❓ Not found in analysis | NEEDS VERIFICATION |
| `user_stats` | ❓ Not found in analysis | NEEDS VERIFICATION |
| `user_consciousness_stats` | ⚠️ Has 2 policies | Verify full CRUD coverage |
| `finance_transactions` | ✅ Has 4 policies | COMPLETE |
| `finance_statements` | ✅ Has 4 policies | COMPLETE |
| `grant_operations` | ✅ Has 4 policies | COMPLETE |
| `task_categories` | ✅ Has 8 policies | COMPLETE |
| `task_projects` | ✅ Has 4 policies | COMPLETE |

---

## 2. FOREIGN KEY ANALYSIS

### Foreign Key DELETE Rule Distribution

Based on 151 foreign keys found:

| DELETE Rule | Typical Behavior |
|-------------|------------------|
| **CASCADE** | Child records deleted when parent deleted |
| **SET NULL** | FK column set to NULL when parent deleted (orphaned records) |
| **RESTRICT** | Prevents deletion of parent if children exist |
| **NO ACTION** | Same as RESTRICT |

### Critical CASCADE Relationships to Review

**User Deletion Impact** (when `users.id` is deleted):

All user_id foreign keys use `ON DELETE CASCADE` which means:
- ✅ `moments` → All user moments deleted (CORRECT)
- ✅ `weekly_summaries` → All summaries deleted (CORRECT)
- ✅ `work_items` → All tasks deleted (CORRECT)
- ✅ `contact_network` → All contacts deleted (CORRECT)
- ✅ `whatsapp_messages` → All messages deleted (CORRECT - privacy)
- ✅ `ai_usage_logs` → All logs deleted (CORRECT - GDPR compliance)

**Association Deletion Impact** (when `associations.id` is deleted):

Many tables use `ON DELETE SET NULL` for `association_id`:
- ⚠️ `contact_network.association_id` → SET NULL (orphaned contacts)
- ⚠️ `work_items.association_id` → Needs verification

**Risk**: Queries that assume `association_id IS NOT NULL` may break.

**Recommendation**: 
1. Audit all queries filtering by `association_id`
2. Add NULL checks where needed
3. Consider adding partial indexes: `WHERE association_id IS NOT NULL`

---

## 3. MISSING RLS POLICIES - PRIORITY LIST

### 🔴 CRITICAL (Fix Immediately)

1. **ai_usage_tracking_errors**
   - Missing: INSERT, UPDATE, DELETE
   - Reason: Tracks AI cost data (financial)

2. **data_deletion_requests**
   - Missing: UPDATE, DELETE
   - Reason: GDPR/LGPD compliance table

3. **daily_questions**
   - Missing: INSERT, UPDATE, DELETE
   - Reason: User personal data

4. **whatsapp_messages**
   - Missing: INSERT, DELETE
   - Reason: Privacy-sensitive communications

5. **whatsapp_sync_logs**
   - Missing: INSERT, UPDATE, DELETE
   - Reason: Sync metadata needs proper access control

### 🟡 HIGH (Fix Before Production)

6. **question_responses**
   - Verify full CRUD coverage
   - Reason: User reflection data

7. **user_consciousness_stats**
   - Verify full CRUD coverage
   - Reason: Gamification tracking

8. **weekly_summaries**
   - Fix inconsistent policies
   - Reason: AI-generated user summaries

---

## 4. RECOMMENDATIONS

### Immediate Actions (This Week)

1. **Run Supabase SQL Queries**:
   - Execute queries from `supabase/audit-queries/phase1-rls-coverage.sql`
   - Execute queries from `supabase/audit-queries/phase1-foreign-keys.sql`
   - Document actual database state (not just migrations)

2. **Create Migrations for Missing Policies**:
   - Start with CRITICAL tables (ai_usage_tracking_errors, data_deletion_requests, etc.)
   - Use template from DATABASE_DIAGNOSTIC_REPORT_ISSUE_73.md Appendix A
   - Each migration must be idempotent

3. **Review Foreign Key Behavior**:
   - Document expected behavior for each CASCADE
   - Verify association deletion doesn't break queries
   - Test soft-delete scenarios

### Migration Naming Convention

```
migrations/20260110_fix_rls_<table_name>.sql
```

Example:
```
migrations/20260110_fix_rls_ai_usage_tracking_errors.sql
migrations/20260110_fix_rls_data_deletion_requests.sql
migrations/20260110_fix_rls_daily_questions.sql
```

### Migration Template

Use the template from DATABASE_DIAGNOSTIC_REPORT_ISSUE_73.md Appendix A:
- Pre-flight checks
- Enable RLS
- Create SECURITY DEFINER functions (if needed)
- Create ALL 4 CRUD policies
- Create triggers
- Create indexes
- Add comments
- Post-flight verification

---

## 5. NEXT STEPS

1. ✅ **Complete this audit** (you are here)
2. ⏳ **Execute SQL queries in Supabase** (manual step via SQL Editor)
3. ⏳ **Generate migration files** for each gap
4. ⏳ **Test migrations in staging**
5. ⏳ **Apply migrations to production** (when ready)

---

## Appendix A: Audit Queries Location

Queries to execute manually in Supabase SQL Editor:

- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\audit-queries\phase1-rls-coverage.sql`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\audit-queries\phase1-foreign-keys.sql`

---

**Report Status**: Draft - Requires manual SQL execution to complete  
**Next Review**: After SQL queries executed  
**Assigned To**: Backend Architect Agent
