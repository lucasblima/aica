# AICA Life OS - Claude Code Instructions

## Quick Commands
```bash
# Development
npm run dev              # Start dev server (Vite)
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E

# Supabase
npx supabase db diff     # Preview migration changes
npx supabase db push     # Apply migrations (local)
npx supabase functions serve  # Local Edge Functions
```

---

## ⚠️ DEPLOY - REGRAS CRÍTICAS

### ❌ NUNCA EXECUTE MANUALMENTE:
```bash
gcloud builds submit ...   # NÃO - causa deploy duplicado
gcloud run deploy ...      # NÃO - usa trigger automático
```

### ✅ DEPLOY CORRETO:
```bash
git add -A && git commit -m "sua mensagem" && git push origin main
```
Deploy é **100% automático** via GitHub trigger (~4 min).

**Verificar status:**
```bash
gcloud builds list --limit=5 --region=southamerica-east1
```

---

## Project Structure
```
src/
├── modules/           # Feature modules (atlas, journey, studio, grants, finance)
│   └── {module}/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
├── components/        # Shared UI (Ceramic design system)
├── contexts/          # React Context providers
├── hooks/             # Global custom hooks
└── services/          # API clients, Supabase queries
supabase/
├── migrations/        # SQL migrations (versioned)
└── functions/         # Deno Edge Functions
```

---

## Architecture Decisions

### Authentication (Critical)
- **MUST use** `@supabase/ssr` (NOT `@supabase/supabase-js`)
- PKCE flow required for Cloud Run stateless containers
- Cookie-based sessions, never localStorage
- Single Supabase client - import from `src/services/supabaseClient.ts`
- OAuth exchange ONLY in `src/hooks/useAuth.ts`

### Database
- RLS enabled on ALL tables
- SECURITY DEFINER functions for privileged ops
- Always filter by `user_id` in queries

### AI Integration
- Gemini calls via Edge Functions only (never client-side)
- Prefer `gemini-1.5-flash` for cost optimization
- Rate limit + retry logic required

---

## Module Reference
| Module | Path | Purpose |
|--------|------|---------|
| Atlas | `src/modules/atlas/` | Task management + Eisenhower Matrix |
| Journey | `src/modules/journey/` | Consciousness points, moments |
| Studio | `src/modules/studio/` | Podcast production workflow |
| Grants | `src/modules/grants/` | PDF-first edital parsing |
| Finance | `src/modules/finance/` | Bank statement processing |

---

## Common Fixes

### Import errors
```bash
rm -rf node_modules/.vite && npm install && npm run dev
```

### OAuth redirect issues
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Verify Google OAuth Console allowed origins
3. Ensure single Supabase client instance across app

### Migration fails
```bash
npx supabase db reset --local  # Reset local DB
npx supabase migration repair  # Fix migration state
```

### Build verification before push
```bash
npm run build && npm run typecheck
```

---

## URLs de Produção
- **App:** https://aica-5562559893.southamerica-east1.run.app
- **Supabase:** https://gppebtrshbvuzatmebhr.supabase.co
- **Region:** southamerica-east1 (São Paulo)

---

## 🤖 Agent Specialization (Auto-Delegation)

| Agent | Auto-Triggers |
|-------|---------------|
| `master-architect-planner` | "plan", "architecture", "design" |
| `backend-architect-supabase` | "migration", "RLS", "database", "schema" |
| `ux-design-guardian` | "UI review", "UX", "design system" |
| `gamification-engine` | "XP", "badge", "achievement", "streak" |
| `podcast-production-copilot` | "podcast", "guest", "pauta", "episode" |
| `testing-qa-playwright` | "E2E test", "Playwright", "test coverage" |
| `security-privacy-auditor` | "LGPD", "GDPR", "security audit" |
| `gemini-integration-specialist` | "Gemini API", "prompt", "AI integration" |

**Explicit:** `"Use o {agent-name} agent para {task}"`

---

## 📋 Session Management

### Naming Convention
Pattern: `{area}-{feature}-{type}`
```bash
claude --session backend-auth-refactor
claude --resume                         # Listar sessões
claude --continue                       # Retomar recente
```

### Permission Modes
| Mode | Editar? | Use Case |
|------|---------|----------|
| normal | ✅ | Development |
| plan | ❌ | Code reviews |
| auto | ✅ auto | Trusted workflows |

```bash
claude --permission-mode plan  # Safe review mode
```

---

## 🔄 Multi-Terminal Sync

### Antes de iniciar (OBRIGATÓRIO)
```bash
git pull origin main
git branch -a --sort=-committerdate | head -10
git log --all --oneline --since="1 day ago" | head -20
```

### Commits (SEMPRE)
```
<type>(<scope>): <description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** feat, fix, docs, test, refactor, chore
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, ui

---

## 🚨 Critical Reminders

- **NEVER** create backup files (.backup, .bak) - Git is the backup
- **NEVER** call Gemini API client-side - use Edge Functions
- **ALWAYS** include RLS policies with new tables
- **ALWAYS** use `@supabase/ssr` for authentication
- **ALWAYS** include co-authorship in commits

---

## Quality Targets
- **Coverage:** >80% unit tests
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

---

## Related Docs
- @.claude/AGENT_GUIDELINES.md - Workflow multi-terminal detalhado
- @.claude/WORK_QUEUE.md - Branches ativas e prioridades

---
**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5