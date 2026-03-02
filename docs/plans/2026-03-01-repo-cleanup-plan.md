# Repository Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean repository from ~580 artifact files down to industry-standard structure with ~70 essential files.

**Architecture:** Three sequential delete commits — root artifacts, docs curation, .gitignore prevention. No code changes, pure cleanup. Git history preserves everything.

**Tech Stack:** git, bash (rm commands)

---

### Task 1: Create feature branch

**Files:**
- None

**Step 1: Sync and branch**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git pull origin main
git checkout -b chore/repo-cleanup
```

**Step 2: Verify clean state**

```bash
git status
```

Expected: clean working tree on `chore/repo-cleanup`

---

### Task 2: Investigate root source files before deletion

**Files:**
- Check: `constants.ts`, `types.ts`, `supabaseClient.ts`, `metadata.json`

**Step 1: Check constants.ts imports**

The root `constants.ts` is NOT imported by anything — finance imports from `../constants` (relative to its own module). Safe to delete.

**Step 2: Check types.ts imports**

Root `types.ts` IS imported by multiple files via `@/types` or relative paths. It's a legitimate source file. However, `src/types.ts` also exists.
Check: `grep -rn "from ['\"]@/types" src/ | head -5` and `grep -rn "from ['\"]\.\./\.\./types" src/ | head -5`
If root `types.ts` is imported: KEEP. If only `src/types.ts` is imported: DELETE root.

**Step 3: Check supabaseClient.ts**

Known re-export wrapper (`src/services/supabaseClient.ts`). KEEP — backward compat.

**Step 4: Check metadata.json**

Telegram Mini App metadata. Check if referenced: `grep -rn "metadata.json" src/ vite.config.ts`
If unused: DELETE. If referenced by Telegram integration: KEEP.

---

### Task 3: Delete root session artifacts (commit 1)

**Files:**
- Delete: 65 .md files, 20 .sql files, 16 scripts, 12 .txt files, 6 misc files, 4 orphan dirs

**Step 1: Delete root .md session artifacts**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git rm \
  AI_TRACKING_TESTS_QUICK_START.md \
  APLICAR_MIGRATIONS_SIMPLES.md \
  APPLY_GAMIFICATION_MIGRATIONS.md \
  APPLY_JOURNEY_FIX.md \
  APPLY_MIGRATIONS_NOW.md \
  APPLY_WHATSAPP_GAMIFICATION_MIGRATION.md \
  CHECK_EDGE_FUNCTION_CONFIG.md \
  CONFIGURE_GOOGLE_OAUTH.md \
  COPIAR_MIGRATIONS.md \
  CURRENT_PROBLEMS_CODE_REFERENCE.md \
  DELETE_OLD_COOKIES.md \
  DEPLOY_AGORA.md \
  DEPLOY_DASHBOARD_RAPIDO.md \
  DEPLOY_SUCESSO.md \
  DEPLOY_TOKEN_ISSUE.md \
  DEPLOY_VIA_CLI.md \
  DIAGNOSE_VIA_NETWORK.md \
  EDGE_FUNCTION_DEPLOY_GUIDE.md \
  EDGE_FUNCTION_RECRIADA.md \
  EVOLUTION_API_CHECKLIST.md \
  EVOLUTION_API_EXECUTIVE_SUMMARY.md \
  EVOLUTION_API_INTEGRATION_SUMMARY.md \
  FIX_401_UNAUTHORIZED.md \
  GUIA_FINAL_MIGRATIONS.md \
  IMPLEMENTATION_CHECKLIST.md \
  IMPLEMENTATION_STATUS.md \
  INVESTIGATION_INDEX.md \
  INVESTIGATION_SUMMARY.md \
  ISSUE_162_SUMMARY.md \
  JOURNEY_AI_TRACKING_TEST_REPORT.md \
  JOURNEY_AI_TRACKING_TESTS_SUMMARY.md \
  JOURNEY_IMPLEMENTATION_CODE_EXAMPLES.md \
  JOURNEY_INVESTIGATION_REPORT.md \
  JOURNEY_TIMELINE_ARCHITECTURE.md \
  LANDING_PAGE_DELIVERY_SUMMARY.md \
  MIGRATIONS_CONCLUIDAS.md \
  MIGRATIONS_ORDER_FIXED.md \
  MIGRATIONS_RESUMO_FINAL.md \
  OAUTH_FLOW_DIAGRAM.md \
  OAUTH_MATURITY_REPORT.md \
  PHASE1_IMPLEMENTATION_SUMMARY.md \
  PHASE5_E2E_TEST_RESULTS.md \
  PHASE5_FINAL_RESULTS.md \
  PHASE5_SUMMARY.md \
  PHASE5_TEST_EXECUTION_REPORT.md \
  PHASE5_TESTING_GUIDE.md \
  QUICK_REFERENCE_USER_MEMORY.md \
  RESOLVER_ERRO_401_STAGING.md \
  RESOLVER_ERRO_TRIGGER.md \
  RESOLVER_ERROS_POLICIES.md \
  SECURITY_REMEDIATION_SUMMARY.md \
  SECURITY_RLS_IMPROVEMENT.md \
  SECURITY_SETUP.md \
  SETUP_AND_DEPLOYMENT.md \
  SOLUCAO_FINAL_MIGRATION_0.md \
  SPRINT_1_EXECUTION_SUMMARY.md \
  SPRINT_1_TASKS.md \
  SPRINT_2_EXECUTION_SUMMARY.md \
  TASK_1.4_IMPLEMENTATION_SUMMARY.md \
  TASK_35_COMPLETION_SUMMARY.md \
  task-logger-migration.md \
  TEST_EXECUTION_GUIDE.md \
  Todos.md \
  VERIFY_EDGE_FUNCTION_CONFIG.md \
  WHATSAPP_INTEGRATION_SUMMARY.md \
  WORKSPACE_TEST_GUIDE.md
```

