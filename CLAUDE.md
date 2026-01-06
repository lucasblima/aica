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

## ⚠️ DEPLOY - REGRAS CRÍTICAS

### ❌ NUNCA EXECUTE MANUALMENTE:
```bash
# NÃO FAÇA ISSO - causa deploy duplicado
gcloud builds submit ...
gcloud run deploy ...
```

### ✅ DEPLOY CORRETO:
O deploy é **100% AUTOMÁTICO** via GitHub trigger.

**Para fazer deploy, apenas:**
```bash
git add -A
git commit -m "sua mensagem"
git push origin main
```

**O que acontece automaticamente:**
1. Push no GitHub → Trigger `rmgpgab-aica-southamerica-...` é acionado
2. Cloud Build executa `cloudbuild.yaml`
3. Deploy em `southamerica-east1` (São Paulo)
4. ~4 minutos para completar

**Para verificar status do deploy:**
```bash
# Ver builds recentes (não dispara novo build)
gcloud builds list --limit=5 --region=southamerica-east1

# Ver logs de um build específico
gcloud builds log BUILD_ID --region=southamerica-east1
```

### Por que não fazer deploy manual?
- Existe trigger automático configurado no Cloud Build
- Deploy manual cria build "global" duplicado
- Dois deploys simultâneos podem causar race conditions
- Desperdiça recursos e tempo de build

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

## Architecture Decisions

### Authentication (Critical)
- **MUST use** `@supabase/ssr` (NOT `@supabase/supabase-js`)
- PKCE flow required for Cloud Run stateless containers
- Cookie-based sessions, never localStorage
- Single Supabase client instance - import from `src/services/supabaseClient.ts`
- OAuth exchange happens ONLY in `src/hooks/useAuth.ts`
- See: `src/contexts/AuthContext.tsx`

### Database
- RLS enabled on ALL tables - verify with: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
- SECURITY DEFINER functions for privileged ops
- Always filter by `user_id` in queries

### AI Integration
- Gemini calls via Edge Functions only (never client-side)
- Prefer `gemini-1.5-flash` for cost optimization
- Rate limit + retry logic required
- See: `supabase/functions/*/index.ts`

## Module Reference
| Module | Path | Purpose |
|--------|------|---------|
| Atlas | `src/modules/atlas/` | Task management + Eisenhower Matrix |
| Journey | `src/modules/journey/` | Consciousness points, moments |
| Studio | `src/modules/studio/` | Podcast production workflow |
| Grants | `src/modules/grants/` | PDF-first edital parsing |
| Finance | `src/modules/finance/` | Bank statement processing |

## Common Fixes

### Import errors
```bash
rm -rf node_modules/.vite && npm install && npm run dev
```

### OAuth redirect issues
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Verify Google OAuth Console allowed origins
3. Cloud Run may generate new URLs on deploy
4. Ensure single Supabase client instance across app

### Migration fails
```bash
npx supabase db reset --local  # Reset local DB
npx supabase migration repair  # Fix migration state
```

### Build verification before push
```bash
npm run build && npm run typecheck
```

## URLs de Produção
- **App:** https://aica-5562559893.southamerica-east1.run.app
- **Supabase:** https://gppebtrshbvuzatmebhr.supabase.co
- **Region:** southamerica-east1 (São Paulo)

## Related Docs
- @.claude/AGENT_GUIDELINES.md
- @.claude/WORK_QUEUE.md
- @docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md

---
**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5