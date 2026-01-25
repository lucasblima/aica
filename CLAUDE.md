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

### Root Structure
```
src/
├── modules/           # Feature modules (atlas, journey, studio, grants, finance, connections)
│   └── {module}/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types.ts (or types/index.ts)
│       └── index.ts   # Barrel export for public API
├── components/        # Shared UI components (semantic organization)
├── contexts/          # React Context providers
├── hooks/             # Global custom hooks
├── services/          # API clients, Supabase queries, integrations
├── integrations/      # Third-party service integrations (Gemini, Whisper, etc.)
├── lib/               # Utility functions, helpers
└── types/             # Global type definitions
supabase/
├── migrations/        # SQL migrations (versioned)
└── functions/         # Deno Edge Functions
```

### Components Organization (Issue #39 Refactor)
Shared components are organized into **4 semantic categories**:

```
src/components/
├── ui/               # 16 reusable UI primitives (no business logic)
│   ├── Accordion.tsx
│   ├── ConfirmationModal.tsx
│   ├── LoadingScreen.tsx
│   ├── NotificationContainer.tsx
│   └── index.ts      # Barrel export
├── layout/           # 4 layout components (headers, navigation, containers)
│   ├── HeaderGlobal.tsx
│   ├── AuthSheet.tsx
│   ├── SettingsMenu.tsx
│   └── index.ts      # Barrel export
├── features/         # 24+ feature components (cross-module reusable)
│   ├── Calendar*.tsx
│   ├── Gamification*.tsx
│   ├── Efficiency*.tsx
│   ├── Timeline*.tsx
│   └── index.ts      # Barrel export
├── domain/           # 4 domain-specific business logic components
│   ├── PriorityMatrix.tsx
│   ├── TaskEditModal.tsx
│   └── index.ts      # Barrel export
├── index.ts          # Root barrel export (backward compatibility)
└── {other}/          # Legacy folders (AreaQuickActionModal, ProfileModal, etc.)
```

### Import Patterns
```typescript
// ✅ Recommended: Use barrel exports
import { LoadingScreen, NotificationContainer } from '@/components/ui'
import { HeaderGlobal } from '@/components/layout'
import { GamificationWidget, Calendar* } from '@/components/features'
import { PriorityMatrix, TaskEditModal } from '@/components/domain'

// ✅ Also works: Root-level barrel export (for backward compatibility)
import { LoadingScreen, HeaderGlobal } from '@/components'

// ❌ Avoid: Direct file imports (reduces maintainability)
import { LoadingScreen } from '@/components/ui/LoadingScreen'
```

---

## Component Organization Best Practices (Issue #39)

### Semantic Categorization
Components are categorized by **purpose**, not location:

