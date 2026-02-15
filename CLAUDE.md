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

## Default Working Mode: Clarify → Team → Execute

For medium+ complexity tasks (2+ files, decisions involved, new features):
1. **Clarify** — Ask about information gaps before starting (see `clarification-first.md`)
2. **Team** — Create an Agent Team with appropriate composition (see `agent-teams.md`)
3. **Execute** — Teammates work in parallel, lead synthesizes and reports

Solo work is reserved for trivially clear single-file fixes only.

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

## Quality Targets

- **Coverage:** >80% unit tests
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

## Critical Rules (Summary)

- **ALWAYS** clarify information gaps before starting medium+ tasks
- **ALWAYS** create Agent Teams for tasks touching 2+ files or involving decisions
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
**Maintainers:** Lucas Boscacci Lima + Claude | **Updated:** Fevereiro 2026