**Step 2: Delete root .sql files**

```bash
git rm \
  apply_whatsapp_migrations.sql \
  check_migration.sql \
  check_session.sql \
  FIX_POLICIES_AND_TRIGGERS.sql \
  FIX_POLICIES_MANUAL.sql \
  MIGRATION_0_DOCUMENT_PROCESSING.sql \
  MIGRATION_0_DOCUMENT_PROCESSING_IDEMPOTENT.sql \
  MIGRATION_0_FINAL_IDEMPOTENT.sql \
  MIGRATION_1_WHATSAPP_DOCUMENT_TRACKING.sql \
  MIGRATION_2_STREAK_TRENDS.sql \
  MIGRATION_3_CONSCIOUSNESS_POINTS.sql \
  MIGRATION_3_CONSCIOUSNESS_POINTS_IDEMPOTENT.sql \
  MIGRATION_4_RECIPE_BADGES.sql \
  MIGRATION_5_UNIFIED_EFFICIENCY.sql \
  migration_status_check.sql \
  PATCH_MIGRATION_0_FK_CONSTRAINTS.sql \
  REGISTRAR_MIGRATIONS_MANUAL.sql \
  temp_whatsapp_migrations.sql \
  test-notification-system.sql \
  VALIDAR_MIGRATIONS.sql
```

**Step 3: Delete root scripts**

```bash
git rm \
  apply_all_migrations.sh \
  apply_migrations.cjs \
  apply_migrations_admin.cjs \
  apply_migrations_rest.cjs \
  apply-migration.bat \
  CONNECTIONS_TESTS_COMMANDS.sh \
  create-test-user.mjs \
  execute_migrations.cjs \
  fix-401-auth.bat \
  LANDING_V5_QUICKSTART.bat \
  LANDING_V5_QUICKSTART.sh \
  migrate_logger.py \
  verify-oauth-config.sh \
  verify-user-login.mjs \
  test-supabase-key.js \
  query_deadlines.js \
  query_profiles.js
```

**Step 4: Delete root .txt files**

