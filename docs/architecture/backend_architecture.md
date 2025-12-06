# Backend Architecture – Fonte de Verdade

## Visão Geral

**Última atualização:** 2025-12-06

Este documento descreve **todas as tabelas do Supabase** que o frontend (Aica) utiliza, seus **relacionamentos** e como o **frontend interage** com elas através dos serviços em `src/services/supabaseService.ts`.

---

## Tabelas Principais
| Tabela | Campos Relevantes | Função | Relacionamento(s) |
|--------|-------------------|--------|-------------------|
| **users** | `id`, `email`, `full_name`, `avatar_url`, `created_at` | Identifica o usuário autenticado. | 1‑N → `pair_conversations`, `chat_sessions`, `activity_log`, `memories`, `daily_reports` |
| **associations** | `id`, `name`, `description`, `logo_url`, `archived` | Grupos/associações que o usuário faz parte. | 1‑N → `modules`, `work_items`, `group_messages` |
| **modules** (life_areas) | `id`, `name`, `description`, `association_id`, `archived` | Áreas da "Minha Vida" (Finanças, Saúde, Educação…). | N‑1 → `associations` |
| **work_items** | `id`, `title`, `description`, `due_date`, `start_date`, `priority`, `status`, `association_id`, `assignee_name`, `archived`, `completed_at`, `created_at`, `updated_at` | Tarefas diárias exibidas em **Meu Dia**. | N‑1 → `associations` |
| **memories** | `id`, `content`, `metadata` (JSON), `user_id` | Registro de eventos emocionais ou contextuais. | N‑1 → `users` |
| **daily_reports** | `id`, `report_type`, `report_content`, `user_id` | Relatórios diários de progresso ou bem‑estar. | N‑1 → `users` |
| **activity_log** | `id`, `action`, `details` (JSON), `user_id` | Histórico de ações (ex.: pomodoro, envio de mensagem). | N‑1 → `users` |
| **chat_sessions** | `id`, `user_id`, `channel_identifier`, `created_at`, `last_interaction_at` | Sessões de conversa por canal (WhatsApp, web). | N‑1 → `users` |
| **pair_conversations** | `id`, `content`, `sender_id`, `match_id`, `delivered`, `moderation_status` | Mensagens que acionam o **Database Webhook** → n8n → Evolution API (WhatsApp). | N‑1 → `users` (sender) ; `match_id` referencia outro usuário ou contato externo |
| **group_messages** | `id`, `content`, `sender_id`, `status`, `sent_at`, `external_msg_id` | Mensagens em massa ou convites de grupo. | N‑1 → `users` |
| **contact_network** | `id`, `user_id`, `contact_name`, `phone_number`, `last_interaction_date` | Cadastro de contatos externos (ex.: Gisele). | N‑1 → `users` |
| **audit_log** | `id`, `event`, `payload`, `status`, `created_at` | Registro de erros/validações nos workflows n8n. | — |

## Módulo Podcast (Namespace: `podcast_`)

| Tabela | Função | Campos Obrigatórios (Schema Fix) |
|--------|--------|----------------------------------|
| **podcast_shows** | O Programa | `id`, `title` (not name), `description`, `cover_url`, `owner_id` |
| **podcast_episodes** | O Episódio | `id`, `show_id`, `title`, `status`, `scheduled_date`, `created_at`, `updated_at` |
| **podcast_team_members**| Participantes | `id`, `episode_id`, `name`, `role`, `whatsapp` |

## Correções de Segurança (RLS Fixes)
> **CRÍTICO:** A tabela `associations` e `association_members` NÃO podem ter políticas RLS que se referenciam mutuamente de forma direta.
> **Solução:** Usar função `public.check_membership(user_id, association_id)` com `SECURITY DEFINER`.

## Correções de API (Gemini Live)
- O hook `useGeminiLive` deve instanciar o `MultimodalLiveClient` corretamente.
- Eventos devem ser ouvidos via `.on('eventName', callback)` apenas se a instância do cliente estiver inicializada.

