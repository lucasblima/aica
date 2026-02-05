# AICA Life OS - Claude Code Instructions

Este arquivo contém instruções para agentes Claude Code trabalhando no projeto AICA Life OS.

---

## Visao Geral do Projeto

**AICA Life OS** e um "Sistema Operacional de Vida Integral" que integra produtividade pessoal e profissional para brasileiros. Funciona como um "Jarvis pessoal" com 8 modulos principais.

### Stack Tecnologico
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Google Gemini API (via backend seguro)
- **Design**: Ceramic Design System (neumorphic, warm palettes)
- **Deploy**: Google Cloud Run

---

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

## DEPLOY - FLUXO VIA TERMINAL

### Passo 1: Commit e Push
```bash
git add -A && git commit -m "sua mensagem" && git push origin main
```

### Passo 2: Deploy Manual via Cloud Build
```bash
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762
```
Deploy leva ~4 minutos.

### Verificar Status
```bash
# Listar builds recentes
gcloud builds list --limit=5 --region=southamerica-east1 --project=gen-lang-client-0948335762

# Logs do ultimo build
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)" --region=southamerica-east1 --project=gen-lang-client-0948335762) --region=southamerica-east1
```

### Apos Deploy
Acesse: https://aica-staging-5p22u2w6jq-rj.a.run.app

---

## Modulos Principais

| Modulo | Descricao | Tabelas Principais |
|--------|-----------|-------------------|
| **Atlas** | Gestao de tarefas (Eisenhower Matrix) | `work_items` |
| **Agenda** | Sincronizacao Google Calendar | `calendar_events` |
| **Journey** | Autoconhecimento e reflexoes | `moment_entries`, `daily_reports` |
| **Captacao** | Grant writing para FAPERJ, FINEP, CNPq | `grant_projects`, `grant_opportunities` |
| **Connections** | CRM pessoal por contexto | `connection_spaces`, `connection_members` |
| **Studio** | Producao de podcasts com IA | `podcast_shows`, `podcast_episodes` |
| **Finance** | Gestao financeira pessoal | `finance_transactions` |
| **Flux** | Gestao de treinos para coaches | `athletes`, `workout_blocks`, `alerts` |

### Module Paths
| Module | Path | Purpose |
|--------|------|---------|
| Atlas | `src/modules/atlas/` | Task management + Eisenhower Matrix |
| Journey | `src/modules/journey/` | Consciousness points, moments |
| Studio | `src/modules/studio/` | Podcast production workflow |
| Grants | `src/modules/grants/` | PDF-first edital parsing |
| Finance | `src/modules/finance/` | Bank statement processing |
| Connections | `src/modules/connections/` | WhatsApp integration, pairing code |
| Flux | `src/modules/flux/` | Training management for coaches (multi-modality) |

---

## REGRAS DE SEGURANCA CRITICAS

### NUNCA FAZER:
```typescript
// ERRADO - API key no frontend
const genai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// ERRADO - Expor chaves em codigo
const API_KEY = "AIza...";
```

### SEMPRE FAZER:
```typescript
// CORRETO - Usar GeminiClient que chama Edge Function
import { GeminiClient } from '@/lib/gemini';
const client = GeminiClient.getInstance();
const result = await client.call({ action: 'generate', payload: {...} });

// CORRETO - API keys apenas em Supabase Secrets
// supabase secrets set GEMINI_API_KEY=xxx
```

---

## INTEGRACOES GOOGLE - DIRETRIZES 2026

### Prioridade 1: File Search API (RAG Gerenciado)

**O que e:** Sistema RAG totalmente gerenciado pela Google. Elimina necessidade de vector databases customizados.

**Quando usar:**
- Indexacao de documentos (PDFs de editais, transcricoes)
- Busca semantica em base de conhecimento
- Geracao de respostas com citacoes

**Como implementar:**
```typescript
// Edge Function: supabase/functions/file-search-v2/index.ts
import { GoogleGenAI } from '@google/genai';

// Criar store por modulo
const store = await client.fileSearchStores.create({
  config: { display_name: 'aica-captacao-knowledge' }
});

// Upload com indexacao automatica
await client.fileSearchStores.uploadToFileSearchStore({
  file: pdfFile,
  file_search_store_name: store.name,
  config: {
    chunking_config: {
      white_space_config: {
        max_tokens_per_chunk: 400,  // Otimizado para portugues
        max_overlap_tokens: 40
      }
    }
  }
});

// Query com RAG
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: question,
  tools: [{
    file_search: {
      file_search_stores: [store.name],
      max_results: 5
    }
  }]
});
```

**Custo:** $0.15/1M tokens para indexar, storage e queries GRATIS

