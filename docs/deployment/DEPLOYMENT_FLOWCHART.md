# Journey Redesign - Deployment Flowchart

Visual guide for the deployment process.

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRE-DEPLOYMENT                              │
│                                                                  │
│  1. Read Documentation                                          │
│     ├─ QUICK_START_DEPLOYMENT.md (10 min)                       │
│     └─ DEPLOYMENT_SUMMARY.md (20 min)                           │
│                                                                  │
│  2. Verify Prerequisites                                         │
│     ├─ Supabase CLI installed ✓                                 │
│     ├─ Authenticated to Supabase ✓                              │
│     ├─ Project linked ✓                                         │
│     └─ Gemini API key ready ✓                                   │
│                                                                  │
│  3. Review Migration                                             │
│     └─ supabase/migrations/20251206_journey_redesign.sql        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: DATABASE MIGRATION                    │
│                                                                  │
│  Command: npx supabase db push                                  │
│                                                                  │
│  Creates:                                                        │
│  ├─ 6 Tables                                                    │
│  │  ├─ moments                                                   │
│  │  ├─ weekly_summaries                                         │
│  │  ├─ daily_questions                                          │
│  │  ├─ question_responses                                       │
│  │  ├─ consciousness_points_log                                 │
│  │  └─ user_consciousness_stats                                 │
│  │                                                              │
│  ├─ 4 Functions                                                 │
│  │  ├─ calculate_cp_level                                       │
│  │  ├─ award_consciousness_points                               │
│  │  ├─ update_moment_streak                                     │
│  │  └─ update_updated_at_column                                 │
│  │                                                              │
│  ├─ 15+ RLS Policies                                            │
│  │  └─ User data isolation across all tables                    │
│  │                                                              │
│  ├─ 8+ Performance Indexes                                      │
│  │  └─ Optimized for common query patterns                      │
│  │                                                              │
│  └─ 10 Seeded Questions                                         │
│     └─ Daily reflection question pool                           │
│                                                                  │
│  Expected: "Migration applied successfully"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                STEP 2: VALIDATE DATABASE MIGRATION               │
│                                                                  │
│  Run: supabase/validation/post_deployment_validation.sql        │
│                                                                  │
│  Checks:                                                         │
│  ├─ ✓ Tables created (6/6)                                      │
│  ├─ ✓ Functions created (4/4)                                   │
│  ├─ ✓ RLS enabled (6/6 tables)                                  │
│  ├─ ✓ Policies created (15+)                                    │
│  ├─ ✓ Indexes created (8+)                                      │
│  ├─ ✓ Triggers configured (2)                                   │
│  ├─ ✓ Questions seeded (10)                                     │
│  └─ ✓ Constraints enforced                                      │
│                                                                  │
│  Expected: "ALL CRITICAL VALIDATIONS PASSED"                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 3: CREATE STORAGE BUCKET                   │
│                                                                  │
│  Option A: Via Supabase Dashboard                               │
│  ├─ Navigate to Storage → New Bucket                            │
│  ├─ Name: moments-audio                                         │
│  ├─ Public: Yes ✓                                               │
│  └─ File size limit: 10 MB                                      │
│                                                                  │
│  Option B: Via SQL                                              │
│  └─ Run: supabase/setup/storage_bucket_setup.sql                │
│                                                                  │
│  Creates:                                                        │
│  ├─ Bucket: moments-audio                                       │
│  └─ 4 RLS Policies                                              │
│     ├─ Users can upload own audio                               │
│     ├─ Users can read own audio                                 │
│     ├─ Users can update own audio                               │
│     └─ Users can delete own audio                               │
│                                                                  │
│  Expected: Bucket created and secured                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 4: SET ENVIRONMENT SECRETS                 │
│                                                                  │
│  Check if secret exists:                                         │
│  Command: npx supabase secrets list | grep GEMINI_API_KEY       │
│                                                                  │
│  If missing, set it:                                             │
│  Command: npx supabase secrets set GEMINI_API_KEY=<key>         │
│                                                                  │
│  Expected: Secret configured                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 STEP 5: DEPLOY EDGE FUNCTION                     │
│                                                                  │
│  Command: npx supabase functions deploy gemini-chat             │
│                                                                  │
│  Deploys:                                                        │
│  └─ supabase/functions/gemini-chat/index.ts                     │
│                                                                  │
│  New Actions:                                                    │
│  ├─ analyze_moment_sentiment                                    │
│  │  ├─ AI sentiment analysis                                    │
│  │  ├─ Emotion detection (up to 5)                              │
│  │  ├─ Trigger identification (up to 3)                         │
│  │  └─ Energy level calculation (0-100)                         │
│  │                                                              │
│  └─ generate_weekly_summary                                     │
│     ├─ Emotional trend analysis                                 │
│     ├─ Dominant emotions (3-5)                                  │
│     ├─ Key moment highlights (3-5)                              │
│     ├─ Insights generation (3-5)                                │
│     └─ Focus suggestion                                         │
│                                                                  │
│  Preserved Actions:                                              │
│  ├─ finance_chat (backward compatible)                          │
│  └─ Legacy chat interface                                        │
│                                                                  │
│  Expected: Function URL returned                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 6: TEST EDGE FUNCTION                      │
│                                                                  │
│  Windows:                                                        │
│  Command: .\supabase\tests\edge_function_tests.ps1              │
│                                                                  │
│  Linux/Mac:                                                      │
│  Command: bash supabase/tests/edge_function_tests.sh            │
│                                                                  │
│  Tests (7 total):                                                │
│  ├─ ✓ Positive sentiment analysis                               │
│  ├─ ✓ Negative sentiment analysis                               │
│  ├─ ✓ Neutral sentiment analysis                                │
│  ├─ ✓ Weekly summary generation                                 │
│  ├─ ✓ Error handling - missing content                          │
│  ├─ ✓ Error handling - invalid action                           │
│  └─ ✓ Legacy chat backward compatibility                        │
│                                                                  │
│  Expected: "ALL TESTS PASSED (7/7)"                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 7: FINAL VERIFICATION                    │
│                                                                  │
│  Use: DEPLOYMENT_CHECKLIST.md                                   │
│                                                                  │
│  Verify:                                                         │
│  ├─ ✓ Database (19 checkpoints)                                 │
│  │  ├─ Migration applied                                        │
│  │  ├─ Tables created correctly                                 │
│  │  ├─ RLS enabled and policies working                         │
│  │  ├─ Functions tested                                         │
│  │  └─ Seed data loaded                                         │
│  │                                                              │
│  ├─ ✓ Storage (5 checkpoints)                                   │
│  │  ├─ Bucket created                                           │
│  │  ├─ RLS policies configured                                  │
│  │  └─ Access controls tested                                   │
│  │                                                              │
│  ├─ ✓ Edge Function (6 checkpoints)                             │
│  │  ├─ Function deployed                                        │
│  │  ├─ Secrets configured                                       │
│  │  ├─ Sentiment analysis working                               │
│  │  ├─ Weekly summary working                                   │
│  │  └─ Error handling correct                                   │
│  │                                                              │
│  └─ ✓ Testing (7 checkpoints)                                   │
│     ├─ All automated tests pass                                 │
│     ├─ Manual tests successful                                  │
│     └─ End-to-end flow validated                                │
│                                                                  │
│  Expected: All 37 checkpoints ✓                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT COMPLETE                       │
│                                                                  │
│  Status: ✓ SUCCESSFUL                                           │
│                                                                  │
│  Deployed Components:                                            │
│  ├─ 6 database tables                                           │
│  ├─ 4 PostgreSQL functions                                      │
│  ├─ 15+ RLS policies                                            │
│  ├─ 1 storage bucket                                            │
│  ├─ 2 new Edge Function actions                                 │
│  └─ 10 seeded daily questions                                   │
│                                                                  │
│  Next Steps:                                                     │
│  ├─ Monitor Edge Function logs                                  │
│  ├─ Check database query performance                            │
│  ├─ Validate with test users                                    │
│  └─ Document any issues                                         │
│                                                                  │
│  Sign-off: DEPLOYMENT_CHECKLIST.md                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Decision Tree: Which Documentation to Use?