---

## Fluxos de Dados (Frontend ↔ Supabase)

### 1. Autenticação
- **Frontend**: `supabaseClient.ts` cria o cliente com `supabaseUrl` e `supabaseAnonKey`.
- **Chamada**: `supabase.auth.getSession()` e `onAuthStateChange` em `App.tsx`.
- **Resultado**: Usuário autenticado → `user.id` usado como `sender_id` nas mensagens.

### 2. Carregamento de Dados
| Tela | Função | Serviço (`supabaseService.ts`) | Consulta Supabase |
|------|--------|-------------------------------|-------------------|
| **Minha Vida** | Exibir módulos/áreas de vida | `getLifeAreas()` | `select * from modules where archived = false` (join `associations` opcional) |
| **Meu Dia** | Listar tarefas do dia | `getDailyAgenda()` | `select * from work_items where due_date <= today and archived = false` |
| **Associações** (card “Minhas Associações”) | Mostrar associações do usuário | `getUserAssociations(userId)` | `select * from associations where user_id = $userId` |
| **Memórias/Relatórios** | Persistir contexto emocional | `addMemory()`, `addDailyReport()` | `insert` nas tabelas `memories` / `daily_reports` |

### 3. Envio de Mensagem WhatsApp (Colaboração)
1. **Usuário clica “Cobrar via WhatsApp”** → UI chama `sendMessage(content, senderId, matchId)` (novo método em `supabaseService.ts`).
2. `sendMessage` **insere** um registro em `pair_conversations` (status `pending`).
3. **Database Webhook** configurado no Supabase detecta o `INSERT` e faz POST para o endpoint HTTP do **n8n** (`/webhook/send-whatsapp-msg`).
4. n8n **valida** `auth_token` e `user_id` (IF node). Se válido, chama a **Evolution API** para enviar a mensagem real via WhatsApp.
5. Quando a API responde sucesso, n8n **atualiza** o registro: `delivered = true`, `moderation_status = 'sent'`, `external_msg_id = <id da API>`.
6. Frontend pode **escutar** mudanças em tempo real usando `subscribeToMessageStatus(messageId, callback)` (Realtime channel) e atualizar a UI (ex.: “Enviando… → Enviado”).

### 4. Atualização de Status de Tarefas
- **Frontend**: ao marcar tarefa concluída, chama `updateTaskStatus(taskId, 'completed')` (função existente).
- **Supabase**: `update work_items set status = 'completed', completed_at = now() where id = $taskId`.
- UI reflete mudança imediatamente (optimistic update) e, via Realtime, outros dispositivos veem a atualização.

---

## Diagrama Simplificado (texto)
```
[Frontend (React)]
   │
   ├─ supabaseClient.ts  ←→  Supabase Auth
   │
   ├─ supabaseService.ts
   │      ├─ getLifeAreas()      → modules ↔ associations
   │      ├─ getDailyAgenda()    → work_items ↔ associations
   │      ├─ sendMessage()       → pair_conversations (INSERT)
   │      └─ subscribeToMessageStatus() ← Realtime channel
   │
   └─ UI components (App.tsx, BottomNav, etc.)
          │
          └─ renderVida / renderAgenda (consomem dados acima)

[Supabase]
   ├─ tables (users, associations, modules, work_items, …)
   ├─ Realtime (push updates to frontend)
   └─ Database Webhook → n8n

[n8n Workflow]
   ├─ Recebe payload (phone, message, user_id, auth_token)
   ├─ IF auth_token válido
   ├─ Call Evolution API (WhatsApp) → envia mensagem
   └─ UPDATE pair_conversations (delivered = true, external_msg_id)
```

---

## Como usar este documento
- **Revisão**: Abra `backend_architecture.md` no seu editor (Metro) para ter a referência única.
- **Manutenção**: Sempre que criar nova tabela ou mudar um relacionamento, atualize este arquivo.
- **Comunicação**: Compartilhe com a equipe de backend e com quem for integrar novos fluxos (ex.: novos canais de mensagem, novos módulos de vida).