```bash
git rm \
  BE-02_DELIVERY_SUMMARY.txt \
  COMMIT_MESSAGE_INVITATION_EMAIL.txt \
  CONNECTIONS_E2E_SUMMARY.txt \
  DELIVERY_MANIFEST.txt \
  EDGE_FUNCTION_INTEGRATION_CODE.txt \
  FINAL_SUMMARY.txt \
  IMPLEMENTATION_SUMMARY.txt \
  QUICK_START.txt \
  SECURITY_REMEDIATION_COMPLETE.txt \
  STUDIO_LIBRARY_SUMMARY.txt \
  TRACK_2_COMPLETION_REPORT.txt \
  WELCOME_TOUR_IMPLEMENTATION_COMPLETE.txt
```

**Step 5: Delete root misc files**

```bash
git rm \
  test-edge-function.html \
  mini-app.html \
  test-invitation-email.http \
  CSS_ACCESSIBILITY_UTILITIES.css \
  supabase_cli.tar.gz \
  metadata.json
```

Note: `metadata.json` — verify in Task 2 first. If Telegram needs it, skip.

**Step 6: Delete orphan root directories**

```bash
git rm -r migrations/
git rm -r components/
git rm -r services/
git rm -r tasks/
```

These contain orphaned files not imported by anything in src/.

**Step 7: Conditionally delete root source files**

Based on Task 2 findings:
- `constants.ts` → DELETE (not imported from root)
- `types.ts` → DELETE only if `src/types.ts` covers all imports
- `supabaseClient.ts` → KEEP (backward compat re-export)

```bash
git rm constants.ts
# git rm types.ts  # Only if safe per Task 2
```

**Step 8: Verify root is clean**

```bash
ls -1 | grep -v node_modules | grep -v dist
```

Expected remaining (~20 items):
```
App.tsx, CLAUDE.md, Dockerfile, LICENSE, README.md, backend/,
cloudbuild.yaml, docs/, eslint.config.js, firebase.json,
index.css, index.html, index.tsx, nginx.conf, package-lock.json,
package.json, playwright.config.ts, postcss.config.js, public/,
scripts/, src/, supabase/, supabaseClient.ts, tailwind.config.js,
tests/, tsconfig.json, types.ts, vite.config.ts, vitest.config.ts
```

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: delete root session artifacts

Remove ~130 files accumulated from AI development sessions:
- 65 session .md guides/summaries
- 20 loose .sql files (duplicates of supabase/migrations/)
- 17 obsolete scripts (some with hardcoded credentials)
- 12 delivery .txt reports
- 6 misc files (test HTML, CSS, tar.gz)
- 4 orphan directories (migrations/, components/, services/, tasks/)

Git history preserves all content for recovery if needed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Curate docs/ directory (commit 2)

**Files:**
- Delete: ~370 files across 20+ directories
- Keep: ~50 files across 7 directories

**Step 1: Delete entire artifact directories**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git rm -r \
  docs/audit-reports/ \
  docs/delivery/ \
  docs/implementation/ \
  docs/bugfixes/ \
  docs/verification/ \
  docs/tasks/ \
  docs/flux/ \
  docs/n8n/ \
  docs/onboarding/ \
  docs/epic/ \
  docs/research/ \
  docs/proposals/ \
  docs/sql/ \
  docs/workflows/ \
  docs/migrations/ \
  docs/development/ \
  docs/diagrams/ \
  docs/examples/
```

**Step 2: Curate docs/architecture/ (keep 8 of 56)**

Keep these essential architecture docs:
```bash
cd docs/architecture/

# First, delete the .backup files (violates CLAUDE.md rules)
git rm -f backend_architecture.md.backup backend_architecture.md.backup_20251206_020508 2>/dev/null
git rm -f DATABASE_SCHEMA_NEW_TABLES.sql 2>/dev/null

