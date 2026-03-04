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

## Default Working Mode: Name → Clarify → Ask Team → Execute → PR → Review

Every session follows this mandatory flow:
1. **Name** — Suggest a session name (e.g., `feat-studio-teleprompter`), wait for approval
2. **Clarify** — Ask about information gaps before starting (see `clarification-first.md`)
3. **Ask Team** — Always ask if user wants an Agent Team activated (never auto-create)
4. **Execute** — Team or solo, based on user decision
5. **PR** — Create Pull Request on feature branch (never push directly to main)
6. **Review** — Read PR comments, address them, report resolution status to user

Solo work is chosen by the user, not assumed. PRs are mandatory for every session with code changes.

## Modular Rules Index

Detailed instructions are in `.claude/rules/` (loaded automatically):

| Rule File | Loading | Content |
|-----------|---------|---------|
| `clarification-first.md` | Always | **Ask about gaps before acting** — 6 dimensions framework |
| `agent-teams.md` | Always | **Team-first workflow** — composition patterns, task rules |
| `security.md` | Always | API keys, RLS, auth, OWASP, backup ban |
| `deploy-pipeline.md` | Always | Staging-first pipeline, commands, services |
| `architecture.md` | Always | Auth decisions, DB patterns, Edge Functions |
| `environments.md` | Always | URLs, Cloud Run services, common fixes |
| `session-protocol.md` | Always | Session end protocol, commits, sync |
| `project-structure.md` | Always | src/ layout, components, imports |
| `code-patterns.md` | When editing `src/**/*.{ts,tsx}` | GeminiClient, React/Ceramic patterns |
| `ai-integration.md` | When editing `lib/gemini/` or `supabase/functions/` | Gemini models, File Search, thinking tokens |
| `design-system.md` | When editing `src/components/` | Ceramic tokens, foundation components |
| `database.md` | When editing `supabase/migrations/` | Migration checklist, RLS, table warnings |
| `whatsapp.md` | When editing connections or webhooks | Pipeline, privacy, troubleshooting |
| `domain-driven-design.md` | When editing `src/services/scoring/` or cross-module features | DDD: Aggregates, Value Objects, Bounded Contexts |

## Quality Targets

- **Coverage:** >80% unit tests
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

## Critical Rules (Summary)

- **ALWAYS** suggest a session name and wait for approval at session start
- **ALWAYS** clarify information gaps before starting medium+ tasks
- **ALWAYS** ask user if they want Agent Team activated (never auto-create teams)
- **ALWAYS** use git worktrees (`.worktrees/`) for feature work — never `git checkout -b` on main tree
- **ALWAYS** create Pull Requests — never push directly to main
- **ALWAYS** read and address PR comments before merging
- **NEVER** expose API keys in frontend — use Edge Functions
- **NEVER** create .backup/.bak files — Git is the backup
- **NEVER** deploy without staging validation first
- **ALWAYS** include RLS policies with new tables
- **ALWAYS** use `@supabase/ssr` for auth (not `@supabase/supabase-js`)
- **ALWAYS** use `GeminiClient.getInstance()` singleton
- **ALWAYS** follow Session End Protocol (see `session-protocol.md`)

## Related Docs

- `docs/PRD.md` — Product requirements
- `docs/GEMINI_API_SETUP.md` — API setup
- `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` — Design system
- `docs/PRIVACY_AND_SECURITY.md` — Security
- `docs/OPENCLAW_ADAPTATION.md` — OpenClaw features
- `docs/journey/EDGE_FUNCTIONS_MAP.md` — Journey AI integrations

---
**Maintainers:** Lucas Boscacci Lima + Claude | **Updated:** Marco 2026