| Category | Purpose | Examples | Reusable |
|----------|---------|----------|----------|
| **ui/** | UI primitives, no business logic | Accordion, Button, Modal, Card | ✅ Yes |
| **layout/** | Page structure, navigation | Header, Sidebar, Nav | ✅ Yes |
| **features/** | Cross-module reusable features | Calendar, Gamification, Timeline | ✅ Yes |
| **domain/** | Business logic, domain-specific | PriorityMatrix, TaskEditor | ⚠️ Sometimes |

### Naming Conventions
- **Component files:** PascalCase (e.g., `LoadingScreen.tsx`)
- **Barrel exports:** Always `index.ts` per category
- **CSS files:** Same name as component (e.g., `LoadingScreen.css`)

### When to Create New Components
- ✅ **Move to components/ if:** Used by 2+ modules, no module-specific dependencies
- ❌ **Keep in modules/ if:** Only used in 1 module, tight business logic coupling
- ✅ **Add to ui/ if:** Pure presentation, reusable across any context
- ✅ **Add to features/ if:** Feature-driven, cross-module, some business logic

### Types Organization
All modules follow the standardized pattern:
```
src/modules/{module}/
├── types/
│   ├── index.ts         # All public types (RECOMMENDED)
│   └── *.ts             # Internal type files
└── types.ts             # ❌ DEPRECATED - move to types/index.ts
```

Import pattern:
```typescript
// ✅ Recommended
import type { GuestDossier } from '@/modules/podcast/types'

// ✅ Also works
import type { GuestDossier } from '@/modules/podcast/types/dossier'

// ❌ Avoid
import type { GuestDossier } from '@/modules/podcast'
```

### Integration Files
All third-party integrations are in `src/integrations/`:
```typescript
import { transcribeAudioWithWhisper } from '@/integrations'
import { analyzeSentimentWithGemini } from '@/integrations'
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
| Connections | `src/modules/connections/` | WhatsApp integration, pairing code |

---

## WhatsApp Pairing Code (Issue #87)

### Overview
Alternative to QR Code for WhatsApp connection. Generates 8-digit pairing code with 60s TTL for easier mobile pairing.

### Architecture Flow
1. **Frontend:** `usePairingCode().generateCode('5511987654321')`
2. **Edge Function:** `generate-pairing-code` → Evolution API
3. **Evolution API:** Returns pairing code (60s TTL)
4. **User:** Enters code in WhatsApp mobile app
5. **Webhook:** `CONNECTION_UPDATE` → updates DB `status='connected'`
6. **Frontend:** Real-time subscription detects change → UI updates

### Key Components

#### Backend
- **Edge Function:** `supabase/functions/generate-pairing-code/index.ts`
  - RPC: `get_or_create_whatsapp_session`, `record_pairing_attempt`
  - Query param: `?number={phoneNumber}` (format: 5511987654321)
  - Returns: `{ code: "12345678", expiresAt: "ISO8601" }`

- **Webhook:** `supabase/functions/webhook-evolution/index.ts`
  - Event: `CONNECTION_UPDATE`
  - Updates `whatsapp_sessions.status` → 'connected'
  - Auto-syncs contacts via Evolution API

- **Database:** `whatsapp_sessions` table
  - Migration: `20260113_whatsapp_sessions_multi_instance.sql`
  - RPC functions: 6 total (see migration file)
  - Permissions: `20260121000007_grant_whatsapp_rpc_permissions.sql`

#### Frontend
- **Hook:** `src/hooks/usePairingCode.ts`
  - Countdown timer 60s
  - Format: XXXX-XXXX (visual only, API uses 8 digits)
  - Copy to clipboard

- **Component:** `src/modules/connections/components/whatsapp/PairingCodeDisplay.tsx`
  - 4-step instructions in Portuguese
  - Ceramic theme design
  - Auto-regenerate on expiration

- **Integration:** `src/modules/connections/views/ConnectionsWhatsAppTab.tsx`
  - Toggle QR/Pairing methods
  - Real-time subscription via `useWhatsAppSessionSubscription()`

### Usage Example
```typescript
import { usePairingCode } from '@/hooks/usePairingCode'

const { generateCode, code, secondsRemaining, isExpired } = usePairingCode()

// Generate code
await generateCode('5511987654321')

// Display
if (code && !isExpired) {
  console.log(`Code: ${code}, expires in ${secondsRemaining}s`)
}
```

### Troubleshooting

#### Code not generating
- **Symptom:** Edge Function returns 400/401 error
- **Check:**
  1. `EVOLUTION_API_URL` and `EVOLUTION_API_KEY` in Supabase secrets
  2. JWT token passing correctly (see `usePairingCode.ts:99-107`)
  3. RPC permissions granted (`20260121000007_grant_whatsapp_rpc_permissions.sql`)
- **Debug:** `npx supabase functions logs generate-pairing-code --tail`

#### Webhook not updating status
- **Symptom:** Status stays 'connecting' after entering code
- **Check:**
  1. `EVOLUTION_WEBHOOK_SECRET` matches in:
     - Supabase Edge Function secrets
     - Evolution API webhook configuration
  2. HMAC signature validation (see `webhook-evolution/index.ts`)
- **Debug:** `npx supabase functions logs webhook-evolution --tail`

#### Real-time lag or not working
- **Symptom:** UI doesn't update after connection
- **Check:**
  1. Supabase Dashboard → Database → Replication
  2. Enable replication for `whatsapp_sessions` table
  3. RLS policies allow SELECT for user
- **Verify:** `useWhatsAppSessionSubscription()` hook active

#### Pairing code format mismatch
- **Symptom:** User enters code but WhatsApp rejects
- **Check:**
  1. Evolution API query param: `?number={phoneNumber}` (line 189 in generate-pairing-code)
  2. Phone format: No spaces, format 5511987654321 (10-15 digits)
- **Note:** Frontend displays XXXX-XXXX for UX, but API uses 8 digits without dash

### Environment Secrets (Supabase)
Required in Edge Functions → Secrets:
```bash
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your-api-key
EVOLUTION_WEBHOOK_SECRET=your-webhook-secret
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Rate Limiting
- **Pairing attempts:** Tracked in `whatsapp_sessions.pairing_attempts`
- **Messages sent:** Tracked in `messages_sent_today` (resets daily)
- **Grace period:** 90s server-side (beyond 60s UI countdown)

### Related Issues
- **#89:** Webhook CONNECTION_UPDATE real-time (implemented)
- **#90:** Dedicated connection page (ConnectionsWhatsAppTab)
- **#91:** Process received messages to timeline (future)
- **#118:** WhatsApp as document input for RAG (future)

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

## URLs de Ambientes

### Staging (Ambiente Ativo)
- **App:** https://aica-staging-5p22u2w6jq-rj.a.run.app/
- **Supabase:** https://uzywajqzbdbrfammshdg.supabase.co
- **Region:** southamerica-east1 (São Paulo)
- **Uso:** Desenvolvimento, testes e validação do MVP

### Produção (Pausado)
- **Status:** ⏸️ Desativado até MVP finalizar
- **Motivo:** Foco total em staging, redução de overhead de manutenção

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
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, ui, components, architecture, database

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
- **docs/ARCHITECTURE_REFACTORING_ISSUE_39.md** - Comprehensive guide to Phase 1-7 refactoring
- **docs/PRD.md** - Product requirements and feature specifications
- **.claude/AGENT_GUIDELINES.md** - Workflow multi-terminal detalhado
- **.claude/WORK_QUEUE.md** - Branches ativas e prioridades

---
**Maintainers:** Lucas Boscacci Lima + Claude Haiku 4.5