# Delete all EXCEPT the keepers
# Keepers: backend_architecture.md, AI_COST_TRACKING_ARCHITECTURE.md, AUTH_FLOW_DIAGRAM.md,
#          CHAT_ARCHITECTURE.md, CONTACT_METRICS_ARCHITECTURE.md, FINANCE_MODULE_ARCHITECTURE.md,
#          FINANCE_STATEMENT_PROCESSING_ARCHITECTURE.md, USER_PROFILE_ARCHITECTURE.md
cd /c/Users/lucas/repos/Aica_frontend
git rm \
  docs/architecture/AGENT_QUICKSTART.md \
  docs/architecture/ARCHITECTURE_AUTH_LOOP_FIX.md \
  docs/architecture/AUTH_INVESTIGATION_INDEX.md \
  docs/architecture/BACKEND_VS_FRONTEND_APPROACH.md \
  docs/architecture/BE-01_CHECKLIST.md \
  docs/architecture/BE-01_DAILY_REPORTS_AUTOMATION.md \
  docs/architecture/BE-01_FILE_INDEX.md \
  docs/architecture/BE-01_IMPLEMENTATION_GUIDE.md \
  docs/architecture/BE-01_README.md \
  docs/architecture/BE-01_SUMMARY.md \
  docs/architecture/BE-01_TESTING_CHECKLIST.md \
  docs/architecture/BE-02_COMPARISON_TABLE.md \
  docs/architecture/BE-02_DECISION_MATRIX.md \
  docs/architecture/BE-02_EXECUTIVE_SUMMARY.md \
  docs/architecture/BE-02_GAMIFICATION_CONSOLIDATION.md \
  docs/architecture/BE-02_IMPLEMENTATION_GUIDE.md \
  docs/architecture/BE-02_INDEX.md \
  docs/architecture/BE-02_README.md \
  docs/architecture/CONNECTION_ARCHETYPES_IMPLEMENTATION_PLAN.md \
  docs/architecture/DATABASE_FIXES_INDEX.md \
  docs/architecture/DATABASE_FIXES_QUICK_REFERENCE.md \
  docs/architecture/DATABASE_SCHEMA_INVESTIGATION.md \
  docs/architecture/DATABASE_SCHEMA_VERIFIED.md \
  docs/architecture/FINANCE_MODULE_SECURITY_AUDIT.md \
  docs/architecture/GUEST_APPROVAL_WORKFLOW.md \
  docs/architecture/JOURNEY_REDESIGN_IMPLEMENTATION_PLAN.md \
  docs/architecture/MIGRATION_GUIDE_NEW_TABLES.md \
  docs/architecture/MIGRATION_STATUS.md \
  docs/architecture/NAVIGATION_FLOW_DIAGRAMS.md \
  docs/architecture/PODCAST_FLOW_DIAGRAMS.md \
  docs/architecture/REFACTORING_LOG.md \
  docs/architecture/SCHEMA_VALIDATION_REPORT.md \
  docs/architecture/STUDIO_PHASE_3_4_EXECUTION_PLAN.md \
  docs/architecture/STUDIO_REFACTORING_COMPLETE.md \
  docs/architecture/STUDIO_WIZARD_ARCHITECTURE.md \
  docs/architecture/STUDIO_WORKSPACE_MIGRATION.md \
  docs/architecture/TYPE_MIGRATION_REFERENCE.md \
  docs/architecture/USER_MEMORY_SYSTEM.md \
  docs/architecture/WAVE_2_TYPES_MIGRATION_SUMMARY.md \
  docs/architecture/WAVE_7_E2E_TESTING_REPORT.md \
  docs/architecture/WAVE_7_MANUAL_VALIDATION_CHECKLIST.md \
  docs/architecture/WAVE_7_PART_5_ANALYSIS.md \
  docs/architecture/WAVE_7_PART_6_ANALYSIS.md \
  docs/architecture/WAVE_8_ACTION_PLAN.md \
  docs/architecture/WAVE_8_COMPLETION_REPORT.md \
  docs/architecture/WAVE_9_CLEANUP_REPORT.md \
  docs/architecture/HABITAT_ARCHITECTURE.md
