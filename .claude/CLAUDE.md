# Aica Life OS - Claude Code Memory System

> **Auto-loaded context for all Claude Code terminals**
> This file provides shared context across multi-terminal development sessions.

---

## 🎯 Quick Context (Always Active)

### Project Identity
- **Name:** Aica Life OS
- **Type:** React/TypeScript personal life management application
- **Deploy:** Google Cloud Run (stateless containers)
- **Auth:** Supabase Auth with `@supabase/ssr` (PKCE flow)
- **AI:** Google Gemini API via Edge Functions

### Current Sprint Focus
See **[WORK_QUEUE.md](./.claude/WORK_QUEUE.md)** for active branches and priorities.

### Development Standards
- **Commits:** 100% Conventional Commits + Co-authorship mandatory
- **Branches:** `feature/{description}-issue-{number}` pattern
- **Testing:** >80% coverage target (Vitest + Playwright)
- **Code Style:** TypeScript strict + ESLint + Tailwind CSS

---

## 📚 Core Documentation (Auto-Import)

### Workflow Guidelines
@.claude/agent_guidelines.md

**Key Sections:**
- Multi-terminal synchronization protocol
- Conventional commits format with co-authorship
- Version control best practices (Git is backup system)
- Specialized agent mapping and invocation
- Learning framework for architectural decisions

### Work Queue
@.claude/WORK_QUEUE.md

**Key Sections:**
- Active branches dashboard with status indicators
- Priority-based task organization
- Merge history with lessons learned
- Sync commands reference for multi-terminal work

### Project Instructions
@CLAUDE.md (root)

**Key Sections:**
- Tech stack details
- Common issues and solutions
- Authentication patterns (@supabase/ssr)
- AI integration guidelines

---

## 🤖 Agent Specialization Rules

### Automatic Delegation Guidelines

Claude Code will **automatically** invoke specialized agents when:

| Agent | Auto-Trigger Keywords | Example Task |
|-------|----------------------|--------------|
| `master-architect-planner` | "plan", "architecture", "design system" | "Plan the WhatsApp integration" |
| `backend-architect-supabase` | "migration", "RLS", "database", "schema" | "Create podcast_episodes table" |
| `gemini-integration-specialist` | "Gemini API", "prompt", "AI integration" | "Optimize token usage in chat" |
| `testing-qa-playwright` | "E2E test", "Playwright", "test coverage" | "Write tests for OAuth flow" |
| `security-privacy-auditor` | "LGPD", "GDPR", "security audit", "RLS policy" | "Audit user data handling" |
| `ux-design-guardian` | "UI review", "UX pattern", "design system" | "Review modal component design" |
| `gamification-engine` | "XP", "badge", "achievement", "streak" | "Implement task completion XP" |
| `podcast-production-copilot` | "podcast", "guest research", "pauta" | "Create episode outline wizard" |
| `calendar-executive` | "Google Calendar", "OAuth", "sync" | "Debug token refresh issue" |
| `atlas-task-manager` | "task", "Meu Dia", "priority", "Eisenhower" | "Create task with deadline" |
| `documentation-maintainer` | "update docs", "sync PRD", "architecture doc" | "Update PRD with new features" |

### Explicit Invocation Format

When automatic delegation doesn't occur:
```
Use the {agent-name} agent to {specific task}
```

Example:
```
Use the master-architect-planner agent to create an implementation plan for the WhatsApp gamification feature
```

### Multi-Agent Workflows

For complex tasks requiring multiple agents in sequence:
```
1. Use master-architect-planner to create overall design
2. Use backend-architect-supabase to implement database schema
3. Use testing-qa-playwright to create E2E tests
4. Use documentation-maintainer to update PRD.md
```

---

## 🔧 Automation Hooks

### Active Hooks (Configured in settings.json)

**PostToolUse - WORK_QUEUE Auto-Update:**
- Triggers after Edit/Write operations
- Auto-commits WORK_QUEUE.md changes when on feature branch
- Ensures branch status stays synchronized

**UserPromptSubmit - Conventional Commits Reminder:**
- Shows reminder about commit format before every session
- Reduces commit message errors

**PreToolUse - Migration Validation:**
- Warns when Supabase migration commands detected
- Prompts to verify RLS policies are in place

See **[settings.json](./.claude/settings.json)** for hook implementations.

---

## 📋 Session Management Protocol

### Naming Sessions for Parallel Work

Each terminal working on different tasks should use named sessions:

```bash
# Terminal 1: Backend authentication work
claude
> /rename backend-auth-refactor

# Terminal 2: E2E test development
claude
> /rename e2e-oauth-tests

# Terminal 3: Podcast feature implementation
claude
> /rename podcast-wizard-implementation
```

### Resuming Sessions

```bash
# List all project sessions
claude --resume

# Resume specific session
claude --resume backend-auth-refactor

# Continue most recent session
claude --continue
```

### Session Naming Convention

Pattern: `{area}-{feature}-{type}`

Examples:
- `backend-auth-refactor`
- `frontend-ui-gamification`
- `e2e-tests-podcast`
- `docs-architecture-update`

---

## 🛡️ Permission Modes by Task Type