---

*Última atualização: 2025-12-05*



---

## Google Calendar Integration - Secretária Executiva

### Visão Geral

**Última atualização:** 2025-12-06

Integração completa com Google Calendar usando OAuth 2.0 via Supabase Auth. Permite que Aica funcione como secretária executiva, organizando proativamente a agenda do usuário.

### Arquitetura OAuth

#### Fluxo de Autorização
```
1. Usuário clica "Autorizar Acesso" (GoogleCalendarConnect.tsx)
2. Frontend chama connectGoogleCalendar() → Supabase Auth
3. Supabase redireciona para Google OAuth consent screen
4. Usuário aceita permissões (calendar.events + userinfo.email)
5. Google redireciona de volta com authorization code
6. Supabase troca code por access_token + refresh_token
7. App.tsx detecta OAuth callback via URL hash
8. handleOAuthCallback() salva tokens na tabela google_calendar_tokens
9. UI atualiza para estado "Sincronizado"
```

#### Escopos Solicitados
- `https://www.googleapis.com/auth/calendar.events` - Leitura E escrita de eventos
- `https://www.googleapis.com/auth/userinfo.email` - Email do usuário

### Estrutura da Tabela: google_calendar_tokens

```sql
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    email TEXT,
    name TEXT,
    picture_url TEXT,
    scopes TEXT[],
    is_connected BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMPTZ,
    last_refresh TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
    ON google_calendar_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tokens"
    ON google_calendar_tokens FOR ALL
    USING (auth.uid() = user_id);
```

### Sincronização Inteligente

#### Estratégias de Auto-Sync
1. **Polling (5 minutos)** - Hook `useGoogleCalendarEvents` com `syncInterval: 300`
2. **Visibility API** - Sincroniza quando usuário retorna para a aba
3. **Manual Trigger** - Botão "Sincronizar" no GoogleCalendarConnect

#### Fluxo de Sincronização
```
1. Hook verifica isGoogleCalendarConnected()
2. Se conectado, chama fetchEvents() automaticamente
3. fetchAndTransformEvents() busca eventos via Google Calendar API v3
4. Eventos transformados para formato TimelineEvent
5. AgendaView.tsx mescla eventos com tasks do Supabase
6. DailyTimeline renderiza timeline unificada
7. updateLastSyncTime() atualiza timestamp
```

### Integração com Timeline (AgendaView.tsx)

```typescript
const mergedTimelineTasks = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Filtrar eventos para data selecionada
    const selectedDateCalendarEvents = calendarEvents
        .filter(event => event.startTime.startsWith(dateStr))
        .map(transformCalendarEventToTask);
    
    // Mesclar e ordenar
    return [...timelineTasks, ...selectedDateCalendarEvents]
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
}, [timelineTasks, calendarEvents, selectedDate]);
```

### Serviços Implementados

**googleAuthService.ts** (218 linhas)
- `connectGoogleCalendar()` - Inicia OAuth
- `handleOAuthCallback()` - Salva tokens
- `getValidAccessToken()` - Token válido com auto-refresh

**googleCalendarTokenService.ts** (398 linhas)
- `saveGoogleCalendarTokens()` - CRUD Supabase
- `refreshAccessToken()` - Renovação manual
- `updateLastSyncTime()` - Timestamp de sync

**googleCalendarService.ts**
- `fetchAndTransformEvents()` - API v3 + transformação
- `transformGoogleEvent()` - Conversão TimelineEvent

**useGoogleCalendarEvents.ts** (156 linhas)
- Hook React com auto-sync
- Estado: `events`, `isConnected`, `isLoading`, `error`, `lastSyncTime`

### Seleção de Data (Minha Semana)

DailyTimeline.tsx gera 7 dias (3 antes, dia atual, 3 depois). Ao clicar em data, `onDateChange()` atualiza `selectedDate` e filtra tasks + eventos.

### Arquitetura Multi-Usuário

RLS Isolation: Cada usuário vê APENAS seus tokens via `auth.uid() = user_id`.