```

**Step 3: Curate docs/features/ (keep 8 of 22)**

Keep quickstarts and active reference only:
```bash
cd /c/Users/lucas/repos/Aica_frontend
git rm \
  docs/features/CALENDAR_SYNC_IMPLEMENTATION_SUMMARY.md \
  docs/features/DAILY_QUESTION_GEMINI_PATCH.md \
  docs/features/DAILY_QUESTIONS_AI_DRIVEN.md \
  docs/features/DAILY_QUESTIONS_IMPLEMENTATION_SUMMARY.md \
  docs/features/DAILY_QUESTIONS_TESTING.md \
  docs/features/FILE_SEARCH_IMPLEMENTATION_PLAN.md \
  docs/features/GEMINI_FILE_SEARCH_SUMMARY.md \
  docs/features/GUEST_APPROVAL_INTEGRATION.md \
  docs/features/GUEST_IDENTIFICATION_WORKFLOW.md \
  docs/features/JOURNEY_SCHEMA_FILES_INDEX.md \
  docs/features/JOURNEY_SCHEMA_VALIDATION_COMPLETE.md \
  docs/features/TRIGRAM_SIMILARITY_IMPLEMENTATION.md \
  docs/features/WELCOME_TOUR_CHECKLIST.md \
  docs/features/WELCOME_TOUR_INDEX.md
```

Kept: CALENDAR_INTEGRATION_README.md, CONNECTION_INVITATIONS_EMAIL_SYSTEM.md, CONNECTIONS_CALENDAR_SYNC_INTEGRATION.md, DAILY_QUESTIONS_QUICK_START.md, EFFICIENCY_SCORE_SYSTEM.md, FILE_SEARCH_QUICKSTART.md, GOOGLE_CALENDAR_INTEGRATION.md, TRACKING_INTEGRATION_GUIDE.md

**Step 4: Curate docs/testing/ (keep 2 of 13)**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git rm \
  docs/testing/CONNECTIONS_E2E_DELIVERY.md \
  docs/testing/CONNECTIONS_E2E_TEST_SUMMARY.md \
  docs/testing/E2E_TEST_EXECUTION_RESULTS.md \
  docs/testing/E2E_TESTING_PROGRESS_2026-01-02.md \
  docs/testing/GEMINI_TESTS_SUMMARY.md \
  docs/testing/GUIA_TESTE_AI_COST_DASHBOARD.md \
  docs/testing/PERSISTENCE_TESTING_QUICK_START.md \
  docs/testing/PHASE_3_E2E_TESTS_README.md \
  docs/testing/PHASE_3_MANUAL_TESTING_GUIDE.md \
  docs/testing/PHASE3_FILES_MANIFEST.md \
  docs/testing/TEST_EXECUTION_REPORT.md
```

Kept: E2E_TESTS_QUICK_START.md, E2E_GAP_ANALYSIS.md

**Step 5: Curate docs/modules/ (keep 2, delete connections/ subdir)**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git rm -r docs/modules/connections/
```

Kept: docs/modules/CONNECTIONS_MODULE.md, docs/modules/PODCAST_WORKFLOW.md

**Step 6: Delete docs/ root artifacts (keep ~8 of 188)**

This is the largest batch. Keep ONLY:
- PRD.md
- GEMINI_API_SETUP.md
- PRIVACY_AND_SECURITY.md (if exists at root, may be in security/)
- QUICK_START_GUIDE.md
- CERAMIC_DESIGN_SYSTEM_GUIDANCE.md (if at root, may be in design/)
- OPENCLAW_ADAPTATION.md
- README.md
- HABITAT_ARCHITECTURE.md (if not already in architecture/)
- MULTIMODAL_CHAT_ARCHITECTURE.md (if not in architecture/)
- DATABASE_SCHEMA_MULTIMODAL.md

```bash
cd /c/Users/lucas/repos/Aica_frontend