### When to Use Each Mode

| Task Type | Permission Mode | Rationale |
|-----------|----------------|-----------|
| **New Feature** | Normal (⏵⏵ accept edits) | Needs to make commits and edits |
| **Code Review** | Plan (⏸ plan mode) | Analysis only, no modifications |
| **Quick Debug** | Auto (⏵⏵ auto-accept) | Trusted, already tested patterns |
| **Experimental** | Normal + frequent commits | Easy rollback if needed |
| **Cross-Branch Review** | Plan mode | Prevent accidental commits to wrong branch |

### Plan Mode for Safe Cross-Terminal Analysis

When reviewing code from another terminal without modifying:

```bash
# Safe analysis in plan mode
claude --permission-mode plan -p "Review authentication implementation in @src/lib/supabase"

# Output: Suggestions without making commits
```

---

## 🔄 Multi-Terminal Synchronization

### Before Starting Work (MANDATORY)

```bash
# 1. Update current branch
git pull origin main

# 2. Check active branches (sorted by recent activity)
git branch -a --sort=-committerdate | head -10

# 3. View recent commits across all branches
git log --all --oneline --since="1 day ago" | head -20

# 4. Check WORK_QUEUE.md for current priorities
cat .claude/WORK_QUEUE.md | grep -A 5 "🟢 ATIVA"
```

### During Work

- **Frequent commits** (don't wait for complete feature)
- **Descriptive messages** following Conventional Commits
- **Update WORK_QUEUE.md** when changing task status

### When Switching Branches/Terminals

**Option 1: Commit WIP state**
```bash
git add .
git commit -m "WIP: [description of current state]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Option 2: Use stash with descriptive message**
```bash
git stash push -m "WIP: implementing feature X - missing tests"
```

---

## 🎓 Architectural Decision Framework

### When Claude Should Explain Decisions

**ALWAYS explain:**
- ❓ **Why** a solution was chosen (not just "what")
- ❓ **Trade-offs** of architectural decisions
- ❓ **Alternatives** that were considered
- ❓ **References** for deeper learning

### Decision Documentation Format

```markdown
## Decision: [Title]

### Context
[Why do we need to decide this?]

### Options Considered
1. **Option A:** [Pros/Cons]
2. **Option B:** [Pros/Cons]

### Decision
We chose **Option X** because:
- [Reason 1]
- [Reason 2]

### Implementation Notes
[How to implement this decision]

### References
- [Link to documentation]
- [Reference to pattern/standard]
```

Save to: `docs/decisions/YYYY-MM-DD-{decision-name}.md`

---

## 📊 Quality Targets

### Code Coverage
- Unit Tests: >80% (current: ~90% in validation utilities)
- E2E Tests: Critical user paths covered
- Integration Tests: In development

### Performance
- Build Time: ~3-4 min (target: <3 min)
- Cloud Run Cold Start: <2s
- Lighthouse Score: >90

### Compliance
- LGPD/GDPR: RLS policies on all tables
- OWASP Top 10: No known vulnerabilities
- Accessibility: WCAG 2.1 AA

---

## 🚨 Critical Reminders

### Authentication
- **ALWAYS** use `@supabase/ssr` (NOT `@supabase/supabase-js`) for Cloud Run
- PKCE flow is mandatory for stateless containers
- Cookie-based sessions (never localStorage)

### Database
- **ALWAYS** include RLS policies with new tables
- Use SECURITY DEFINER functions for privileged operations
- Test migrations locally before deploying

### AI Integration
- **NEVER** call Gemini API client-side (use Edge Functions)
- Always implement rate limiting and error handling
- Optimize costs: use `gemini-1.5-flash` when possible

### Version Control
- **NEVER** create manual backup files (.backup, .bak, .old)
- Git is the source of truth - use branches for experiments
- Co-authorship in every commit: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

---

## 📁 Repository Structure

```
.claude/
├── CLAUDE.md (this file - auto-loaded memory)
├── agent_guidelines.md (workflow for multi-terminal dev)
├── WORK_QUEUE.md (active branches & priorities)
├── settings.json (hooks & automation)
└── skills/ (managed skills)
    ├── ai-integration.md
    ├── aica-development.md
    ├── api-integrations.md
    └── ... (10 total project skills)
```

---

## 🔗 Quick References

### Essential Commands
```bash
# Branch status
git branch --show-current

# Active branches
git branch --no-merged main

# Recent work across all branches
git log --all --since="today" --oneline

# Stash management
git stash list
git stash apply stash@{0}

# Build & test
npm run build
npm run test
npm run test:e2e
```

### Common Issues & Solutions

**Build fails with import errors:**
```bash
rm -rf node_modules/.vite
npm install
npm run dev
```

**OAuth redirect mismatch:**
- Verify Client ID matches Supabase Dashboard
- Check allowed URLs in Supabase + Google OAuth Console
- Use latest Cloud Run URL (not legacy URL)

**E2E tests race condition:**
- Check auth state timing in test setup
- Ensure migrations applied before tests run
- Use proper waitFor selectors

---

**Last Updated:** 2026-01-02
**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
**Auto-Loaded:** Yes (all Claude Code sessions)