**Arquivos relacionados:**
- `src/services/fileSearchApiClient.ts` (implementacao antiga)
- `src/hooks/useFileSearch.ts` (hook frontend)

### Prioridade 2: Grounding with Google Search

**O que e:** Conecta Gemini a resultados de busca em tempo real.

**Quando usar:**
- Buscar editais atualizados
- Pesquisar informacoes sobre convidados de podcast
- Validar informacoes com fontes

**Como implementar:**
```typescript
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Quais editais da FAPERJ estao abertos para IA?',
  tools: [{ googleSearch: {} }]
});

// Resposta inclui groundingMetadata com fontes verificaveis
const sources = response.groundingMetadata.groundingChunks;
```

### Prioridade 3: Agent Development Kit (ADK)

**O que e:** Framework para sistemas multi-agentes.

**Quando usar:**
- Orquestrar multiplos agentes especializados
- Criar fluxos complexos de IA
- Implementar Tia Sabia (assistente de voz)

**Arquitetura recomendada:**
```
Coordinator Agent
|-- Captacao Agent (File Search + Google Search)
|-- Studio Agent (Google Search + Function Calling)
|-- Journey Agent (Embeddings + Memory)
|-- Finance Agent (Function Calling)
```

**Instalacao:**
```bash
pip install google-adk
```

### Prioridade 4: Gemini Live API (Voz em Tempo Real)

**O que e:** API de streaming bidirecional para voz.

**Quando usar:**
- Tia Sabia (assistente de voz via WhatsApp)
- Interacoes por voz no app

**Caracteristicas:**
- Latencia 600ms para primeiro token
- Voice Activity Detection nativo
- Suporte a portugues brasileiro
- Entende tom emocional (affective dialog)

---

## Project Structure

### Root Structure
```
src/
|-- modules/           # Feature modules (atlas, journey, studio, grants, finance, connections)
|   |-- {module}/
|       |-- components/
|       |-- hooks/
|       |-- services/
|       |-- types.ts (or types/index.ts)
|       |-- index.ts   # Barrel export for public API
|-- components/        # Shared UI components (semantic organization)
|-- contexts/          # React Context providers
|-- hooks/             # Global custom hooks
|-- services/          # API clients, Supabase queries, integrations
|-- integrations/      # Third-party service integrations (Gemini, Whisper, etc.)
|-- lib/               # Utility functions, helpers
|   |-- gemini/
|       |-- client.ts      # Cliente singleton para Gemini
|       |-- models.ts      # Configuracao de modelos
|       |-- types.ts       # Tipos TypeScript
|-- types/             # Global type definitions
supabase/
|-- migrations/        # SQL migrations (versioned)
|-- functions/         # Deno Edge Functions
    |-- gemini-chat/       # Edge Function principal
    |-- file-search/       # File Search atual
    |-- file-search-v2/    # Nova implementacao (criar)
    |-- deep-research/     # Deep Research Agent
```

### Components Organization (Issue #39 Refactor)
Shared components are organized into **4 semantic categories**:

```
src/components/
|-- ui/               # 16 reusable UI primitives (no business logic)
|   |-- Accordion.tsx
|   |-- ConfirmationModal.tsx
|   |-- LoadingScreen.tsx
|   |-- NotificationContainer.tsx
|   |-- index.ts      # Barrel export
|-- layout/           # 4 layout components (headers, navigation, containers)
|   |-- HeaderGlobal.tsx
|   |-- AuthSheet.tsx
|   |-- SettingsMenu.tsx
|   |-- index.ts      # Barrel export
|-- features/         # 24+ feature components (cross-module reusable)
|   |-- Calendar*.tsx
|   |-- Gamification*.tsx
|   |-- Efficiency*.tsx
|   |-- Timeline*.tsx
|   |-- index.ts      # Barrel export
|-- domain/           # 4 domain-specific business logic components
|   |-- PriorityMatrix.tsx
|   |-- TaskEditModal.tsx
|   |-- index.ts      # Barrel export
|-- index.ts          # Root barrel export (backward compatibility)
|-- {other}/          # Legacy folders (AreaQuickActionModal, ProfileModal, etc.)
```

### Import Patterns
```typescript
// Recommended: Use barrel exports
import { LoadingScreen, NotificationContainer } from '@/components/ui'
import { HeaderGlobal } from '@/components/layout'
import { GamificationWidget, Calendar* } from '@/components/features'
import { PriorityMatrix, TaskEditModal } from '@/components/domain'

// Also works: Root-level barrel export (for backward compatibility)
import { LoadingScreen, HeaderGlobal } from '@/components'

// Avoid: Direct file imports (reduces maintainability)
import { LoadingScreen } from '@/components/ui/LoadingScreen'
```

---

## Component Organization Best Practices (Issue #39)

### Semantic Categorization
Components are categorized by **purpose**, not location:

