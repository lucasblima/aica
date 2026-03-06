# AICA Life OS - Claude Code Instructions

**AICA Life OS** e um "Sistema Operacional de Vida Integral" que integra produtividade pessoal e profissional para brasileiros. Funciona como um "Jarvis pessoal" com 8 modulos.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Google Gemini API (via Edge Functions only)
- **Design**: Ceramic Design System (neumorphic, warm palettes)
- **Deploy**: Google Cloud Run + Firebase Hosting

## Quick Commands

```bash
npm run dev              # Dev server (Vite)
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E

npx supabase db diff     # Preview migration changes
npx supabase db push     # Apply migrations
npx supabase functions serve  # Local Edge Functions
```

## Modules

| Module | Path | Tables |
|--------|------|--------|
| **Atlas** | `src/modules/atlas/` | `work_items` |
| **Agenda** | `src/modules/agenda/` | `calendar_events` |
| **Journey** | `src/modules/journey/` | `moments`, `daily_reports` |
| **Grants** | `src/modules/grants/` | `grant_projects`, `grant_opportunities` |
| **Connections** | `src/modules/connections/` | `connection_spaces`, `connection_members` |
| **Studio** | `src/modules/studio/` | `podcast_shows`, `podcast_episodes` |
| **Finance** | `src/modules/finance/` | `finance_transactions` |
| **Flux** | `src/modules/flux/` | `athletes`, `workout_blocks`, `alerts` |

## Default Working Mode

```
Name -> Clarify -> Ask Team -> Brainstorm -> Plan -> Worktree -> TDD/Execute -> Verify -> Review -> Finish -> PR
```

Every session follows this mandatory flow:

1. **Name** — Suggest a session name, wait for approval
2. **Clarify** — Ask about information gaps (see `clarification-first.md`)
3. **Ask Team** — Always ask if user wants Agent Team activated (never auto-create)
4. **Brainstorm** — For non-trivial tasks: `superpowers:brainstorming` -> design doc -> user approval
5. **Plan** — `superpowers:writing-plans` -> implementation plan saved to `docs/plans/`
6. **Worktree** — `superpowers:using-git-worktrees` -> isolated workspace in `.worktrees/`
7. **TDD/Execute** — `superpowers:test-driven-development` (RED-GREEN-REFACTOR). For bugs: `superpowers:systematic-debugging` first
8. **Verify** — `superpowers:verification-before-completion` -> FRESH build/test output as evidence
9. **Review** — `superpowers:requesting-code-review` -> address findings
10. **Finish** — `superpowers:finishing-a-development-branch` -> 4 options (merge/PR/keep/discard)
11. **PR** — Create Pull Request on feature branch (never push directly to main)

Steps 4-5 are lightweight for trivial tasks (skip or a few sentences). Steps 7-9 repeat per task. Solo work is chosen by the user, not assumed.

## Superpowers Integration

| Phase | Skill | When |
|-------|-------|------|
| Design | `superpowers:brainstorming` | Before any non-trivial feature |
| Planning | `superpowers:writing-plans` | After design approval |
| Workspace | `superpowers:using-git-worktrees` | Every session |
| Implementation | `superpowers:test-driven-development` | Every code change |
| Debugging | `superpowers:systematic-debugging` | Every bug/failure |
| Agent Teams | `superpowers:subagent-driven-development` | Team execution with spec+quality review |
| Parallel Work | `superpowers:dispatching-parallel-agents` | 3+ independent tasks/bugs |
| Verification | `superpowers:verification-before-completion` | Before any completion claim |
| Code Review | `superpowers:requesting-code-review` | Before PR creation |
| Review Response | `superpowers:receiving-code-review` | When addressing review feedback |
| Completion | `superpowers:finishing-a-development-branch` | After all tasks verified |

## Modular Rules Index

Detailed instructions are in `.claude/rules/` (loaded automatically):

| Rule File | Loading | Content |
|-----------|---------|---------|
| `clarification-first.md` | Always | Session flow, 6 dimensions, brainstorming gate |
| `agent-teams.md` | Always | Team workflow, execution strategies, two-stage review |
| `session-protocol.md` | Always | Full pipeline, TDD, verification, PR workflow |
| `security.md` | Always | API keys, RLS, auth, OWASP, verification |
| `deploy-pipeline.md` | Always | Staging-first pipeline, verification obrigatoria |
| `architecture.md` | Always | Auth decisions, DB patterns, Edge Functions, troubleshooting |
| `environments.md` | Always | URLs, Cloud Run services, common fixes |
| `project-structure.md` | Always | src/ layout, components, imports, plans dir |
| `code-patterns.md` | When editing `src/**/*.{ts,tsx}` | GeminiClient, Ceramic, TDD, review, verification |
| `ai-integration.md` | When editing `lib/gemini/` or `supabase/functions/` | Gemini models, File Search, thinking tokens |
| `design-system.md` | When editing `src/components/` | Ceramic tokens, foundation components |
| `database.md` | When editing `supabase/migrations/` | Migration checklist, RLS, debugging |
| `whatsapp.md` | When editing connections or webhooks | Pipeline, privacy, development workflow |
| `domain-driven-design.md` | When editing `src/services/scoring/` or cross-module features | DDD: Aggregates, Value Objects, Bounded Contexts |

## Quality Targets

- **Coverage:** >80% unit tests (enforced via `superpowers:test-driven-development`)
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

## Critical Rules (Summary)

### Session Workflow
- **ALWAYS** suggest a session name and wait for approval at session start
- **ALWAYS** clarify information gaps before starting medium+ tasks
- **ALWAYS** ask user if they want Agent Team activated (never auto-create teams)
- **ALWAYS** brainstorm before implementing non-trivial features (`superpowers:brainstorming`)
- **ALWAYS** write implementation plans for multi-step tasks (`superpowers:writing-plans`)
- **ALWAYS** use git worktrees (`.worktrees/`) for feature work — never `git checkout -b` on main tree
- **ALWAYS** create Pull Requests — never push directly to main
- **ALWAYS** read and address PR comments before merging

### Code Quality
- **ALWAYS** follow TDD: write failing test first, then implement (`superpowers:test-driven-development`)
- **ALWAYS** verify with FRESH evidence before claiming done (`superpowers:verification-before-completion`)
- **ALWAYS** request code review before PR (`superpowers:requesting-code-review`)
- **ALWAYS** use `superpowers:systematic-debugging` for bugs — never guess-and-check
- **ALWAYS** follow Session End Protocol (see `session-protocol.md`)

### Security & Architecture
- **NEVER** expose API keys in frontend — use Edge Functions
- **NEVER** create .backup/.bak files — Git is the backup
- **NEVER** deploy without staging validation first
- **ALWAYS** include RLS policies with new tables
- **ALWAYS** use `@supabase/ssr` for auth (not `@supabase/supabase-js`)
- **ALWAYS** use `GeminiClient.getInstance()` singleton

## Related Docs

- `docs/PRD.md` — Product requirements
- `docs/GEMINI_API_SETUP.md` — API setup
- `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` — Design system
- `docs/PRIVACY_AND_SECURITY.md` — Security
- `docs/OPENCLAW_ADAPTATION.md` — OpenClaw features
- `docs/journey/EDGE_FUNCTIONS_MAP.md` — Journey AI integrations

---
**Maintainers:** Lucas Boscacci Lima + Claude | **Updated:** Marco 2026
