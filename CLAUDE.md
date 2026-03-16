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

## Solo Dev Workflow

Micro (1-5 linhas): Fix > Verify > Commit > Push
Standard: Clarify > Execute (TDD) > Verify > Review > Finish
Complex: Clarify > Design > Plan > Execute (TDD) > Verify > Review > Finish

Regras detalhadas em `.claude/rules/` (carregadas automaticamente).
Perfil do dev em memory — Claude adapta explicacoes conforme lacunas.

## Quality Targets

- **Coverage:** >80% unit tests
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

## Related Docs

- `docs/PRD.md` — Product requirements
- `docs/GEMINI_API_SETUP.md` — API setup
- `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` — Design system
- `docs/PRIVACY_AND_SECURITY.md` — Security
- `docs/OPENCLAW_ADAPTATION.md` — OpenClaw features
- `docs/journey/EDGE_FUNCTIONS_MAP.md` — Journey AI integrations

---
**Maintainers:** Lucas Boscacci Lima + Claude | **Updated:** Marco 2026
