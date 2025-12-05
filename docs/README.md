# Aica Frontend - Documentation

Complete documentation for Aica Life OS frontend application.

**Last updated:** 2025-12-05
**Total files:** 16 organized documentation files

---

## 📚 Quick Navigation

### Core Documentation (Top Level)
- **[PRD.md](./PRD.md)** - Product Requirements Document (main requirements)
- **[INTEGRATION_TEST_PLAN.md](./INTEGRATION_TEST_PLAN.md)** - 150+ test scenarios for QA
- **[DATA_PROCESSING_INVENTORY.md](./DATA_PROCESSING_INVENTORY.md)** - GDPR data processing inventory

---

## 🎨 Design & UI/UX

📁 **[design/](./design/)**

| File | Description |
|------|-------------|
| [UI_UX_GUIDELINES.md](./design/UI_UX_GUIDELINES.md) | Complete Ceramic design system documentation |

**Use when:**
- Implementing new UI components
- Understanding design patterns and standards
- Ensuring visual consistency
- Onboarding frontend designers/developers
- Selecting colors, typography, or spacing

---

## 🔒 Security & Compliance

📁 **[security/](./security/)**

| File | Description |
|------|-------------|
| [PRIVACY_AND_SECURITY.md](./security/PRIVACY_AND_SECURITY.md) | Privacy policy & GDPR compliance documentation |
| [SECURITY_AUDIT_REPORT.md](./security/SECURITY_AUDIT_REPORT.md) | Security assessment & OWASP Top 10 review |

**Use when:**
- Implementing data handling features
- Reviewing compliance requirements
- Conducting security audits
- Onboarding security-focused team members

---

## 🏗️ Architecture & Database

📁 **[architecture/](./architecture/)**

| File | Description |
|------|-------------|
| [backend_architecture.md](./architecture/backend_architecture.md) | System architecture & table relationships |
| [DATABASE_SCHEMA_NEW_TABLES.sql](./architecture/DATABASE_SCHEMA_NEW_TABLES.sql) | SQL schema definitions |
| [DATABASE_SCHEMA_VERIFIED.md](./architecture/DATABASE_SCHEMA_VERIFIED.md) | Verified schema documentation (25 tables) |
| [MIGRATION_GUIDE_NEW_TABLES.md](./architecture/MIGRATION_GUIDE_NEW_TABLES.md) | Step-by-step database migration guide |
| [SCHEMA_VALIDATION_REPORT.md](./architecture/SCHEMA_VALIDATION_REPORT.md) | SQL validation queries & health checks |

**Use when:**
- Understanding system architecture
- Creating database migrations
- Debugging database issues
- Onboarding backend developers
- Validating schema integrity

---

## ⚙️ Workflows & Integrations

📁 **[workflows/](./workflows/)**

| File | Description |
|------|-------------|
| [N8N_MESSAGE_PROCESSING_WORKFLOW.md](./workflows/N8N_MESSAGE_PROCESSING_WORKFLOW.md) | 10-node message processing pipeline |
| [N8N_DAILY_REPORT_WORKFLOW.md](./workflows/N8N_DAILY_REPORT_WORKFLOW.md) | Daily report generation workflow |
| [EVOLUTION_API_WEBHOOK_IMPLEMENTATION.md](./workflows/EVOLUTION_API_WEBHOOK_IMPLEMENTATION.md) | WhatsApp integration via Evolution API |

**Use when:**
- Setting up n8n workflows
- Debugging message processing
- Configuring WhatsApp integration
- Understanding automation pipelines

---

## ✨ Feature Documentation

📁 **[features/](./features/)**

| File | Description |
|------|-------------|
| [EFFICIENCY_SCORE_SYSTEM.md](./features/EFFICIENCY_SCORE_SYSTEM.md) | Efficiency calculation system & components |
| [GOOGLE_CALENDAR_INTEGRATION.md](./features/GOOGLE_CALENDAR_INTEGRATION.md) | Google Calendar OAuth setup & testing |

**Use when:**
- Implementing feature enhancements
- Understanding existing features
- Configuring integrations
- Writing feature documentation

---

## 🎯 Documentation Goals

This reorganization ensures:
- ✅ **Zero duplicates** - Single source of truth
- ✅ **No outdated files** - All docs reflect current state
- ✅ **Clear organization** - Easy to find what you need
- ✅ **Better onboarding** - New developers can navigate easily
- ✅ **Reduced maintenance** - Less files to keep updated

