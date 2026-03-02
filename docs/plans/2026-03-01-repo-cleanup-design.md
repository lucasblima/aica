# Repository Cleanup Design — `chore-repo-cleanup`

**Date:** 2026-03-01
**Session:** chore-repo-cleanup
**Status:** Approved

## Problem

The repository accumulated ~135 session artifacts in root (68 .md, 20 .sql, 31 scripts, 11 .txt) and 427 docs across 32 subdirectories. Most are one-time session outputs (summaries, reports, debug scripts) that obscure the actual project structure and don't match industry-standard repo organization.

## Goals

1. Clean root to ~20 files (configs + entry points only)
2. Curate docs/ from 427 → ~50 essential reference files across 6 directories
3. Prevent re-accumulation via .gitignore rules

## Decision: Delete vs Archive

**Delete from repo.** Git history preserves everything. No archive/ directory needed.

## Root Cleanup (~133 files to delete)

### DELETE: Session .md files (68)

All SCREAMING_CASE .md files in root are session artifacts:
- Deploy guides: DEPLOY_AGORA.md, DEPLOY_SUCESSO.md, DEPLOY_VIA_CLI.md, etc.
- Fix guides: FIX_401_UNAUTHORIZED.md, RESOLVER_ERRO_401_STAGING.md, etc.
- Migration guides: APPLY_MIGRATIONS_NOW.md, GUIA_FINAL_MIGRATIONS.md, etc.
- Sprint/phase docs: SPRINT_1_TASKS.md, PHASE1_IMPLEMENTATION_SUMMARY.md, etc.
- Investigation docs: INVESTIGATION_INDEX.md, JOURNEY_INVESTIGATION_REPORT.md, etc.

### DELETE: SQL files (20)

| File | Reason |
|------|--------|
| MIGRATION_0_*.sql (3 variants) | Duplicate of 20260112000001 |
| MIGRATION_2_STREAK_TRENDS.sql | Duplicate of 20260123000000 |
| MIGRATION_3_*.sql (2 variants) | Duplicate of 20260124000000 |
| MIGRATION_4_RECIPE_BADGES.sql | Duplicate of 20260125000000 |
| MIGRATION_5_UNIFIED_EFFICIENCY.sql | Duplicate of 20260126000002 |
| check_migration.sql, check_session.sql | Debug queries |
| migration_status_check.sql, VALIDAR_MIGRATIONS.sql | Validation queries |
| FIX_POLICIES_*.sql (2) | One-time repair |
| PATCH_MIGRATION_0_FK_CONSTRAINTS.sql | One-time patch |
| REGISTRAR_MIGRATIONS_MANUAL.sql | Manual registration |
| apply_whatsapp_migrations.sql | Consolidated; covered by supabase/migrations/ |
| temp_whatsapp_migrations.sql | Temporary consolidation |
| test-notification-system.sql | Test script |
| MIGRATION_1_WHATSAPP_DOCUMENT_TRACKING.sql | Covered by existing migrations |

### DELETE: Scripts (18+)

- apply_migrations.cjs, apply_migrations_admin.cjs, apply_migrations_rest.cjs, execute_migrations.cjs — obsolete migration runners (some with hardcoded credentials)
- apply_all_migrations.sh, apply-migration.bat — duplicated in scripts/
- CONNECTIONS_TESTS_COMMANDS.sh — test aliases (covered by package.json)
- LANDING_V5_QUICKSTART.sh, LANDING_V5_QUICKSTART.bat — feature-specific setup
- fix-401-auth.bat — one-time troubleshooting
- verify-oauth-config.sh, verify-user-login.mjs — one-time verification
- create-test-user.mjs — hardcoded test user creator
- test-supabase-key.js — hardcoded key validator
- query_deadlines.js, query_profiles.js — debug queries
- migrate_logger.py — one-time refactoring tool

### DELETE: Other files

- 11 .txt files (delivery summaries, completion reports)
- test-edge-function.html, mini-app.html, test-invitation-email.http
- CSS_ACCESSIBILITY_UTILITIES.css
- supabase_cli.tar.gz
- metadata.json

### KEEP in root (~20 files)

- Toolchain configs: package.json, package-lock.json, tsconfig.json, vite.config.ts, vitest.config.ts, tailwind.config.js, postcss.config.js, eslint.config.js, playwright.config.ts
- Deploy: Dockerfile, cloudbuild.yaml, firebase.json, nginx.conf
- Docs: README.md, CLAUDE.md, LICENSE
- Entry points: index.html, index.tsx, index.css, App.tsx
- Source directories: src/, supabase/, public/, tests/, scripts/, backend/, docs/

### INVESTIGATE before deciding

- constants.ts — check if imported anywhere
- types.ts — check if imported from root
- supabaseClient.ts — known re-export wrapper, likely keep

## Docs Cleanup (427 → ~50 files)

### Final structure

```
docs/
├── PRD.md
├── GEMINI_API_SETUP.md
├── PRIVACY_AND_SECURITY.md
├── QUICK_START_GUIDE.md
├── CERAMIC_DESIGN_SYSTEM_GUIDANCE.md
├── OPENCLAW_ADAPTATION.md
├── README.md
├── architecture/          (~8 files — core system design)
├── design/                (6 files — all kept, active design system)
├── deployment/            (9 files — all kept, active pipeline)
├── security/              (4 files — policy + audit records)
├── features/              (~8 files — quick-starts only)
└── journey/               (EDGE_FUNCTIONS_MAP.md — referenced in CLAUDE.md)
```

### DELETE entire directories

audit-reports/, delivery/, implementation/, bugfixes/, verification/, tasks/, flux/, n8n/, onboarding/, epic/, research/, proposals/, sql/, workflows/, migrations/, development/, diagrams/, examples/

### CURATE (keep essentials, delete artifacts)

- architecture/: keep ~8 of 56 (core arch docs only)
- features/: keep ~8 of 22 (quick-starts only)
- testing/: keep 2 of 13 (E2E quick-start + gap analysis)
- modules/: keep 2 of 17+ (high-level overviews)
- guides/: keep 2 of ~5 (active guides only)

## Prevention (.gitignore additions)

```gitignore
# Session artifacts (prevent re-accumulation)
*_SUMMARY.md
*_SUMMARY.txt
*_REPORT.md
*_REPORT.txt
*_COMPLETE.md
*_COMPLETE.txt
*_CHECKLIST.md
DELIVERY_*.md
SPRINT_*.md
PHASE_*.md
IMPLEMENTATION_*.md
!docs/PRD.md
!README.md
!CLAUDE.md
```

## Implementation Plan

3 sequential commits:
1. `chore: delete root session artifacts` — ~133 files
2. `chore: curate docs/ directory` — ~350 docs removed/reorganized
3. `chore: update .gitignore to prevent re-accumulation`

## Security Note

Several root scripts contain hardcoded credentials (Supabase keys, connection strings). Deleting them from the working tree is necessary. Note: they remain in git history — a separate `git filter-branch` or BFG cleanup would be needed to fully purge, but that's a separate concern.