| Category | Purpose | Examples | Reusable |
|----------|---------|----------|----------|
| **ui/** | UI primitives, no business logic | Accordion, Button, Modal, Card | Yes |
| **layout/** | Page structure, navigation | Header, Sidebar, Nav | Yes |
| **features/** | Cross-module reusable features | Calendar, Gamification, Timeline | Yes |
| **domain/** | Business logic, domain-specific | PriorityMatrix, TaskEditor | Sometimes |

### Naming Conventions
- **Component files:** PascalCase (e.g., `LoadingScreen.tsx`)
- **Barrel exports:** Always `index.ts` per category
- **CSS files:** Same name as component (e.g., `LoadingScreen.css`)

### When to Create New Components
- **Move to components/ if:** Used by 2+ modules, no module-specific dependencies
- **Keep in modules/ if:** Only used in 1 module, tight business logic coupling
- **Add to ui/ if:** Pure presentation, reusable across any context
- **Add to features/ if:** Feature-driven, cross-module, some business logic

### Types Organization
All modules follow the standardized pattern:
```
src/modules/{module}/
|-- types/
|   |-- index.ts         # All public types (RECOMMENDED)
|   |-- *.ts             # Internal type files
|-- types.ts             # DEPRECATED - move to types/index.ts
```

Import pattern:
```typescript
// Recommended
import type { GuestDossier } from '@/modules/podcast/types'

// Also works
import type { GuestDossier } from '@/modules/podcast/types/dossier'

// Avoid
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
- Prefer `gemini-2.5-flash` for cost optimization
- Rate limit + retry logic required

---

## Padroes de Codigo

### Chamadas ao Gemini
```typescript
// Sempre usar o cliente centralizado
import { GeminiClient } from '@/lib/gemini';

const client = GeminiClient.getInstance();

// Especificar acao e modelo
const result = await client.call({
  action: 'suggest_guest',  // Acao especifica
  payload: { topic: 'IA' },
  model: 'smart'  // 'fast' | 'smart' | 'embedding'
});
```

### Edge Functions
```typescript
// supabase/functions/*/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // API key do Supabase Secrets
  const apiKey = Deno.env.get('GEMINI_API_KEY')!;

  // ... logica
});
```

### Componentes React (Ceramic Design)
```tsx
// Usar classes do Ceramic Design System
<div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
  <h2 className="text-ceramic-800 font-medium">Titulo</h2>
  <button className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2">
    Acao
  </button>