---

## 📖 How to Use This Documentation

### For New Developers
1. Start with **[PRD.md](./PRD.md)** - Understand product vision
2. Read **[architecture/backend_architecture.md](./architecture/backend_architecture.md)** - System overview
3. Review **[design/UI_UX_GUIDELINES.md](./design/UI_UX_GUIDELINES.md)** - Design system & UI patterns
4. Check **[security/PRIVACY_AND_SECURITY.md](./security/PRIVACY_AND_SECURITY.md)** - Privacy principles
5. Review **[INTEGRATION_TEST_PLAN.md](./INTEGRATION_TEST_PLAN.md)** - Testing approach

### For Feature Development
1. Check **[features/](./features/)** - Existing feature docs
2. Review **[design/UI_UX_GUIDELINES.md](./design/UI_UX_GUIDELINES.md)** - UI patterns & components
3. Review **[architecture/](./architecture/)** - Database schema
4. Update relevant docs after implementation
5. Run `documentation-maintainer` agent to sync docs

### For DevOps/Integration
1. Review **[workflows/](./workflows/)** - n8n workflows
2. Check **[architecture/MIGRATION_GUIDE_NEW_TABLES.md](./architecture/MIGRATION_GUIDE_NEW_TABLES.md)** - Setup guide
3. Validate with **[architecture/SCHEMA_VALIDATION_REPORT.md](./architecture/SCHEMA_VALIDATION_REPORT.md)**

### For Compliance/Security
1. **[security/PRIVACY_AND_SECURITY.md](./security/PRIVACY_AND_SECURITY.md)** - Privacy policy
2. **[security/SECURITY_AUDIT_REPORT.md](./security/SECURITY_AUDIT_REPORT.md)** - Security posture
3. **[DATA_PROCESSING_INVENTORY.md](./DATA_PROCESSING_INVENTORY.md)** - GDPR inventory

---

## 🔄 Keeping Documentation Updated

### Automated Updates
Use the `documentation-maintainer` agent to auto-update docs:

```
@documentation-maintainer Analyze recent commits and update PRD.md and backend_architecture.md
```

The agent will:
- Analyze git commits since last update
- Verify implementations in code
- Validate database schema via Supabase MCP
- Update documentation automatically
- Generate change report

### Manual Updates
When adding new features:
1. Update relevant docs in appropriate folder
2. Update PRD.md if it's a new feature
3. Update architecture docs if database changes
4. Commit docs with code changes

---

## 📊 Documentation Structure History

**December 5, 2025 - Major Cleanup + Design Documentation**
- Reduced from 26 to 15 files, then added 1 new (16 total, 38% reduction)
- Deleted 11 obsolete/duplicate files
- Consolidated 3 files into 1
- Organized into 5 subdirectories (added design/)
- Created this README for navigation
- Added comprehensive UI/UX Guidelines documenting Ceramic design system

**Files Deleted:**
- PRD.md.backup, PRD_updated.md (duplicates)
- PROGRESS_REPORT.md (outdated)
- PHASE_2_IMPLEMENTATION_SUMMARY.md (outdated)
- TASK_13/15/16_COMPLETION_SUMMARY.md (completed)
- DATABASE_SCHEMA_REVIEW.md, DATABASE_SCHEMA_COMPLETE.md (redundant)
- refactoring_studio_ceramic.md (implemented)

**Files Consolidated:**
- GOOGLE_CALENDAR_SETUP.md + GOOGLE_CALENDAR_TESTING.md
  → GOOGLE_CALENDAR_INTEGRATION.md

---

## 🆘 Help & Support

### Finding Documentation
1. Use this README as navigation hub
2. Search by folder (security, architecture, workflows, features)
3. Check [PRD.md](./PRD.md) for feature overview

### Contributing to Docs
- Keep documentation close to code changes
- Update relevant docs when implementing features
- Use clear, concise language
- Include code examples where helpful
- Run documentation-maintainer agent after major changes

### Questions?
- Check existing docs first
- Review code comments for implementation details
- Ask team for clarification on outdated content

---

**Maintained by:** Aica Development Team
**Repository:** [Aica_frontend](https://github.com/lucasblima/Aica_frontend)