```
START: Need to deploy Journey Redesign?
│
├─ Are you experienced with Supabase?
│  ├─ YES → Use QUICK_START_DEPLOYMENT.md
│  │         ├─ Time: 10 minutes
│  │         └─ Commands only, minimal explanation
│  │
│  └─ NO → Use docs/DEPLOYMENT_INSTRUCTIONS_20251206.md
│            ├─ Time: 45 minutes (15 min read, 30 min execute)
│            └─ Full step-by-step with explanations
│
├─ Need to track deployment progress?
│  └─ Use DEPLOYMENT_CHECKLIST.md
│     ├─ 37 interactive checkpoints
│     └─ Sign-off section
│
├─ Need to understand architecture?
│  └─ Use DEPLOYMENT_SUMMARY.md
│     ├─ Schema details
│     ├─ API reference
│     └─ Security analysis
│
├─ Need complete package overview?
│  └─ Use DEPLOYMENT_REPORT.md
│     ├─ All deliverables
│     ├─ Technical specs
│     └─ Risk assessment
│
└─ Can't find what you need?
   └─ Use DEPLOYMENT_INDEX.md
      └─ Navigation guide to all docs
```

---

## Rollback Flow (Emergency)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ISSUE DETECTED                           │
│                                                                  │
│  Examples:                                                       │
│  ├─ Migration failed                                            │
│  ├─ Edge Function errors                                        │
│  ├─ RLS blocking legitimate access                              │
│  └─ Data corruption                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ASSESS SEVERITY                             │
│                                                                  │
│  Minor Issues (can wait):                                        │
│  ├─ Single test failure                                         │
│  ├─ Performance slower than expected                            │
│  └─ Non-critical feature not working                            │
│  → Fix forward, don't rollback                                  │
│                                                                  │
│  Major Issues (rollback needed):                                 │
│  ├─ Migration corrupted existing data                           │
│  ├─ Edge Function completely broken                             │
│  ├─ RLS leaking user data                                       │
│  └─ Production app unusable                                     │
│  → Proceed to rollback                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ROLLBACK: EDGE FUNCTION                        │
│                                                                  │
│  1. Checkout previous version:                                  │
│     git checkout <previous-commit>                               │
│                                                                  │
│  2. Redeploy:                                                    │
│     npx supabase functions deploy gemini-chat                   │
│                                                                  │
│  3. Verify:                                                      │
│     Test function with legacy action                            │
│                                                                  │
│  4. Return to main:                                              │
│     git checkout main                                            │
│                                                                  │
│  Time: 2-3 minutes                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ROLLBACK: STORAGE BUCKET                       │
│                                                                  │
│  Run cleanup from:                                               │
│  supabase/setup/storage_bucket_setup.sql (section 7)            │
│                                                                  │
│  DROP POLICY IF EXISTS "Users can upload own audio" ...         │
│  DROP POLICY IF EXISTS "Users can read own audio" ...           │
│  DROP POLICY IF EXISTS "Users can update own audio" ...         │
│  DROP POLICY IF EXISTS "Users can delete own audio" ...         │
│  DELETE FROM storage.buckets WHERE name = 'moments-audio';      │
│                                                                  │
│  Time: 1 minute                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ROLLBACK: DATABASE MIGRATION                   │
│                                                                  │
│  DEVELOPMENT ONLY:                                               │
│  Command: npx supabase db reset                                 │
│  WARNING: Deletes all data!                                      │
│                                                                  │
│  PRODUCTION (safer):                                             │
│  Run manual cleanup:                                             │
│                                                                  │
│  DROP TABLE IF EXISTS consciousness_points_log CASCADE;         │
│  DROP TABLE IF EXISTS question_responses CASCADE;               │
│  DROP TABLE IF EXISTS weekly_summaries CASCADE;                 │
│  DROP TABLE IF EXISTS moments CASCADE;                          │
│  DROP TABLE IF EXISTS user_consciousness_stats CASCADE;         │
│  DROP TABLE IF EXISTS daily_questions CASCADE;                  │
│                                                                  │
│  DROP FUNCTION IF EXISTS update_moment_streak(UUID);            │
│  DROP FUNCTION IF EXISTS award_consciousness_points(...);       │
│  DROP FUNCTION IF EXISTS calculate_cp_level(INT);               │
│  DROP FUNCTION IF EXISTS update_updated_at_column();            │
│                                                                  │
│  Time: 2-3 minutes                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ROLLBACK COMPLETE                           │
│                                                                  │
│  Verify:                                                         │
│  ├─ ✓ Edge Function working (old version)                       │
│  ├─ ✓ Storage bucket removed                                    │
│  ├─ ✓ New tables dropped                                        │
│  └─ ✓ App functioning normally                                  │
│                                                                  │
│  Post-Rollback:                                                  │
│  ├─ Document what went wrong                                    │
│  ├─ Fix issues in code                                          │
│  ├─ Test fixes thoroughly                                       │
│  └─ Redeploy when ready                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Relationships