</div>
```

---

## Modelos Gemini Disponiveis

| Modelo | Uso | Custo |
|--------|-----|-------|
| `gemini-2.5-flash` | Tarefas rapidas, streaming | Baixo |
| `gemini-2.5-pro` | Analise complexa, raciocinio | Medio |
| `gemini-3-pro-preview` | Agentic, codigo, reasoning | Alto |
| `gemini-2.5-flash-native-audio` | Live API, voz | Medio |
| `text-embedding-004` | Embeddings semanticos | Muito baixo |

---

## Tarefas Prioritarias (Fevereiro 2026)

### 1. Migrar para File Search V2
- [ ] Criar Edge Function `file-search-v2`
- [ ] Migrar documentos existentes
- [ ] Atualizar `useFileSearch` hook
- [ ] Deprecar implementacao antiga

### 2. Integrar Grounding no Studio
- [ ] Adicionar Google Search as pesquisas de convidados
- [ ] Exibir fontes verificaveis na UI
- [ ] Implementar cache de resultados

### 3. Setup ADK para Coordinator Agent
- [ ] Criar estrutura Python em `/backend/agents/`
- [ ] Implementar agente de Captacao
- [ ] Integrar com Supabase via Function Calling

### 4. Context Caching do Gemini (Task #36 - COMPLETA)
- [x] Criar `backend/agents/services/context_cache_service.py`
- [x] Criar Edge Function `context-cache`
- [x] Implementar hook `useContextCache.ts`
- [x] Atualizar `GeminiClient` com actions de cache
- [x] Adicionar documentacao em `docs/GEMINI_API_SETUP.md`

**Economia estimada**: Ate 90% em tokens repetidos (perfil usuario + system instructions)

---

## Problemas Conhecidos

1. **OAuth em producao**: PKCE flow tem problemas com Cloud Run stateless
   - Workaround: Usar staging para testes OAuth

2. **Schema mismatches**: Colunas faltantes causam erros de auto-save
   - Verificar migrations antes de features

3. **Rate limits**: Gemini tem limites por minuto
   - Implementar retry com backoff exponencial

---

## WhatsApp Pairing Code (Issue #87)

### Overview
Alternative to QR Code for WhatsApp connection. Generates 8-digit pairing code with 60s TTL for easier mobile pairing.

### Architecture Flow
1. **Frontend:** `usePairingCode().generateCode('5511987654321')`
2. **Edge Function:** `generate-pairing-code` -> Evolution API
3. **Evolution API:** Returns pairing code (60s TTL)
4. **User:** Enters code in WhatsApp mobile app
5. **Webhook:** `CONNECTION_UPDATE` -> updates DB `status='connected'`
6. **Frontend:** Real-time subscription detects change -> UI updates

### Key Components

#### Backend
- **Edge Function:** `supabase/functions/generate-pairing-code/index.ts`
  - RPC: `get_or_create_whatsapp_session`, `record_pairing_attempt`
  - Query param: `?number={phoneNumber}` (format: 5511987654321)
  - Returns: `{ code: "12345678", expiresAt: "ISO8601" }`

- **Webhook:** `supabase/functions/webhook-evolution/index.ts`
  - Event: `CONNECTION_UPDATE`
  - Updates `whatsapp_sessions.status` -> 'connected'
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
  1. Supabase Dashboard -> Database -> Replication
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
Required in Edge Functions -> Secrets:
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
1. Check Supabase Dashboard -> Authentication -> URL Configuration
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
- **Region:** southamerica-east1 (Sao Paulo)
- **Uso:** Desenvolvimento, testes e validacao do MVP

### Producao (Pausado)
- **Status:** Desativado ate MVP finalizar
- **Motivo:** Foco total em staging, reducao de overhead de manutencao

---

## Agent Specialization (Auto-Delegation)

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

## Session Management

### Naming Convention
Pattern: `{area}-{feature}-{type}`
```bash
claude --session backend-auth-refactor
claude --resume                         # Listar sessoes
claude --continue                       # Retomar recente
```

### Permission Modes
| Mode | Editar? | Use Case |
|------|---------|----------|
| normal | Yes | Development |
| plan | No | Code reviews |
| auto | Yes auto | Trusted workflows |

```bash
claude --permission-mode plan  # Safe review mode
```

---

## Multi-Terminal Sync

### Antes de iniciar (OBRIGATORIO)
```bash
git pull origin main
git branch -a --sort=-committerdate | head -10
git log --all --oneline --since="1 day ago" | head -20
```

### Commits (SEMPRE)
```
<type>(<scope>): <description>

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, docs, test, refactor, chore
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, ui, components, architecture, database

---

## Critical Reminders

- **NEVER** create backup files (.backup, .bak) - Git is the backup
- **NEVER** call Gemini API client-side - use Edge Functions
- **NEVER** expose API keys in frontend code
- **ALWAYS** include RLS policies with new tables
- **ALWAYS** use `@supabase/ssr` for authentication
- **ALWAYS** include co-authorship in commits
- **ALWAYS** use GeminiClient singleton for AI calls

---

## Quality Targets
- **Coverage:** >80% unit tests
- **Build:** <3 min target
- **Lighthouse:** >90
- **Compliance:** LGPD/GDPR, OWASP Top 10, WCAG 2.1 AA

---

## Instrucoes para Agentes

### Ao criar novas features de IA:
1. **Sempre** usar Edge Functions para chamadas ao Gemini
2. **Nunca** expor API keys no frontend
3. Verificar se File Search ou Grounding resolve o problema antes de criar RAG customizado
4. Usar tracking de uso (`aiUsageTrackingService`)
5. Implementar retry com backoff

### Ao modificar modulos existentes:
1. Verificar migrations necessarias
2. Manter compatibilidade com RLS
3. Usar tipos TypeScript existentes de `src/types.ts`
4. Seguir Ceramic Design System
5. Testar com usuario autenticado

### Ao criar Edge Functions:
1. Sempre incluir CORS headers
2. Validar autenticacao via JWT
3. Usar `Deno.env.get()` para secrets
4. Logar erros com contexto
5. Retornar JSON com `success` boolean

---

## Related Docs

### Google
- [File Search API](https://ai.google.dev/gemini-api/docs/file-search)
- [ADK Documentation](https://google.github.io/adk-docs/)
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)

### Projeto
- **docs/ARCHITECTURE_REFACTORING_ISSUE_39.md** - Comprehensive guide to Phase 1-7 refactoring
- **docs/PRD.md** - Product requirements and feature specifications
- **docs/GEMINI_API_SETUP.md** - Setup de API
- **docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md** - Design System
- **docs/PRIVACY_AND_SECURITY.md** - Seguranca
- **.claude/AGENT_GUIDELINES.md** - Workflow multi-terminal detalhado
- **.claude/WORK_QUEUE.md** - Branches ativas e prioridades

---
**Maintainers:** Lucas Boscacci Lima + Claude

*Ultima atualizacao: Fevereiro 2026*