### Segurança e Compliance

**Proteções:**
1. Tokens no banco (AES-256 at rest)
2. RLS policies (isolamento)
3. HTTPS/TLS 1.3 obrigatório
4. Token revocation ao desconectar

**Compliance:** GDPR, LGPD, CCPA compliant

### Documentação Completa
`docs/features/GOOGLE_CALENDAR_INTEGRATION.md` (697 linhas)


---

## Podcast Module - Frontend-First Development

### Current Status: Frontend Complete, Backend Pending

The Podcast module has been developed using a **frontend-first strategy** to validate the user experience before investing in backend infrastructure. The following components are fully implemented in the UI:

#### New Frontend Components (Phase 5 Expansion)

1. **GuestIdentificationWizard** (`src/modules/podcast/components/GuestIdentificationWizard.tsx`)
   - 3-step wizard for guest profile identification
   - AI-powered profile search (mocked, awaits Gemini integration)
   - Theme selection (auto/manual), scheduling, and location configuration

2. **PreProductionHub** (`src/modules/podcast/views/PreProductionHub.tsx`)
   - Research panel with Bio/Ficha/News tabs
   - Pauta (outline) builder with drag-and-drop topics
   - Topic categories: Geral, Quebra-Gelo, Patrocinador, Polêmicas
   - AI Chat assistant for guest research
   - Custom sources upload interface (PDFs, links, text)

3. **ProductionMode** (`src/modules/podcast/views/ProductionMode.tsx`)
   - Live recording interface with HH:MM:SS timer
   - Topic checklist with completion tracking
   - Teleprompter launcher
   - Co-Host Aica panel (Monitor/Active modes)
   - AI Chat for real-time assistance
   - Audio level indicators

4. **TeleprompterWindow** (`src/modules/podcast/components/TeleprompterWindow.tsx`)
   - Full-screen teleprompter overlay
   - Auto-scroll for sponsor reads (speed 0-5)
   - Topic navigation with preview
   - Category-based visual styling

5. **PostProductionHub** (`src/modules/podcast/views/PostProductionHub.tsx`)
   - Success screen after recording
   - Roadmap display for future features:
     - Automatic transcription
     - AI-generated cuts for TikTok/Reels/Shorts
     - SEO-optimized blog posts
     - Social media auto-publishing

6. **PodcastCopilotView** (`src/views/PodcastCopilotView.tsx`)
   - Updated routing for new workflow
   - State management for multi-step process
   - Legacy mode compatibility (Preparation/Studio)

#### Backend Requirements (Pending Implementation)

Based on the frontend components, the following backend support is needed:

##### Database Schema Extensions

```sql
-- New columns for podcast_episodes (if not exists)
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_reference TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS guest_profile JSONB;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS episode_theme TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS theme_mode TEXT CHECK (theme_mode IN ('auto', 'manual'));
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS season INTEGER DEFAULT 1;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS recording_duration INTEGER; -- seconds

-- Guest research storage (alternative: store in episode metadata JSONB)
CREATE TABLE IF NOT EXISTS podcast_guest_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
    biography TEXT,
    technical_sheet JSONB,
    controversies JSONB,
    sources JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsor scripts (for teleprompter)
ALTER TABLE podcast_topics ADD COLUMN IF NOT EXISTS sponsor_script TEXT;
```

##### Storage Requirements

```
/podcast-recordings/
  /{show_id}/
    /{episode_id}/
      /audio.mp3           -- Main recording
      /transcript.txt      -- Auto-generated transcript
      /cuts/              -- Social media cuts
        /short-1.mp4
        /short-2.mp4
      /sources/           -- Custom research sources
        /document-1.pdf
        /link-archive.html
```

##### API Integrations Needed

1. **Gemini Deep Research** - Guest profile search
   - Input: Guest name + reference
   - Output: Biography, technical sheet, controversies
   - Endpoint: `/api/podcast/research-guest`