```
DEPLOYMENT_INDEX.md (Navigation Hub)
        │
        ├─────────────────────────┬────────────────────────┬─────────────────┐
        │                         │                        │                 │
    Quick Start            Full Guide              Architecture        Complete Report
        │                         │                        │                 │
        v                         v                        v                 v
QUICK_START_         DEPLOYMENT_               DEPLOYMENT_        DEPLOYMENT_
DEPLOYMENT.md        INSTRUCTIONS_              SUMMARY.md         REPORT.md
                     20251206.md
                            │
                            │ references
                            │
        ┌───────────────────┴──────────────────┐
        │                                      │
        v                                      v
Interactive Checklist                 Validation Scripts
        │                                      │
        v                                      v
DEPLOYMENT_                          post_deployment_
CHECKLIST.md                         validation.sql
                                             │
                                             │ validates
                                             │
        ┌────────────────────────────────────┴─────────────────┐
        │                                                       │
        v                                                       v
Core Migration                                          Edge Function
        │                                                       │
        v                                                       v
20251206_journey_                                    gemini-chat/
redesign.sql                                         index.ts
        │                                                       │
        │ creates                                               │ tested by
        │                                                       │
        v                                                       v
6 Tables                                              Test Suites
4 Functions                                                 │
15+ RLS Policies                                            │
                                                            v
                                               edge_function_tests.ps1
                                               edge_function_tests.sh
```