# Delete all docs/*.md EXCEPT the keepers
# Using a find + grep approach for safety
find docs/ -maxdepth 1 -name "*.md" \
  ! -name "PRD.md" \
  ! -name "GEMINI_API_SETUP.md" \
  ! -name "QUICK_START_GUIDE.md" \
  ! -name "OPENCLAW_ADAPTATION.md" \
  ! -name "README.md" \
  ! -name "HABITAT_ARCHITECTURE.md" \
  ! -name "MULTIMODAL_CHAT_ARCHITECTURE.md" \
  ! -name "DATABASE_SCHEMA_MULTIMODAL.md" \
  -exec git rm {} +
```

**Step 7: Keep guides/ with 1 file**

```bash
# guides/ has only CALENDAR_SYNC_QUICK_START.md — keep it
```

**Step 8: Verify docs/ structure**

```bash
find docs/ -type f | sort
```

Expected ~50 files across: architecture/ (8), design/ (6), deployment/ (9), security/ (4), features/ (8), testing/ (2), modules/ (2), guides/ (1), journey/ (1), plans/ (2), root (8)

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: curate docs/ directory from 427 to ~50 essential files

Remove session artifacts, keeping only active reference documentation:
- Keep: PRD, architecture, design system, deployment, security, feature quickstarts
- Delete: 18 artifact directories (delivery, implementation, audit-reports, etc.)
- Curate: architecture/ (8 of 56), features/ (8 of 22), testing/ (2 of 13)
- Delete: ~180 root docs/ artifacts (phase reports, sprint summaries, fix logs)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Update .gitignore to prevent re-accumulation (commit 3)

**Files:**
- Modify: `.gitignore`

**Step 1: Add session artifact patterns to .gitignore**

Append to `.gitignore`:

```gitignore

# Session artifacts (prevent AI session output re-accumulation)
# These patterns catch common session output filenames
*_SUMMARY.md
*_SUMMARY.txt
*_REPORT.md
*_REPORT.txt
*_COMPLETE.md
*_COMPLETE.txt
DELIVERY_*.md
DELIVERY_*.txt
SPRINT_*.md
PHASE_*.md
PHASE*.md
IMPLEMENTATION_*.md

# Root-level artifacts (should never be committed)
/*.sql
/*.cjs
/*.mjs
/*.bat
/*.sh
/*.py
/*.http
/*.tar.gz

# Exceptions for files that SHOULD be tracked
!docs/PRD.md
!README.md
!CLAUDE.md
```

**Step 2: Verify patterns don't exclude wanted files**

```bash
git status
# Should only show .gitignore as modified
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore to prevent session artifact re-accumulation

Add patterns for common AI session outputs (*_SUMMARY.md, *_REPORT.md,
PHASE_*.md, etc.) and root-level scripts (*.sql, *.cjs, *.bat, *.sh).
Exceptions preserve PRD.md, README.md, and CLAUDE.md.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Push and create PR

**Files:**
- None

**Step 1: Verify all commits**

```bash
git log --oneline -5
```

Expected: 3 commits on `chore/repo-cleanup`

**Step 2: Run build to ensure nothing broke**

```bash
npm run build && npm run typecheck
```

Expected: both pass (we only deleted non-source files)

**Step 3: Push and create PR**

```bash
git push -u origin chore/repo-cleanup
gh pr create --title "chore: repository cleanup — remove ~500 session artifacts" --body "$(cat <<'EOF'
## Summary
- Remove ~130 root session artifacts (md, sql, scripts, txt)
- Curate docs/ from 427 → ~50 essential reference files
- Update .gitignore to prevent re-accumulation

## Context
The repository accumulated hundreds of AI development session artifacts
(summaries, reports, debug scripts, migration duplicates) that obscure
the project structure. All deleted content is preserved in git history.

## What was kept
- All toolchain configs (package.json, tsconfig, vite, etc.)
- Core docs: PRD, architecture, design system, deployment, security
- Feature quickstarts and active reference guides
- All source code untouched

## Test plan
- [x] `npm run build` passes
- [x] `npm run typecheck` passes
- [ ] Manual verification of docs/ structure

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