2. **Gemini Pauta Generation** - Topic suggestions
   - Input: Guest profile + theme
   - Output: Suggested topics by category
   - Endpoint: `/api/podcast/generate-pauta`

3. **Post-Production Pipeline** (Future)
   - Transcription service integration
   - Video cut generation (Opus Clip-style)
   - Blog post generation
   - Social media API connections

##### Service Layer Requirements

Create `src/services/podcastProductionService.ts`:
```typescript
// Guest research
async function searchGuestProfile(name: string, reference: string)
async function saveGuestResearch(episodeId: string, research: GuestResearch)

// Recording management
async function startRecording(episodeId: string)
async function pauseRecording(episodeId: string)
async function finishRecording(episodeId: string, duration: number)

// Post-production
async function generateTranscript(episodeId: string)
async function generateCuts(episodeId: string)
async function publishToSocial(episodeId: string, platforms: string[])
```

#### Migration Priority

**High Priority (Core Workflow):**
1. Guest profile storage (JSONB in episode metadata or separate table)
2. Recording duration tracking
3. Sponsor script field for topics

**Medium Priority (Enhanced Features):**
1. Custom sources storage (Supabase Storage)
2. Gemini Deep Research integration
3. Research caching

**Low Priority (Future Roadmap):**
1. Transcription service
2. Video cut generation
3. Blog post generation
4. Social media publishing

#### Frontend-Backend Integration Checklist

- [ ] Create database migrations for new podcast fields
- [ ] Implement `podcastProductionService.ts` with Supabase integration
- [ ] Connect GuestIdentificationWizard to Gemini search API
- [ ] Wire PreProductionHub to save research data
- [ ] Implement recording start/stop/duration tracking
- [ ] Add Supabase Storage for custom sources
- [ ] Create RLS policies for new podcast tables/columns
- [ ] Add E2E tests for podcast production workflow

---


---



---

## OAuth Session Security (Producao)

**Ultima atualizacao:** 2025-12-06

Sistema de limpeza preventiva de URLs OAuth expiradas para evitar erros de autenticacao.

### Problema Identificado

**Erros observados:**
- `@supabase/gotrue-js: Session as retrieved from URL expires in -XXXs`
- `Session was issued over 120s ago, URL could be stale`
- `GET /auth/v1/user 403 (Forbidden)`

**Causa raiz:** Usuarios acessando URLs de callback OAuth antigas/salvas com tokens expirados.

### Arquitetura da Solucao (4 Camadas)

**Camada 1: Pre-Validacao (index.tsx)**


**Camada 2: Utilitario Central (authUrlCleaner.ts - 106 linhas)**
- `cleanExpiredOAuthParams()`: Valida expires_at com buffer 60s, limpa URL se expirado
- `suppressExpiredSessionWarnings()`: Filtra console warnings esperados

**Camada 3: Configuracao Supabase (PKCE Flow)**


**Camada 4: Validacao Secundaria (App.tsx)**
- Detecta auth params apos inicializacao
- Aguarda 1s para Supabase processar
- Valida sessao via getSession()
- Limpa URL se sem sessao valida

### Arquivos Modificados (Commit ed59802)
1. `src/utils/authUrlCleaner.ts` (NOVO - 106 linhas)
2. `index.tsx` (+8 linhas)
3. `App.tsx` (+25 linhas, useEffect linhas 92-116)
4. `src/services/supabaseClient.ts` (+14 linhas)

### Beneficios
- Elimina erros 403 de URLs OAuth expiradas
- PKCE previne interceptacao de codigo de autorizacao
- Historico do navegador limpo (sem URLs obsoletas)
- Logs claros para depuracao

## Validação Automática

**Última verificação:** 2025-12-06

**Status:** Para validação completa do schema, execute:
```bash
supabase db diff --schema public
```

**Tabelas esperadas:** `users`, `associations`, `modules`, `work_items`, `memories`, `daily_reports`, `activity_log`, `contact_network`, `podcast_shows`, `podcast_episodes`, `podcast_topics`, `team_members`, `google_calendar_tokens`