---

## Time Estimates by Path

### Path 1: Express Deployment (10 minutes)
```
Read QUICK_START_DEPLOYMENT.md (2 min)
  ↓
Apply migration (1 min)
  ↓
Create storage bucket (1 min)
  ↓
Deploy Edge Function (2 min)
  ↓
Quick validation (4 min)
  ↓
DONE
```

### Path 2: Standard Deployment (45 minutes)
```
Read DEPLOYMENT_INSTRUCTIONS (15 min)
  ↓
Apply migration (2 min)
  ↓
Validate database (5 min)
  ↓
Create storage bucket (3 min)
  ↓
Deploy Edge Function (3 min)
  ↓
Run full test suite (10 min)
  ↓
Complete checklist (7 min)
  ↓
DONE
```

### Path 3: Comprehensive Review (2 hours)
```
Read DEPLOYMENT_SUMMARY (20 min)
  ↓
Read DEPLOYMENT_REPORT (30 min)
  ↓
Review migration SQL (15 min)
  ↓
Review Edge Function code (15 min)
  ↓
Apply migration (2 min)
  ↓
Validate thoroughly (15 min)
  ↓
Test manually + automated (15 min)
  ↓
Document findings (8 min)
  ↓
DONE
```

---

**Flowchart Version**: 1.0
**Created**: 2025-12-06
**Maintained By**: Backend Architect Agent
